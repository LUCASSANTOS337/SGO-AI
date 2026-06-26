import { createClient } from '@supabase/supabase-js';
import { User, Activity, Vacation, ProductionGoal, Procedure, KnowledgeRating, AuditLog, Holiday } from '../types';

// Read keys from Vite environment variables
const rawSupabaseUrl = ((import.meta as any).env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();

// Normalize the URL: prepending https:// if it is missing and it's not empty, and fixing common format typos
const normalizeSupabaseUrl = (url: string): string => {
  let clean = url.trim();
  if (!clean) return '';
  
  // Fix format typo: e.g., https:projectid//supabase.co -> https://projectid.supabase.co
  if (clean.includes('//supabase.co')) {
    const match = clean.match(/(?:https?:\s*)?([a-zA-Z0-9\-]+)\s*\/\/supabase\.co/i);
    if (match && match[1]) {
      return `https://${match[1].toLowerCase()}.supabase.co`;
    }
  }
  
  // Prepend protocol if missing
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  
  return clean;
};

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

// Check if a string is a valid HTTP/HTTPS URL
const isValidHttpUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Check if Supabase keys are properly configured
export const isSupabaseConfigured = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (!isValidHttpUrl(supabaseUrl)) return false;
  if (supabaseUrl.includes('placeholder') || supabaseUrl === 'YOUR_SUPABASE_URL') return false;
  
  try {
    const parsed = new URL(supabaseUrl);
    // If the host is exactly supabase.co or www.supabase.co, it's not a real project URL (missing project subdomain)
    if (parsed.hostname === 'supabase.co' || parsed.hostname === 'www.supabase.co') {
      return false;
    }
  } catch {
    return false;
  }
  
  return true;
})();

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Supabase Integration Service
 * All functions fallback gracefully to a resolved promise or empty array if Supabase is not configured.
 */
