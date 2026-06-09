import React, { useState, useRef } from 'react';
import { Activity, User, Procedure, ProductionGoal, KnowledgeRating, Vacation } from '../types';
import { 
  CheckCircle2, Clock, Calendar, AlertTriangle, MessageSquare, BookOpen, 
  Award, Save, BookMarked, Paperclip, UserCheck, AlertCircle, RefreshCw,
  TrendingUp, Users, ChevronRight, X, FileText, ArrowRight, ShieldAlert,
  CalendarDays, Download, Info
} from 'lucide-react';

interface ExecucaoDiaProps {
  activities: Activity[];
  users: User[];
  activeUser: User | null;
  currentSimulatedDate: string;
  procedures: Procedure[];
  productionGoals: ProductionGoal[];
  onUpdateActivity: (actId: string, updatedFields: Partial<Activity>) => void;
  onAddComment: (actId: string, text: string) => void;
  onUpdateGoalTodayProduction: (goalId: string, collaboratorId: string, qty: number) => void;
  
  // Optional but fully passed props for intelligent analytics
  knowledge?: KnowledgeRating[];
  vacations?: Vacation[];
  onAddAuditLog?: (action: string, prev?: string, next?: string) => void;
}

export function ExecucaoDia({
  activities,
  users,
  activeUser,
  currentSimulatedDate,
  procedures,
  productionGoals,
  onUpdateActivity,
  onAddComment,
  onUpdateGoalTodayProduction,
  knowledge = [],
  vacations = [],
  onAddAuditLog
}: ExecucaoDiaProps) {
  
  // ----------------------------------------------------
  // States & Core Selectors
  // ----------------------------------------------------
  const isManager = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';
  
  // Active operator to filter the view for
  const [selectedColabId, setSelectedColabId] = useState<string>(activeUser?.id || '');
  const targetColab = isManager 
    ? (users.find(u => u.id === selectedColabId) || activeUser) 
    : activeUser;
  const colabId = targetColab?.id || '';

  // Modal / Control Overlay States
  const [postponingActId, setPostponingActId] = useState<string | null>(null);
  const [postponeDate, setPostponeDate] = useState<string>('');
  const [postponeReason, setPostponeReason] = useState<string>('Dependência de terceiro');
  const [customPostponeReason, setCustomPostponeReason] = useState<string>('');

  const [commentingActId, setCommentingActId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');

  const [reassigningActId, setReassigningActId] = useState<string | null>(null);
  const [activeProcedure, setActiveProcedure] = useState<Procedure | null>(null);
  
  // Attachment Simulation
  const [attachingActId, setAttachingActId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ [actId: string]: { name: string; size: string }[] }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scorecard modal State
  const [selectedScoreUserId, setSelectedScoreUserId] = useState<string | null>(null);

  // Translate simulated Month/Year to Competencia name
  const monthMap: { [key: string]: string } = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
  };
  const parts = currentSimulatedDate.split('-');
  const competenceFromSimulated = parts.length >= 2 ? `${monthMap[parts[1]]}/${parts[0]}` : 'Junho/2026';
  const activeCompetence = competenceFromSimulated;

  // ----------------------------------------------------
  // Activity Filters for Target Collaborator
  // ----------------------------------------------------
  const colabActivities = activities.filter(act => {
    return act.responsavelAtualId === colabId || act.responsaveisAuxiliaresIds?.includes(colabId);
  });

  // Today's activities
  const todayActivities = colabActivities.filter(act => act.dataLimite === currentSimulatedDate);

  // Overdue activities
  const overdueActivities = colabActivities.filter(act => act.dataLimite < currentSimulatedDate && act.status !== 'Concluída');

  // Both represent the Job Queue (Fila de Trabalho)
  const scheduledActivities = [...overdueActivities, ...todayActivities];

  // Helper for Procedure pairing
  const getProcedureForActivity = (actName: string): Procedure | null => {
    return procedures.find(proc => 
      (proc.titulo.toLowerCase().trim() === actName.toLowerCase().trim() ||
       actName.toLowerCase().includes(proc.titulo.toLowerCase()) ||
       proc.titulo.toLowerCase().includes(actName.toLowerCase())) &&
      proc.status === 'Aprovado'
    ) || null;
  };

  // ----------------------------------------------------
  // Core Operational Metrics Calculations (Daily Production)
  // ----------------------------------------------------
  const activeGoal = productionGoals.find(g => 
    g.competencia === activeCompetence && g.participantesIds.includes(colabId)
  );

  const participantsCount = activeGoal?.participantesIds.length || 1;

  // Calculate meta diária individual exactly matching Volumes e Metas tab
  const metaDiariaOriginal = activeGoal ? (activeGoal.quantidadeTotal / activeGoal.diasUteis / participantsCount) : 0;
  const previousDaysTotalCompleted = activeGoal ? activeGoal.participantesIds.reduce((sum, pId) => {
    return sum + (activeGoal.producaoAcumulada[pId] || 0);
  }, 0) : 0;
  const remainingTotalToDistribute = activeGoal ? Math.max(0, activeGoal.quantidadeTotal - previousDaysTotalCompleted) : 0;

  const calculatedMetaDiariaIndividual = activeGoal
    ? (activeGoal.diasRestantes > 0 
        ? Number((remainingTotalToDistribute / activeGoal.diasRestantes / participantsCount).toFixed(2))
        : 0)
    : 0;

  const META_DIARIA = calculatedMetaDiariaIndividual || metaDiariaOriginal;

  const currentProductionToday = activeGoal?.producaHoje[colabId] ?? 0;
  const saldoHoje = META_DIARIA > 0 ? (currentProductionToday - META_DIARIA) : 0;
  const isAcimaMeta = META_DIARIA > 0 ? (saldoHoje >= 0) : true;

  // Monthly Cumulative Calculations
  const previousCompleted = activeGoal ? (activeGoal.producaoAcumulada[colabId] || 0) : 0;
  const producaoAcumuladaTotal = previousCompleted + currentProductionToday;
  
  // Cumulative Target: Proportional goal total up to now (provisional target logic)
  const colabTotalGoalShare = activeGoal ? (activeGoal.quantidadeTotal / participantsCount) : 0;
  const diasSendoTrabalhados = activeGoal ? Math.max(1, activeGoal.diasUteis - activeGoal.diasRestantes + 1) : 0;
  const metaAcumuladaMes = activeGoal ? Number((colabTotalGoalShare * (diasSendoTrabalhados / (activeGoal?.diasUteis || 20))).toFixed(1)) : 0;
  const saldoAcumuladoMes = activeGoal ? Number((producaoAcumuladaTotal - metaAcumuladaMes).toFixed(1)) : 0;

  // ----------------------------------------------------
  // Termômetro da Competência Statistics
  // ----------------------------------------------------
  // Aggregate data for the whole active goal (team performance)
  const totalRealizadoEquipe = activeGoal 
    ? Object.keys(activeGoal.producaoAcumulada).reduce((sum, pId) => sum + (activeGoal.producaoAcumulada[pId] || 0), 0) + 
      Object.keys(activeGoal.producaHoje).reduce((sum, pId) => sum + (activeGoal.producaHoje[pId] || 0), 0)
    : 0;
  const metaTotalEquipe = activeGoal?.quantidadeTotal || 0;
  const totalPercentTermometro = metaTotalEquipe > 0 ? Math.min(100, Math.round((totalRealizadoEquipe / metaTotalEquipe) * 100)) : 0;
  const saldoRestanteEquipe = activeGoal ? Math.max(0, metaTotalEquipe - totalRealizadoEquipe) : 0;
  const diasUteisRestantes = activeGoal?.diasRestantes ?? 0;
  const metaDiariaAtualizadaEquipe = (activeGoal && diasUteisRestantes > 0)
    ? Number((saldoRestanteEquipe / (diasUteisRestantes * (activeGoal?.participantesIds.length || 1))).toFixed(2))
    : 0;

  const [inputProdText, setInputProdText] = useState<string>('');

  const handleSaveProduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;
    const qty = parseFloat(inputProdText) || 0;
    onUpdateGoalTodayProduction(activeGoal.id, colabId, qty);
    
    // Log registration
    if (onAddAuditLog) {
      onAddAuditLog(
        `Produção Informada`,
        `${targetColab?.nome} produziu anteriormente: ${currentProductionToday}`,
        `Nova quantidade informada: ${qty} faturas`
      );
    }
    
    setInputProdText('');
  };

  // ----------------------------------------------------
  // Dynamic Alertas Operacionais Scanner (Top Fixed Bar)
  // ----------------------------------------------------
  // Find activities expiring in <= 5 days
  const expiringShortTerm = activities.filter(act => {
    if (act.status === 'Concluída' || act.competencia !== activeCompetence) return false;
    const expDate = new Date(act.dataLimite);
    const currDate = new Date(currentSimulatedDate);
    const diffTime = expDate.getTime() - currDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 5;
  });

  // Active delayed tasks
  const activeAtrasadas = activities.filter(act => act.dataLimite < currentSimulatedDate && act.status !== 'Concluída');

  // Teammates below custom standard daily target
  const teammatesAbaixoMeta = users.filter(u => u.status === 'Ativo' && u.role !== 'Admin').filter(u => {
    const colabGoal = productionGoals.find(g => g.competencia === activeCompetence && g.participantesIds.includes(u.id));
    if (!colabGoal) return false; // Se não houver meta atribuída para o colaborador, ele não está abaixo da meta
    const uToday = colabGoal.producaHoje[u.id] ?? 0;
    return uToday < 10; // flag those with less than 10 units reported
  });

  // Upcoming vacation returns (vacation ending in <= 5 days)
  const upcomingVacationReturns = vacations.filter(vac => {
    try {
      const partsEnd = vac.dataFim.split('-');
      const expDate = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2]));
      const currDate = new Date(currentSimulatedDate);
      const diffTime = expDate.getTime() - currDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 5 && vac.redistribuida;
    } catch {
      return false;
    }
  });

  // Vacations requiring redistribution
  const pendenciasRedistribuicao = vacations.filter(vac => !vac.redistribuida);

  // Compile alerts catalog
  const alertCount = expiringShortTerm.length + activeAtrasadas.length + teammatesAbaixoMeta.length + upcomingVacationReturns.length + pendenciasRedistribuicao.length;

  // ----------------------------------------------------
  // Carga Operacional Index Parser
  // ----------------------------------------------------
  // Calculate load as: (activities pending that user is responsible for or auxiliary)
  const calculateCargaOperacional = (uId: string) => {
    const totalActs = activities.filter(a => a.competencia === activeCompetence && (a.responsavelAtualId === uId || a.responsaveisAuxiliaresIds?.includes(uId)));
    const pendingActs = totalActs.filter(a => a.status !== 'Concluída');
    if (totalActs.length === 0) return 0;
    const progress = Math.round((pendingActs.length / totalActs.length) * 100);
    return progress;
  };

  // ----------------------------------------------------
  // Ranking de Performance Operacional (40-30-20-10)
  // ----------------------------------------------------
  const calculatePerformanceScore = (uId: string) => {
    const uActivities = activities.filter(act => 
      act.responsavelAtualId === uId || act.responsaveisAuxiliaresIds?.includes(uId)
    );
    const uActiveGoal = productionGoals.find(g => 
      g.competencia === activeCompetence && g.participantesIds.includes(uId)
    );

    // 1. Atividades Concluídas (40%)
    const totalActs = uActivities.length;
    const completedActs = uActivities.filter(act => act.status === 'Concluída').length;
    const conclPercent = totalActs > 0 ? (completedActs / totalActs) * 100 : 100;

    // 2. Metas de Produção Atingidas (30%)
    let prodPercentRating = 100;
    if (uActiveGoal) {
      const uAccum = (uActiveGoal.producaoAcumulada[uId] || 0) + (uActiveGoal.producaHoje[uId] || 0);
      const uProportionalTotal = uActiveGoal.quantidadeTotal / (uActiveGoal.participantesIds.length || 1);
      prodPercentRating = Math.min(100, (uAccum / (uProportionalTotal || 1)) * 100);
    }

    // 3. Cumprimento de prazo (20%)
    const overdueCount = uActivities.filter(act => act.dataLimite < currentSimulatedDate && act.status !== 'Concluída').length;
    const onTimePercent = totalActs > 0 ? Math.max(0, ((completedActs - overdueCount) / totalActs) * 100) : 100;

    // 4. Ausência de atrasos (10%)
    const delayAbsencePercent = totalActs > 0 ? Math.max(0, ((totalActs - overdueCount) / totalActs) * 100) : 100;

    // Combined score
    const finalScore = Math.round(
      (conclPercent * 0.40) + 
      (prodPercentRating * 0.30) + 
      (onTimePercent * 0.20) + 
      (delayAbsencePercent * 0.10)
    );

    return {
      finalScore,
      totalActs,
      completedActs,
      pendingCount: totalActs - completedActs,
      overdueCount,
      conclPercent: Math.round(conclPercent),
      prodPercent: Math.round(prodPercentRating),
      onTimePercent: Math.round(onTimePercent),
      delayAbsencePercent: Math.round(delayAbsencePercent)
    };
  };

  // Sorted list of rank candidates
  const rankings = users
    .filter(u => u.status !== 'Inativo')
    .map(u => {
      const scoreData = calculatePerformanceScore(u.id);
      return {
        user: u,
        ...scoreData
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  // ----------------------------------------------------
  // Automatic Redistribution Assistant Algorithm
  // ----------------------------------------------------
  // Propose best operator based on: Carga Operacional, knowledge levels, and availability
  const calculateRedistributionProposal = (act: Activity): { candidate: User | null; reason: string } => {
    const activeCandidates = users.filter(u => u.id !== act.responsavelAtualId && u.status === 'Ativo' && u.role !== 'Admin');
    if (activeCandidates.length === 0) {
      return { candidate: null, reason: 'Nenhum operador elegível disponível no setor.' };
    }

    let bestCandidate: User | null = null;
    let bestScore = -9999;
    let computedReason = '';

    activeCandidates.forEach(cand => {
      // 1. Knowledge matrix score for this activity name
      const candKnowledge = knowledge.find(k => k.colaboradorId === cand.id && k.atividadeNome.toLowerCase().trim() === act.nome.toLowerCase().trim());
      const levelNum = candKnowledge?.nivel || 1; // standard fallback
      const knowledgePoints = levelNum * 20; // max is 100 for lvl 5

      // 2. Carga operacional (fewer pending tasks is better)
      const candPending = activities.filter(a => a.responsavelAtualId === cand.id && a.status !== 'Concluída').length;
      const loadPoints = Math.max(0, 100 - (candPending * 15));

      // Combined weight index
      const combined = knowledgePoints + loadPoints;

      if (combined > bestScore) {
        bestScore = combined;
        bestCandidate = cand;
        computedReason = `Menor carga operacional (${candPending} pendências) e conhecimento técnico nível ${levelNum}.`;
      }
    });

    return {
      candidate: bestCandidate,
      reason: computedReason
    };
  };

  // ----------------------------------------------------
  // Job Queue Handlers
  // ----------------------------------------------------
  const handleConcludeActivity = (act: Activity) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = currentSimulatedDate.split('-').reverse().join('/');
    
    // Conclude status
    onUpdateActivity(act.id, { status: 'Concluída' });

    // Save comments log
    const logComment = `[CONTROLE]: Concluído em ${dateFormatted} às ${timeStr} por ${targetColab?.nome || 'Operador'}`;
    onAddComment(act.id, logComment);

    if (onAddAuditLog) {
      onAddAuditLog(
        `Finalização de Atividade`,
        `Fila de ${targetColab?.nome} - Status: ${act.status}`,
        `Atividade [${act.nome}] finalizada com sucesso operacional às ${timeStr}`
      );
    }
  };

  const handlePostponeSubmit = (e: React.FormEvent, act: Activity) => {
    e.preventDefault();
    if (!postponeDate) return;

    const actualReason = postponeReason === 'Outros' ? customPostponeReason : postponeReason;
    if (!actualReason.trim()) return;

    const originalDateFormatted = act.dataLimite.split('-').reverse().join('/');
    const newDateFormatted = postponeDate.split('-').reverse().join('/');

    // Update target date
    onUpdateActivity(act.id, { dataLimite: postponeDate });

    // Safe logging comments
    const logComment = `[ATRASO JUSTIFICADO]: Postergada de ${originalDateFormatted} para ${newDateFormatted}. Justificativa: "${actualReason}" por ${activeUser?.nome || 'Operador'}`;
    onAddComment(act.id, logComment);

    if (onAddAuditLog) {
      onAddAuditLog(
        `Adiamento Operacional`,
        `Prazo original: ${originalDateFormatted}`,
        `Atividade [${act.nome}] reprogramada para ${newDateFormatted}. Justificativa: ${actualReason}`
      );
    }

    // Reset states
    setPostponingActId(null);
    setPostponeDate('');
    setPostponeReason('Dependência de terceiro');
    setCustomPostponeReason('');
  };

  const handleCommentSubmitLocal = (e: React.FormEvent, actId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    onAddComment(actId, commentText);
    
    if (onAddAuditLog) {
      const act = activities.find(a => a.id === actId);
      onAddAuditLog(
        `Feedback Inserido`,
        `Atividade: ${act?.nome}`,
        `Observação adicionada: "${commentText}"`
      );
    }

    setCommentingActId(null);
    setCommentText('');
  };

  // Re-routes responsible assignee
  const handleReassignSubmit = (actId: string, newRespId: string) => {
    const originalAct = activities.find(a => a.id === actId);
    const prevUser = users.find(u => u.id === originalAct?.responsavelAtualId);
    const nextUser = users.find(u => u.id === newRespId);

    onUpdateActivity(actId, { responsavelAtualId: newRespId });

    if (onAddAuditLog && originalAct) {
      onAddAuditLog(
        `Repasse Operacional`,
        `Responsável anterior: ${prevUser?.nome}`,
        `Atividade [${originalAct.nome}] redistribuída para [${nextUser?.nome}] por determinação superior`
      );
    }

    setReassigningActId(null);
  };

  // ----------------------------------------------------
  // Drag & Drop / Simulated File Uploader Actions
  // ----------------------------------------------------
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, actId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      registerSimulatedFile(actId, file.name, file.size);
    }
  };

  const handleManualFileChoose = (e: React.ChangeEvent<HTMLInputElement>, actId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      registerSimulatedFile(actId, file.name, file.size);
    }
  };

  const registerSimulatedFile = (actId: string, name: string, sizeNum: number) => {
    const readableSize = sizeNum > 1024 * 1024 
      ? `${(sizeNum / (1024 * 1024)).toFixed(1)} MB` 
      : `${(sizeNum / 1024).toFixed(1)} KB`;

    const newArr = uploadedFiles[actId] ? [...uploadedFiles[actId]] : [];
    newArr.push({ name, size: readableSize });

    setUploadedFiles(prev => ({
      ...prev,
      [actId]: newArr
    }));

    // Register internal system comment
    const logComment = `[COMPROVANTE ANEXADO]: Arquivo "${name}" (${readableSize}) anexado com sucesso para fins de conformidade.`;
    onAddComment(actId, logComment);

    if (onAddAuditLog) {
      const act = activities.find(a => a.id === actId);
      onAddAuditLog(
        `Upload de Comprovante`,
        `Atividade: ${act?.nome}`,
        `Arquivo [${name}] integrado como anexo regulatório.`
      );
    }
    
    setAttachingActId(null);
  };

  // ----------------------------------------------------
  // Individual Scorecard Click-view Data Retrieval
  // ----------------------------------------------------
  const getIndividualScorecardData = (uId: string) => {
    const userObj = users.find(u => u.id === uId);
    if (!userObj) return null;

    const stats = calculatePerformanceScore(uId);
    
    // Let's count days that production targets were met
    let metGoalsDays = 0;
    let unmetGoalsDays = 0;
    
    if (activeGoal && activeGoal.historicoDiario) {
      Object.keys(activeGoal.historicoDiario).forEach(date => {
        const historyDayProd = activeGoal.historicoDiario[date]?.[uId] ?? 0;
        if (historyDayProd >= META_DIARIA) {
          metGoalsDays++;
        } else {
          unmetGoalsDays++;
        }
      });

      const todayProg = activeGoal.producaHoje[uId] ?? 0;
      if (todayProg >= META_DIARIA) {
        metGoalsDays++;
      } else {
        unmetGoalsDays++;
      }
    }

    const uAccum = activeGoal ? (activeGoal.producaoAcumulada[uId] || 0) + (activeGoal.producaHoje[uId] || 0) : 0;

    return {
      user: userObj,
      competencia: activeCompetence,
      recebidas: stats.totalActs,
      concluidas: stats.completedActs,
      pendentes: stats.pendingCount,
      atrasadas: stats.overdueCount,
      metasAtingidas: metGoalsDays,
      metasNaoAtingidas: unmetGoalsDays,
      producaoAcumulada: uAccum,
      produtividadeGeral: stats.conclPercent,
      score: stats.finalScore
    };
  };

  const activeScoreData = selectedScoreUserId ? getIndividualScorecardData(selectedScoreUserId) : null;

  return (
    <div className="space-y-6 animate-fade-in text-xs text-zinc-900 dark:text-zinc-100">
      
      {/* ----------------------------------------------------
          6. SEÇÃO FIXA: PAINEL DE ALERTAS OPERACIONAIS
          ---------------------------------------------------- */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex justify-between items-center border-b dark:border-zinc-800 pb-2.5">
          <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
            🚨 Alertas Operacionais Regulatórios
          </h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-50 text-rose-650 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400">
            {alertCount} alertas ativos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Alerta Atividades Atrasadas */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            activeAtrasadas.length > 0 
              ? 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/15 dark:border-rose-900/60' 
              : 'bg-emerald-50/20 border-emerald-100/50 dark:bg-emerald-950/5 dark:border-emerald-900/30'
          }`}>
            <span className="text-[10px] text-zinc-450 font-black uppercase tracking-wider block">Demandas Atrasadas</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className={`text-xl font-mono font-black ${activeAtrasadas.length > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-zinc-400'}`}>
                {activeAtrasadas.length}
              </span>
              <span className="text-[9px] text-zinc-450">atrasos</span>
            </div>
            <p className="text-[8px] text-zinc-500 mt-1 leading-none font-medium">
              {activeAtrasadas.length > 0 ? '⚠️ Exige redistribuição imediata' : '✅ SLA com 100% de pontualidade'}
            </p>
          </div>

          {/* Alerta Expiring <= 5 days */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between bg-amber-50/20 border-amber-100/70 dark:bg-amber-950/10 dark:border-amber-900/40`}>
            <span className="text-[10px] text-zinc-450 font-black uppercase tracking-wider block">Vencimento curto (5 dias)</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-mono font-black text-amber-600 dark:text-amber-400">
                {expiringShortTerm.length}
              </span>
              <span className="text-[9px] text-zinc-450 text-zinc-400">ativos</span>
            </div>
            <p className="text-[8px] text-zinc-500 mt-1 leading-none font-medium">
              {expiringShortTerm.length > 0 ? '⚡ Focar esforços operacionais' : '✅ Distribuição confortável de prazos'}
            </p>
          </div>

          {/* Alerta Abaixo da Meta */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-zinc-450 font-black uppercase tracking-wider block">Colaboradores abaixo meta</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-mono font-black text-indigo-650 dark:text-indigo-400">
                {teammatesAbaixoMeta.length}
              </span>
              <span className="text-[9px] text-zinc-405">operadores</span>
            </div>
            <p className="text-[8px] text-zinc-500 mt-1 leading-none font-medium text-amber-600">
              {teammatesAbaixoMeta.length > 0 ? '⚠️ Volume diário < 10 faturas' : '✅ Compliance geral de produção'}
            </p>
          </div>

          {/* Alerta Retornos férias */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-zinc-450 font-black uppercase tracking-wider block">Retornos de Férias</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-mono font-black text-indigo-755 dark:text-zinc-200">
                {upcomingVacationReturns.length}
              </span>
              <span className="text-[9px] text-zinc-405">próximos</span>
            </div>
            <p className="text-[8px] text-zinc-500 mt-1 leading-none font-medium">
              {upcomingVacationReturns.length > 0 ? '🔄 Retorno operacional em breve' : '✅ Nenhuma transição prevista'}
            </p>
          </div>

          {/* Alerta Redistribuições pendentes */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            pendenciasRedistribuicao.length > 0 
              ? 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/15 dark:border-rose-900/60' 
              : 'bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850'
          }`}>
            <span className="text-[10px] text-zinc-450 font-black uppercase tracking-wider block">Mapeamentos de Férias</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className={`text-xl font-mono font-black ${pendenciasRedistribuicao.length > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
                {pendenciasRedistribuicao.length}
              </span>
              <span className="text-[9px] text-zinc-405">pendentes</span>
            </div>
            <p className="text-[8px] text-zinc-500 mt-1 leading-none font-medium">
              {pendenciasRedistribuicao.length > 0 ? '🚨 Requer mapear substitutos!' : '✅ Todos períodos mapeados'}
            </p>
          </div>
        </div>
      </div>

      {/* Top Selector bar for Management */}
      <div className="p-5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-black text-indigo-755 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
            🚀 Cockpit Operacional do Dia
          </h3>
          <p className="text-zinc-500 mt-0.5 font-semibold">
            Painel consolidado para visualização de faturas, redistribuição inteligente e controle diário.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isManager && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider shrink-0">Simular Colaborador</span>
              <select
                value={selectedColabId}
                onChange={e => setSelectedColabId(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-850 border dark:border-zinc-800 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>
                ))}
              </select>
            </div>
          )}

          <div className="px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 rounded-xl text-indigo-850 dark:text-indigo-400 font-extrabold flex items-center gap-1.5">
            <Calendar size={13} />
            <span>SLA Data: {currentSimulatedDate.split('-').reverse().join('/')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2: Main Workspace Operations */}
        <div className="lg:col-span-2 space-y-6">

          {/* ----------------------------------------------------
              4. MELHORADO: PRODUÇÃO DO DIA vs METAS DO OPERADOR
              ---------------------------------------------------- */}
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-605" />
                <h4 className="font-black text-xs text-zinc-905 dark:text-white uppercase tracking-wide">
                  Indicadores de Produção do Dia
                </h4>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase flex items-center gap-1 ${
                isAcimaMeta 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' 
                  : 'bg-rose-50 text-rose-750 border border-rose-150 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/40'
              }`}>
                {isAcimaMeta ? '🟢 Acima da Meta' : '🔴 Abaixo da Meta'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
              
              {/* Meta do dia */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl space-y-1 select-none">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider block">Meta do Dia</span>
                <div className="text-lg font-black font-mono text-zinc-800 dark:text-zinc-250">
                  {META_DIARIA.toFixed(1)} <span className="text-[10px] font-normal text-zinc-500">unids</span>
                </div>
                <p className="text-[8px] text-zinc-500 leading-none">Meta setorial padrão</p>
              </div>

              {/* Produção Informada */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl space-y-1">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider block">Produção Informada</span>
                <div className="text-lg font-black font-mono text-indigo-650 dark:text-indigo-400">
                  {currentProductionToday.toFixed(1)}
                </div>
                <p className="text-[8px] text-zinc-500 leading-none">Inserido em {currentSimulatedDate.split('-').reverse().join('/')}</p>
              </div>

              {/* Saldo diário */}
              <div className={`p-3.5 border rounded-xl space-y-1 select-none ${
                isAcimaMeta 
                  ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/10' 
                  : 'bg-rose-50/15 border-rose-100 dark:bg-rose-950/5'
              }`}>
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider block">Saldo Líquido</span>
                <div className={`text-lg font-black font-mono ${saldoHoje >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {saldoHoje >= 0 ? `+${saldoHoje.toFixed(1)}` : saldoHoje.toFixed(1)}
                </div>
                <p className="text-[8px] text-zinc-500 leading-none">Desempenho no checklist</p>
              </div>

              {/* Launch Production form element */}
              <form onSubmit={handleSaveProduction} className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[9px] font-black text-zinc-400 block uppercase tracking-wide leading-none">Lançar Produção</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ex: 15"
                    value={inputProdText}
                    onChange={e => setInputProdText(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 text-black dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-indigo-650 hover:bg-indigo-750 text-white font-black rounded-xl shadow-sm transition flex items-center justify-center shrink-0"
                  >
                    <Save size={13} />
                  </button>
                </div>
              </form>

            </div>

            {/* Expanded Monthly Cumulative Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-3 border-t dark:border-zinc-800 text-[10px]">
              <div className="flex justify-between p-2.5 bg-zinc-50/50 dark:bg-zinc-950/60 rounded-xl border dark:border-zinc-850 font-semibold">
                <span className="text-zinc-500">Meta Acumulada do Mês:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-300 font-extrabold">{metaAcumuladaMes} unids</span>
              </div>
              <div className="flex justify-between p-2.5 bg-zinc-50/50 dark:bg-zinc-950/60 rounded-xl border dark:border-zinc-850 font-semibold">
                <span className="text-zinc-500">Produção Acumulada:</span>
                <span className="font-mono text-purple-605 font-extrabold">{producaoAcumuladaTotal} unids</span>
              </div>
              <div className="flex justify-between p-2.5 bg-zinc-50/50 dark:bg-zinc-950/60 rounded-xl border dark:border-zinc-850 font-semibold">
                <span className="text-zinc-500">Saldo Geral Acumulado:</span>
                <span className={`font-mono font-extrabold ${saldoAcumuladoMes >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {saldoAcumuladoMes >= 0 ? `+${saldoAcumuladoMes}` : saldoAcumuladoMes}
                </span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              5. SEÇÃO: TERMÔMETRO DA COMPETÊNCIA (TEAMS GAUGE)
              ---------------------------------------------------- */}
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <h4 className="font-black text-xs text-zinc-905 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                🌡️ Termômetro Operacional ({activeCompetence})
              </h4>
              <span className="text-xs font-black text-indigo-650 dark:text-indigo-400 font-mono">
                {totalPercentTermometro}% de Meta Atingida
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between font-mono text-[10px] text-zinc-550 font-extrabold">
                <span>Realizado Geral: {totalRealizadoEquipe} faturas</span>
                <span>Alvo da Competência: {metaTotalEquipe} faturas</span>
              </div>

              {/* Progress gauge visual bar */}
              <div className="w-full bg-zinc-100 dark:bg-zinc-950 border dark:border-zinc-850 h-3.5 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div 
                  className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-700 min-w-4 flex items-center justify-end px-1.5" 
                  style={{ width: `${totalPercentTermometro}%` }}
                >
                  <span className="text-[8px] text-white font-extrabold leading-none">{totalPercentTermometro}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-center">
                <div className="p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border dark:border-zinc-850">
                  <span className="text-[8px] text-zinc-450 block uppercase tracking-wider font-bold">Produção realizada</span>
                  <span className="text-sm font-mono font-black text-indigo-600 block mt-0.5">{totalRealizadoEquipe}</span>
                </div>
                <div className="p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border dark:border-zinc-850">
                  <span className="text-[8px] text-zinc-450 block uppercase tracking-wider font-bold">Saldo restante</span>
                  <span className="text-sm font-mono font-black text-zinc-700 dark:text-zinc-300 block mt-0.5">{saldoRestanteEquipe}</span>
                </div>
                <div className="p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border dark:border-zinc-850">
                  <span className="text-[8px] text-zinc-450 block uppercase tracking-wider font-bold">Dias úteis restantes</span>
                  <span className="text-sm font-mono font-black text-zinc-700 dark:text-zinc-300 block mt-0.5">{diasUteisRestantes}</span>
                </div>
                <div className="p-2 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border dark:border-zinc-850">
                  <span className="text-[8px] text-zinc-450 block uppercase tracking-wider font-bold">Meta diária recalculada</span>
                  <span className="text-sm font-mono font-black text-purple-600 block mt-0.5">{metaDiariaAtualizadaEquipe}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              1. NOVO PAINEL: "MINHA FILA DE TRABALHO"
              ---------------------------------------------------- */}
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b dark:border-zinc-800 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-zinc-909 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                  📋 Minha Fila de Trabalho ({targetColab?.nome})
                </h4>
                <p className="text-[10px] text-zinc-400 mt-0.5 leading-none">
                  Fila diária regulada para execução na data selecionada ou prazos passados pendentes.
                </p>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-750 dark:bg-zinc-950 dark:text-indigo-400 px-2.5 py-1 rounded-lg border dark:border-zinc-800">
                Prazos Integrados ({scheduledActivities.length})
              </span>
            </div>

            {scheduledActivities.length === 0 ? (
              <div className="py-14 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 size={36} className="text-emerald-500" />
                <span className="font-bold text-zinc-700 dark:text-zinc-200">Parabéns! Fila 100% Limpa</span>
                <p className="text-[10px] max-w-sm text-zinc-550 leading-relaxed">Não existem demandas operacionais agenciadas ou atrasadas para o perfil sob simulação nesta data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table id="job_queue_table" className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-850 text-zinc-405 uppercase tracking-wider text-[9px] font-extrabold">
                      <th className="py-2.5">Atividade</th>
                      <th className="py-2.5">Competência</th>
                      <th className="py-2.5">Prazo</th>
                      <th className="py-2.5">Prioridade</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-850 font-semibold text-zinc-800 dark:text-zinc-200">
                    {scheduledActivities.map((act) => {
                      const isOverdue = act.dataLimite < currentSimulatedDate;
                      const matchingProc = getProcedureForActivity(act.nome);

                      return (
                        <tr key={act.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                          <td className="py-3">
                            <div className="space-y-0.5">
                              <span className="text-zinc-950 dark:text-white font-extrabold text-[11px] block">{act.nome}</span>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[8px] bg-zinc-100 dark:bg-zinc-950 px-1 py-0.5 rounded text-zinc-550 font-bold border dark:border-zinc-850">
                                  Resp: {users.find(u => u.id === act.responsavelAtualId)?.nome}
                                </span>
                                {matchingProc && (
                                  <button
                                    onClick={() => setActiveProcedure(matchingProc)}
                                    className="text-[8px] bg-purple-50 text-purple-700 dark:bg-purple-950/35 dark:text-purple-400 px-1.5 py-0.5 rounded flex items-center gap-1 hover:underline"
                                  >
                                    <BookOpen size={8} /> Procedimento
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-zinc-500 font-mono text-[10px]">{act.competencia}</td>
                          <td className="py-3">
                            <div className="space-y-0.5">
                              <span className={`text-[10px] font-mono leading-none font-bold block ${isOverdue ? 'text-rose-500 font-black' : 'text-zinc-800 dark:text-zinc-300'}`}>
                                {act.dataLimite.split('-').reverse().join('/')}
                              </span>
                              {isOverdue && (
                                <span className="text-[7px] text-rose-500 font-black uppercase tracking-wider block">⚠️ SLA atrasado</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase tracking-wide select-none ${
                              act.prioridade === 'Crítica' ? 'bg-red-100 text-red-750 dark:bg-red-955/20 dark:text-red-400' :
                              act.prioridade === 'Alta' ? 'bg-amber-100 text-amber-750 dark:bg-amber-955/20 dark:text-amber-400' :
                              'bg-zinc-100 text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400'
                            }`}>
                              {act.prioridade}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase flex items-center gap-0.5 select-none w-fit ${
                              act.status === 'Concluída' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40' 
                                : 'bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/30'
                            }`}>
                              {act.status}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Observation */}
                              <button
                                onClick={() => setCommentingActId(act.id)}
                                title="Inserir Observação"
                                className="p-1 text-zinc-500 hover:text-indigo-650 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded transition"
                              >
                                <MessageSquare size={13} />
                              </button>

                              {/* Attach File */}
                              <button
                                onClick={() => setAttachingActId(act.id)}
                                title="Anexar Comprovante Técnico"
                                className="p-1 text-zinc-500 hover:text-purple-650 hover:bg-zinc-100 dark:hover:bg-zinc-855 rounded transition relative flex items-center"
                              >
                                <Paperclip size={13} />
                                {uploadedFiles[act.id] && uploadedFiles[act.id].length > 0 && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
                                )}
                              </button>

                              {/* Adiar */}
                              <button
                                onClick={() => {
                                  setPostponingActId(act.id);
                                  setPostponeDate(act.dataLimite);
                                }}
                                title="Adiar Demanda"
                                className="p-1 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-zinc-850 rounded transition"
                              >
                                <Clock size={13} />
                              </button>

                              {/* Repassar (Admin / Coordenação only) */}
                              {isManager && (
                                <button
                                  onClick={() => setReassigningActId(act.id)}
                                  title="Repassar Atividade"
                                  className="p-1 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded transition"
                                >
                                  <Users size={13} />
                                </button>
                              )}

                              {/* Concluir */}
                              <button
                                onClick={() => handleConcludeActivity(act)}
                                title="Concluir Atividade"
                                className="p-1 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Column 3: Secondary Side Statistics & Balance */}
        <div className="space-y-6">

          {/* ----------------------------------------------------
              11. NOVO PANEL: SCORE INDIVIDUAL DO OPERADOR
              ---------------------------------------------------- */}
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b dark:border-zinc-800 pb-2.5">
              <h4 className="font-extrabold text-xs text-zinc-909 dark:text-white uppercase tracking-wide">
                📊 Scorecard de Performance
              </h4>
              <span className="text-[8px] bg-indigo-50 text-indigo-750 dark:bg-zinc-900 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">
                Consolidado
              </span>
            </div>

            <div className="space-y-3.5">
              <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider leading-none">Exibir Perfil Operacional</span>
              
              <div className="grid grid-cols-2 gap-2">
                {users.filter(u => u.status !== 'Inativo').map(u => {
                  const uStats = calculatePerformanceScore(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedScoreUserId(u.id)}
                      className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                        selectedScoreUserId === u.id 
                          ? 'bg-indigo-50/40 border-indigo-250 dark:bg-zinc-950' 
                          : 'bg-zinc-50/50 hover:bg-zinc-100/50 dark:bg-zinc-950/40 dark:border-zinc-850 dark:hover:bg-zinc-950/80'
                      }`}
                    >
                      <span className="font-extrabold text-[10px] text-zinc-950 dark:text-white truncate block">{u.nome}</span>
                      <div className="flex justify-between items-center mt-1 text-[9px] font-mono leading-none">
                        <span className="text-zinc-500">Score:</span>
                        <span className="font-black text-indigo-650 dark:text-indigo-450">{uStats.finalScore} pts</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              8. NOVO PANEL: CARGA OPERACIONAL DO SETOR
              ---------------------------------------------------- */}
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
              <h4 className="font-extrabold text-xs text-zinc-909 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                💼 Carga Operacional de Rotinas
              </h4>
              <Info size={11} className="text-zinc-400" title="Proporção de rotinas pendentes alocadas por executor no ciclo." />
            </div>

            <div className="space-y-3.5">
              {users
                .filter(u => u.status !== 'Inativo')
                .map((colab) => {
                  const pendingCount = activities.filter(a => a.competencia === activeCompetence && a.responsavelAtualId === colab.id && a.status !== 'Concluída').length;
                  const totalCountCurrent = activities.filter(a => a.competencia === activeCompetence && a.responsavelAtualId === colab.id).length;
                  
                  // Percentage calculation
                  const percentageOfLoad = totalCountCurrent > 0 ? Math.round((pendingCount / totalCountCurrent) * 100) : 0;
                  
                  // Blocks simulator based on requested format: ████████░░ 80%
                  const blockCount = Math.round(percentageOfLoad / 10);
                  const blocksStr = '█'.repeat(blockCount) + '░'.repeat(10 - blockCount);

                  return (
                    <div key={colab.id} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-extrabold">
                        <span className="text-zinc-800 dark:text-zinc-200">{colab.nome}</span>
                        <span className="font-mono text-zinc-500">({pendingCount}/{totalCountCurrent} ativs)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] leading-none text-indigo-600 dark:text-indigo-400 tracking-tighter shrink-0 select-none">
                          {blocksStr}
                        </span>
                        <span className="font-mono text-[9px] font-black text-zinc-700 dark:text-zinc-300">
                          {percentageOfLoad}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ----------------------------------------------------
              7. MELHORADO: RANKING DE PERFORMANCE OPERACIONAL
              ---------------------------------------------------- */}
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <div>
              <h4 className="font-extrabold text-xs text-zinc-909 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                🏆 Ranking de Performance Operacional
              </h4>
              <p className="text-[9px] text-zinc-510 mt-1 italic leading-tight dark:text-zinc-400">
                Métrica ponderada avançada: 40% Conclusão de Rotinas, 30% Metas Atingidas, 20% Cumprimento de Prazo, 10% Ausência de Atrasos.
              </p>
            </div>

            <div className="space-y-3">
              {rankings.map(({ user, finalScore, conclPercent, prodPercent, onTimePercent, delayAbsencePercent, completedActs, overdueCount }, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                const medal = medals[idx] || '🎖️';
                const isTargetView = user.id === colabId;

                return (
                  <div 
                    key={user.id} 
                    className={`p-3 rounded-xl border flex flex-col gap-2 transition ${
                      isTargetView 
                        ? 'bg-indigo-50/15 border-indigo-200 dark:bg-zinc-850' 
                        : 'bg-zinc-50/50 dark:bg-zinc-950/40 dark:border-zinc-850'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[12px] leading-none shrink-0">{medal}</span>
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100 truncate block">{user.nome}</span>
                      </div>
                      <span className="font-mono font-black text-indigo-650 dark:text-indigo-400 text-xs shrink-0">
                        {finalScore} pts
                      </span>
                    </div>

                    <div className="w-full bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 h-1.5 rounded-full overflow-hidden p-0.5">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${finalScore}%` }}></div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-[8px] font-mono leading-none font-bold text-center text-zinc-500 uppercase">
                      <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-850 p-1 rounded">
                        <span className="text-purple-600 block">{conclPercent}%</span>
                        <span className="text-[6px] text-zinc-400 block font-normal">Rotinas</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-850 p-1 rounded">
                        <span className="text-indigo-600 block">{prodPercent}%</span>
                        <span className="text-[6px] text-zinc-400 block font-normal">Meta Vol</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-850 p-1 rounded">
                        <span className="text-emerald-600 block">{onTimePercent}%</span>
                        <span className="text-[6px] text-zinc-400 block font-normal">Prazo</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-850 p-1 rounded">
                        <span className={`block ${delayAbsencePercent < 100 ? 'text-rose-500' : 'text-emerald-500'}`}>{delayAbsencePercent}%</span>
                        <span className="text-[6px] text-zinc-400 block font-normal">NoDelay</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ----------------------------------------------------
          11. NOVO MODAL: SCORE INDIVIDUAL DETALHADO (CARD POPUP)
          ---------------------------------------------------- */}
      {selectedScoreUserId && activeScoreData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in font-semibold">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border dark:border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4">
            
            <div className="flex justify-between items-start border-b dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-750 dark:bg-indigo-950/40 dark:border-indigo-900">
                  {activeScoreData.user.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm dark:text-white uppercase leading-tight">{activeScoreData.user.nome}</h4>
                  <span className="text-[9px] text-zinc-500 leading-none">Perfil Operacional no Ciclo</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScoreUserId(null)}
                className="p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-850 text-rose-500 text-lg font-bold leading-none select-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl space-y-1">
                <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Competência Foco</span>
                <span className="text-zinc-900 dark:text-zinc-250 font-black block">{activeScoreData.competencia}</span>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl space-y-1">
                <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Score Geral</span>
                <span className="text-indigo-650 dark:text-indigo-400 font-black block">{activeScoreData.score} pts</span>
              </div>

              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl leading-none flex justify-between items-center">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider">Ativs Recebidas</span>
                <span className="font-black text-zinc-800 dark:text-zinc-200">{activeScoreData.recebidas}</span>
              </div>

              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl leading-none flex justify-between items-center">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider">Ativs Concluídas</span>
                <span className="font-black text-emerald-600">{activeScoreData.concluidas}</span>
              </div>

              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl leading-none flex justify-between items-center">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider">Ativs Pendentes</span>
                <span className="font-black text-amber-600">{activeScoreData.pendentes}</span>
              </div>

              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl leading-none flex justify-between items-center">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider">Ativs Atrasadas</span>
                <span className={`font-black ${activeScoreData.atrasadas > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>{activeScoreData.atrasadas}</span>
              </div>

              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl leading-none flex justify-between items-center">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider">Metas Atingidas</span>
                <span className="font-black text-emerald-600">{activeScoreData.metasAtingidas} d</span>
              </div>

              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl leading-none flex justify-between items-center">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider">Metas Não Atingidas</span>
                <span className="font-black text-rose-500">{activeScoreData.metasNaoAtingidas} d</span>
              </div>

              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl leading-none flex justify-between items-center col-span-2">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider">Produção Acumulada Mês</span>
                <span className="font-black text-purple-600">{activeScoreData.producaoAcumulada} faturas</span>
              </div>

              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-xl leading-none flex justify-between items-center col-span-2">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider">Produtividade Geral (Rotinas SLA)</span>
                <span className="font-black text-indigo-650 dark:text-indigo-400">{activeScoreData.produtividadeGeral}%</span>
              </div>
            </div>

            <div className="pt-3 border-t dark:border-zinc-805 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedScoreUserId(null)}
                className="px-4.5 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white font-black rounded-xl text-xs transition"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          3. MODAL: ADIAMENTO DE ATIVIDADES
          ---------------------------------------------------- */}
      {postponingActId && (() => {
        const act = activities.find(a => a.id === postponingActId);
        if (!act) return null;

        return (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in font-semibold">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border dark:border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
                <h5 className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wide">
                  <Clock size={14} className="text-amber-500" /> Adiar Atividade Operacional
                </h5>
                <button
                  type="button"
                  onClick={() => setPostponingActId(null)}
                  className="text-zinc-405 font-bold hover:text-zinc-600 text-rose-500"
                >
                  ×
                </button>
              </div>

              <form onSubmit={(e) => handlePostponeSubmit(e, act)} className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">Atividade Selecionada</span>
                  <span className="p-2 bg-zinc-50 border dark:border-zinc-850 rounded-xl text-zinc-700 dark:text-zinc-300 block font-black text-[11px] uppercase">
                    {act.nome}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">Nova Data Limite</label>
                    <input
                      type="date"
                      required
                      min={currentSimulatedDate}
                      value={postponeDate}
                      onChange={e => setPostponeDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-black dark:text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">Atribuído Por</label>
                    <span className="p-1 px-2.5 bg-zinc-100 border dark:border-zinc-800 rounded-lg text-zinc-500 font-semibold block">{activeUser?.nome}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">Motivo do Adiamento</label>
                  <select
                    value={postponeReason}
                    onChange={e => {
                      setPostponeReason(e.target.value);
                      if (e.target.value !== 'Outros') setCustomPostponeReason('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-black dark:text-white font-semibold focus:outline-none"
                  >
                    <option value="Dependência de terceiro">Dependência de terceiro</option>
                    <option value="Aguardando documentação">Aguardando documentação</option>
                    <option value="Sobrecarga operacional">Sobrecarga operacional</option>
                    <option value="Falta de informação">Falta de informação</option>
                    <option value="Outros">Outras alternativas</option>
                  </select>
                </div>

                {postponeReason === 'Outros' && (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">Descreva a justificativa regulatória</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Intercorrências na instabilidade do portal gov..."
                      value={customPostponeReason}
                      onChange={e => setCustomPostponeReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg text-black dark:text-white"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-1.5">
                  <button
                    type="submit"
                    className="px-4.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg shadow-sm"
                  >
                    Confirmar Adiamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ----------------------------------------------------
          3. OBSERVAÇÃO MODAL POPUP
          ---------------------------------------------------- */}
      {commentingActId && (() => {
        const act = activities.find(a => a.id === commentingActId);
        return (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in text-xs font-semibold">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border dark:border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b dark:border-zinc-800 pb-1.5">
                <h5 className="font-extrabold text-zinc-909 dark:text-white flex items-center gap-1 uppercase tracking-wide">
                  <MessageSquare size={13} className="text-indigo-550 shrink-0" /> Inserir Observação
                </h5>
                <button
                  type="button"
                  onClick={() => setCommentingActId(null)}
                  className="text-rose-500 font-bold hover:text-zinc-650"
                >
                  ×
                </button>
              </div>

              {act?.comentarios && act.comentarios.length > 0 && (
                <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl space-y-2 border dark:border-zinc-850 max-h-32 overflow-y-auto">
                  <span className="text-[8px] font-bold text-zinc-400 block uppercase tracking-wider">Histórico de Observações</span>
                  {act.comentarios.map(com => (
                    <div key={com.id} className="text-[10px] text-zinc-600 dark:text-zinc-350 bg-white dark:bg-zinc-950 p-1.5 rounded border dark:border-zinc-850">
                      <strong className="text-purple-650 dark:text-purple-400 font-extrabold">{com.autorNome}:</strong> {com.texto}
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => handleCommentSubmitLocal(e, commentingActId)} className="space-y-4">
                <textarea
                  required
                  rows={3}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Escreva detalhes técnicos, ocorrências do faturamento ou ocorrências operacionais..."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-850 rounded-xl text-black dark:text-zinc-100"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-750 font-black text-white rounded-lg shadow-sm transition"
                  >
                    Gravar Nota
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ----------------------------------------------------
          1. SIMULADOR DE ARQUIVO ANEXAR COMC
          ---------------------------------------------------- */}
      {attachingActId && (() => {
        const act = activities.find(a => a.id === attachingActId);
        return (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in text-xs font-semibold">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border dark:border-zinc-800 p-5 rounded-xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b dark:border-zinc-830 pb-2">
                <h5 className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <Paperclip size={13} className="text-purple-600 shrink-0" /> Anexar Comprovante Técnico
                </h5>
                <button
                  type="button"
                  onClick={() => setAttachingActId(null)}
                  className="text-rose-500 font-bold"
                >
                  ×
                </button>
              </div>

              <span>Arraste ou escolha os arquivos de relatório ou XML de confirmação para auditoria SGO:</span>

              <div 
                className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50/10' 
                    : 'border-zinc-250 hover:border-indigo-400 dark:border-zinc-800'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={(e) => handleDrop(e, attachingActId)}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-1.5 flex flex-col items-center">
                  <Download className="text-zinc-400 animate-bounce" size={20} />
                  <span className="font-bold text-[10px] text-indigo-600 block">Dra & Drop ou Clique aqui</span>
                  <span className="text-[8px] text-zinc-400">PDF, XLS, CSV ou XML (máx 5MB)</span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={(e) => handleManualFileChoose(e, attachingActId)} 
                />
              </div>

              {uploadedFiles[attachingActId] && uploadedFiles[attachingActId].length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider block">Relatórios Pendentes Salvos:</span>
                  {uploadedFiles[attachingActId].map((f, idx) => (
                    <div key={idx} className="flex justify-between p-1.5 bg-zinc-50 border dark:border-zinc-850 rounded text-[9px] font-mono leading-none">
                      <span className="truncate max-w-[200px] font-bold text-zinc-600 dark:text-zinc-300">{f.name}</span>
                      <span className="text-[8px] text-zinc-400 shrink-0">{f.size}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ----------------------------------------------------
          9. NOVO MODAL: REPASSAR ATIVIDADE DIRETO COM RECOMENDADOR
          ---------------------------------------------------- */}
      {reassigningActId && (() => {
        const act = activities.find(a => a.id === reassigningActId);
        if (!act) return null;

        const proposal = calculateRedistributionProposal(act);

        return (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in font-semibold">
            <div className="w-full max-w-md bg-white dark:bg-zinc-950 border dark:border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4 text-xs">
              <div className="flex justify-between items-center border-b dark:border-zinc-800 pb-2">
                <h5 className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <UserCheck size={14} className="text-indigo-600 shrink-0" /> Repassar Demanda SGO
                </h5>
                <button
                  type="button"
                  onClick={() => setReassigningActId(null)}
                  className="text-rose-500 font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-1 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border dark:border-zinc-850">
                <span className="text-[9px] uppercase font-bold text-zinc-405 tracking-wider block leading-none mb-1">Rotina Ativa</span>
                <span className="text-indigo-755 dark:text-indigo-400 font-black text-sm block">{act.nome}</span>
                <span className="text-[9px] text-zinc-450 block">Responsável Atual: {users.find(u => u.id === act.responsavelAtualId)?.nome}</span>
              </div>

              {/* 9. Sugestão Inteligente de Substitutos */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/40 rounded-xl space-y-2">
                <div className="flex items-center gap-1 font-black text-purple-755 dark:text-purple-400 text-[10px] uppercase tracking-wide">
                  <TrendingUp size={11} /> Substituição Sugerida Automática
                </div>
                {proposal.candidate ? (
                  <div className="space-y-1">
                    <div className="flex justify-between leading-none font-extrabold">
                      <span className="text-zinc-800 dark:text-zinc-200">Recomendado: {proposal.candidate.nome}</span>
                      <span className="text-[9px] text-purple-600 font-black">Nível {knowledge.find(k => k.colaboradorId === proposal.candidate?.id && k.atividadeNome.toLowerCase().trim() === act.nome.toLowerCase().trim())?.nivel ?? 1}</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 leading-relaxed"><strong className="text-purple-650">Motivo:</strong> {proposal.reason}</p>
                    <button
                      type="button"
                      onClick={() => handleReassignSubmit(act.id, proposal.candidate!.id)}
                      className="mt-1 text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-black py-1 px-2.5 rounded-lg transition overflow-hidden"
                    >
                      Aplicar Sugestão: {proposal.candidate.nome}
                    </button>
                  </div>
                ) : (
                  <p className="text-[9px] text-zinc-500 italic">{proposal.reason}</p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[9px] text-zinc-405 font-bold uppercase tracking-wider block mb-1">Ou Escolha Manualmente</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {users
                    .filter(u => u.id !== act.responsavelAtualId && u.status === 'Ativo')
                    .map(u => {
                      const uKnowledge = knowledge.find(k => k.colaboradorId === u.id && k.atividadeNome.toLowerCase().trim() === act.nome.toLowerCase().trim());
                      const currentPending = activities.filter(a => a.responsavelAtualId === u.id && a.status !== 'Concluída').length;

                      return (
                        <div 
                          key={u.id} 
                          onClick={() => handleReassignSubmit(act.id, u.id)}
                          className="p-2 bg-zinc-50 hover:bg-indigo-50/40 dark:bg-zinc-900 border dark:border-zinc-850 hover:border-indigo-200 rounded-xl cursor-pointer transition flex justify-between items-center"
                        >
                          <div>
                            <span className="font-extrabold text-[10px] text-zinc-800 dark:text-zinc-200 block">{u.nome}</span>
                            <span className="text-[8px] text-zinc-405 font-medium block">Pilha pendente: {currentPending} ativs</span>
                          </div>
                          <span className="text-[9px] font-mono bg-zinc-150 dark:bg-zinc-950 px-1.5 py-0.5 rounded font-black">
                            conh Lvl {uKnowledge?.nivel || 1}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Operational Procedure Detail Overlay */}
      {activeProcedure && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-center items-center z-50">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-xl border dark:border-zinc-800 text-xs flex flex-col gap-4 animate-fade-in mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <BookMarked className="text-purple-650" size={18} />
                <div>
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">📖 {activeProcedure.titulo}</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Documentação Operacional de Suporte Técnico</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveProcedure(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-rose-555 font-extrabold text-sm"
              >
                ×</button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[9px] text-zinc-450 font-bold uppercase tracking-wider block mb-1">Descrição Geral</span>
                <p className="text-zinc-750 dark:text-zinc-300 leading-relaxed font-semibold bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border dark:border-zinc-850 text-justify">
                  {activeProcedure.descricao}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] text-zinc-450 font-bold uppercase tracking-wider block">Passo a Passo de Execução</span>
                {activeProcedure.passos && activeProcedure.passos.length > 0 ? (
                  <div className="space-y-2">
                    {activeProcedure.passos.map((passo, idx) => (
                      <div key={idx} className="flex gap-2.5 p-2 bg-indigo-50/30 border dark:border-zinc-850 rounded-xl items-start">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-150 dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-center font-black text-indigo-755 text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed pt-0.5">{passo}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-400 italic">Nenhum passo a passo documentado ainda.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveProcedure(null)}
                className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-755 text-white font-extrabold rounded-lg shadow-sm"
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
