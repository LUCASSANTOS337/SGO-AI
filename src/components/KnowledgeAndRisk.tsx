import React, { useState } from 'react';
import { KnowledgeRating, User, Activity } from '../types';
import { 
  ShieldAlert, Award, AlertTriangle, CheckCircle, BarChart, ChevronDown, Check
} from 'lucide-react';

interface KnowledgeAndRiskProps {
  knowledge: KnowledgeRating[];
  users: User[];
  activities: Activity[];
  onUpdateKnowledge: (colaboradorId: string, atividadeNome: string, nivel: number) => void;
}

export function KnowledgeAndRisk({
  knowledge,
  users,
  activities,
  onUpdateKnowledge
}: KnowledgeAndRiskProps) {
  // Extract unique activity names dynamically from registered activities
  const computedCatalog = Array.from(new Set(activities.map(act => act.nome)));
  const ACTIVITIES_CATALOG = computedCatalog.length > 0 ? computedCatalog : ['Processamento JST', 'Auditoria Orizon', 'Fechamento Klingo', 'Reconciliação Bradesco'];

  const [selectedColab, setSelectedColab] = useState('');
  const [selectedAct, setSelectedAct] = useState(ACTIVITIES_CATALOG[0]);
  const [selectedLevel, setSelectedLevel] = useState<number>(3);

  // Active collaborators
  const colaboradores = users.filter(u => u.role === 'Colaborador' || u.id === 'lucas');

  const handleUpdate = (colabId: string, actName: string, level: number) => {
    onUpdateKnowledge(colabId, actName, level);
  };

  // Helper to retrieve rating
  const getRating = (colabId: string, actName: string): number => {
    const record = knowledge.find(k => k.colaboradorId === colabId && k.atividadeNome === actName);
    return record ? record.nivel : 1;
  };

  // Level display helper
  const getLevelLabel = (lvl: number) => {
    switch (lvl) {
      case 5: return 'Especialista';
      case 4: return 'Avançado';
      case 3: return 'Intermediário';
      case 2: return 'Básico';
      default: return 'Não conhece';
    }
  };

  const getLevelBg = (lvl: number) => {
    switch (lvl) {
      case 5: return 'bg-emerald-650 text-white dark:bg-emerald-800';
      case 4: return 'bg-emerald-500 text-white dark:bg-emerald-900/80';
      case 3: return 'bg-yellow-500 text-zinc-900 dark:bg-amber-800/80 dark:text-white';
      case 2: return 'bg-orange-400 text-white dark:bg-orange-950/40 dark:text-orange-300';
      default: return 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600';
    }
  };

  // Calculate Operational Risk for each activity:
  // Operational Risk = Crititcal/High if only 1 member has Avançado/Especialista (>=4) domain
  const getOperationalRisk = (actName: string) => {
    const strongExecutorsCount = colaboradores.filter(c => getRating(c.id, actName) >= 4).length;
    const basicExecutorsCount = colaboradores.filter(c => getRating(c.id, actName) >= 2).length;

    if (strongExecutorsCount === 1) {
      return { level: 'Crítico', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/50', desc: 'Apenas uma pessoa possui domínio avançado sobre esta rotina.' };
    }
    if (strongExecutorsCount === 0 && basicExecutorsCount <= 2) {
      return { level: 'Alto', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200/50', desc: 'Nenhum especialista cadastrado, equipe depende de conhecimentos básicos.' };
    }
    if (strongExecutorsCount === 2) {
      return { level: 'Médio', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/50', desc: 'Dois executores dominam a rotina. Recomenda-se treinar um terceiro.' };
    }
    return { level: 'Baixo', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/50', desc: 'Processo robusto, com múltiplos especialistas aptos para substituição imediata.' };
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Title & Stats */}
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
          <Award size={16} className="text-indigo-500" /> Matriz de Conhecimento e Riscos Singulares
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Escala de qualificação operacional: 1 (Não conhece) até 5 (Especialista). Alerta automático de dependências críticas.
        </p>
      </div>

      {/* 2D Grid Table representing knowledge ratings */}
      <div className="overflow-x-auto border border-zinc-150 dark:border-zinc-850 rounded-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-850 text-[10px] text-zinc-400 font-bold uppercase select-none">
              <th className="px-5 py-4 font-semibold text-[10px] tracking-wider">Colaborador</th>
              {ACTIVITIES_CATALOG.map(act => (
                <th key={act} className="px-5 py-4 font-semibold text-[10px] tracking-wider text-center">{act}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {colaboradores.map((colab) => (
              <tr key={colab.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/10">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-[9px] text-indigo-750 dark:text-indigo-400 shrink-0 select-none">
                      {colab.nome ? colab.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CO'}
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">{colab.nome}</span>
                      <span className="text-[10px] text-zinc-450">{colab.role}</span>
                    </div>
                  </div>
                </td>

                {ACTIVITIES_CATALOG.map(act => {
                  const rating = getRating(colab.id, act);
                  return (
                    <td key={act} className="px-5 py-3.5 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        {/* Interactive Picker on grid */}
                        <select
                          value={rating}
                          onChange={(e) => handleUpdate(colab.id, act, Number(e.target.value))}
                          className={`text-[10px] font-extrabold max-w-28 px-2 py-1 rounded-lg border-0 text-center cursor-pointer transition ${getLevelBg(rating)}`}
                        >
                          <option value={1} className="bg-white dark:bg-zinc-900 text-zinc-700">1 - Não conhece</option>
                          <option value={2} className="bg-white dark:bg-zinc-900 text-zinc-700">2 - Básico</option>
                          <option value={3} className="bg-white dark:bg-zinc-900 text-zinc-700">3 - Intermediário</option>
                          <option value={4} className="bg-white dark:bg-zinc-900 text-zinc-705">4 - Avançado</option>
                          <option value={5} className="bg-white dark:bg-zinc-900 text-zinc-900">5 - Especialista</option>
                        </select>
                        <span className="text-[9px] text-zinc-400">{getLevelLabel(rating)}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risco Operacional Alerts Block */}
      <div className="space-y-3.5">
        <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">Prevenção e Análise de Risco Operacional (Continuidade)</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACTIVITIES_CATALOG.map(act => {
            const risk = getOperationalRisk(act);
            const isDanger = risk.level === 'Crítico' || risk.level === 'Alto';

            return (
              <div 
                key={act} 
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all duration-300 ${isDanger ? 'border-amber-200' : 'border-zinc-150'} ${risk.color}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h5 className="font-bold text-xs text-zinc-950 dark:text-white">{act}</h5>
                    <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-1">{risk.desc}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border dark:border-zinc-800">
                    Risco {risk.level}
                  </span>
                </div>

                {isDanger && (
                  <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-850/50 flex items-center gap-1 text-[10px] text-zinc-500 font-semibold select-none">
                    <ShieldAlert size={12} className="text-amber-500" />
                    Recomendação: Realizar shadowing / transferir conhecimento antes das férias da equipe.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