export const supabaseService = {
  // ----------------------------------------------------------------
  // Settings (Competence & Simulated Date)
  // ----------------------------------------------------------------
  async getSetting(key: string, defaultValue: string): Promise<string> {
    if (!supabase) return defaultValue;
    try {
      const { data, error } = await supabase
        .from('sgo_settings')
        .select('value')
        .eq('key', key)
        .single();
      if (error || !data) return defaultValue;
      return data.value;
    } catch {
      return defaultValue;
    }
  },

  async saveSetting(key: string, value: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_settings')
        .upsert({ key, value });
      return !error;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------------
  // Users
  // ----------------------------------------------------------------
  async getUsers(): Promise<User[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('sgo_users')
        .select('*');
      if (error) throw error;
      
      // Map database snake_case back to camelCase
      return (data || []).map((u: any) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
        metaDiariaPadrao: u.meta_diaria_padrao,
        status: u.status,
        senha: u.senha,
        funcao: u.funcao
      }));
    } catch (e: any) {
      console.warn('Error fetching users from Supabase:', e?.message || e?.details || (typeof e === 'object' ? JSON.stringify(e) : e));
      return null;
    }
  },

  async saveUser(user: User): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_users')
        .upsert({
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          meta_diaria_padrao: user.metaDiariaPadrao,
          status: user.status,
          senha: user.senha,
          funcao: user.funcao
        });
      if (error) throw error;
      return true;
    } catch (e: any) {
      console.warn('Error saving user to Supabase:', e?.message || e?.details || (typeof e === 'object' ? JSON.stringify(e) : e));
      return false;
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_users')
        .delete()
        .eq('id', userId);
      return !error;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------------
  // Activities (Tasks)
  // ----------------------------------------------------------------
  async getActivities(): Promise<Activity[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('sgo_activities')
        .select('*');
      if (error) throw error;

      return (data || []).map((a: any) => ({
        id: a.id,
        nome: a.nome,
        competencia: a.competencia,
        responsavelOriginalId: a.responsavel_original_id,
        responsavelAtualId: a.responsavel_atual_id,
        responsaveisAuxiliaresIds: a.responsaveis_auxiliares_ids || [],
        prioridade: a.prioridade,
        status: a.status,
        dataLimite: a.data_limite,
        comentarios: a.comentarios || [],
        anexos: a.anexos || [],
        recorrente: a.recorrente,
        periodicidade: a.periodicidade,
        mesesAtividadeComMesmoResponsavel: a.meses_atividade_com_mesmo_responsavel || 0
      }));
    } catch (e: any) {
      console.warn('Error fetching activities:', e?.message || e?.details || (typeof e === 'object' ? JSON.stringify(e) : e));
      return null;
    }
  },

  async saveActivity(activity: Activity): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_activities')
        .upsert({
          id: activity.id,
          nome: activity.nome,
          competencia: activity.competencia,
          responsavel_original_id: activity.responsavelOriginalId,
          responsavel_atual_id: activity.responsavelAtualId,
          responsaveis_auxiliares_ids: activity.responsaveisAuxiliaresIds,
          prioridade: activity.prioridade,
          status: activity.status,
          data_limite: activity.dataLimite,
          comentarios: activity.comentarios,
          anexos: activity.anexos,
          recorrente: activity.recorrente,
          periodicidade: activity.periodicidade,
          meses_atividade_com_mesmo_responsavel: activity.mesesAtividadeComMesmoResponsavel
        });
      if (error) throw error;
      return true;
    } catch (e: any) {
      console.warn('Error saving activity to Supabase:', e?.message || e?.details || (typeof e === 'object' ? JSON.stringify(e) : e));
      return false;
    }
  },

  async deleteActivity(activityId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_activities')
        .delete()
        .eq('id', activityId);
      return !error;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------------
  // Vacations
  // ----------------------------------------------------------------
  async getVacations(): Promise<Vacation[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('sgo_vacations')
        .select('*');
      if (error) throw error;
      return (data || []).map((v: any) => ({
        id: v.id,
        colaboradorId: v.colaborador_id,
        dataInicio: v.data_inicio,
        dataFim: v.data_fim,
        redistribuida: v.redistribuida,
        redistribuicoes: v.redistribuicoes || {}
      }));
    } catch {
      return null;
    }
  },

  async saveVacation(vacation: Vacation): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_vacations')
        .upsert({
          id: vacation.id,
          colaborador_id: vacation.colaboradorId,
          data_inicio: vacation.dataInicio,
          data_fim: vacation.dataFim,
          redistribuida: vacation.redistribuida,
          redistribuicoes: vacation.redistribuicoes
        });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteVacation(vacationId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_vacations')
        .delete()
        .eq('id', vacationId);
      return !error;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------------
  // Production Goals (Lançamentos)
  // ----------------------------------------------------------------
  async getProductionGoals(): Promise<ProductionGoal[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('sgo_production_goals')
        .select('*');
      if (error) throw error;
      return (data || []).map((g: any) => ({
        id: g.id,
        nome: g.nome,
        competencia: g.competencia,
        quantidadeTotal: g.quantidade_total,
        diasUteis: g.dias_uteis,
        participantesIds: g.participantes_ids || [],
        producaoAcumulada: g.producao_acumulada || {},
        producaHoje: g.produca_hoje || {},
        diasRestantes: g.dias_restantes,
        historicoDiario: g.historico_diario || {},
        planilhaAnexo: g.planilha_anexo,
        faturas: g.faturas
      }));
    } catch {
      return null;
    }
  },

  async saveProductionGoal(goal: ProductionGoal): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_production_goals')
        .upsert({
          id: goal.id,
          nome: goal.nome,
          competencia: goal.competencia,
          quantidade_total: goal.quantidadeTotal,
          dias_uteis: goal.diasUteis,
          participantes_ids: goal.participantesIds,
          producao_acumulada: goal.producaoAcumulada,
          produca_hoje: goal.producaHoje,
          dias_restantes: goal.diasRestantes,
          historico_diario: goal.historicoDiario,
          planilha_anexo: goal.planilhaAnexo,
          faturas: goal.faturas
        });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteProductionGoal(goalId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_production_goals')
        .delete()
        .eq('id', goalId);
      return !error;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------------
  // Procedures (Procedimentos)
  // ----------------------------------------------------------------
  async getProcedures(): Promise<Procedure[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('sgo_procedures')
        .select('*');
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        titulo: p.titulo,
        descricao: p.descricao,
        passos: p.passos || [],
        autorId: p.autor_id,
        status: p.status,
        dataSugerida: p.data_sugerida,
        pdfNome: p.pdf_nome,
        imageNome: p.image_nome
      }));
    } catch {
      return null;
    }
  },

  async saveProcedure(procedure: Procedure): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_procedures')
        .upsert({
          id: procedure.id,
          titulo: procedure.titulo,
          descricao: procedure.descricao,
          passos: procedure.passos,
          autor_id: procedure.autorId,
          status: procedure.status,
          data_sugerida: procedure.dataSugerida,
          pdf_nome: procedure.pdfNome,
          image_nome: procedure.imageNome
        });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteProcedure(procedureId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_procedures')
        .delete()
        .eq('id', procedureId);
      return !error;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------------
  // Knowledge Ratings
  // ----------------------------------------------------------------
  async getKnowledge(): Promise<KnowledgeRating[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('sgo_knowledge')
        .select('*');
      if (error) throw error;
      return (data || []).map((k: any) => ({
        colaboradorId: k.colaborador_id,
        atividadeNome: k.atividade_nome,
        nivel: k.nivel
      }));
    } catch {
      return null;
    }
  },

  async saveKnowledge(rating: KnowledgeRating): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_knowledge')
        .upsert({
          colaborador_id: rating.colaboradorId,
          atividade_nome: rating.atividadeNome,
          nivel: rating.nivel
        });
      return !error;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------------
  // Audit Logs
  // ----------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('sgo_audit_logs')
        .select('*')
        .order('data_hora', { ascending: true });
      if (error) throw error;
      return (data || []).map((log: any) => ({
        id: log.id,
        usuarioNome: log.usuario_nome,
        dataHora: log.data_hora,
        acao: log.acao,
        infoAnterior: log.info_anterior,
        infoNova: log.info_nova
      }));
    } catch {
      return null;
    }
  },

  async saveAuditLog(log: AuditLog): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_audit_logs')
        .upsert({
          id: log.id,
          usuario_nome: log.usuarioNome,
          data_hora: log.dataHora,
          acao: log.acao,
          info_anterior: log.infoAnterior,
          info_nova: log.infoNova
        });
      return !error;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------------
  // Holidays
  // ----------------------------------------------------------------
  async getHolidays(): Promise<Holiday[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('sgo_holidays')
        .select('*');
      if (error) throw error;
      return (data || []).map((h: any) => ({
        id: h.id,
        nome: h.nome,
        tipo: h.tipo,
        data: h.data
      }));
    } catch {
      return null;
    }
  },

  async saveHoliday(holiday: Holiday): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_holidays')
        .upsert({
          id: holiday.id,
          nome: holiday.nome,
          tipo: holiday.tipo,
          data: holiday.data
        });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteHoliday(holidayId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sgo_holidays')
        .delete()
        .eq('id', holidayId);
      return !error;
    } catch {
      return false;
    }
  }
};
