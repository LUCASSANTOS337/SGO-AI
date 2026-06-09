import React, { useState } from 'react';
import { Activity, ProductionGoal, User } from '../types';
import { 
  Lock, CheckCircle2, ShieldAlert, ArrowRight, Check, AlertCircle, RefreshCw
} from 'lucide-react';

interface CompetenceCloserProps {
  activities: Activity[];
  productionGoals: ProductionGoal[];
  activeUser: User | null;
  competenciaAtual: string;
  onCloseCompetence: (justification?: string) => void;
}

export function CompetenceCloser({
  activities,
  productionGoals,
  activeUser,
  competenciaAtual,
  onCloseCompetence
}: CompetenceCloserProps) {
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [typedPassword, setTypedPassword] = useState('');
  const [justification, setJustification] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Scan for pending issues
  const pendingActivities = activities.filter(a => a.status !== 'Concluída');
  
  // Find unregistered goals (where teammates have 0 registered today)
  const unregisteredMetas = productionGoals.filter(goal => {
    return Object.values(goal.producaHoje).some(val => val === 0);
  });

  const hasPendencies = pendingActivities.length > 0 || unregisteredMetas.length > 0;
  const isAuthorizedRole = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (hasPendencies) {
      if (!isAuthorizedRole) {
        setErrorMessage('Apenas administradores ou coordenadores podem forçar o fechamento com pendências operacionais!');
        return;
      }
      if (typedPassword !== '1234') { // Mock authorized standard sector password
        setErrorMessage('Senha administrativa incorreta! Digite a credencial setorial "1234" para validar.');
        return;
      }
      if (!justification.trim() || justification.trim().length < 8) {
        setErrorMessage('Por favor, informe uma justificativa válida com pelo menos 8 caracteres explicando a urgência do fechamento.');
        return;
      }
    }

    onCloseCompetence(hasPendencies ? justification : undefined);
    
    // Reset states
    setTypedPassword('');
    setJustification('');
    setShowOverrideForm(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Title */}
      <div>
        <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none">
          🔐 Fechamento e Encerramento Operacional de Competência
        </h4>
        <p className="text-xs text-zinc-500 mt-1 dark:text-zinc-400">
          Checagem sistêmica de pendências regulatórias antes da transição de ciclo operacional.
        </p>
      </div>

      {/* Dynamic Checklist scan */}
      <div className="space-y-3.5">
        <h5 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Status das Pendências ({competenciaAtual})</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Activities checkCard */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 select-none ${pendingActivities.length > 0 ? 'bg-rose-50/50 border-rose-200 text-rose-900 dark:bg-rose-950/10' : 'bg-emerald-50/50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/10'}`}>
            {pendingActivities.length > 0 ? (
              <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="text-xs font-bold block dark:text-white">Atividades Pendentes: {pendingActivities.length}</span>
              <p className="text-[11px] text-zinc-500 mt-0.5 dark:text-zinc-400">
                {pendingActivities.length > 0 
                  ? `Rotinas inacabadas: ${pendingActivities.map(a => a.nome).join(', ')}`
                  : 'Parabéns! Todas as rotinas operacionais foram finalizadas.'}
              </p>
            </div>
          </div>

          {/* Production metas checkCard */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 select-none ${unregisteredMetas.length > 0 ? 'bg-amber-50/50 border-amber-200 text-amber-900 dark:bg-amber-950/10' : 'bg-emerald-50/50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/10'}`}>
            {unregisteredMetas.length > 0 ? (
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="text-xs font-bold block dark:text-white">Lançamentos de Metas Pendentes</span>
              <p className="text-[11px] text-zinc-500 mt-0.5 dark:text-zinc-400">
                {unregisteredMetas.length > 0 
                  ? 'Existem colaboradores com registro diário zerado.'
                  : 'Excelente! Todos os colaboradores registraram faturamento hoje.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning/Closure controls */}
      <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800">
        {hasPendencies ? (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 text-red-900 text-xs rounded-xl flex items-start gap-2 border dark:bg-red-950/10 dark:text-red-300 dark:border-red-900/30">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> Existem pendências na competência <strong>{competenciaAtual}</strong>.
                Somente <strong>Coordenadores</strong> ou o <strong>Master Admin</strong> podem autorizar o fechamento sob esta condição informando a senha de liberação setorial.
              </div>
            </div>

            {!showOverrideForm ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setShowOverrideForm(true);
                }}
                className="w-full text-center py-2 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 font-bold transition text-white text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Lock size={13} /> Liberar Fechamento Excepcional
              </button>
            ) : (
              <form onSubmit={handleClose} className="space-y-4 p-4 border dark:border-zinc-800/80 rounded-2xl bg-zinc-50/40 dark:bg-zinc-900/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Senha Setorial Admin (Dica: "1234")</label>
                    <input
                      type="password"
                      required
                      placeholder="Senha Administrativa"
                      value={typedPassword}
                      onChange={e => setTypedPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border dark:border-zinc-850 rounded-xl text-xs text-zinc-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Justificativa de Fechamento</label>
                    <input
                      type="text"
                      required
                      maxLength={180}
                      placeholder="Ex: Demandas Klingo pendentes por falha no repasse externo"
                      value={justification}
                      onChange={e => setJustification(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border dark:border-zinc-850 rounded-xl text-xs text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{errorMessage}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOverrideForm(false)}
                    className="px-3 py-1.5 border dark:border-zinc-850 rounded-lg text-xs"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-755 text-white rounded-lg text-xs font-semibold"
                  >
                    Homologar Encerramento Excepcional
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 select-none">
              <CheckCircle2 size={14} /> Ciclo regulamentar verificado com sucesso. Pronto para fechamento!
            </span>
            <button
              onClick={() => onCloseCompetence()}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 transition font-bold text-white text-xs rounded-xl flex items-center gap-1.5"
            >
              Encerrar Competência Atual <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
