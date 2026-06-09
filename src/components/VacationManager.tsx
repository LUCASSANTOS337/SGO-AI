import React, { useState } from 'react';
import { Vacation, User, Activity, AuditLog } from '../types';
import { 
  Calendar, UserPlus, ArrowRight, ArrowRightLeft, ShieldAlert, BadgeInfo, Play, CheckCircle, Trash2
} from 'lucide-react';

interface VacationManagerProps {
  vacations: Vacation[];
  users: User[];
  activities: Activity[];
  activeUser: User | null;
  onAddVacation: (vacation: Omit<Vacation, 'id' | 'redistribuida' | 'redistribuicoes'>) => void;
  onRedistributeVacation: (vacationId: string, mapping: { [activityId: string]: string }) => void;
  onFinishVacation: (vacationId: string) => void;
  onCancelVacation: (vacationId: string) => void;
}

export function VacationManager({
  vacations,
  users,
  activities,
  activeUser,
  onAddVacation,
  onRedistributeVacation,
  onFinishVacation,
  onCancelVacation
}: VacationManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedColabId, setSelectedColabId] = useState('');
  const [dateStart, setDateStart] = useState('2026-06-10');
  const [dateEnd, setDateEnd] = useState('2026-06-25');

  // Redistribution mapping panel state
  const [activeRedistributionVac, setActiveRedistributionVac] = useState<Vacation | null>(null);
  const [redistribMode, setRedistribMode] = useState<'total' | 'individual'>('total');
  const [globalSubId, setGlobalSubId] = useState('');
  const [individualMapping, setIndividualMapping] = useState<{ [actId: string]: string }>({});

  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const canManage = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';

  const handleCreateVac = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColabId) return;

    onAddVacation({
      colaboradorId: selectedColabId,
      dataInicio: dateStart,
      dataFim: dateEnd
    });

    setSelectedColabId('');
    setShowAddForm(false);
  };

  const handleStartRedistribute = (vac: Vacation) => {
    setActiveRedistributionVac(vac);
    const colabActs = activities.filter(a => a.responsavelOriginalId === vac.colaboradorId);
    
    // Seed individual mapping
    const seed: { [actId: string]: string } = {};
    colabActs.forEach(a => {
      seed[a.id] = '';
    });
    setIndividualMapping(seed);
    setGlobalSubId('');
  };

  const submitRedistribution = () => {
    if (!activeRedistributionVac) return;

    let finalMapping: { [actId: string]: string } = {};
    
    if (redistribMode === 'total') {
      if (!globalSubId) return;
      const colabActs = activities.filter(a => a.responsavelOriginalId === activeRedistributionVac.colaboradorId);
      colabActs.forEach(a => {
        finalMapping[a.id] = globalSubId;
      });
    } else {
      finalMapping = { ...individualMapping };
    }

    onRedistributeVacation(activeRedistributionVac.id, finalMapping);
    setActiveRedistributionVac(null);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            🌴 Planejamento de Férias e Redistribuição Manual
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Controle a continuidade operacional transferindo atividades temporariamente durante ausências.
          </p>
        </div>
        {canManage && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 transition font-medium text-white text-xs rounded-xl"
          >
            <UserPlus size={13} /> Agendar Férias
          </button>
        )}
      </div>

      {/* Agendamento form */}
      {showAddForm && (
        <form onSubmit={handleCreateVac} className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Colaborador</label>
            <select
              required
              value={selectedColabId}
              onChange={e => setSelectedColabId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs text-black dark:text-white focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Início</label>
            <input
              type="date"
              required
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-black dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Fim</label>
            <input
              type="date"
              required
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-black dark:text-white"
            />
          </div>
          <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 rounded-xl text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium"
            >
              Salvar Agendamento
            </button>
          </div>
        </form>
      )}

      {/* Vacations active list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vacations.length === 0 ? (
          <div className="col-span-2 text-center py-6 text-zinc-400 border border-dashed rounded-xl dark:border-zinc-800 text-xs">
            Nenhum período de férias registrado ou planejado.
          </div>
        ) : (
          vacations.map((vac) => {
            const colab = users.find(u => u.id === vac.colaboradorId);
            const colabActs = activities.filter(a => a.responsavelOriginalId === vac.colaboradorId);
            const isCurrentlyVacationing = true; // For simulation simplicity

            return (
              <div 
                key={vac.id} 
                className={`p-4 rounded-2xl border transition-all ${
                  vac.redistribuida 
                    ? 'border-emerald-250 bg-emerald-50/10 dark:bg-emerald-950/5 dark:border-emerald-900/30' 
                    : 'border-zinc-150 bg-zinc-50/20 dark:bg-zinc-900 dark:border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-xs text-indigo-750 dark:text-indigo-400 shrink-0 select-none">
                      {colab?.nome ? colab.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CO'}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-purple-600 dark:text-purple-400">{colab?.nome}</h4>
                      <p className="text-[10px] text-zinc-400 font-medium font-mono flex items-center gap-1 mt-1">
                        <Calendar size={11} /> {vac.dataInicio} até {vac.dataFim}
                      </p>
                    </div>
                  </div>
                  <div>
                    {vac.redistribuida ? (
                      <span className="text-[9px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/10">
                        Redistribuído
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-900/10">
                        Aguardando Redistribuição
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-block representing actions */}
                <div className="mt-4 pt-3.5 border-t border-zinc-150 dark:border-zinc-800 text-[11px] space-y-2 select-none">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Atividades do colaborador ({colabActs.length})</span>
                    <span className="font-bold">{colabActs.map(a => a.nome.split(' ').pop()).join(', ') || 'Nenhuma'}</span>
                  </div>

                  {vac.redistribuida ? (
                    <div className="space-y-1 bg-white dark:bg-zinc-950 p-2.5 rounded-xl border dark:border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1.5 uppercase tracking-wider">
                        <ArrowRightLeft size={10} className="text-emerald-500" /> Atribuições Manuais Ativas:
                      </p>
                      {Object.entries(vac.redistribuicoes).map(([actId, subId]) => {
                        const act = activities.find(a => a.id === actId);
                        const sub = users.find(u => u.id === subId);
                        return (
                          <div key={actId} className="flex justify-between font-mono text-[10px]">
                            <span className="text-zinc-600 dark:text-zinc-450">{act?.nome}</span>
                            <span className="text-zinc-400">→</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{sub?.nome}</span>
                          </div>
                        );
                      })}
                      {canManage && (
                        <div className="mt-2.5 flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => onFinishVacation(vac.id)}
                            className="flex-1 text-center text-[10px] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/30 p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 font-bold transition"
                          >
                            Concluir Férias (Retorno)
                          </button>
                          
                          {confirmCancelId === vac.id ? (
                            <div className="flex-1 flex items-center justify-between bg-rose-50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-lg px-2 py-1">
                              <span className="text-[9px] font-bold text-rose-700 dark:text-rose-450">Confirmar?</span>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onCancelVacation(vac.id);
                                    setConfirmCancelId(null);
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelId(null)}
                                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 text-[9px] font-bold px-1 py-0.5 transition"
                                >
                                  Não
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmCancelId(vac.id)}
                              className="flex-1 text-center text-[10px] bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-105 dark:hover:bg-rose-950/40 font-bold transition"
                            >
                              Cancelar Férias
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    canManage && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleStartRedistribute(vac)}
                          className="w-full text-center text-xs py-1.5 px-3 border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-zinc-900 text-indigo-700 dark:text-indigo-400 rounded-xl font-semibold transition"
                        >
                          ⚡ Configurar Redistribuição Manual
                        </button>
                        
                        {confirmCancelId === vac.id ? (
                          <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-xl p-2.5">
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-450">Deseja cancelar o agendamento?</span>
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onCancelVacation(vac.id);
                                  setConfirmCancelId(null);
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelId(null)}
                                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 text-[10px] font-bold px-2 py-1 transition"
                              >
                                Voltar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmCancelId(vac.id)}
                            className="w-full text-center text-xs py-1.5 px-3 border border-rose-200 dark:border-rose-800/30 bg-rose-50/30 hover:bg-rose-50 dark:bg-zinc-900 text-rose-600 dark:text-rose-405 rounded-xl font-semibold transition"
                          >
                            ❌ Cancelar Férias / Agendamento
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Redistribute Manual Panel modal */}
      {activeRedistributionVac && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-950 max-w-lg w-full rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-4">
            <div>
              <h4 className="font-bold text-sm text-zinc-950 dark:text-white flex items-center gap-1.5">
                ⚡ Redistribuir Atividades de {users.find(u => u.id === activeRedistributionVac.colaboradorId)?.nome}
              </h4>
              <p className="text-xs text-zinc-500 mt-1">
                Escolha se deseja encaminhar tudo para um único executor ou destinar individualmente por demanda.
              </p>
            </div>

            {/* Toggle Mode */}
            <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl text-xs select-none">
              <button
                type="button"
                onClick={() => setRedistribMode('total')}
                className={`flex-1 text-center py-1.5 rounded-lg font-bold ${redistribMode === 'total' ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white shadow-xs' : 'text-zinc-500'}`}
              >
                Redistribuição Total
              </button>
              <button
                type="button"
                onClick={() => setRedistribMode('individual')}
                className={`flex-1 text-center py-1.5 rounded-lg font-bold ${redistribMode === 'individual' ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white shadow-xs' : 'text-zinc-500'}`}
              >
                Redistribuição Individual
              </button>
            </div>

            {/* Content per mode */}
            {redistribMode === 'total' ? (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Substituto Único (Receberá todas as demandas)</label>
                <select
                  required
                  value={globalSubId}
                  onChange={e => setGlobalSubId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white"
                >
                  <option value="">Selecione o substituto...</option>
                  {users.filter(u => u.id !== activeRedistributionVac.colaboradorId).map(u => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {activities.filter(a => a.responsavelOriginalId === activeRedistributionVac.colaboradorId).map(a => (
                  <div key={a.id} className="flex justify-between items-center gap-2 border-b dark:border-zinc-900 pb-2 text-xs">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{a.nome}</span>
                    <select
                      value={individualMapping[a.id] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setIndividualMapping(prev => ({ ...prev, [a.id]: val }));
                      }}
                      className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl text-xs"
                    >
                      <option value="">Escolher...</option>
                      {users.filter(u => u.id !== activeRedistributionVac.colaboradorId).map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-2 justify-end pt-4 border-t border-zinc-150 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveRedistributionVac(null)}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 rounded-xl text-xs"
              >
                Voltar
              </button>
              <button
                onClick={submitRedistribution}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                Efetivar Alocação Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
