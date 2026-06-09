import React, { useState } from 'react';
import { Activity, User, KnowledgeRating } from '../types';
import { 
  RotateCw, AlertTriangle, UserCheck, ShieldAlert, Check, HelpCircle, BarChart2, Star, Sparkles, TrendingDown
} from 'lucide-react';

interface IntelligentRotationProps {
  activities: Activity[];
  users: User[];
  knowledge: KnowledgeRating[];
  activeUser: User | null;
  onUpdateActivityResponsible: (activityId: string, newREsponsibleId: string) => void;
  onAddAuditLog: (action: string, prev: string, next: string) => void;
}

export function IntelligentRotation({
  activities,
  users,
  knowledge,
  activeUser,
  onUpdateActivityResponsible,
  onAddAuditLog
}: IntelligentRotationProps) {
  // Local state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canManage = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';

  // Filter activities to be unique by case-insensitive name, prioritizing the one with maximum tenure
  const uniqueActivities: Activity[] = [];
  const seenNames = new Set<string>();

  const sortedForUniqueness = [...activities].sort((a, b) => {
    return (b.mesesAtividadeComMesmoResponsavel || 0) - (a.mesesAtividadeComMesmoResponsavel || 0);
  });

  for (const act of sortedForUniqueness) {
    const nameKey = act.nome.trim().toLowerCase();
    if (!seenNames.has(nameKey)) {
      seenNames.add(nameKey);
      uniqueActivities.push(act);
    }
  }

  // Helper: retrieve knowledge rating of user on specific activity name
  const getRating = (uId: string, actName: string): number => {
    const record = knowledge.find(k => k.colaboradorId === uId && k.atividadeNome === actName);
    return record ? record.nivel : 1;
  };

  const getKnowledgeLabel = (level: number) => {
    switch (level) {
      case 5: return 'Especialista';
      case 4: return 'Avançado';
      case 3: return 'Intermediário';
      case 2: return 'Básico';
      default: return 'Iniciante/Não conhece';
    }
  };

  // Algorithm for suggesting potential substitutes
  const handleAnalyzeRotation = (activity: Activity) => {
    setSelectedActivityId(activity.id);
    
    const currentRespId = activity.responsavelAtualId;
    const candidates = users.filter(u => u.id !== currentRespId && u.status === 'Ativo');

    // For each candidate, rank by:
    // 1. Knowledge matrix score: Rating in this activity (1-5) * 15 points
    // 2. Workload penalty: Count of active tasks currently under this candidate * -5 points
    // 3. Affinity: If they are auxiliary responsibles on this activity (+10 points)
    const diagnosis = candidates.map(user => {
      const knowledgeLevel = getRating(user.id, activity.nome);
      
      const currentWorkload = activities.filter(a => a.responsavelAtualId === user.id).length;
      
      const isAuxiliary = activity.responsaveisAuxiliaresIds?.includes(user.id) || false;

      // Pure heuristic score
      let score = (knowledgeLevel * 15) - (currentWorkload * 5);
      if (isAuxiliary) score += 10;

      return {
        user,
        knowledgeLevel,
        currentWorkload,
        isAuxiliary,
        score,
        reasons: [
          `Nível de domínio: ${getKnowledgeLabel(knowledgeLevel)}`,
          `Carga acumulada: ${currentWorkload} atividade(s)`,
          isAuxiliary ? `☑ Já atua como responsável auxiliar cadastrado` : `☐ Executor externo`
        ]
      };
    });

    // Sort by score in descending order
    diagnosis.sort((a, b) => b.score - a.score);
    setSuggestions(diagnosis);
  };

  const handleApplyRotation = (suggestedUser: User) => {
    if (!selectedActivityId) return;

    const act = activities.find(a => a.id === selectedActivityId);
    if (!act) return;

    const prevRespName = users.find(u => u.id === act.responsavelAtualId)?.nome || 'Nenhum';
    onUpdateActivityResponsible(act.id, suggestedUser.id);
    onAddAuditLog(
      'Rodízio de Competência de Atividade',
      `Responsável: ${prevRespName} (Com meses pendentes: ${act.mesesAtividadeComMesmoResponsavel || 0})`,
      `Novo responsável rotativo: ${suggestedUser.nome} (Cálculo de Monopólio Reiniciado)`
    );

    setSuccessMsg(`Atividade "${act.nome}" rotacionada com segurança! O novo guardião é ${suggestedUser.nome}.`);
    
    // reset panel selection
    setSelectedActivityId(null);
    setSuggestions([]);

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none">
            ♻️ Revezamento Operacional & Controles de Monopólio
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Revezar líderes operacionais bimestralmente distribui competências de forma uniforme e evita pontos únicos de falha.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-zinc-850 border border-emerald-150 dark:border-zinc-800 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Check size={14} className="stroke-2 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid listing active durations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active tracking cards */}
        <div className="lg:col-span-7 space-y-3.5 text-xs">
          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Rotina Atual & Tempo de Permanência</h4>
          
          <div className="space-y-3">
            {uniqueActivities.map(act => {
              const months = act.mesesAtividadeComMesmoResponsavel || 1;
              const respUser = users.find(u => u.id === act.responsavelAtualId);
              const limitExceeded = months >= 6;
              const isSelected = selectedActivityId === act.id;

              // Calculate visual percentage relative to 6-month limit
              const percent = Math.min(100, Math.round((months / 6) * 100));

              return (
                <div 
                  key={act.id}
                  className={`p-4 border rounded-2xl transition ${
                    isSelected ? 'bg-indigo-50/20 border-indigo-200 dark:bg-zinc-850 dark:border-indigo-800' : 
                    limitExceeded ? 'bg-rose-50/15 border-rose-200 dark:bg-rose-950/5 dark:border-rose-900/30' : 
                    'bg-zinc-50/40 border-zinc-150 hover:bg-zinc-50 dark:bg-zinc-900/40 dark:border-zinc-850'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h5 className="font-extrabold text-zinc-900 dark:text-white leading-none text-xs">{act.nome}</h5>
                      <span className="text-[10px] text-zinc-500 font-medium inline-block mt-1">
                        Responsável Atual: <strong>{respUser?.nome || 'Não atribuído'}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block ${
                        limitExceeded ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {months} {months === 1 ? 'mês' : 'meses'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar representing accumulation */}
                  <div className="mt-3.5 space-y-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase">
                      <span className="text-zinc-400">Tempo acumulado com guardião</span>
                      <span className={limitExceeded ? 'text-rose-500 animate-pulse' : 'text-zinc-500'}>
                        {percent}% do limite sugerido (6 meses)
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${limitExceeded ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-indigo-600'}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Monopolio alert flag */}
                  {limitExceeded && (
                    <div className="mt-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 rounded-xl p-2.5 flex items-start gap-2 text-[10px] text-rose-800 dark:text-rose-300">
                      <ShieldAlert size={14} className="shrink-0 text-rose-500 mt-0.5 animate-pulse" />
                      <div>
                        Risco de Monopólio: {respUser?.nome} está há {months} meses conduzindo esta rotina sozinho. Recomenda-se treinar e rotacionar esta demanda.
                      </div>
                    </div>
                  )}

                  {/* Analyse trigger button */}
                  {canManage && (
                    <div className="mt-3.5 flex justify-end">
                      <button
                        onClick={() => handleAnalyzeRotation(act)}
                        className="py-1.5 px-3 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:text-indigo-600 dark:hover:text-indigo-400 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <RotateCw size={11} className={isSelected ? 'animate-spin' : ''} /> Sugerir Substitutos Qualificados
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

        {/* Audit & Suggestion Sidebar */}
        <div className="lg:col-span-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl p-5 text-xs">
          
          {selectedActivityId ? (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b pb-2 dark:border-zinc-800 flex justify-between items-center">
                <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <Sparkles size={12} className="text-indigo-500" /> Diagnóstico de Revezamento
                </h4>
                <button 
                  onClick={() => { setSelectedActivityId(null); setSuggestions([]); }}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  Fechar
                </button>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Atividade em análise:</span>
                <p className="font-extrabold text-sm text-zinc-900 dark:text-white">
                  {activities.find(a => a.id === selectedActivityId)?.nome}
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Sugestões baseadas em Matriz e Carga:</span>
                
                {suggestions.map(({ user, knowledgeLevel, currentWorkload, isAuxiliary, score, reasons }) => {
                  
                  return (
                    <div key={user.id} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-850 space-y-2 select-none hover:shadow-xs transition">
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-[9px] text-indigo-750 dark:text-indigo-400 shrink-0 select-none">
                            {user.nome ? user.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CO'}
                          </div>
                          <span className="font-extrabold text-zinc-850 dark:text-white">{user.nome}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-indigo-650 font-bold font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded">
                          <Star size={9} className="fill-indigo-500 text-indigo-500" /> Fit: {score} pts
                        </div>
                      </div>

                      <div className="space-y-1 text-[10px] text-zinc-500 border-t dark:border-zinc-800/80 pt-1.5">
                        {reasons.map((r: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="text-indigo-500">•</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleApplyRotation(user)}
                        className="w-full mt-2 text-center py-1 bg-indigo-600 hover:bg-slate-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-indigo-750 dark:text-indigo-400 font-extrabold rounded-lg text-[10px] transition"
                      >
                        Aplicar Revezamento para {user.nome.split(' ')[0]}
                      </button>

                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400 font-medium italic space-y-2 select-none">
              <RotateCw size={30} className="mx-auto text-zinc-300 animate-spin-slow" />
              <p className="max-w-xs mx-auto">Selecione uma atividade à esquerda para calcular o algoritmo de substitutos adequados.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
