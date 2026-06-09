import React from 'react';
import { Activity, User, Vacation, ProductionGoal, Holiday } from '../types';
import { 
  AlertCircle, ShieldAlert, Users, Calendar, BarChart, ArrowRight, HeartPulse, Check, Info, Bell, AlertTriangle
} from 'lucide-react';
import { getTodayFormatted } from '../utils/competencias';

interface InterimPanelProps {
  activities: Activity[];
  users: User[];
  vacations: Vacation[];
  productionGoals: ProductionGoal[];
  holidays: Holiday[];
  activeUser: User | null;
  competenciaAtual: string;
}

export function InterimPanel({
  activities,
  users,
  vacations,
  productionGoals,
  holidays,
  activeUser,
  competenciaAtual
}: InterimPanelProps) {
  // Current client timestamp simulation as dynamic actual date
  const todayStr = getTodayFormatted();
  const todayDate = new Date(todayStr);

  // 1. Overdue activities (pendente or andamento and dateLimite < today)
  const overdueActivities = activities.filter(a => {
    if (a.status === 'Concluída') return false;
    if (!a.dataLimite) return false;
    return a.dataLimite < todayStr;
  });

  // 2. Activities due in next 5 days (dataLimite >= today and <= today + 5 days)
  const fiveDaysLater = new Date(todayDate);
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
  const fiveDaysLaterStr = fiveDaysLater.toISOString().split('T')[0];

  const dueSoonActivities = activities.filter(a => {
    if (a.status === 'Concluída') return false;
    if (!a.dataLimite) return false;
    return a.dataLimite >= todayStr && a.dataLimite <= fiveDaysLaterStr;
  });

  // 3. People currently on vacation (or upcoming)
  const peopleOnVacation = vacations.map(v => {
    const colab = users.find(u => u.id === v.colaboradorId);
    return {
      vac: v,
      colab,
      isActive: todayStr >= v.dataInicio && todayStr <= v.dataFim
    };
  });

  // 4. Mapped/Redistributed activities in progress
  const redistributedTasks: { act: Activity; sub: User | undefined; orig: User | undefined }[] = [];
  vacations.forEach(v => {
    if (v.redistribuida && v.redistribuicoes) {
      Object.entries(v.redistribuicoes).map(([actId, subId]) => {
        const act = activities.find(a => a.id === actId);
        const sub = users.find(u => u.id === subId);
        const orig = users.find(u => u.id === v.colaboradorId);
        if (act) {
          redistributedTasks.push({ act, sub, orig });
        }
      });
    }
  });

  // 5. Total Accumulated Production vs Programmed
  const goal = productionGoals[0]; // let's analyze first active goal as index
  let totalGoalQty = 0;
  let totalProducedQty = 0;
  let percentAchieved = 0;

  if (goal) {
    totalGoalQty = goal.quantidadeTotal;
    const participantsCount = goal.participantesIds.length;
    totalProducedQty = goal.participantesIds.reduce((sum, pId) => {
      const accum = goal.producaoAcumulada[pId] || 0;
      const todayQty = goal.producaHoje[pId] || 0;
      return sum + accum + todayQty;
    }, 0);
    percentAchieved = Math.min(100, Math.round((totalProducedQty / totalGoalQty) * 100));
  }

  // 6. Collaborators below target (for active goal)
  const belowTargetCollaborators: { colab: User; todayProduction: number; target: number }[] = [];
  if (goal) {
    const participantsCount = goal.participantesIds.length || 1;
    const remainingToDistribute = Math.max(0, goal.quantidadeTotal - goal.participantesIds.reduce((sum, pId) => sum + (goal.producaoAcumulada[pId] || 0), 0));
    const calculatedTarget = goal.diasRestantes > 0 
      ? Number((remainingToDistribute / goal.diasRestantes / participantsCount).toFixed(2))
      : 0;

    goal.participantesIds.forEach(pId => {
      const colab = users.find(u => u.id === pId);
      const qty = goal.producaHoje[pId] || 0;
      if (qty < calculatedTarget && colab) {
        belowTargetCollaborators.push({
          colab,
          todayProduction: qty,
          target: calculatedTarget
        });
      }
    });
  }

  // 7. Active Operational Alerts
  const alerts: string[] = [];
  if (overdueActivities.length > 0) {
    alerts.push(`Existem ${overdueActivities.length} demandas operacionais com SLA Vencido! Ação corretiva recomendada.`);
  }
  if (belowTargetCollaborators.length > 1) {
    alerts.push(`Alerta de Produtividade: ${belowTargetCollaborators.length} integrantes estão rendendo abaixo do estipulado hoje.`);
  }
  activities.forEach(act => {
    if ((act.mesesAtividadeComMesmoResponsavel || 0) >= 6) {
      const resp = users.find(u => u.id === act.responsavelAtualId)?.nome;
      alerts.push(`Monopólio Detectado: Atividade "${act.nome}" está encarregada para ${resp} há mais de 6 meses.`);
    }
  });

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      
      {/* Upper header */}
      <div className="bg-gradient-to-r from-zinc-900 to-indigo-950 p-6 rounded-2xl border border-indigo-900/30 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div>
          <div className="flex items-center gap-1.5">
            <HeartPulse className="text-indigo-400 shrink-0" size={18} />
            <span className="font-extrabold text-[10px] tracking-wider uppercase text-indigo-400">Coordenação Substituta</span>
          </div>
          <h3 className="text-base font-black mt-1 leading-none">
            🛡️ Painel do Coordenador Interino ({activeUser?.nome})
          </h3>
          <p className="text-xs text-zinc-300 mt-2 leading-relaxed max-w-xl">
            Sua liderança temporária garante a continuidade operacional. Use estes cartões estatísticos para remanejar gargalos de SLA.
          </p>
        </div>

        <div className="bg-indigo-950/80 border border-indigo-800/40 px-3.5 py-2 rounded-xl text-right">
          <span className="text-[9px] text-indigo-300 block uppercase font-bold">Expediente Atual</span>
          <span className="font-mono font-bold text-xs">Simulação: {todayStr}</span>
        </div>
      </div>

      {/* Alerts box */}
      {alerts.length > 0 && (
        <div className="bg-rose-50/20 border border-rose-250/50 dark:border-rose-950 rounded-2xl p-4.5 space-y-2 select-none">
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider text-[10px]">
            <Bell size={13} className="animate-bounce" /> Alertas Operacionais Críticos ({alerts.length})
          </div>
          <ul className="space-y-1.5 pl-1.5">
            {alerts.map((al, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-zinc-800 dark:text-zinc-300 leading-relaxed font-semibold">
                <span className="text-rose-500 shrink-0">•</span>
                <span>{al}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid of indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Overdue Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h4 className="font-bold text-zinc-900 dark:text-white border-b pb-2 dark:border-zinc-800 flex justify-between items-center text-[11px] uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <span>⏰ Demandas em SLA Atrasado ({overdueActivities.length})</span>
            <AlertTriangle size={13} />
          </h4>

          {overdueActivities.length === 0 ? (
            <div className="text-center py-6 text-zinc-400 font-medium">
              🎉 Nenhuma demanda em atraso na competência!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {overdueActivities.map(a => {
                const resp = users.find(u => u.id === a.responsavelAtualId);
                return (
                  <div key={a.id} className="p-3 bg-rose-50/25 dark:bg-zinc-950 border dark:border-zinc-850/80 rounded-xl space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-zinc-90 w-3/4 text-zinc-900 dark:text-white">{a.nome}</span>
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black uppercase rounded">Atrasado</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 pt-1.5 border-t dark:border-zinc-900">
                      <span>Executante: {resp?.nome}</span>
                      <span className="font-mono text-rose-550 font-bold">Até {a.dataLimite}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Due soon Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h4 className="font-bold text-zinc-900 dark:text-white border-b pb-2 dark:border-zinc-800 flex justify-between items-center text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-500">
            <span>📅 SLA Crítico (Próximos 5 Dias: {dueSoonActivities.length})</span>
            <Calendar size={13} />
          </h4>

          {dueSoonActivities.length === 0 ? (
            <div className="text-center py-6 text-zinc-400 font-medium">
              Nenhuma entrega crítica agendada para os próximos 5 dias.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {dueSoonActivities.map(a => {
                const resp = users.find(u => u.id === a.responsavelAtualId);
                return (
                  <div key={a.id} className="p-3 bg-amber-50/20 dark:bg-zinc-950 border dark:border-zinc-850/80 rounded-xl space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-zinc-850 text-zinc-900 dark:text-white">{a.nome}</span>
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded">Urgente</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 pt-1.5 border-t dark:border-zinc-900">
                      <span>Executante: {resp?.nome}</span>
                      <span className="font-mono font-bold text-amber-605">Prazo: {a.dataLimite}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collaborators Under Perform section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h4 className="font-bold text-zinc-900 dark:text-white border-b pb-2 dark:border-zinc-800 flex justify-between items-center text-[11px] uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
            <span>⚠️ Operadores Abaixo do Planejado ({belowTargetCollaborators.length})</span>
            <Users size={13} />
          </h4>

          {belowTargetCollaborators.length === 0 ? (
            <div className="text-center py-6 text-emerald-600 font-bold flex items-center justify-center gap-1">
              <Check size={14} className="stroke-2" /> Toda a equipe atingiu a meta hoje!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {belowTargetCollaborators.map(({ colab, todayProduction, target }) => (
                <div key={colab.id} className="p-3 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-[8px] text-indigo-750 dark:text-indigo-400 shrink-0 select-none">
                      {colab.nome ? colab.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CO'}
                    </div>
                    <div className="truncate">
                      <span className="font-extrabold text-zinc-900 dark:text-white text-xs block truncate">{colab.nome}</span>
                      <span className="text-[10px] text-zinc-400">Meta: {target} / dia</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black block text-rose-500">{todayProduction} u</span>
                    <span className="text-[9px] text-zinc-400">de déficit: -{Number((target - todayProduction).toFixed(1))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Extended vacation and redistribution row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
        
        {/* Absent Personnel list */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h4 className="font-bold text-zinc-900 dark:text-white border-b pb-2 dark:border-zinc-800 text-[11px] uppercase tracking-wider flex justify-between items-center">
            <span>🏖️ Integrantes em Férias Ativas</span>
            <span className="text-zinc-400">Mapeamento de Capacidade</span>
          </h4>

          {peopleOnVacation.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 font-medium">
              Nenhuma ausência planejada ou ativa identificada nesta competência.
            </div>
          ) : (
            <div className="space-y-3">
              {peopleOnVacation.map(({ vac, colab, isActive }) => {
                return (
                  <div key={vac.id} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border dark:border-zinc-850">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-[10px] text-indigo-750 dark:text-indigo-400 shrink-0 select-none">
                        {colab?.nome ? colab.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CO'}
                      </div>
                      <div>
                        <span className="font-extrabold text-zinc-900 dark:text-white text-xs block">{colab?.nome}</span>
                        <span className="text-[10px] text-zinc-450 font-mono">De {vac.dataInicio} até {vac.dataFim}</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      isActive ? 'bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/20 dark:text-sky-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                    }`}>
                      {isActive ? '🏖️ Férias Ativas' : 'Planejado'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mapped temporary hand-offs */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h4 className="font-bold text-zinc-900 dark:text-white border-b pb-2 dark:border-zinc-800 text-[11px] uppercase tracking-wider flex justify-between items-center">
            <span>🔄 Fluxos de Redistribuição Operacional Ativos</span>
            <span className="text-emerald-500 font-bold">Continuidade Saudável</span>
          </h4>

          {redistributedTasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 font-medium italic">
              Nenhuma atividade redistribuída em curso temporário.
            </div>
          ) : (
            <div className="space-y-3">
              {redistributedTasks.map(({ act, sub, orig }, idx) => (
                <div key={idx} className="p-3 bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-150/50 dark:border-zinc-850 rounded-xl text-xs space-y-1 font-semibold leading-relaxed">
                  <div className="flex justify-between">
                    <span className="font-extrabold text-zinc-850 text-zinc-900 dark:text-white">{act.nome}</span>
                    <span className="text-[10px] font-mono text-zinc-400">Responsável Original: {orig?.nome.split(' ')[0]}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 pt-1.5 border-t border-zinc-150 dark:border-zinc-900 leading-none">
                    <span>Substituto do SLA:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">★ {sub?.nome}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
