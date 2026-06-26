import React, { useState, useEffect } from 'react';
import { 
  Bot, LayoutDashboard, Database, CalendarRange, Target, BookOpen, Layers, 
  FileText, ShieldCheck, Sun, Moon, Sparkles, User, RefreshCw, ChevronRight, 
  BadgeAlert, Clock, LogOut, ShieldAlert, ArrowRight, UserCheck, Copy, Check, X
} from 'lucide-react';

import { 
  INITIAL_USERS, INITIAL_ACTIVITIES, INITIAL_VACATIONS, 
  INITIAL_GOALS, INITIAL_PROCEDURES, INITIAL_KNOWLEDGE, INITIAL_AUDIT_LOGS 
} from './mockData';
import { 
  User as UserType, Activity, Vacation, ProductionGoal, 
  Procedure, KnowledgeRating, AuditLog, Priority, ActivityStatus, Comment, Holiday
} from './types';

// Supabase Integration Service
import { supabaseService, isSupabaseConfigured } from './lib/supabaseService';

// Importing subcomponents
import { MetricCard, TeamProductivityGauge, MiniBarChart } from './components/Charts';
import { MondayTable } from './components/MondayTable';
import { VacationManager } from './components/VacationManager';
import { MetasTracker } from './components/MetasTracker';
import { ProceduresCenter } from './components/ProceduresCenter';
import { KnowledgeAndRisk } from './components/KnowledgeAndRisk';
import { CompetenceCloser } from './components/CompetenceCloser';
import { ReportsPanel } from './components/ReportsPanel';
import { AuditLogsPanel } from './components/AuditLogsPanel';
import { SGOAI } from './components/SGOAI';

// Brand new subcomponents
import { CollaboratorsManager } from './components/CollaboratorsManager';
import { ProductionConfig } from './components/ProductionConfig';
import { HolidaysCalendar } from './components/HolidaysCalendar';
import { IntelligentRotation } from './components/IntelligentRotation';
import { InterimPanel } from './components/InterimPanel';
import { ExecucaoDia } from './components/ExecucaoDia';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordScreen } from './components/ChangePasswordScreen';
import { COMPETENCIAS_LIST, getTodayFormatted, adjustLimitDateForCompetence } from './utils/competencias';

