import React, { useState, useEffect } from 'react';
import { ProductionGoal, User, Holiday } from '../types';
import { 
  Calculator, Check, AlertCircle, RefreshCw, Layers, Sparkles, TrendingUp, HelpCircle, ArrowLeft, ArrowRight, UserCheck, Edit2, Calendar,
  FileSpreadsheet, Download
} from 'lucide-react';
import { getTodayFormatted } from '../utils/competencias';

interface MetasTrackerProps {
  productionGoals: ProductionGoal[];
  users: User[];
  activeUser: User | null;
  currentSimulatedDate: string;
  onUpdateGoalTodayProduction: (goalId: string, collaboratorId: string, qty: number) => void;
  onAdvanceGoalDay: (goalId: string) => void;
  onAdjustProduction: (goalId: string, date: string, collaboratorId: string, qty: number) => void;
  holidays: Holiday[];
  onResetSimulatedDate?: () => void;
  onUpdateInvoiceStatus?: (goalId: string, numFatura: string, newStatus: 'Pendente' | 'Concluída') => void;
}

export function MetasTracker({
  productionGoals,
  users,
  activeUser,
  currentSimulatedDate,
  onUpdateGoalTodayProduction,
  onAdvanceGoalDay,
  onAdjustProduction,
  holidays,
  onResetSimulatedDate,
  onUpdateInvoiceStatus
}: MetasTrackerProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [typedQty, setTypedQty] = useState<string>('12.5');
  
  // New States
  const [viewDate, setViewDate] = useState<string>(currentSimulatedDate);
  const [selectedColabHistoryId, setSelectedColabHistoryId] = useState<string | null>(null);
  const [adjustingColabId, setAdjustingColabId] = useState<string | null>(null);
  const [adjustQtyInput, setAdjustQtyInput] = useState<string>('');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState<'Todas' | 'Pendente' | 'Concluída'>('Todas');
  const [selectedInvoiceOwnerId, setSelectedInvoiceOwnerId] = useState<string>('all');

  // Keep viewDate synchronized when simulated date shifts
  useEffect(() => {
    setViewDate(currentSimulatedDate);
  }, [currentSimulatedDate]);

  useEffect(() => {
    if (activeUser && activeUser.role !== 'Admin' && activeUser.role !== 'Coordenação') {
      setSelectedInvoiceOwnerId(activeUser.id);
    } else {
      setSelectedInvoiceOwnerId('all');
    }
  }, [activeUser]);

  // Find active goal
  const activeGoal = productionGoals.find(g => g.id === selectedGoalId) || productionGoals[0];

  const handleRegisterToday = (userId: string, inputQty: number) => {
    if (!activeGoal) return;
    onUpdateGoalTodayProduction(activeGoal.id, userId, inputQty);
  };

  if (!activeGoal) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-sm text-center text-xs text-zinc-400">
        Nenhuma meta de produção cadastrada para a competência ativa.
      </div>
    );
  }

  // Helpers to navigate business days
  const getPrevBusinessDay = (dateStr: string, holidaysList: Holiday[]): string => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const curr = new Date(year, month, day);
    curr.setDate(curr.getDate() - 1);
    
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  const handleGoToPrevDay = () => {
    const prevDay = getPrevBusinessDay(viewDate, holidays);
    // Limit to block going before the start of the simulation month if you want, but allow traversing history
    setViewDate(prevDay);
  };

  const handleGoToNextDay = () => {
    if (viewDate >= currentSimulatedDate) {
      return;
    }
    const nextDay = getNextBusinessDay(viewDate, holidays);
    setViewDate(nextDay);
  };

  // Auto Calculations
  const participantsCount = activeGoal.participantesIds.length;
  
  // 1. Initial Meta Base (e.g. 1000 / 20 / 4 = 12.5)
  const metaDiariaOriginal = activeGoal.quantidadeTotal / activeGoal.diasUteis / (participantsCount || 1);

  // 2. Cumulative team production
  const teamCumulativeDone = activeGoal.participantesIds.reduce((sum, pId) => {
    const ac = activeGoal.producaoAcumulada[pId] || 0;
    const hj = activeGoal.producaHoje[pId] || 0;
    return sum + ac + hj;
  }, 0);

  const teamTotalCompletedPercent = Math.min(100, Math.round((teamCumulativeDone / activeGoal.quantidadeTotal) * 100));
  const teamTotalRemaining = Math.max(0, activeGoal.quantidadeTotal - teamCumulativeDone);

  // 3. Recalculated Target:
  const previousDaysTotalCompleted = activeGoal.participantesIds.reduce((sum, pId) => {
    return sum + (activeGoal.producaoAcumulada[pId] || 0);
  }, 0);
  
  const remainingTotalToDistribute = Math.max(0, activeGoal.quantidadeTotal - previousDaysTotalCompleted);
  const calculatedMetaDiariaIndividual = activeGoal.diasRestantes > 0 
    ? Number((remainingTotalToDistribute / activeGoal.diasRestantes / (participantsCount || 1)).toFixed(2))
    : 0;

  const isPastView = viewDate !== currentSimulatedDate;
  const canAdjust = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';

  // Retrieve selected collaborator's production data for the viewDate
  const getColabProdOnViewDate = (cId: string) => {
    if (isPastView) {
      return activeGoal.historicoDiario[viewDate]?.[cId] ?? 0;
    } else {
      return activeGoal.producaHoje[cId] ?? 0;
    }
  };

  const handleSaveAdjustment = (colabId: string) => {
    const nextVal = parseFloat(adjustQtyInput) || 0;
    onAdjustProduction(activeGoal.id, viewDate, colabId, nextVal);
    setAdjustingColabId(null);
  };

  // Historic log calculation for popup modal (Item 6)
  const colabInModal = users.find(u => u.id === selectedColabHistoryId);
  const colabHistoryRows = colabInModal ? (() => {
    const rows = [];
    // 1. Add days from history
    Object.keys(activeGoal.historicoDiario).forEach(dateKey => {
      const prod = activeGoal.historicoDiario[dateKey]?.[colabInModal.id] ?? 0;
      rows.push({
        date: dateKey,
        production: prod,
        // The general dynamic daily goal or exact historical goal (let's assume calculatedMetaDiariaIndividual as standard reference)
        goal: calculatedMetaDiariaIndividual || metaDiariaOriginal,
        isToday: false
      });
    });
    // 2. Add today if there is production recorded
    if (activeGoal.producaHoje[colabInModal.id] !== undefined) {
      rows.push({
        date: currentSimulatedDate,
        production: activeGoal.producaHoje[colabInModal.id],
        goal: calculatedMetaDiariaIndividual,
        isToday: true
      });
    }
    // Sort chronological
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  })() : [];

  const invoiceListToRender = (activeGoal.faturas || []).filter(f => {
    if (selectedInvoiceOwnerId !== 'all') {
      if (selectedInvoiceOwnerId === 'coordenacao') {
        if (f.responsavelId !== 'coordenacao' && f.responsavelId !== 'COORDENACAO') {
          return false;
        }
      } else {
        if (f.responsavelId !== selectedInvoiceOwnerId) {
          return false;
        }
      }
    }

    if (invoiceFilterStatus !== 'Todas') {
      if (f.status !== invoiceFilterStatus) {
        return false;
      }
    }

    if (invoiceSearch.trim() !== '') {
      const searchLower = invoiceSearch.toLowerCase();
      const numMatch = f.numFatura.toLowerCase().includes(searchLower);
      const nameMatch = f.nomeFantasia.toLowerCase().includes(searchLower);
      const codeMatch = f.codCred.toLowerCase().includes(searchLower);
      if (!numMatch && !nameMatch && !codeMatch) {
         return false;
      }
    }

    return true;
  });

  const handleDownloadCollaboratorInvoices = () => {
    if (!activeGoal) return;

    const isSpecificColab = selectedInvoiceOwnerId !== 'all' && selectedInvoiceOwnerId !== 'coordenacao';
    const targetId = isSpecificColab 
      ? selectedInvoiceOwnerId 
      : (activeUser?.role !== 'Admin' && activeUser?.role !== 'Coordenação' ? activeUser?.id : null);

    let faturasDoColaborador = (activeGoal.faturas || []);
    let docName = activeGoal.planilhaAnexo?.nome || 'Faturas';
    
    if (targetId) {
      // Filter only for this collaborator
      faturasDoColaborador = faturasDoColaborador.filter(f => f.responsavelId === targetId);
      const colabName = users.find(u => u.id === targetId)?.nome || 'Colaborador';
      const sanitizedName = colabName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
      const sanitizedCompetencia = activeGoal.competencia.replace('/', '_');
      docName = `faturas_${sanitizedName}_${sanitizedCompetencia}.csv`;
    } else {
      const sanitizedCompetencia = activeGoal.competencia.replace('/', '_');
      docName = `todas_faturas_por_colaborador_${sanitizedCompetencia}.csv`;
    }

    // Generate CSV with Brazilian formatting (semicolon separator, comma decimal)
    let csvContent = 'NUM_FATURA;CODCRED;CGC_CPF;NOME_FANTASIA;VL_FATURA;CONSULTA;SADT;RESUMO_INTERN;HONORARIO_INDIVID;STATUS;COMPLEXIDADE;RESPONSAVEL\n';
    
    faturasDoColaborador.forEach(f => {
      const formatNum = (v: number) => String(v || 0).replace('.', ',');
      const respName = f.responsavelId === 'coordenacao' || f.responsavelId === 'COORDENACAO' 
        ? 'COORDENACAO' 
        : (users.find(u => u.id === f.responsavelId)?.nome || f.responsavelId);
      
      csvContent += `"${f.numFatura || ''}";"${f.codCred || ''}";"${f.cgcCpf || ''}";"${(f.nomeFantasia || '').replace(/"/g, '""')}";${formatNum(f.vlFatura)};${formatNum(f.consulta)};${formatNum(f.sadt)};${formatNum(f.resumoIntern)};${formatNum(f.honorarioIndivid)};"${f.status || 'Pendente'}";${formatNum(f.complexidade)};"${respName}"\n`;
    });

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', docName.endsWith('.csv') ? docName : `${docName.split('.')[0]}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6 font-sans">
      
      {/* Selector & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 flex-wrap">
            🎯 Indicador de Metas de Produção Inteligente
            {isPastView && (
              <span className="text-[10px] bg-rose-500 text-white font-mono px-2 py-0.5 rounded-full uppercase animate-pulse">
                Modo Histórico (Consulta)
              </span>
            )}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Cálculo dinâmico baseado em dias úteis restantes e compensações automáticas de faturamento.
          </p>
        </div>
        
        {productionGoals.length > 1 && (
          <select
            value={selectedGoalId || activeGoal.id}
            onChange={e => setSelectedGoalId(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white rounded-xl border dark:border-zinc-800 focus:outline-none"
          >
            {productionGoals.map(g => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main calculation indicator card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-50/50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-150/70 dark:border-zinc-800 select-none">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Meta Total Volumétrica</span>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">{activeGoal.quantidadeTotal} faturas</div>
          <p className="text-[10px] text-zinc-500 font-medium">Dias Úteis: {activeGoal.diasUteis} dias</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Dias Úteis Restantes</span>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{activeGoal.diasRestantes} de {activeGoal.diasUteis}</div>
          <p className="text-[10px] text-zinc-500 font-medium">Participantes Ativos: {participantsCount}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Meta Diária Individual</span>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
            {calculatedMetaDiariaIndividual}
            <span className="text-xs font-normal text-zinc-400 line-through" title="Meta original sem recálculos">({metaDiariaOriginal.toFixed(1)})</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-semibold flex items-center gap-0.5">
            <TrendingUp size={11} className="text-amber-500" /> Meta com Recálculo ativo
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Saldos Operacionais</span>
          <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{teamTotalRemaining} faturas</div>
          <p className="text-[10px] text-zinc-500 font-medium">Concluído Equipe: {teamTotalCompletedPercent}%</p>
        </div>
      </div>

      {/* Spreadsheet Attachment Block */}
      {activeGoal.planilhaAnexo && (
        <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs animate-fade-in select-none">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <p className="font-extrabold text-zinc-900 dark:text-white leading-none flex items-center gap-1.5 flex-wrap">
                📋 Planilha de Faturamento e Numerações
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/45 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Excel / CSV</span>
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
                {activeGoal.planilhaAnexo.nome} ({activeGoal.planilhaAnexo.tamanho}) • Anexado a este planejamento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadCollaboratorInvoices}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-100 dark:shadow-none transition-all cursor-pointer shrink-0"
          >
            <Download size={13} />
            Baixar Planilha de Faturas
          </button>
        </div>
      )}

      {/* Date Navigation Bar and Input Area (Item 5) */}
      <div className="p-4 bg-indigo-50/40 dark:bg-zinc-950 border border-indigo-150/50 dark:border-indigo-950/60 rounded-2xl space-y-4">
        
        {/* Navigation header row */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b dark:border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded-lg">
              <Calendar size={15} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">Calendário de Expedientes</span>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-xs font-black text-zinc-900 dark:text-white block">
                  Visualizando dia: <span className="font-mono text-indigo-600 dark:text-indigo-400">{viewDate.split('-').reverse().join('/')}</span>
                </span>
                {currentSimulatedDate !== getTodayFormatted() && onResetSimulatedDate && (
                  <button
                    onClick={onResetSimulatedDate}
                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-md text-[9px] font-bold transition flex items-center gap-1 border border-amber-200 dark:border-amber-900 leading-none select-none cursor-pointer"
                    title="O sistema está com data de expediente simulada diferente do dia real de hoje no Brasil (05/06/2026). Clique para redefinir."
                  >
                    <RefreshCw size={8} /> Redefinir para Hoje Real (05/06/2026)
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 select-none">
            <button
              onClick={handleGoToPrevDay}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border dark:border-zinc-800 rounded-xl text-zinc-650 dark:text-zinc-300 text-[11px] font-bold flex items-center gap-1 transition"
            >
              <ArrowLeft size={11} /> Dia Anterior
            </button>
            <span className="text-zinc-300 dark:text-zinc-800">|</span>
            <button
              onClick={handleGoToNextDay}
              disabled={viewDate >= currentSimulatedDate}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition ${
                viewDate >= currentSimulatedDate 
                  ? 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 text-zinc-400' 
                  : 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border dark:border-zinc-800 text-zinc-650 dark:text-zinc-300'
              }`}
            >
              Próximo Dia <ArrowRight size={11} />
            </button>
          </div>
        </div>

        {/* Input workspace layout depending on View Date */}
        {!isPastView ? (
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5 leading-none">
                <Calculator size={13} /> Meu Painel de Produção Diário
              </h4>
              <p className="text-[10px] text-indigo-850/80 dark:text-zinc-400 mt-1">
                Lançando faturamento para o executor logado: <strong>{activeUser?.nome}</strong> ({activeUser?.role})
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-700 dark:text-zinc-400">Sua meta de hoje:</span>
                <span className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-lg font-mono font-bold">{calculatedMetaDiariaIndividual}</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={typedQty}
                  onChange={e => setTypedQty(e.target.value)}
                  className="px-3.5 py-2 w-28 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-xs rounded-xl text-zinc-900 dark:text-white font-mono"
                />
                <button
                  onClick={() => {
                    if (!activeUser) return;
                    handleRegisterToday(activeUser.id, parseFloat(typedQty) || 0);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 transition rounded-xl text-white text-xs font-bold"
                >
                  Confirmar Lançamento
                </button>
              </div>

              <div className="flex items-center gap-3 pl-2 sm:border-l dark:border-zinc-850">
                <button
                  onClick={() => onAdvanceGoalDay(activeGoal.id)}
                  className="flex items-center gap-1 py-2 px-4 bg-zinc-900 dark:bg-zinc-800 hover:bg-indigo-600 dark:hover:bg-indigo-605 rounded-xl text-xs font-bold transition text-white"
                  title="Finaliza o expediente atual e consolida metas e desvios no log mensal."
                >
                  <RefreshCw size={12} className="animate-spin-slow text-indigo-400" /> Fechar Expediente
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/40 border dark:border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-[11px] text-zinc-500 max-w-xl leading-relaxed">
              <strong>📆 Modo Histórico Ativo:</strong> Você está visualizando os lançamentos consolidados do expediente passado de <strong>{viewDate.split('-').reverse().join('/')}</strong>. Não é possível alterar dados normais neste modo, a menos que possua privilégios administrativos.
            </div>
            <button
              onClick={() => setViewDate(currentSimulatedDate)}
              className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-zinc-800 dark:text-white border px-3 py-1.5 rounded-xl font-bold tracking-wider uppercase transition shrink-0"
            >
              Voltar ao Dia Atual
            </button>
          </div>
        )}

      </div>

      {/* PANEL: SGO AUTOMATIC INVOICE CHECKLIST & DISTRIBUTION TRACKING */}
      {activeGoal.faturas && activeGoal.faturas.length > 0 ? (
        <div className="bg-zinc-50/75 dark:bg-zinc-950 border border-zinc-155 dark:border-zinc-800 rounded-2xl p-5 space-y-4 animate-fade-in text-xs font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b dark:border-zinc-850 pb-3">
            <div>
              <h4 className="font-extrabold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 leading-none">
                <FileSpreadsheet size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Lista e Conciliação de Faturas do Lote</span>
              </h4>
              <p className="text-[10px] text-zinc-500 mt-1">
                Marque as faturas como concluídas para que a contagem de faturamento diário seja recalculada em tempo real.
              </p>
            </div>

            <div className="flex gap-2 text-[9px] font-mono select-none">
              <span className="px-2 py-1 bg-white dark:bg-zinc-900 border dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg font-bold">
                Total: {(activeGoal.faturas || []).length}
              </span>
              <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10 rounded-lg font-black">
                Concluídas: {(activeGoal.faturas || []).filter(f => f.status === 'Concluída').length}
              </span>
              <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/10 rounded-lg font-black">
                Pendentes: {(activeGoal.faturas || []).filter(f => f.status === 'Pendente').length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-450 tracking-wider">Visualizar faturas de</label>
              {(activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação') ? (
                <select
                  value={selectedInvoiceOwnerId}
                  onChange={e => setSelectedInvoiceOwnerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white rounded-xl border dark:border-zinc-800"
                >
                  <option value="all">Todas as faturas do lote</option>
                  <option value="coordenacao">Coordenação (Consulta Pura)</option>
                  {activeGoal.participantesIds.map(pId => (
                    <option key={pId} value={pId}>
                      {users.find(u => u.id === pId)?.nome || pId}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-2.5 py-1.5 bg-zinc-100/60 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-350 rounded-xl border dark:border-zinc-800 font-bold">
                  {activeUser?.nome} (Sua carteira pessoal)
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-450 tracking-wider">Filtrar por Status</label>
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl border dark:border-zinc-800">
                {(['Todas', 'Pendente', 'Concluída'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setInvoiceFilterStatus(st)}
                    className={`flex-1 py-1 text-[10px] uppercase font-bold text-center rounded-lg transition-all cursor-pointer ${
                      invoiceFilterStatus === st
                        ? 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-400 shadow-sm font-black'
                        : 'text-zinc-505 hover:text-zinc-700 dark:hover:text-zinc-350'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-455 tracking-wider">Pesquisar faturas</label>
              <input
                type="text"
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                placeholder="Nº Fatura, Credenciado, etc..."
                className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white rounded-xl border dark:border-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[10px] select-none">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 border-b dark:border-zinc-800 font-bold uppercase text-[9px] tracking-wider text-zinc-400">
                  <tr>
                    <th className="p-2 w-10 text-center">Ação</th>
                    <th className="p-2">Nº Fatura</th>
                    <th className="p-2">Nome Fantasia / Credenciado</th>
                    <th className="p-2 text-right">Valor bruto</th>
                    <th className="p-2 text-center">Complexidade (Pts)</th>
                    <th className="p-2 text-center">Responsável Alocado</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-850">
                  {invoiceListToRender.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-450 italic">
                        Nenhuma fatura correspondente aos critérios de busca foi encontrada neste lote.
                      </td>
                    </tr>
                  ) : (
                    invoiceListToRender.map((invoice, idx) => {
                      const isCompleted = invoice.status === 'Concluída';
                      const ownerName = invoice.responsavelId === 'COORDENACAO' || invoice.responsavelId === 'coordenacao'
                        ? 'COORDENAÇÃO (SGO)' 
                        : (users.find(u => u.id === invoice.responsavelId)?.nome || invoice.responsavelId);

                      const canToggle = activeUser?.role === 'Admin' || 
                                        activeUser?.role === 'Coordenação' || 
                                        activeUser?.id === invoice.responsavelId;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors ${
                            isCompleted ? 'bg-emerald-500/10 dark:bg-emerald-900/20' : ''
                          }`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              disabled={!canToggle || isPastView}
                              onChange={() => {
                                if (onUpdateInvoiceStatus && !isPastView) {
                                  onUpdateInvoiceStatus(
                                    activeGoal.id,
                                    invoice.numFatura,
                                    isCompleted ? 'Pendente' : 'Concluída'
                                  );
                                }
                              }}
                              className={`rounded text-emerald-600 focus:ring-0 ${
                                canToggle && !isPastView ? 'cursor-pointer animate-scale-in' : 'cursor-not-allowed opacity-50'
                              }`}
                              title={
                                !canToggle
                                  ? 'Você só pode alterar o status de faturas alocadas para você!'
                                  : isPastView
                                  ? 'Impossível alterar faturas no modo histórico!'
                                  : 'Marcar como Concluída'
                              }
                            />
                          </td>

                          <td className="p-2 font-mono font-bold text-white">
                            {invoice.numFatura}
                          </td>

                          <td className="p-2 font-semibold">
                            <span className="block truncate max-w-xs">{invoice.nomeFantasia}</span>
                            <span className="text-[8px] text-zinc-450 font-mono">CGC/CPF: {invoice.cgcCpf || 'N/A'} • CODCRED: {invoice.codCred}</span>
                          </td>

                          <td className="p-2 text-right font-mono font-medium text-white">
                            {invoice.vlFatura.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          <td className="p-2 text-center font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded-full font-extrabold text-[8.5px] ${
                                invoice.complexidade >= 5
                                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                                  : invoice.complexidade >= 2.5
                                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500'
                                  : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400'
                              }`}
                            >
                              {invoice.complexidade} pt
                            </span>
                          </td>

                          <td className="p-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md font-bold text-[8px] uppercase truncate max-w-[125px] ${
                                invoice.responsavelId === 'COORDENACAO' || invoice.responsavelId === 'coordenacao'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400'
                                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 text-zinc-750'
                              }`}
                              title={ownerName}
                            >
                              {ownerName}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl text-center font-sans space-y-1">
          <p className="text-zinc-455 font-bold text-[10px] uppercase">📋 Nenhuma Planilha de Faturamento Integrada no Lote</p>
          <p className="text-[9px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Este lote usa entrada manual simples. Para habilitar o checklist analítico de faturas e os rateios automáticos, anexe e processe a planilha de faturas no painel de <strong>Planejamento do Setor</strong>.
          </p>
        </div>
      )}

      {/* Collaborators progress list */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Acompanhamento de Rendimento da Equipe</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeGoal.participantesIds.map(pId => {
            const participant = users.find(u => u.id === pId);
            const qtyOnDate = getColabProdOnViewDate(pId);
            const isTargetMet = qtyOnDate >= calculatedMetaDiariaIndividual;
            const absoluteTotal = (activeGoal.producaoAcumulada[pId] || 0) + (qtyOnDate);
            const isCurrentlyAdjusting = adjustingColabId === pId;

            return (
              <div 
                key={pId} 
                className="p-4 bg-zinc-50/30 dark:bg-zinc-900/40 rounded-2xl border dark:border-zinc-850 space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Participant badge and header */}
                  <div className="flex items-center justify-between">
                    <div 
                      onClick={() => setSelectedColabHistoryId(pId)}
                      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
                      title="Clique para abrir histórico diário do colaborador"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-[10px] text-indigo-750 dark:text-indigo-400 shrink-0 select-none">
                        {participant?.nome ? participant.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CO'}
                      </div>
                      <div className="truncate">
                        <h5 className="font-extrabold text-xs text-zinc-900 dark:text-white leading-none hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-0.5">
                          {participant?.nome}
                        </h5>
                        <span className="text-[9px] text-zinc-450 block mt-1 uppercase tracking-widest">{participant?.role}</span>
                      </div>
                    </div>

                    {/* Admin Override Trigger (Item 4) */}
                    {canAdjust && !isCurrentlyAdjusting && (
                      <button
                        onClick={() => {
                          setAdjustingColabId(pId);
                          setAdjustQtyInput(String(qtyOnDate));
                        }}
                        className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded transition"
                        title="Ajustar esta produção retroativamente"
                      >
                        <Edit2 size={11} />
                      </button>
                    )}
                  </div>

                  {/* Operational values */}
                  <div className="space-y-1.5 mt-4">
                    
                    {isCurrentlyAdjusting ? (
                      <div className="space-y-1.5 bg-zinc-100 p-2.5 rounded-xl dark:bg-zinc-950 border dark:border-zinc-850">
                        <span className="text-[9px] uppercase font-bold text-zinc-400">Ajustar Produção:</span>
                        <div className="flex gap-1">
                          <input 
                            type="number" 
                            step="0.1"
                            value={adjustQtyInput}
                            onChange={e => setAdjustQtyInput(e.target.value)}
                            className="w-16 px-1.5 py-1 bg-white border rounded text-xs text-zinc-900 dark:bg-zinc-900 dark:text-white font-mono"
                          />
                          <button 
                            onClick={() => handleSaveAdjustment(pId)}
                            className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[10px]"
                          >
                            Ok
                          </button>
                          <button 
                            onClick={() => setAdjustingColabId(null)}
                            className="px-1.5 py-1 bg-zinc-300 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 rounded text-[10px]"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-zinc-500 dark:text-zinc-450">Faturamentos do dia:</span>
                        <span className="font-mono font-black text-zinc-900 dark:text-white">{qtyOnDate} faturas</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline text-[10px] text-zinc-450 pt-1 border-t dark:border-zinc-850">
                      <span>Total Acumulado Mês:</span>
                      <span className="font-mono">{absoluteTotal} faturas</span>
                    </div>
                  </div>
                </div>

                {/* Validation Status Tags */}
                <div className="pt-3 border-t dark:border-zinc-850 select-none">
                  {qtyOnDate === 0 ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                      <AlertCircle size={11} className="stroke-2 shrink-0" /> Ausente Hoje / Aguardando
                    </span>
                  ) : isTargetMet ? (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      <Check size={11} className="stroke-2 shrink-0" /> Meta atingida de {calculatedMetaDiariaIndividual}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-rose-600 dark:text-rose-450">
                      <AlertCircle size={11} className="stroke-2 shrink-0 animate-pulse" /> Meta defasada (Déficit: -{(calculatedMetaDiariaIndividual - qtyOnDate).toFixed(1)})
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Historic daily production log lookup (Item 6) */}
      {selectedColabHistoryId && colabInModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-fade-in text-xs">
            
            <div className="flex justify-between items-start border-b dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-[10px] text-indigo-750 dark:text-indigo-400 shrink-0 select-none">
                  {colabInModal.nome ? colabInModal.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CO'}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    📈 Histórico diário de {colabInModal.nome}
                  </h4>
                  <p className="text-[10px] text-zinc-400">Registros consolidados de faturamento na competência {activeGoal.competencia}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedColabHistoryId(null)}
                className="p-1 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-805 text-zinc-500 rounded-lg font-bold"
              >
                Voltar
              </button>
            </div>

            {/* List Table of Logs */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5">Data de Expediente</th>
                    <th className="py-2.5 text-center">Meta do Dia</th>
                    <th className="py-2.5 text-center">Faturado</th>
                    <th className="py-2.5 text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-850">
                  {colabHistoryRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-450 italic">
                        Nenhum faturamento registrado até o momento para este operador.
                      </td>
                    </tr>
                  ) : (
                    colabHistoryRows.map((row, idx) => {
                      const isMet = row.production >= row.goal;
                      return (
                        <tr key={idx} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 ${row.isToday ? 'bg-indigo-50/15 font-bold' : ''}`}>
                          <td className="py-3 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {row.date.split('-').reverse().join('/')}
                            {row.isToday && <span className="ml-1.5 text-[8px] bg-indigo-100 text-indigo-700 px-1 rounded">Hoje</span>}
                          </td>
                          <td className="py-3 text-center text-zinc-500">{row.goal} faturas</td>
                          <td className="py-3 text-center font-mono font-bold text-zinc-850 dark:text-white">{row.production} faturas</td>
                          <td className="py-3 text-right">
                            {row.production === 0 ? (
                              <span className="inline-block px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold uppercase text-zinc-400 rounded-full">Ausente / S.I.</span>
                            ) : isMet ? (
                              <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 text-[9px] font-black uppercase rounded-full">✅ Meta Batida</span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-[9px] font-black uppercase rounded-full">❌ Não Atingida</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-zinc-400 leading-relaxed text-center pt-2 select-none">
              Valores calculados em tempo real de acordo com as presenças de trabalho registradas.
            </p>

          </div>
        </div>
      )}

    </div>
  );
}