export default function App() {
  // -----------------------------------------
  // Supabase Sync States & Helpers
  // -----------------------------------------
  const isSyncingFromSupabase = React.useRef(false);
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'success' | 'error' | 'offline'>(
    isSupabaseConfigured ? 'idle' : 'offline'
  );
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  const loadAllSupabaseData = async () => {
    if (!isSupabaseConfigured) {
      setSupabaseStatus('offline');
      return;
    }
    setSupabaseLoading(true);
    setSupabaseStatus('idle');
    try {
      // Set to true immediately during initial load to prevent immediate auto-saves from firing
      isSyncingFromSupabase.current = true;

      const [
        dbUsers,
        dbActivities,
        dbVacations,
        dbGoals,
        dbProcedures,
        dbKnowledge,
        dbLogs,
        dbHolidays,
        dbCompetencia,
        dbSimDate
      ] = await Promise.all([
        supabaseService.getUsers(),
        supabaseService.getActivities(),
        supabaseService.getVacations(),
        supabaseService.getProductionGoals(),
        supabaseService.getProcedures(),
        supabaseService.getKnowledge(),
        supabaseService.getAuditLogs(),
        supabaseService.getHolidays(),
        supabaseService.getSetting('competencia', ''),
        supabaseService.getSetting('simulated_date', '')
      ]);

      const isConnectionWorking = (
        dbUsers !== null &&
        dbActivities !== null &&
        dbVacations !== null &&
        dbGoals !== null &&
        dbProcedures !== null &&
        dbKnowledge !== null &&
        dbHolidays !== null
      );

      if (isConnectionWorking) {
        setSupabaseStatus('success');
        
        // If the remote database has no users and no activities, seed it with the local state!
        if (dbUsers.length === 0 && dbActivities.length === 0) {
          console.log('Remote Supabase is empty. Seeding local state to cloud...');
          if (competencia) supabaseService.saveSetting('competencia', competencia);
          if (currentSimulatedDate) supabaseService.saveSetting('simulated_date', currentSimulatedDate);
          users.forEach(u => supabaseService.saveUser(u));
          activities.forEach(a => supabaseService.saveActivity(a));
          vacations.forEach(v => supabaseService.saveVacation(v));
          productionGoals.forEach(g => supabaseService.saveProductionGoal(g));
          procedures.forEach(p => supabaseService.saveProcedure(p));
          knowledge.forEach(k => supabaseService.saveKnowledge(k));
          holidays.forEach(h => supabaseService.saveHoliday(h));
        } else {
          // Otherwise, populate application state with remote data
          if (dbUsers.length > 0) setUsers(dbUsers);
          if (dbActivities.length > 0) setActivities(dbActivities);
          if (dbVacations.length > 0) setVacations(dbVacations);
          if (dbGoals.length > 0) setProductionGoals(dbGoals);
          if (dbProcedures.length > 0) setProcedures(dbProcedures);
          if (dbKnowledge.length > 0) setKnowledge(dbKnowledge);
          if (dbLogs && dbLogs.length > 0) setAuditLogs(dbLogs);
          if (dbHolidays.length > 0) setHolidays(dbHolidays);
          if (dbCompetencia) setCompetencia(dbCompetencia);
          if (dbSimDate) setCurrentSimulatedDate(dbSimDate);
        }
      } else {
        setSupabaseStatus('error');
      }

      setTimeout(() => {
        isSyncingFromSupabase.current = false;
      }, 800);
    } catch (e) {
      console.warn('Error loading data from Supabase:', e);
      setSupabaseStatus('error');
      isSyncingFromSupabase.current = false;
    } finally {
      setSupabaseLoading(false);
    }
  };

  useEffect(() => {
    loadAllSupabaseData();
  }, []);

  // -----------------------------------------
  // Core Operational States
  // -----------------------------------------
  const [competencia, setCompetencia] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sgo_competencia');
      return saved || 'Junho/2026';
    } catch {
      return 'Junho/2026';
    }
  });
  const [users, setUsers] = useState<UserType[]>(() => {
    try {
      const saved = localStorage.getItem('sgo_users');
      const parsed = saved ? JSON.parse(saved) : INITIAL_USERS;
      
      // Merge missing initial users (like Leandro) into the existing structure by email
      const merged = [...parsed];
      INITIAL_USERS.forEach(initialUser => {
        const exists = parsed.some((u: any) => u.email.trim().toLowerCase() === initialUser.email.trim().toLowerCase());
        if (!exists) {
          merged.push(initialUser);
        }
      });

      // Deduplicate unique by BOTH email and id
      const uniqueUsers: any[] = [];
      const seenEmails = new Set<string>();
      const seenIds = new Set<string>();
      
      merged.forEach((u: any) => {
        const emailKey = u.email ? u.email.trim().toLowerCase() : '';
        const idKey = u.id ? u.id.trim().toLowerCase() : '';
        if (emailKey && idKey && !seenEmails.has(emailKey) && !seenIds.has(idKey)) {
          seenEmails.add(emailKey);
          seenIds.add(idKey);
          uniqueUsers.push(u);
        }
      });

      // Guarantee everyone has a password, and explicitly enforce Leandro's non-Admin role
      const finalCleaned = uniqueUsers.map((u: any) => {
        let updated = { ...u, senha: u.senha || '123' };
        if (updated.email.trim().toLowerCase() === 'leandro.menezes@asfeb.org.br') {
          updated.role = 'Colaborador';
          updated.funcao = 'ANALISTA PLENO';
        }
        return updated;
      });

      // Heal localStorage immediately
      localStorage.setItem('sgo_users', JSON.stringify(finalCleaned));
      return finalCleaned;
    } catch {
      const fallback = INITIAL_USERS.map(u => ({ ...u, senha: u.senha || '123' }));
      try { localStorage.setItem('sgo_users', JSON.stringify(fallback)); } catch {}
      return fallback;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem('sgo_is_authenticated');
      return savedAuth === 'true';
    } catch {
      return false;
    }
  });

  const [activeUser, setActiveUser] = useState<UserType | null>(() => {
    try {
      const savedActive = localStorage.getItem('sgo_active_user');
      const savedUsers = localStorage.getItem('sgo_users');
      const rawUsers = savedUsers 
        ? JSON.parse(savedUsers).map((u: any) => ({ ...u, senha: u.senha || '123' })) 
        : INITIAL_USERS.map(u => ({ ...u, senha: u.senha || '123' }));
      
      const uniqueUsers: any[] = [];
      const seenEmails = new Set<string>();
      const seenIds = new Set<string>();
      
      rawUsers.forEach((u: any) => {
        const emailKey = u.email ? u.email.trim().toLowerCase() : '';
        const idKey = u.id ? u.id.trim().toLowerCase() : '';
        if (emailKey && idKey && !seenEmails.has(emailKey) && !seenIds.has(idKey)) {
          seenEmails.add(emailKey);
          seenIds.add(idKey);
          uniqueUsers.push(u);
        }
      });

      const currentUsers = uniqueUsers.map((u: any) => {
        if (u.email.trim().toLowerCase() === 'leandro.menezes@asfeb.org.br') {
          u.role = 'Colaborador';
          u.funcao = 'ANALISTA PLENO';
        }
        return u;
      });
      
      const savedAuth = localStorage.getItem('sgo_is_authenticated');
      const isAuth = savedAuth === 'true';

      if (savedActive && isAuth) {
        const parsedActive = JSON.parse(savedActive);
        const found = currentUsers.find((u: any) => u.id === parsedActive.id);
        if (found) return found;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('sgo_activities');
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
    } catch {
      return INITIAL_ACTIVITIES;
    }
  });
  const [vacations, setVacations] = useState<Vacation[]>(() => {
    try {
      const saved = localStorage.getItem('sgo_vacations');
      return saved ? JSON.parse(saved) : INITIAL_VACATIONS;
    } catch {
      return INITIAL_VACATIONS;
    }
  });
  const [productionGoals, setProductionGoals] = useState<ProductionGoal[]>(() => {
    try {
      const saved = localStorage.getItem('sgo_goals');
      return saved ? JSON.parse(saved) : INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  });
  const [procedures, setProcedures] = useState<Procedure[]>(() => {
    try {
      const saved = localStorage.getItem('sgo_procedures');
      return saved ? JSON.parse(saved) : INITIAL_PROCEDURES;
    } catch {
      return INITIAL_PROCEDURES;
    }
  });
  const [knowledge, setKnowledge] = useState<KnowledgeRating[]>(() => {
    try {
      const saved = localStorage.getItem('sgo_knowledge');
      return saved ? JSON.parse(saved) : INITIAL_KNOWLEDGE;
    } catch {
      return INITIAL_KNOWLEDGE;
    }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('sgo_audit_logs');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });
  
  // Real calendar list & simulated dates (Item 3, 5)
  const [currentSimulatedDate, setCurrentSimulatedDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sgo_simulated_date');
      if (saved && saved !== '2026-06-03') return saved;
      return getTodayFormatted();
    } catch {
      return getTodayFormatted();
    }
  });
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    try {
      const saved = localStorage.getItem('sgo_holidays');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'h-1', nome: 'Ano Novo', tipo: 'Nacional', data: '2026-01-01' },
      { id: 'h-2', nome: 'Carnaval', tipo: 'Nacional', data: '2026-02-17' },
      { id: 'h-3', nome: 'Sexta-feira Santa', tipo: 'Nacional', data: '2026-04-03' },
      { id: 'h-4', nome: 'Tiradentes', tipo: 'Nacional', data: '2026-04-21' },
      { id: 'h-5', nome: 'Dia do Trabalho', tipo: 'Nacional', data: '2026-05-01' },
      { id: 'h-6', nome: 'Corpus Christi', tipo: 'Nacional', data: '2026-06-04' },
      { id: 'h-7', nome: 'Independência do Brasil', tipo: 'Nacional', data: '2026-09-07' },
      { id: 'h-8', nome: 'Nossa Sra. Aparecida', tipo: 'Nacional', data: '2026-10-12' },
      { id: 'h-9', nome: 'Finados', tipo: 'Nacional', data: '2026-11-02' },
      { id: 'h-10', nome: 'Proclamação da República', tipo: 'Nacional', data: '2026-11-15' },
      { id: 'h-11', nome: 'Dia da Consciência Negra', tipo: 'Nacional', data: '2026-11-20' },
      { id: 'h-12', nome: 'Natal', tipo: 'Nacional', data: '2026-12-25' }
    ];
  });

  // Navigation & View controls
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [themeMode, setThemeMode] = useState<'claro' | 'escuro'>('claro');
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(false);
  const [isInterinoMode, setIsInterinoMode] = useState<boolean>(false);

  // Load theme preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('sgo_theme');
    if (saved === 'dark') {
      setThemeMode('escuro');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = themeMode === 'claro' ? 'escuro' : 'claro';
    setThemeMode(newTheme);
    localStorage.setItem('sgo_theme', newTheme === 'escuro' ? 'dark' : 'light');
  };

  // -----------------------------------------
  // Automatic Persistence Effects
  // -----------------------------------------
  useEffect(() => {
    localStorage.setItem('sgo_competencia', competencia);
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      supabaseService.saveSetting('competencia', competencia);
    }
  }, [competencia]);

  useEffect(() => {
    localStorage.setItem('sgo_users', JSON.stringify(users));
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      users.forEach(u => {
        supabaseService.saveUser(u);
      });
    }
  }, [users]);

  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('sgo_active_user', JSON.stringify(activeUser));
    } else {
      localStorage.removeItem('sgo_active_user');
    }
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem('sgo_activities', JSON.stringify(activities));
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      activities.forEach(a => {
        supabaseService.saveActivity(a);
      });
    }
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('sgo_vacations', JSON.stringify(vacations));
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      vacations.forEach(v => {
        supabaseService.saveVacation(v);
      });
    }
  }, [vacations]);

  useEffect(() => {
    localStorage.setItem('sgo_goals', JSON.stringify(productionGoals));
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      productionGoals.forEach(g => {
        supabaseService.saveProductionGoal(g);
      });
    }
  }, [productionGoals]);

  useEffect(() => {
    localStorage.setItem('sgo_procedures', JSON.stringify(procedures));
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      procedures.forEach(p => {
        supabaseService.saveProcedure(p);
      });
    }
  }, [procedures]);

  useEffect(() => {
    localStorage.setItem('sgo_knowledge', JSON.stringify(knowledge));
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      knowledge.forEach(k => {
        supabaseService.saveKnowledge(k);
      });
    }
  }, [knowledge]);

  useEffect(() => {
    localStorage.setItem('sgo_audit_logs', JSON.stringify(auditLogs));
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current && auditLogs.length > 0) {
      supabaseService.saveAuditLog(auditLogs[auditLogs.length - 1]);
    }
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('sgo_simulated_date', currentSimulatedDate);
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      supabaseService.saveSetting('simulated_date', currentSimulatedDate);
    }
  }, [currentSimulatedDate]);

  useEffect(() => {
    localStorage.setItem('sgo_holidays', JSON.stringify(holidays));
    if (isSupabaseConfigured && supabaseStatus === 'success' && !isSyncingFromSupabase.current) {
      holidays.forEach(h => {
        supabaseService.saveHoliday(h);
      });
    }
  }, [holidays]);

  // Helper to add audit logs
  const logEvent = (actionName: string, prev?: string, next?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      usuarioNome: activeUser?.nome || 'Sistema',
      dataHora: new Date().toISOString().replace('T', ' ').substring(0, 16),
      acao: actionName,
      infoAnterior: prev,
      infoNova: next
    };
    setAuditLogs(prevLogs => [...prevLogs, newLog]);
  };

  // -----------------------------------------
  // Handlers: Authentication & Security
  // -----------------------------------------
  const handleLogin = (user: UserType) => {
    setActiveUser(user);
    const hasTempPassword = (user.senha || '123') === '123';
    if (!hasTempPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('sgo_is_authenticated', 'true');
    }
  };

  const handleChangePassword = (newPw: string) => {
    if (!activeUser) return;
    
    // Update the user's password in users state
    const updatedUsers = users.map(u => u.id === activeUser.id ? { ...u, senha: newPw } : u);
    setUsers(updatedUsers);
    localStorage.setItem('sgo_users', JSON.stringify(updatedUsers));

    // Update activeUser state
    const updatedActive = { ...activeUser, senha: newPw };
    setActiveUser(updatedActive);
    localStorage.setItem('sgo_active_user', JSON.stringify(updatedActive));
    
    // Now they are authenticated!
    setIsAuthenticated(true);
    localStorage.setItem('sgo_is_authenticated', 'true');

    logEvent('Troca de Senha Efetuada', 'Senha Temporária', 'Nova Senha Registrada');
  };

  const handleLogout = () => {
    logEvent('Logout', activeUser?.nome || 'Operador', 'Sessão encerrada pelo usuário');
    setIsAuthenticated(false);
    setActiveUser(null);
    localStorage.removeItem('sgo_is_authenticated');
    localStorage.removeItem('sgo_active_user');
  };

  // -----------------------------------------
  // Handlers: Activity Management
  // -----------------------------------------
  const handleUpdateActivity = (actId: string, updatedFields: Partial<Activity>) => {
    const original = activities.find(a => a.id === actId);
    if (!original) return;

    // Log detail depending on what changes
    if (updatedFields.prioridade) {
      logEvent(`Alteração de Prioridade (${original.nome})`, original.prioridade, updatedFields.prioridade);
    }
    if (updatedFields.status) {
      logEvent(`Alteração de Status (${original.nome})`, original.status, updatedFields.status);
    }

    setActivities(prev => prev.map(a => {
      if (a.id === actId) {
        return { ...a, ...updatedFields };
      }
      return a;
    }));
  };

  const handleDeleteActivity = (actId: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act) return;
    logEvent(`Remoção de Atividade`, `Atividade: ${act.nome}`, 'Excluída permanentemente');
    setActivities(prev => prev.filter(a => a.id !== actId));
    if (isSupabaseConfigured) {
      supabaseService.deleteActivity(actId);
    }
  };

  const handleCreateActivity = (newAct: Omit<Activity, 'id' | 'comentarios' | 'anexos'>) => {
    const baseId = Date.now();
    
    // 1. Create the primary activity
    const actObj: Activity = {
      ...newAct,
      id: `act-${baseId}`,
      comentarios: [],
      anexos: []
    };
    
    const additionalClonings: Activity[] = [];
    
    // 2. If it is recurrent, generate automatically for all future competencies
    if (newAct.recorrente) {
      const startIndex = COMPETENCIAS_LIST.indexOf(newAct.competencia);
      if (startIndex !== -1) {
        const remainingCompetencies = COMPETENCIAS_LIST.slice(startIndex + 1);
        remainingCompetencies.forEach((nextComp, idx) => {
          const adjustedDate = adjustLimitDateForCompetence(newAct.dataLimite, nextComp);
          additionalClonings.push({
            ...newAct,
            id: `act-${baseId}-future-${idx}`,
            competencia: nextComp,
            dataLimite: adjustedDate,
            comentarios: [],
            anexos: [],
            status: 'Pendente' as ActivityStatus
          });
        });
      }
    }
    
    const respName = users.find(u => u.id === newAct.responsavelAtualId)?.nome || 'Sem Responsável';
    logEvent(
      `Atividade Criada`, 
      'Nenhuma', 
      `${newAct.nome} - Responsável: ${respName}${newAct.recorrente ? ' (Recorrências geradas automaticamente para competências futuras)' : ''}`
    );
    
    setActivities(prev => [...prev, actObj, ...additionalClonings]);
  };

  const handleAddComment = (actId: string, text: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act) return;

    const newComment: Comment = {
      id: `com-${Date.now()}`,
      autorId: activeUser?.id || 'anon',
      autorNome: activeUser?.nome || 'Operador',
      texto: text,
      dataHora: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setActivities(prev => prev.map(a => {
      if (a.id === actId) {
        return { ...a, comentarios: [...a.comentarios, newComment] };
      }
      return a;
    }));
    logEvent(`Comentário Adicionado`, undefined, `Novo comentário na atividade ${act.nome}`);
  };

  const handleAddAttachment = (actId: string, file: File) => {
    const act = activities.find(a => a.id === actId);
    if (!act) return;

    // Create a client-side Object URL to represent the exact same file for download
    const fileUrl = URL.createObjectURL(file);
    const newAttachment = {
      id: `att-${Date.now()}`,
      nome: file.name,
      tamanho: file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(1)} KB`,
      mimeType: file.type || 'application/octet-stream',
      url: fileUrl
    };

    setActivities(prev => prev.map(a => {
      if (a.id === actId) {
        return { ...a, anexos: [...a.anexos, newAttachment] };
      }
      return a;
    }));
    logEvent(`Documento Anexado`, undefined, `Arquivo ${file.name} vinculado na rotina ${act.nome}`);
  };

  // -----------------------------------------
  // Handlers: Vacations & Redistribution
  // -----------------------------------------
  const handleAddVacation = (newVac: Omit<Vacation, 'id' | 'redistribuida' | 'redistribuicoes'>) => {
    const vacObj: Vacation = {
      ...newVac,
      id: `vac-${Date.now()}`,
      redistribuida: false,
      redistribuicoes: {}
    };
    const colab = users.find(u => u.id === newVac.colaboradorId);
    logEvent(`Férias Agendadas`, undefined, `${colab?.nome} de ${newVac.dataInicio} a ${newVac.dataFim}`);
    setVacations(prev => [...prev, vacObj]);
  };

  const handleRedistributeVacation = (vacationId: string, mapping: { [actId: string]: string }) => {
    const vac = vacations.find(v => v.id === vacationId);
    if (!vac) return;

    const colab = users.find(u => u.id === vac.colaboradorId);

    // Apply mappings to active activities
    setActivities(prevActs => prevActs.map(a => {
      if (mapping[a.id]) {
        return { ...a, responsavelAtualId: mapping[a.id] };
      }
      return a;
    }));

    // Save allocation indices on vacation state
    setVacations(prev => prev.map(v => {
      if (v.id === vacationId) {
        return { ...v, redistribuida: true, redistribuicoes: mapping };
      }
      return v;
    }));

    // Log entries
    Object.entries(mapping).forEach(([actId, subId]) => {
      const act = activities.find(a => a.id === actId);
      const sub = users.find(u => u.id === subId);
      logEvent(
        `Redistribuição de Atividade`, 
        `Original: ${colab?.nome}`, 
        `${colab?.nome} alterou responsável da atividade ${act?.nome} para ${sub?.nome}`
      );
    });
  };

  const handleFinishVacation = (vacationId: string) => {
    const vac = vacations.find(v => v.id === vacationId);
    if (!vac) return;

    // Revert assignees
    setActivities(prevActs => prevActs.map(a => {
      if (vac.redistribuicoes[a.id]) {
        return { ...a, responsavelAtualId: a.responsavelOriginalId };
      }
      return a;
    }));

    const colab = users.find(u => u.id === vac.colaboradorId);
    logEvent(
      `Férias Concluídas (Retorno)`, 
      `Substituições Finalizadas`, 
      `Atividades operacionais retornadas automaticamente para ${colab?.nome}`
    );

    // Remove or reset vacation
    setVacations(prev => prev.filter(v => v.id !== vacationId));
    if (isSupabaseConfigured) {
      supabaseService.deleteVacation(vacationId);
    }
  };

  const handleCancelVacation = (vacationId: string) => {
    const vac = vacations.find(v => v.id === vacationId);
    if (!vac) return;

    // Revert assignees if it was already redistributed
    if (vac.redistribuida) {
      setActivities(prevActs => prevActs.map(a => {
        if (vac.redistribuicoes[a.id]) {
          return { ...a, responsavelAtualId: a.responsavelOriginalId };
        }
        return a;
      }));
    }

    const colab = users.find(u => u.id === vac.colaboradorId);
    logEvent(
      `Férias Canceladas`, 
      `Período: ${vac.dataInicio} a ${vac.dataFim}`, 
      `Férias de ${colab?.nome} canceladas. Atividades operacionais reestabelecidas.`
    );

    // Remove vacation
    setVacations(prev => prev.filter(v => v.id !== vacationId));
    if (isSupabaseConfigured) {
      supabaseService.deleteVacation(vacationId);
    }
  };

  // -----------------------------------------
  // Handlers: Production Metrics & Goals
  // -----------------------------------------
  const handleUpdateGoalTodayProduction = (goalId: string, collaboratorId: string, qty: number) => {
    setProductionGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          producaHoje: {
            ...g.producaHoje,
            [collaboratorId]: qty
          }
        };
      }
      return g;
    }));

    const userObj = users.find(u => u.id === collaboratorId);
    logEvent(`Lançamento de Faturamento`, undefined, `${userObj?.nome} produziu ${qty} unidades hoje`);
  };

  const handleUpdateInvoiceStatus = (goalId: string, numFatura: string, newStatus: 'Pendente' | 'Concluída') => {
    setProductionGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const updatedFaturas = (g.faturas || []).map(f => {
          if (f.numFatura === numFatura) {
            return { ...f, status: newStatus };
          }
          return f;
        });

        const targetInvoice = (g.faturas || []).find(f => f.numFatura === numFatura);
        if (targetInvoice) {
          const colabId = targetInvoice.responsavelId;
          const completedInvoicesCount = updatedFaturas.filter(
            f => f.responsavelId === colabId && f.status === 'Concluída'
          ).length;

          const updatedProducaHoje = {
            ...g.producaHoje,
            [colabId]: completedInvoicesCount
          };

          return {
            ...g,
            faturas: updatedFaturas,
            producaHoje: updatedProducaHoje
          };
        }

        return {
          ...g,
          faturas: updatedFaturas
        };
      }
      return g;
    }));

    logEvent(`Status da Fatura Atualizado`, undefined, `Fatura ${numFatura} alterada para ${newStatus}`);
  };

  const getNextBusinessDay = (dateStr: string, holidaysList: Holiday[]): string => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const curr = new Date(year, month, day);
    curr.setDate(curr.getDate() + 1);
    
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleResetSimulatedDate = () => {
    const today = getTodayFormatted();
    setCurrentSimulatedDate(today);
  };

  const handleAdvanceGoalDay = (goalId: string) => {
    // 1. Advance the simulated date first!
    const nextDate = getNextBusinessDay(currentSimulatedDate, holidays);
    setCurrentSimulatedDate(nextDate);

    setProductionGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        // Carry today's input over into cumulative summary, decrementing days remaining
        const nextCumulative = { ...g.producaoAcumulada };
        let anyMissed = false;
        
        // Dynamic daily target in the advanced day context
        const totalCompletedYesterday = Object.keys(g.producaoAcumulada).reduce((s: number, pId: string) => s + (g.producaoAcumulada[pId] || 0), 0);
        const remToTarget = Math.max(0, g.quantidadeTotal - totalCompletedYesterday);
        const activeTarget = g.diasRestantes > 0 ? (remToTarget / g.diasRestantes / g.participantesIds.length) : 0;

        g.participantesIds.forEach(pId => {
          const processedToday = g.producaHoje[pId] || 0;
          nextCumulative[pId] = (nextCumulative[pId] || 0) + processedToday;
          
          if (processedToday < activeTarget) {
            anyMissed = true;
          }
        });

        // Store history snapshot
        const updatedHistory = {
          ...g.historicoDiario,
          [currentSimulatedDate]: { ...g.producaHoje }
        };

        const nextDaysRemaining = Math.max(0, g.diasRestantes - 1);

        // Auto recalculation logic logged
        if (anyMissed) {
          logEvent(
            `Mudança de Expediente (Recálculo Executado)`, 
            `Expediente avançado para ${nextDate.split('-').reverse().join('/')}`, 
            `Metas não alcançadas detectadas. Novas metas recalculadas sobre ${nextDaysRemaining} dias de expediente.`
          );
        } else {
          logEvent(`Mudança de Expediente`, undefined, `Expediente avançado para ${nextDate.split('-').reverse().join('/')} com 100% de compliance diário da equipe!`);
        }

        return {
          ...g,
          producaoAcumulada: nextCumulative,
          producaHoje: {}, // Reset daily input map
          diasRestantes: nextDaysRemaining,
          historicoDiario: updatedHistory
        };
      }
      return g;
    }));
  };

  // -----------------------------------------
  // Handlers: Collaborators, Holidays, Rotation & Manual Adjustments (Item 1, 2, 3, 4)
  // -----------------------------------------
  const handleAddUser = (newUser: Omit<UserType, 'id'>) => {
    const uObj: UserType = {
      ...newUser,
      id: `user-${Date.now()}`
    };
    setUsers(prev => [...prev, uObj]);
    logEvent(`Colaborador Cadastrado`, 'Nenhum', newUser.nome);
  };

  const handleEditUser = (userId: string, updatedFields: Partial<UserType>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatedFields } : u));
    const originalUser = users.find(u => u.id === userId);
    logEvent(`Colaborador Editado (${originalUser?.nome})`, JSON.stringify(originalUser), JSON.stringify(updatedFields));
    
    // Alinhar activeUser se editado o próprio perfil ativo
    if (activeUser && activeUser.id === userId) {
      setActiveUser(prev => prev ? { ...prev, ...updatedFields } : null);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const originalUser = users.find(u => u.id === userId);
    setUsers(prev => {
      const remaining = prev.filter(u => u.id !== userId);
      // Alinhar activeUser se excluído o próprio perfil ativo
      if (activeUser && activeUser.id === userId) {
        if (remaining.length > 0) {
          setActiveUser(remaining[0]);
        } else {
          setActiveUser(null);
        }
      }
      return remaining;
    });
    logEvent(`Colaborador Excluído`, originalUser?.nome, 'Removido permanentemente');
    if (isSupabaseConfigured) {
      supabaseService.deleteUser(userId);
    }
  };

  const handleResetPassword = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, senha: '123' } : u));
    const originalUser = users.find(u => u.id === userId);
    logEvent(`Resetar Senha`, originalUser?.nome, 'Senha resetada para 123');
    
    if (activeUser && activeUser.id === userId) {
      setActiveUser(prev => prev ? { ...prev, senha: '123' } : null);
    }
  };

  const handleAddHoliday = (newHol: Omit<Holiday, 'id'>) => {
    const hObj: Holiday = {
      ...newHol,
      id: `holiday-${Date.now()}`
    };
    setHolidays(prev => [...prev, hObj]);
    logEvent(`Feriado Cadastrado`, 'Nenhum', `${newHol.nome} em ${newHol.data}`);
  };

  const handleDeleteHoliday = (holidayId: string) => {
    const originalHoliday = holidays.find(h => h.id === holidayId);
    setHolidays(prev => prev.filter(h => h.id !== holidayId));
    logEvent(`Feriado Excluído`, originalHoliday?.nome, 'Removido permanentemente');
    if (isSupabaseConfigured) {
      supabaseService.deleteHoliday(holidayId);
    }
  };

  const handleAddGoal = (newGoal: Omit<ProductionGoal, 'id' | 'producaoAcumulada' | 'producaHoje' | 'diasRestantes' | 'historicoDiario'>) => {
    setProductionGoals(prev => {
      const existingIndex = prev.findIndex(g => g.nome === newGoal.nome && g.competencia === newGoal.competencia);
      
      if (existingIndex !== -1) {
        // INCREMENTAL IMPORT OR PLAN UPDATE
        const existingGoal = prev[existingIndex];
        const existingFaturas = existingGoal.faturas || [];
        const importedFaturas = newGoal.faturas || [];
        
        let lidasCount = importedFaturas.length;
        let ignoradasCount = 0;
        let novasCount = 0;
        
        const mergedFaturas = [...existingFaturas];
        importedFaturas.forEach(f => {
          const alreadyExists = existingFaturas.some(old => old.numFatura === f.numFatura);
          if (alreadyExists) {
            ignoradasCount++;
          } else {
            novasCount++;
            mergedFaturas.push(f);
          }
        });

        // Update participants stats
        const prodAcum = { ...existingGoal.producaoAcumulada };
        const prodHoje = { ...existingGoal.producaHoje };
        newGoal.participantesIds.forEach(pId => {
          if (prodAcum[pId] === undefined) {
             prodAcum[pId] = 0;
          }
          if (prodHoje[pId] === undefined) {
             prodHoje[pId] = 0;
          }
        });

        const updatedGoal: ProductionGoal = {
          ...existingGoal,
          quantidadeTotal: newGoal.quantidadeTotal,
          diasUteis: newGoal.diasUteis,
          participantesIds: newGoal.participantesIds,
          planilhaAnexo: newGoal.planilhaAnexo || existingGoal.planilhaAnexo,
          faturas: mergedFaturas,
          producaoAcumulada: prodAcum,
          producaHoje: prodHoje,
        };

        const list = [...prev];
        list[existingIndex] = updatedGoal;
        
        if (importedFaturas.length > 0) {
          logEvent(
            `Importação de Faturas`, 
            `Lote: Lidas: ${lidasCount}, Ignoradas (já existentes): ${ignoradasCount}`,
            `Adicionadas: ${novasCount}, Participantes: ${newGoal.participantesIds.length}`
          );
        } else {
          logEvent(`Planejamento de Produção Atualizado`, existingGoal.nome, `${newGoal.nome} para competência ${newGoal.competencia}`);
        }

        return list;
      } else {
        // NEW PLAN CREATION
        const prodAcum: { [pId: string]: number } = {};
        const prodHoje: { [pId: string]: number } = {};
        newGoal.participantesIds.forEach(pId => {
          prodAcum[pId] = 0;
          prodHoje[pId] = 0;
        });

        const goalObj: ProductionGoal = {
          ...newGoal,
          id: `goal-${Date.now()}`,
          producaoAcumulada: prodAcum,
          producaHoje: prodHoje,
          diasRestantes: newGoal.diasUteis,
          historicoDiario: {}
        };

        if (newGoal.faturas && newGoal.faturas.length > 0) {
          const lidas = newGoal.faturas.length;
          const consultas = newGoal.faturas.filter(x => x.responsavelId === 'COORDENACAO').length;
          const dist = lidas - consultas;
          logEvent(
            `Importação de Faturas`, 
            'Novo Planejamento', 
            `Lidas: ${lidas}, Consultas Purificadas: ${consultas}, Atribuídas: ${dist} para ${newGoal.participantesIds.length} colaboradores`
          );
        } else {
          logEvent(`Planejamento de Produção Ativado`, 'Nenhum', `${newGoal.nome} para competência ${newGoal.competencia}`);
        }

        return [goalObj, ...prev];
      }
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    const originalGoal = productionGoals.find(g => g.id === goalId);
    setProductionGoals(prev => prev.filter(g => g.id !== goalId));
    logEvent(`Lote de Metas Excluído`, originalGoal?.nome || 'Nenhum', `Exclusão do lote da competência ${originalGoal?.competencia}`);
    if (isSupabaseConfigured) {
      supabaseService.deleteProductionGoal(goalId);
    }
  };

  const handleAdjustProduction = (goalId: string, dateStr: string, collaboratorId: string, qty: number) => {
    setProductionGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const prevQty = g.historicoDiario[dateStr]?.[collaboratorId] ?? g.producaHoje[collaboratorId] ?? 0;
        const diff = qty - prevQty;

        if (dateStr === currentSimulatedDate) {
          return {
            ...g,
            producaHoje: {
              ...g.producaHoje,
              [collaboratorId]: qty
            }
          };
        } else {
          const updatedHistory = { ...g.historicoDiario };
          if (!updatedHistory[dateStr]) updatedHistory[dateStr] = {};
          updatedHistory[dateStr] = {
            ...updatedHistory[dateStr],
            [collaboratorId]: qty
          };

          const updatedAcumulada = { ...g.producaoAcumulada };
          updatedAcumulada[collaboratorId] = (updatedAcumulada[collaboratorId] || 0) + diff;

          return {
            ...g,
            historicoDiario: updatedHistory,
            producaoAcumulada: updatedAcumulada
          };
        }
      }
      return g;
    }));

    const colabObj = users.find(u => u.id === collaboratorId);
    logEvent(
      `Ajuste de Produção Manual`,
      `Operador: ${colabObj?.nome} no expediente de ${dateStr.split('-').reverse().join('/')}`,
      `Volume alterado de ${g => g.historicoDiario[dateStr]?.[collaboratorId]} para ${qty} faturas`
    );
  };

  const handleUpdateActivityResponsible = (activityId: string, newREsponsibleId: string) => {
    setActivities(prev => prev.map(a => {
      if (a.id === activityId) {
        return {
          ...a,
          responsavelAtualId: newREsponsibleId,
          mesesAtividadeComMesmoResponsavel: 1 // reset monopoly months
        };
      }
      return a;
    }));
  };

  // -----------------------------------------
  // Handlers: Suggestions, Matrix & Competence End
  // -----------------------------------------
  const handleSuggestProcedure = (newProc: Omit<Procedure, 'id' | 'status' | 'dataSugerida'>) => {
    const procObj: Procedure = {
      ...newProc,
      id: `proc-${Date.now()}`,
      status: 'Sugerido',
      dataSugerida: new Date().toISOString().substring(0, 10)
    };
    logEvent(`Procedimento Sugerido`, undefined, `Rotina sugerida: ${newProc.titulo}`);
    setProcedures(prev => [...prev, procObj]);
  };

  const handleApproveProcedure = (procId: string) => {
    const proc = procedures.find(p => p.id === procId);
    if (!proc) return;

    setProcedures(prev => prev.map(p => {
      if (p.id === procId) {
        return { ...p, status: 'Aprovado' };
      }
      return p;
    }));
    logEvent(`Procedimento Aprovado`, `Sugerido por Executor`, `Rotina "${proc.titulo}" homologada por ${activeUser?.nome}`);
  };

  const handleDeleteProcedure = (procId: string) => {
    const proc = procedures.find(p => p.id === procId);
    if (!proc) return;
    setProcedures(prev => prev.filter(p => p.id !== procId));
    logEvent(`Procedimento Excluído`, proc.titulo, `Removido por ${activeUser?.nome}`);
    if (isSupabaseConfigured) {
      supabaseService.deleteProcedure(procId);
    }
  };

  const handleEditProcedure = (procId: string, updatedFields: Partial<Procedure>) => {
    const proc = procedures.find(p => p.id === procId);
    if (!proc) return;
    setProcedures(prev => prev.map(p => {
      if (p.id === procId) {
        return { ...p, ...updatedFields };
      }
      return p;
    }));
    logEvent(`Procedimento Editado`, proc.titulo, `Alterado por ${activeUser?.nome}`);
  };

  const handleUpdateKnowledge = (colabId: string, actName: string, level: number) => {
    setKnowledge(prev => {
      const exists = prev.some(k => k.colaboradorId === colabId && k.atividadeNome === actName);
      if (exists) {
        return prev.map(k => {
          if (k.colaboradorId === colabId && k.atividadeNome === actName) {
            return { ...k, nivel: level as any };
          }
          return k;
        });
      } else {
        return [...prev, { colaboradorId: colabId, atividadeNome: actName, nivel: level as any }];
      }
    });

    const userObj = users.find(u => u.id === colabId);
    logEvent(`Matriz Atualizada`, undefined, `Alterado domínio de ${userObj?.nome} em "${actName}" para Nível ${level}`);
  };

  const handleCloseCompetence = (justification?: string) => {
    // Audit log integration
    const details = justification 
      ? `FECHAMENTO COM OVERRIDE. Justificativa: ${justification}` 
      : `Fechamento regulamentar concluído sem intercorrências.`;
    
    logEvent(
      `Estágio Operacional Finalizado`, 
      `Competência Ativa: ${competencia}`, 
      `${details}. Próxima competência iniciada.`
    );

    // Compute transition to next month
    const parts = competencia.split('/');
    const currentMonthName = parts[0]; // e.g. Junho
    const year = parts[1]; // 2026

    let nextMonth = 'Julho/2026';
    if (currentMonthName === 'Junho') nextMonth = 'Julho/2026';
    else if (currentMonthName === 'Julho') nextMonth = 'Agosto/2026';
    else nextMonth = 'Setembro/2026';

    setCompetencia(nextMonth);
    
    // Automatically replicate/clone RECURRENT tasks to the newly created month
    setActivities(prevActs => {
      // Find recurrent tasks in the closing competence
      const recurrentInCurrent = prevActs.filter(a => a.recorrente && a.competencia === competencia);
      
      const cloned: Activity[] = [];
      recurrentInCurrent.forEach(r => {
        // Only clone if an activity with the same name doesn't already exist in the target competence
        const exists = prevActs.some(a => a.nome === r.nome && a.competencia === nextMonth);
        if (!exists) {
          const adjustedDate = adjustLimitDateForCompetence(r.dataLimite, nextMonth);
          cloned.push({
            ...r,
            id: `act-${Date.now()}-${Math.random()}`,
            competencia: nextMonth,
            dataLimite: adjustedDate,
            status: 'Pendente' as ActivityStatus,
            comentarios: [],
            anexos: []
          });
        }
      });

      return [...prevActs, ...cloned];
    });

    // Reset Goal counts for new competence
    setProductionGoals(prevGoals => prevGoals.map(g => ({
      ...g,
      competencia: nextMonth,
      producaoAcumulada: g.participantesIds.reduce((o, uId) => ({ ...o, [uId]: 0 }), {}),
      producaHoje: {},
      diasRestantes: g.diasUteis
    })));

    setActiveTab('dashboard');
  };

  // -----------------------------------------
  // Derived Calculation selectors for Dashboard Counters
  // -----------------------------------------
  const usersMap = users.reduce((obj, u) => ({ ...obj, [u.id]: u.nome }), {} as any);
  
  // Tasks assigned to current actor
  const myActivities = activities.filter(a => a.responsavelAtualId === activeUser?.id && a.competencia === competencia);
  
  // Total completed vs total tasks count in active competence
  const compActivities = activities.filter(a => a.competencia === competencia);
  const totalActCount = compActivities.length;
  const completedActCount = compActivities.filter(a => a.status === 'Concluída').length;

  // Overdue calculations
  const overdueActivities = compActivities.filter(a => {
    if (a.status === 'Concluída') return false;
    const limitDate = new Date(a.dataLimite);
    const currentDate = new Date(currentSimulatedDate); // Dynamic simulation date
    return limitDate < currentDate;
  });
  const overdueTasksCount = overdueActivities.length;

  // Finishing in 5 days
  const finishingInFiveDaysCount = compActivities.filter(a => {
    if (a.status === 'Concluída') return false;
    const limitDate = new Date(a.dataLimite);
    const minRange = new Date(currentSimulatedDate);
    const maxRange = new Date(currentSimulatedDate);
    maxRange.setDate(maxRange.getDate() + 5);
    return limitDate >= minRange && limitDate <= maxRange;
  }).length;

  // Active vacationing teammates
  const peopleOnVacationCount = vacations.length;

  // Redistributed tasks metric
  const redistributedCount = compActivities.filter(a => a.responsavelOriginalId !== a.responsavelAtualId).length;

  // How many teammates below active dynamic target
  const activeGoalObject = productionGoals[0];
  const dynamicDailyTarget = activeGoalObject?.diasRestantes > 0 
    ? ((activeGoalObject.quantidadeTotal - Object.keys(activeGoalObject.producaoAcumulada).reduce((s: number, pId: string) => s + (activeGoalObject.producaoAcumulada[pId] || 0), 0)) / activeGoalObject.diasRestantes / activeGoalObject.participantesIds.length)
    : 12.5;

  const lowPerformersCount = activeGoalObject?.participantesIds.filter(pId => {
    const todayVol = activeGoalObject.producaHoje[pId] || 0;
    return todayVol > 0 && todayVol < dynamicDailyTarget;
  }).length || 0;

  // Accumulated production in the competence
  const totalAccumulatedTodayCount = activeGoalObject?.participantesIds.reduce((sum, pId) => {
    return sum + (activeGoalObject.producaoAcumulada[pId] || 0) + (activeGoalObject.producaHoje[pId] || 0);
  }, 0) || 0;

  // Compile full pack of variables to bypass context to SGO AI Assistant safely
  const systemRealTimeState = {
    competence: {
      competenciaAtual: competencia,
      dataSimulada: currentSimulatedDate
    },
    activities: compActivities,
    vacations: vacations,
    productionGoals: productionGoals,
    procedures: procedures,
    knowledge: knowledge,
    auditLogs: auditLogs
  };

  if (!isAuthenticated) {
    if (activeUser && (activeUser.senha || '123') === '123') {
      return (
        <ChangePasswordScreen 
          activeUser={activeUser}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
          themeMode={themeMode === 'escuro' ? 'escuro' : 'claro'}
        />
      );
    }
    return (
      <LoginScreen 
        users={users}
        onLogin={handleLogin}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-300 ${themeMode === 'escuro' ? 'bg-zinc-950 text-zinc-100 dark' : 'bg-zinc-50 text-zinc-900'}`}>
      
      {/* Top Header Controls bar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand UI */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-150 dark:shadow-none">
              <Bot size={22} className="shrink-0" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 leading-none">
                SGO AI
                <span className="text-[9px] bg-indigo-50 text-indigo-700 dark:bg-zinc-805 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-md">GESTÃO OPERACIONAL</span>
              </h1>
              <p className="text-[10px] text-zinc-400 mt-1 font-medium">Competência Ativa: <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{competencia}</span></p>
              
              {/* Supabase connection status indicator */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {supabaseStatus === 'offline' && (
                  <span className="text-[9px] font-bold bg-amber-55 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 px-2 py-0.5 rounded-full flex items-center gap-1" title="Supabase não configurado. Seus dados estão sendo salvos localmente no navegador.">
                    🔌 Modo Local (Offline)
                  </span>
                )}
                {supabaseStatus === 'idle' && (
                  <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    🔄 Conectando Supabase...
                  </span>
                )}
                {supabaseStatus === 'success' && (
                  <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 px-2 py-0.5 rounded-full flex items-center gap-1" title="Conexão com Supabase efetuada e dados sincronizados em tempo real!">
                    🟢 Nuvem Sincronizada
                  </span>
                )}
                {supabaseStatus === 'error' && (
                  <button 
                    onClick={() => setIsSqlModalOpen(true)}
                    className="text-[9px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-750 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 dark:text-rose-450 border border-rose-200/50 dark:border-rose-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-all animate-bounce"
                    title="Erro na sincronização de tabelas. Clique aqui para abrir o Assistente de Configuração do Banco de Dados."
                  >
                    🔴 Erro de Sincronização (Clique para Corrigir)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Profile switcher and controls */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            
            {/* Competencia Dynamic Switcher */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl border dark:border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-400 px-1.5">Ciclo:</span>
              <select
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                className="bg-transparent text-xs font-black font-mono focus:outline-none focus:ring-0 text-purple-600 dark:text-purple-400 shrink-0 border-0 cursor-pointer"
              >
                {COMPETENCIAS_LIST.map(comp => (
                  <option key={comp} value={comp} className="text-purple-600 dark:text-purple-450 font-bold bg-white dark:bg-zinc-900">
                    {comp}
                  </option>
                ))}
              </select>
            </div>

            {/* Active User profile switcher for Admin/Coordenação or static badge for Colaboradores */}
            {activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação' ? (
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl border dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 px-1.5">Perfil:</span>
                <select
                  value={activeUser?.id || ''}
                  onChange={(e) => {
                    const targetUser = users.find(u => u.id === e.target.value);
                    if (targetUser) {
                      setActiveUser(targetUser);
                      const isTemp = (targetUser.senha || '123') === '123';
                      setIsAuthenticated(!isTemp);
                      localStorage.setItem('sgo_is_authenticated', (!isTemp).toString());
                      localStorage.setItem('sgo_active_user', JSON.stringify(targetUser));
                    }
                  }}
                  className="bg-transparent text-xs font-black text-purple-600 dark:text-purple-400 border-0 focus:outline-none focus:ring-0 shrink-0 cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="text-purple-600 dark:text-purple-450 font-bold bg-white dark:bg-zinc-900">
                      {u.nome} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-zinc-150/70 dark:bg-zinc-850 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Perfil:</span>
                <span className="text-xs font-bold text-purple-650 dark:text-purple-400">
                  {activeUser?.nome} <span className="text-[10px] text-zinc-400 font-medium bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md ml-1">{activeUser?.role}</span>
                </span>
              </div>
            )}

            {/* Manual Sync Button for Cloud Data */}
            {isSupabaseConfigured && (
              <button
                onClick={loadAllSupabaseData}
                disabled={supabaseLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-150/70 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-350 transition disabled:opacity-50 shrink-0 cursor-pointer"
                title="Atualizar dados do banco na nuvem"
              >
                <RefreshCw size={12} className={supabaseLoading ? 'animate-spin text-indigo-500' : 'text-zinc-500'} />
                {supabaseLoading ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            )}

            {/* Layout Mode switch button */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 dark:text-zinc-455 transition shrink-0 cursor-pointer"
              title="Alternar brilho do layout"
            >
              {themeMode === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Chat Trigger */}
            <button
              onClick={() => setShowAiAssistant(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 transition font-bold text-white text-xs rounded-xl shadow-md shrink-0 cursor-pointer"
            >
              <Sparkles size={13} /> SGO AI
            </button>

            {/* Top Bar Sign Out Button */}
            <button
              onClick={handleLogout}
              className="p-2 border border-rose-200/50 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-950/40 dark:hover:bg-rose-955/25 text-rose-500 rounded-xl transition shrink-0 cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Structural Content Grid layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Left Drawer Navigation panel */}
        <aside className="w-full md:w-60 flex flex-col gap-4 shrink-0 select-none">
          
          {/* User badge display info */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full shrink-0 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-black text-xs text-indigo-700 dark:text-indigo-400 select-none">
              {activeUser?.nome ? activeUser.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'BO'}
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold text-zinc-400 block tracking-widest uppercase">Operador Ativo</span>
              <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 block truncate leading-none mt-1">{activeUser?.nome}</span>
              <span className="text-[10px] text-zinc-400 font-medium">{activeUser?.role}</span>
            </div>
          </div>

          {/* Navigation link elements */}
          <nav className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-2.5 flex flex-col gap-1 max-h-[460px] overflow-y-auto">
            {[
              { id: 'dashboard', label: 'Painel Central', icon: <LayoutDashboard size={14} /> },
              { id: 'executivo', label: 'Dashboard Executivo', icon: <FileText size={14} /> },
              { id: 'execucao_dia', label: '⚡ Execução do Dia', icon: <Clock size={14} /> },
              { id: 'atividades', label: 'Rotinas & Quadro', icon: <Database size={14} /> },
              { id: 'ferias', label: 'Férias & Ausências', icon: <CalendarRange size={14} /> },
              { id: 'metas', label: 'Volume & Metas', icon: <Target size={14} /> },
              { id: 'procedimentos', label: 'Procedimentos', icon: <BookOpen size={14} /> },
              { id: 'conhecimento', label: 'Matriz & Riscos', icon: <Layers size={14} /> },
              { id: 'rodizio', label: 'Rodízio de Atividades', icon: <RefreshCw size={14} /> },
              { id: 'fechamento', label: 'Fechamento Competência', icon: <ShieldCheck size={14} /> },
              
              // Admin/Coordenação only
              ...(activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação' ? [
                { id: 'colaboradores', label: '👥 Colaboradores', icon: <UserCheck size={14} /> },
                { id: 'producao_config', label: '📊 Op. Faturamento', icon: <Target size={14} /> },
                { id: 'calendario', label: '📅 Feriados', icon: <CalendarRange size={14} /> }
              ] : []),
              
              // Interino only
              ...(isInterinoMode ? [
                { id: 'interino', label: '🛡️ Painel Interino', icon: <ShieldCheck size={14} /> }
              ] : []),

              { id: 'relatorios', label: 'Históricos & Logs', icon: <FileText size={14} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                  activeTab === tab.id 
                    ? 'bg-indigo-50/75 dark:bg-zinc-800 text-indigo-700 dark:text-white' 
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}

            <div className="border-t border-zinc-100 dark:border-zinc-850/60 my-1"></div>

            <button
              onClick={handleLogout}
              className="w-full text-left py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-all cursor-pointer"
            >
              <LogOut size={14} className="shrink-0" />
              <span>Sair / Logout</span>
            </button>
          </nav>

          {/* Interino mode box element */}
          <div className="p-4 bg-zinc-100/50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Painel do Interino</span>
              <input 
                type="checkbox" 
                checked={isInterinoMode}
                onChange={e => {
                  setIsInterinoMode(e.target.checked);
                  logEvent(e.target.checked ? 'Painel do Interino Ativado' : 'Painel do Interino Desativado');
                }}
                className="rounded text-indigo-600 focus:ring-0" 
              />
            </div>
            <p className="text-[10px] text-zinc-400">Ative para consolidar atalhos de monitoria provisória de férias de coordenação.</p>
          </div>
        </aside>

        {/* Outer view container panel */}
        <section className="flex-1 space-y-6">

          {/* Banner do Painel do Interino active view */}
          {isInterinoMode && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-250/50 dark:border-amber-900/40 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none">
              <div className="flex gap-2">
                <ShieldAlert className="text-amber-500 shrink-0 mt-0.5 animate-pulse" size={16} />
                <div>
                  <h4 className="text-xs font-black text-amber-900 dark:text-white uppercase tracking-wider">Alocação de Interino Ativo</h4>
                  <p className="text-[10px] text-amber-800 dark:text-zinc-400 mt-0.5">Visão consolidada de urgências em 5 dias e demandas atrasadas para coordenação interina.</p>
                </div>
              </div>
              <div className="flex gap-1.5 text-[9px] font-mono font-bold uppercase shrink-0">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-zinc-800 dark:text-amber-400 rounded">Vencimentos: {finishingInFiveDaysCount}</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-zinc-800 dark:text-rose-400 rounded">Atrasados: {overdueTasksCount}</span>
              </div>
            </div>
          )}

          {/* VIEW: 1. Dashboard Central */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Widgets scorecard grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                  titulo="Minhas Rotinas ATIVAS" 
                  valor={`${myActivities.length}`} 
                  subtexto="Filtrado por competência" 
                  variant="info"
                  icon={<Layers size={16} className="text-sky-500" />}
                />
                <MetricCard 
                  titulo="Produção Acumulada Mês" 
                  valor={`${totalAccumulatedTodayCount}`} 
                  subtexto="Faturas faturadas" 
                  variant="success"
                  icon={<Target size={16} className="text-emerald-500" />}
                />
                <MetricCard 
                  titulo="Demandas Atrasadas" 
                  valor={`${overdueTasksCount}`} 
                  subtexto="Requer atenção crítica" 
                  variant="danger"
                  icon={<BadgeAlert size={16} className="text-rose-500" />}
                />
                <MetricCard 
                  titulo="Férias & Redistribuições" 
                  valor={`${peopleOnVacationCount}`} 
                  subtexto={`${redistributedCount} atividade(s) redistribuída(s)`} 
                  variant="warning"
                  icon={<CalendarRange size={16} className="text-amber-500" />}
                />
              </div>

              {/* Sub grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Circle Gauge block */}
                <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none">Rendimento da Competência</h4>
                  <div className="flex-1 flex items-center justify-center">
                    <TeamProductivityGauge concluido={completedActCount} total={totalActCount} meta={80} />
                  </div>
                  <p className="text-[10px] text-zinc-400 text-center select-none pt-2 border-t dark:border-zinc-800">
                    Sua equipe precisa concluir no mínimo <strong>80%</strong> das atividades mapeadas.
                  </p>
                </div>

                {/* Overviews / Alerts of operations */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none">Minhas Tarefas (Expediente)</h4>
                    <p className="text-xs text-zinc-500 mt-1">Tarefas ativas de <strong>{activeUser?.nome}</strong> para a competência selecionada.</p>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {myActivities.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-8 border border-dashed rounded-xl text-center select-none dark:border-zinc-850">
                        Nenhuma atividade ativa sob seu encargo hoje. Bom descanso!
                      </p>
                    ) : (
                      myActivities.map(a => (
                        <div key={a.id} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border dark:border-zinc-850 flex justify-between items-center text-xs">
                          <div className="space-y-0.5">
                            <span className="font-bold text-zinc-850 dark:text-zinc-200 block">{a.nome}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">Vence: {a.dataLimite}</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                            a.prioridade === 'Crítica' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20' :
                            a.prioridade === 'Alta' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20' :
                            'bg-zinc-100 text-zinc-500'
                          }`}>
                            {a.prioridade}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <button 
                    onClick={() => setActiveTab('atividades')}
                    className="w-full text-center text-xs py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-850 rounded-xl font-bold transition text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Ver Quadro de Atividades Completo
                  </button>
                </div>
              </div>

              {/* Overdue Demands Section for Coordination & Admin */}
              {(activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação') && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-850">
                    <div>
                      <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2 select-none">
                        <BadgeAlert size={16} /> Controle de Gestão: Demandas Atrasadas
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">
                        Existem <strong>{overdueActivities.length}</strong> atividades atrasadas nesta competência que exigem acompanhamento ou reatribuição imediata.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 font-bold rounded-lg uppercase">
                      Atenção Crítica
                    </span>
                  </div>

                  {overdueActivities.length === 0 ? (
                    <div className="text-center py-8 text-xs text-zinc-400 select-none border border-dashed rounded-xl dark:border-zinc-850">
                      🎉 Tudo em dia! Nenhuma rotina encontra-se com o prazo de execução vencido.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-zinc-500 dark:text-zinc-400">
                        <thead className="bg-zinc-55 dark:bg-zinc-950 text-zinc-400 uppercase text-[9px] tracking-wider select-none">
                          <tr>
                            <th className="p-3">Atividade / Demanda</th>
                            <th className="p-3">Responsável Atual</th>
                            <th className="p-3">Prazo Limite</th>
                            <th className="p-3">Prioridade</th>
                            <th className="p-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                          {overdueActivities.map((act) => {
                            const resp = users.find(u => u.id === act.responsavelAtualId);
                            const originalResp = users.find(u => u.id === act.responsavelOriginalId);
                            
                            return (
                              <tr key={act.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition">
                                <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">
                                  {act.nome}
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                      {resp ? resp.nome : 'Não Atribuído'}
                                    </span>
                                    {originalResp && originalResp.id !== resp?.id && (
                                      <span className="text-[10px] text-zinc-400">
                                        Original: {originalResp.nome}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-rose-600 dark:text-rose-450 font-bold">
                                  {act.dataLimite.split('-').reverse().join('/')}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                                    act.prioridade === 'Crítica' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20' :
                                    act.prioridade === 'Alta' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20' :
                                    'bg-zinc-100 text-zinc-500'
                                  }`}>
                                    {act.prioridade}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => {
                                      setActiveTab('atividades');
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg transition-all cursor-pointer"
                                  >
                                    Reatribuir / Tratar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Risco Operacional Alerts direct inside Dashboard */}
              <div className="p-5 bg-rose-50/50 dark:bg-zinc-900 border border-rose-150/60 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider">Mapeamento de Riscos e Continuidade (Garantia)</span>
                  <p className="text-xs text-zinc-650 dark:text-zinc-300">Existem atividades administrativas essenciais com apenas um especialista responsável cadastrado.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('conhecimento')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 font-semibold transition text-white text-xs rounded-xl shrink-0"
                >
                  Analisar Matriz & Risco
                </button>
              </div>
            </div>
          )}

          {/* VIEW: Execução do Dia */}
          {activeTab === 'execucao_dia' && (
            <ExecucaoDia
              activities={activities}
              users={users}
              activeUser={activeUser}
              currentSimulatedDate={currentSimulatedDate}
              procedures={procedures}
              productionGoals={productionGoals}
              onUpdateActivity={handleUpdateActivity}
              onAddComment={handleAddComment}
              onUpdateGoalTodayProduction={handleUpdateGoalTodayProduction}
              knowledge={knowledge}
              vacations={vacations}
              onAddAuditLog={(action, prev, next) => logEvent(action, prev, next)}
            />
          )}

          {/* VIEW: 2. Activities sheets */}
          {activeTab === 'atividades' && (
            <MondayTable 
              activities={activities}
              users={users}
              activeUser={activeUser}
              competenciaAtual={competencia}
              onUpdateActivity={handleUpdateActivity}
              onDeleteActivity={handleDeleteActivity}
              onCreateActivity={handleCreateActivity}
              onAddComment={handleAddComment}
              onAddAttachment={handleAddAttachment}
            />
          )}

          {/* VIEW: 2. Executive Dashboard (Item 15) */}
          {activeTab === 'executivo' && (() => {
            const teamCumulativeDoneVal = activeGoalObject?.participantesIds.reduce((sum, pId) => {
              const ac = activeGoalObject.producaoAcumulada[pId] || 0;
              const hj = activeGoalObject.producaHoje[pId] || 0;
              return sum + ac + hj;
            }, 0) || 0;
            const targetQty = activeGoalObject?.quantidadeTotal || 1;
            const teamTotalCompletedPercentVal = Math.min(100, Math.round((teamCumulativeDoneVal / targetQty) * 100));

            return (
              <div className="space-y-6 animate-fade-in text-xs">
                <div className="flex justify-between items-center bg-zinc-900/5 dark:bg-zinc-900/40 p-4 rounded-2xl border dark:border-zinc-800">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white">📊 Dashboard Executivo</h3>
                    <p className="text-xs text-zinc-500">Indicadores de alta gerência, controle de produtividade e análise de risco operacional.</p>
                  </div>
                  <div className="text-right text-[10px] font-mono font-bold text-zinc-405">
                    EXPEDIENTE: {currentSimulatedDate.split('-').reverse().join('/')}
                  </div>
                </div>

                {/* Stats Highcards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard titulo="Total de Rotinas" valor={totalActCount} subtexto="Na competência atual" variant="info" />
                  <MetricCard titulo="Rotinas Concluídas" valor={completedActCount} subtexto={`${totalActCount > 0 ? Math.round((completedActCount/totalActCount)*100) : 0}% de eficiência coletiva`} variant="success" />
                  <MetricCard titulo="Demandas Atrasadas" valor={overdueTasksCount} subtexto="Necessitam reatribuição imediata" variant="danger" />
                  <MetricCard titulo="Colaboradores em Férias" valor={peopleOnVacationCount} subtexto="Fora do ciclo operacional" variant="warning" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Gauge widget */}
                  <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Produtividade Consolidada</h4>
                    <div className="flex-1 flex items-center justify-center py-4">
                      <TeamProductivityGauge concluido={teamCumulativeDoneVal} total={targetQty} meta={80} />
                    </div>
                    <p className="text-[10px] text-zinc-500 text-center leading-relaxed mt-2">
                      Percentual alcançado em relação ao objetivo contratual de <strong>{activeGoalObject?.quantidadeTotal}</strong> faturas estabelecidas para o setor administrativo.
                    </p>
                  </div>

                  {/* Team Productivity Ranking */}
                  <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between md:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Ranking de Performance Operacional</h4>
                      <p className="text-[10px] text-zinc-500">Métricas integradas considerando rotinas (40%), faturamento (30%), prazos (20%) e sem atrasos (10%).</p>
                    </div>

                    <div className="space-y-4 flex-1 justify-center flex flex-col">
                      {users
                        .filter(u => u.status !== 'Inativo')
                        .map(u => {
                          const uActivities = activities.filter(act => 
                            act.responsavelAtualId === u.id || act.responsaveisAuxiliaresIds?.includes(u.id)
                          );
                          const activeGoalObj = productionGoals.find(g => 
                            g.competencia === competencia && g.participantesIds.includes(u.id)
                          );

                          // 1. Atividades Concluídas (40%)
                          const totalUActs = uActivities.length;
                          const completedUActs = uActivities.filter(act => act.status === 'Concluída').length;
                          const conclPercent = totalUActs > 0 ? (completedUActs / totalUActs) * 100 : 100;

                          // 2. Metas de Produção Atingidas (30%)
                          let prodPercentRating = 100;
                          if (activeGoalObj) {
                            const uAccum = (activeGoalObj.producaoAcumulada[u.id] || 0) + (activeGoalObj.producaHoje[u.id] || 0);
                            const uProportionalTotal = activeGoalObj.quantidadeTotal / (activeGoalObj.participantesIds.length || 1);
                            prodPercentRating = Math.min(100, (uAccum / (uProportionalTotal || 1)) * 100);
                          }

                          // 3. Cumprimento de prazo (20%)
                          const overdueCount = uActivities.filter(act => act.dataLimite < currentSimulatedDate && act.status !== 'Concluída').length;
                          const onTimePercent = totalUActs > 0 ? Math.max(0, ((completedUActs - overdueCount) / totalUActs) * 105) : 100;
                          const cappedOnTime = Math.min(100, onTimePercent);

                          // 4. Ausência de atrasos (10%)
                          const delayAbsencePercent = totalUActs > 0 ? Math.max(0, ((totalUActs - overdueCount) / totalUActs) * 100) : 100;

                          // Consolidated weighted score
                          const finalScore = Math.round(
                            (conclPercent * 0.40) + 
                            (prodPercentRating * 0.30) + 
                            (cappedOnTime * 0.20) + 
                            (delayAbsencePercent * 0.10)
                          );

                          return {
                            userObj: u,
                            finalScore,
                            conclPercent: Math.round(conclPercent),
                            prodPercent: Math.round(prodPercentRating),
                            onTimePercent: Math.round(cappedOnTime),
                            delayAbsencePercent: Math.round(delayAbsencePercent)
                          };
                        })
                        .sort((a, b) => b.finalScore - a.finalScore)
                        .map(({ userObj, finalScore, conclPercent, prodPercent, onTimePercent, delayAbsencePercent }, index) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          const medal = medals[index] || '🎖️';
                          return (
                            <div key={userObj.id} className="space-y-1.5 p-2 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border dark:border-zinc-850">
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px] leading-none shrink-0">{medal}</span>
                                  <span className="font-extrabold text-indigo-700 dark:text-purple-400">{userObj.nome}</span>
                                </div>
                                <span className="font-mono text-zinc-950 dark:text-white font-extrabold">{finalScore} pts</span>
                              </div>
                              
                              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-650 h-full rounded-full transition-all duration-500" style={{ width: `${finalScore}%` }}></div>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-1 text-[8px] font-mono leading-none font-bold text-center text-zinc-500">
                                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-0.5 py-1 rounded">
                                  <span className="text-purple-600 block">{conclPercent}%</span>
                                  <span className="text-[7px] text-zinc-400 font-normal">Rotinas (40%)</span>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-0.5 py-1 rounded">
                                  <span className="text-indigo-650 block">{prodPercent}%</span>
                                  <span className="text-[7px] text-zinc-400 font-normal">Metas (30%)</span>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-0.5 py-1 rounded">
                                  <span className="text-emerald-600 block">{onTimePercent}%</span>
                                  <span className="text-[7px] text-zinc-400 font-normal">Prazo (20%)</span>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-0.5 py-1 rounded">
                                  <span className={`block ${delayAbsencePercent < 100 ? 'text-rose-500' : 'text-emerald-600'}`}>{delayAbsencePercent}%</span>
                                  <span className="text-[7px] text-zinc-400 font-normal">Atrasos (10%)</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="text-[9px] text-zinc-450 border-t dark:border-zinc-850 pt-3 text-right">
                      Alimentado automaticamente a partir de faturamentos diários reais e rotinas.
                    </div>
                  </div>

                </div>

                {/* Operational Risk Assessment Dashboard Card */}
                <div className="bg-zinc-50 dark:bg-zinc-900/20 rounded-2xl p-5 border dark:border-zinc-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                      🛡️ Avaliação Dinâmica de Risco Operacional
                    </h4>
                    <p className="text-zinc-500 text-xs">
                      O risco mede a resiliência do setor de acordo com rotinas vencidas, ausências planejadas e silos de conhecimento.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 select-none">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Classificação:</span>
                    {overdueTasksCount > 2 || redistributedCount > 2 ? (
                      <span className="px-3.5 py-1 text-xs font-black uppercase text-white bg-rose-500 rounded-lg animate-pulse">Risco Alto</span>
                    ) : overdueTasksCount > 0 || peopleOnVacationCount > 1 ? (
                      <span className="px-3.5 py-1 text-xs font-black uppercase text-zinc-950 bg-amber-400 rounded-lg">Risco Médio</span>
                    ) : (
                      <span className="px-3.5 py-1 text-xs font-black uppercase text-white bg-emerald-500 rounded-lg">Risco Baixo (Seguro)</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* VIEW: 3. Vacations allocator */}
          {activeTab === 'ferias' && (
            <VacationManager 
              vacations={vacations}
              users={users}
              activities={activities}
              activeUser={activeUser}
              onAddVacation={handleAddVacation}
              onRedistributeVacation={handleRedistributeVacation}
              onFinishVacation={handleFinishVacation}
              onCancelVacation={handleCancelVacation}
            />
          )}

          {/* VIEW: 4. Metas calculator */}
          {activeTab === 'metas' && (
            <MetasTracker 
              productionGoals={productionGoals}
              users={users}
              activeUser={activeUser}
              currentSimulatedDate={currentSimulatedDate}
              onUpdateGoalTodayProduction={handleUpdateGoalTodayProduction}
              onAdvanceGoalDay={handleAdvanceGoalDay}
              onAdjustProduction={handleAdjustProduction}
              holidays={holidays}
              onResetSimulatedDate={handleResetSimulatedDate}
              onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
            />
          )}

          {/* VIEW: 5. Procedures Center */}
          {activeTab === 'procedimentos' && (
            <ProceduresCenter 
              procedures={procedures}
              users={users}
              activeUser={activeUser}
              onSuggestProcedure={handleSuggestProcedure}
              onApproveProcedure={handleApproveProcedure}
              onDeleteProcedure={handleDeleteProcedure}
              onEditProcedure={handleEditProcedure}
            />
          )}

          {/* VIEW: 6. Knowledge matrix and Risk alert cards */}
          {activeTab === 'conhecimento' && (
            <KnowledgeAndRisk 
              knowledge={knowledge}
              users={users}
              activities={activities}
              onUpdateKnowledge={handleUpdateKnowledge}
            />
          )}

          {/* VIEW: 6.5 Intelligent Rotation Suggestions View */}
          {activeTab === 'rodizio' && (
            <IntelligentRotation 
              activities={activities}
              users={users}
              knowledge={knowledge}
              activeUser={activeUser}
              onUpdateActivityResponsible={handleUpdateActivityResponsible}
              onAddAuditLog={(action, prev, next) => logEvent(action, prev, next)}
            />
          )}

          {/* VIEW: 7. Competence Transition checker */}
          {activeTab === 'fechamento' && (
            <CompetenceCloser 
              activities={activities}
              productionGoals={productionGoals}
              activeUser={activeUser}
              competenciaAtual={competencia}
              onCloseCompetence={handleCloseCompetence}
            />
          )}

          {/* VIEW: 8. Historical Reports & Log Auditoria */}
          {activeTab === 'relatorios' && (
            <div className="space-y-6">
              <ReportsPanel 
                activities={activities}
                vacations={vacations}
                productionGoals={productionGoals}
                users={users}
                auditLogs={auditLogs}
                competenciaAtual={competencia}
              />
              <AuditLogsPanel auditLogs={auditLogs} />
            </div>
          )}

          {/* VIEW: Admin Tab - 9. Collaborators Management API */}
          {activeTab === 'colaboradores' && (
            <CollaboratorsManager 
              users={users}
              activeUser={activeUser}
              onAddUser={handleAddUser}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onResetPassword={handleResetPassword}
            />
          )}

          {/* VIEW: Admin Tab - 10. Production Settings Formula (Op. Faturamento) */}
          {activeTab === 'producao_config' && (
            <ProductionConfig 
              users={users}
              holidays={holidays}
              activeUser={activeUser}
              productionGoals={productionGoals}
              competenciaAtual={competencia}
              onAddGoal={handleAddGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {/* VIEW: Admin Tab - 11. Operational Holidays list */}
          {activeTab === 'calendario' && (
            <HolidaysCalendar 
              holidays={holidays}
              activeUser={activeUser}
              onAddHoliday={handleAddHoliday}
              onDeleteHoliday={handleDeleteHoliday}
            />
          )}

          {/* VIEW: Interino Mode Tab - 12. Interim Coordinator cockpit alerts */}
          {activeTab === 'interino' && (
            <InterimPanel 
              activities={activities}
              users={users}
              vacations={vacations}
              productionGoals={productionGoals}
              holidays={holidays}
              activeUser={activeUser}
              competenciaAtual={competencia}
            />
          )}

        </section>

      </main>

      {/* Footer copyright */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 select-none">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-[10px] text-zinc-400 font-mono flex flex-col sm:flex-row justify-between gap-2.5">
          <span>SGO AI © 2026 – Sistema de Gestão Operacional Inteligente por Competências.</span>
          <span className="text-zinc-500">Desenvolvido com diretrizes de Arquiteto UX/UI de Alta Fidelidade.</span>
        </div>
      </footer>

      {/* Floating collapsible AI Assistant panel */}
      <SGOAI 
        systemState={systemRealTimeState}
        activeUser={activeUser}
        isOpen={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
      />

      {/* Supabase SQL Setup Assistant Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm select-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500 rounded-xl text-white">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white">Assistente de Configuração do Banco de Dados</h3>
                  <p className="text-[10px] text-zinc-400 font-medium">Sincronização Nuvem Supabase – SGO AI</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-350 cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/25 p-3.5 rounded-xl text-xs text-rose-750 dark:text-rose-400">
                <p className="font-bold mb-1">Por que este erro ocorre?</p>
                <p className="leading-relaxed text-[11px]">
                  As credenciais do Supabase foram adicionadas, mas as tabelas necessárias para armazenar as atividades, colaboradores, metas, férias, procedimentos e logs de auditoria ainda não existem no banco de dados da sua conta do Supabase.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">Siga o passo a passo para corrigir em 1 minuto:</h4>
                <ol className="list-decimal list-inside text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5 leading-relaxed">
                  <li>Acesse o painel do seu <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5">Supabase Dashboard <ArrowRight size={10} className="inline" /></a>.</li>
                  <li>Selecione o seu projeto e clique na aba <strong>SQL Editor</strong> (no menu lateral esquerdo).</li>
                  <li>Clique no botão <strong>New Query</strong> (Nova Consulta) no topo.</li>
                  <li>Clique no botão abaixo para copiar o script SQL completo, cole-o no editor e clique em <strong>Run</strong> (Executar/Executar Script).</li>
                </ol>
              </div>

              {/* Code Panel */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-850 px-3.5 py-1.5 rounded-t-xl border-t border-x border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400">sgo_schema.sql</span>
                  <button
                    onClick={() => {
                      const sqlText = `-- 1. Tabela de Configurações
CREATE TABLE IF NOT EXISTS sgo_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 2. Tabela de Colaboradores (Usuários)
CREATE TABLE IF NOT EXISTS sgo_users (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT,
  avatar TEXT,
  meta_diaria_padrao INTEGER,
  status TEXT,
  senha TEXT,
  funcao TEXT
);

-- 3. Tabela de Atividades
CREATE TABLE IF NOT EXISTS sgo_activities (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  competencia TEXT,
  responsavel_original_id TEXT,
  responsavel_atual_id TEXT,
  responsaveis_auxiliares_ids JSONB DEFAULT '[]'::jsonb,
  prioridade TEXT,
  status TEXT,
  data_limite TEXT,
  comentarios JSONB DEFAULT '[]'::jsonb,
  anexos JSONB DEFAULT '[]'::jsonb,
  recorrente BOOLEAN DEFAULT false,
  periodicidade TEXT,
  meses_atividade_com_mesmo_responsavel INTEGER DEFAULT 0
);

-- 4. Tabela de Férias
CREATE TABLE IF NOT EXISTS sgo_vacations (
  id TEXT PRIMARY KEY,
  colaborador_id TEXT NOT NULL,
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  redistribuida BOOLEAN DEFAULT false,
  redistribuicoes JSONB DEFAULT '{}'::jsonb
);

-- 5. Tabela de Metas de Produção (Lançamentos)
CREATE TABLE IF NOT EXISTS sgo_production_goals (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  competencia TEXT NOT NULL,
  quantidade_total INTEGER NOT NULL,
  dias_uteis INTEGER NOT NULL,
  participantes_ids JSONB DEFAULT '[]'::jsonb,
  producao_acumulada JSONB DEFAULT '{}'::jsonb,
  produca_hoje JSONB DEFAULT '{}'::jsonb,
  dias_restantes INTEGER,
  historico_diario JSONB DEFAULT '{}'::jsonb,
  planilha_anexo TEXT,
  faturas JSONB DEFAULT '[]'::jsonb
);

-- 6. Tabela de Procedimentos
CREATE TABLE IF NOT EXISTS sgo_procedures (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  passos JSONB DEFAULT '[]'::jsonb,
  autor_id TEXT,
  status TEXT,
  data_sugerida TEXT,
  pdf_nome TEXT,
  image_nome TEXT
);

-- 7. Tabela de Matriz de Competência (Knowledge Ratings)
CREATE TABLE IF NOT EXISTS sgo_knowledge (
  colaborador_id TEXT NOT NULL,
  atividade_nome TEXT NOT NULL,
  nivel INTEGER NOT NULL,
  PRIMARY KEY (colaborador_id, atividade_nome)
);

-- 8. Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS sgo_audit_logs (
  id TEXT PRIMARY KEY,
  usuario_nome TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  acao TEXT NOT NULL,
  info_anterior TEXT,
  info_nova TEXT
);

-- 9. Tabela de Feriados
CREATE TABLE IF NOT EXISTS sgo_holidays (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data TEXT NOT NULL
);`;
                      navigator.clipboard.writeText(sqlText);
                      setSqlCopied(true);
                      setTimeout(() => setSqlCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 border dark:border-zinc-700 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 transition cursor-pointer shadow-sm"
                  >
                    {sqlCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    {sqlCopied ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
                <div className="bg-zinc-950 text-zinc-300 p-4 rounded-b-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono max-h-[200px] overflow-y-auto leading-relaxed select-all">
                  <pre>{`-- 1. Tabela de Configurações
CREATE TABLE IF NOT EXISTS sgo_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 2. Tabela de Colaboradores (Usuários)
CREATE TABLE IF NOT EXISTS sgo_users (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT,
  avatar TEXT,
  meta_diaria_padrao INTEGER,
  status TEXT,
  senha TEXT,
  funcao TEXT
);

-- 3. Tabela de Atividades
CREATE TABLE IF NOT EXISTS sgo_activities (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  competencia TEXT,
  responsavel_original_id TEXT,
  responsavel_atual_id TEXT,
  responsaveis_auxiliares_ids JSONB DEFAULT '[]'::jsonb,
  prioridade TEXT,
  status TEXT,
  data_limite TEXT,
  comentarios JSONB DEFAULT '[]'::jsonb,
  anexos JSONB DEFAULT '[]'::jsonb,
  recorrente BOOLEAN DEFAULT false,
  periodicidade TEXT,
  meses_atividade_com_mesmo_responsavel INTEGER DEFAULT 0
);

-- 4. Tabela de Férias
CREATE TABLE IF NOT EXISTS sgo_vacations (
  id TEXT PRIMARY KEY,
  colaborador_id TEXT NOT NULL,
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  redistribuida BOOLEAN DEFAULT false,
  redistribuicoes JSONB DEFAULT '{}'::jsonb
);

-- 5. Tabela de Metas de Produção (Lançamentos)
CREATE TABLE IF NOT EXISTS sgo_production_goals (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  competencia TEXT NOT NULL,
  quantidade_total INTEGER NOT NULL,
  dias_uteis INTEGER NOT NULL,
  participantes_ids JSONB DEFAULT '[]'::jsonb,
  producao_acumulada JSONB DEFAULT '{}'::jsonb,
  produca_hoje JSONB DEFAULT '{}'::jsonb,
  dias_restantes INTEGER,
  historico_diario JSONB DEFAULT '{}'::jsonb,
  planilha_anexo TEXT,
  faturas JSONB DEFAULT '[]'::jsonb
);

-- 6. Tabela de Procedimentos
CREATE TABLE IF NOT EXISTS sgo_procedures (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  passos JSONB DEFAULT '[]'::jsonb,
  autor_id TEXT,
  status TEXT,
  data_sugerida TEXT,
  pdf_nome TEXT,
  image_nome TEXT
);

-- 7. Tabela de Matriz de Competência (Knowledge Ratings)
CREATE TABLE IF NOT EXISTS sgo_knowledge (
  colaborador_id TEXT NOT NULL,
  atividade_nome TEXT NOT NULL,
  nivel INTEGER NOT NULL,
  PRIMARY KEY (colaborador_id, atividade_nome)
);

-- 8. Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS sgo_audit_logs (
  id TEXT PRIMARY KEY,
  usuario_nome TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  acao TEXT NOT NULL,
  info_anterior TEXT,
  info_nova TEXT
);

-- 9. Tabela de Feriados
CREATE TABLE IF NOT EXISTS sgo_holidays (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data TEXT NOT NULL
);`}</pre>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 text-center">
                Após executar o script no SQL Editor, clique no botão <strong>Sincronizar</strong> no topo do painel para conectar imediatamente!
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-350 cursor-pointer transition"
              >
                Entendido, Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
