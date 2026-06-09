import React, { useState, useRef } from 'react';
import { 
  MessageSquare, Paperclip, Plus, Trash2, Calendar, ShieldAlert, CheckCircle2, AlertTriangle, 
  Clock, ArrowRightLeft, Sparkles, UserCheck, RefreshCw, Send, Check, Edit2, X, Eye, Download
} from 'lucide-react';
import { Activity, Priority, ActivityStatus, User, Comment } from '../types';
import { COMPETENCIAS_LIST } from '../utils/competencias';

interface MondayTableProps {
  activities: Activity[];
  users: User[];
  activeUser: User | null;
  competenciaAtual: string;
  onUpdateActivity: (actId: string, updatedFields: Partial<Activity>) => void;
  onDeleteActivity: (actId: string) => void;
  onCreateActivity: (activity: Omit<Activity, 'id' | 'comentarios' | 'anexos'>) => void;
  onAddComment: (actId: string, text: string) => void;
  onAddAttachment: (actId: string, file: File) => void;
}

export function MondayTable({
  activities,
  users,
  activeUser,
  competenciaAtual,
  onUpdateActivity,
  onDeleteActivity,
  onCreateActivity,
  onAddComment,
  onAddAttachment
}: MondayTableProps) {
  // Filter activities to show only those matching the active competence
  const currentActivities = activities.filter(act => act.competencia === competenciaAtual);

  // New activity form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActNome, setNewActNome] = useState('');
  const [newActCompetencia, setNewActCompetencia] = useState(competenciaAtual || 'Junho/2026');

  // Sync newActCompetencia if the main active competence changes
  React.useEffect(() => {
    setNewActCompetencia(competenciaAtual);
  }, [competenciaAtual]);

  const [newActRespId, setNewActRespId] = useState('');
  const [newActAuxIds, setNewActAuxIds] = useState<string[]>([]);
  const [newActPriority, setNewActPriority] = useState<Priority>('Média');
  const [newActStatus, setNewActStatus] = useState<ActivityStatus>('Pendente');
  const [newActLimit, setNewActLimit] = useState('2026-06-15');
  const [newActRecorrente, setNewActRecorrente] = useState(false);
  const [newActMeses, setNewActMeses] = useState(1);
  const [isMultipleExecutions, setIsMultipleExecutions] = useState(false);
  const [multipleDates, setMultipleDates] = useState<string[]>([]);
  const [tempDate, setTempDate] = useState('2026-06-15');

  // Comments modal state
  const [activeCommentsAct, setActiveCommentsAct] = useState<Activity | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Edit activity state
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editActNome, setEditActNome] = useState('');
  const [editActCompetencia, setEditActCompetencia] = useState('');
  const [editActRespId, setEditActRespId] = useState('');
  const [editActAuxIds, setEditActAuxIds] = useState<string[]>([]);
  const [editActPriority, setEditActPriority] = useState<Priority>('Média');
  const [editActStatus, setEditActStatus] = useState<ActivityStatus>('Pendente');
  const [editActLimit, setEditActLimit] = useState('');
  const [editActRecorrente, setEditActRecorrente] = useState(false);
  const [editActMeses, setEditActMeses] = useState(1);

  // File upload reference and state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingActId, setUploadingActId] = useState<string | null>(null);

  // New state for comment editing and attachment preview
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');
  const [previewAttachment, setPreviewAttachment] = useState<{ id: string; nome: string; tamanho: string; mimeType: string; url?: string } | null>(null);
  const [downloadedFeedback, setDownloadedFeedback] = useState(false);

  // Helpers for comments and attachments updates
  const handleDeleteComment = (commentId: string) => {
    if (!activeCommentsAct) return;
    const updatedComments = activeCommentsAct.comentarios.filter(c => c.id !== commentId);
    onUpdateActivity(activeCommentsAct.id, { comentarios: updatedComments });
    setActiveCommentsAct({ ...activeCommentsAct, comentarios: updatedComments });
  };

  const handleSaveEditComment = (commentId: string) => {
    if (!activeCommentsAct || !editingCommentText.trim()) return;
    const updatedComments = activeCommentsAct.comentarios.map(c => 
      c.id === commentId ? { ...c, texto: editingCommentText } : c
    );
    onUpdateActivity(activeCommentsAct.id, { comentarios: updatedComments });
    setActiveCommentsAct({ ...activeCommentsAct, comentarios: updatedComments });
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    if (!activeCommentsAct) return;
    const updatedAnexos = activeCommentsAct.anexos.filter(a => a.id !== attachmentId);
    onUpdateActivity(activeCommentsAct.id, { anexos: updatedAnexos });
    setActiveCommentsAct({ ...activeCommentsAct, anexos: updatedAnexos });
  };

  const handleDownloadAttachmentFile = () => {
    if (!previewAttachment) return;
    
    let url = previewAttachment.url;
    let isCreatedUrl = false;

    if (!url) {
      // Simulate/generate file content dynamically based on original or uploaded file
      const textContent = previewAttachment.nome.endsWith('.csv') || previewAttachment.nome.endsWith('.xlsx') || previewAttachment.nome.includes('planilha')
        ? `id,competencia,responsavel,quantidade_faturas,data_fechamento,status_auditoria\n1039,${competenciaAtual},${activeUser?.nome || 'Operador'},344,2026-06-05,APROVADO_SGO_INTEGRAL\n1040,${competenciaAtual},Coordenação Geral,128,2026-06-05,APROVADO_AUTOMATICO\n1041,${competenciaAtual},Operador Interno,429,2026-06-05,VERIFICADO_COM_AVISO_SLA`
        : `--- RELATÓRIO DE COMPROVAÇÃO DE FECHAMENTO ---\nCompetência: ${competenciaAtual}\nData de Emissão: 05/06/2026 14:54\nResponsável Técnico: ${activeUser?.nome || 'Operador Central'}\nStatus da Homologação das Metas: REVISADO E REGISTRADO\n\nEste documento assegura para todos os fins regulatórios e de auditoria que os volumes descritos nas faturas e metas setoriais estão auditados com o sistema central. Nenhuma incongruência ou inconsistência foi identificada no processamento eletrônico do lote.`;

      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      url = URL.createObjectURL(blob);
      isCreatedUrl = true;
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = previewAttachment.nome;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    if (isCreatedUrl && url) {
      URL.revokeObjectURL(url);
    }
    
    setDownloadedFeedback(true);
    setTimeout(() => {
      setDownloadedFeedback(false);
    }, 2500);
  };

  // Permission checks
  const canWrite = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação' || activeUser?.role === 'Colaborador';
  const canDelete = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação' || activeUser?.role === 'Colaborador';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActNome.trim() || !newActRespId) return;

    if (isMultipleExecutions && multipleDates.length > 0) {
      // Create multiple activities, each with its own dataLimite
      multipleDates.forEach((execDate, index) => {
        onCreateActivity({
          nome: `${newActNome} (Execução ${index + 1}/${multipleDates.length})`,
          competencia: newActCompetencia,
          responsavelOriginalId: newActRespId,
          responsavelAtualId: newActRespId,
          responsaveisAuxiliaresIds: newActAuxIds,
          prioridade: newActPriority,
          status: newActStatus,
          dataLimite: execDate,
          recorrente: newActRecorrente,
          periodicidade: newActRecorrente ? 'Mensal' : undefined,
          mesesAtividadeComMesmoResponsavel: newActMeses
        });
      });
    } else {
      // Create a single activity
      onCreateActivity({
        nome: newActNome,
        competencia: newActCompetencia,
        responsavelOriginalId: newActRespId,
        responsavelAtualId: newActRespId,
        responsaveisAuxiliaresIds: newActAuxIds,
        prioridade: newActPriority,
        status: newActStatus,
        dataLimite: newActLimit,
        recorrente: newActRecorrente,
        periodicidade: newActRecorrente ? 'Mensal' : undefined,
        mesesAtividadeComMesmoResponsavel: newActMeses
      });
    }

    // Reset fields
    setNewActNome('');
    setNewActRespId('');
    setNewActAuxIds([]);
    setNewActPriority('Média');
    setNewActStatus('Pendente');
    setNewActRecorrente(false);
    setNewActMeses(1);
    setIsMultipleExecutions(false);
    setMultipleDates([]);
    setShowAddForm(false);
  };

  const toggleAuxiliary = (uId: string) => {
    setNewActAuxIds(prev => 
      prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]
    );
  };

  const toggleEditAuxiliary = (uId: string) => {
    setEditActAuxIds(prev =>
      prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editActNome.trim() || !editActRespId) return;

    onUpdateActivity(editingActivity.id, {
      nome: editActNome,
      competencia: editActCompetencia,
      responsavelAtualId: editActRespId,
      responsaveisAuxiliaresIds: editActAuxIds,
      prioridade: editActPriority,
      status: editActStatus,
      dataLimite: editActLimit,
      recorrente: editActRecorrente,
      mesesAtividadeComMesmoResponsavel: editActMeses,
    });

    setEditingActivity(null);
  };

  const triggerFileUpload = (actId: string) => {
    setUploadingActId(actId);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 10);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadingActId && e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onAddAttachment(uploadingActId, file);
      
      if (activeCommentsAct && activeCommentsAct.id === uploadingActId) {
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
        const updatedAct = {
          ...activeCommentsAct,
          anexos: [...activeCommentsAct.anexos, newAttachment]
        };
        setActiveCommentsAct(updatedAct);
      }
    }
    if (e.target.value) {
      e.target.value = '';
    }
    setUploadingActId(null);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Hidden file selector input */}
      <input 
        id="hidden_activity_file_upload"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Table Toolbar */}
      <div className="px-6 py-4 border-b border-zinc-150 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            📋 Quadro de Atividades e Rotinas
            <span className="text-xs bg-indigo-50 text-indigo-700 dark:bg-zinc-800 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              {currentActivities.length} Atividades
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Gestão administrativa focada na competência ativa: <strong>{competenciaAtual}</strong>.
          </p>
        </div>
        {canWrite && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 transition font-medium text-white text-xs rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            <Plus size={14} /> Nova Atividade
          </button>
        )}
      </div>

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Atividade</label>
            <input
              type="text"
              required
              placeholder="Ex: Conciliação Klingo Quinzenal"
              value={newActNome}
              onChange={e => setNewActNome(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Competência de Vinculação</label>
            <select
              value={newActCompetencia}
              onChange={e => setNewActCompetencia(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-purple-600 dark:text-purple-400 font-bold cursor-pointer focus:ring-1 focus:ring-purple-500"
            >
              {COMPETENCIAS_LIST.map(comp => (
                <option key={comp} value={comp} className="text-purple-600 dark:text-purple-450 font-bold bg-white dark:bg-zinc-900">
                  {comp}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Responsável Principal</label>
            <select
              required
              value={newActRespId}
              onChange={e => {
                setNewActRespId(e.target.value);
                // Evitar duplicar no auxiliar
                setNewActAuxIds(prev => prev.filter(id => id !== e.target.value));
              }}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white"
            >
              <option value="">Selecione...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prioridade da Demanda</label>
            <select
              value={newActPriority}
              onChange={e => setNewActPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white"
            >
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Crítica">Crítica</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status Inicial da Rotina</label>
            <select
              value={newActStatus}
              onChange={e => setNewActStatus(e.target.value as ActivityStatus)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white"
            >
              <option value="Pendente">⏱️ Pendente</option>
              <option value="Em andamento">⚡ Em andamento</option>
              <option value="Concluída">✅ Concluída</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prazo Limite (SLA)</label>
            <input
              type="date"
              required
              value={newActLimit}
              onChange={e => setNewActLimit(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tempo com Executor atual (Meses)</label>
            <input
              type="number"
              min={1}
              value={newActMeses}
              onChange={e => setNewActMeses(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white font-mono"
            />
          </div>

          {/* New Field: Responsaveis Auxiliares Multiple Selection */}
          <div className="md:col-span-3 space-y-1.5 select-none">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Selecione Responsáveis Auxiliares (Participação Opcional)</label>
            {newActRespId ? (
              <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-32 overflow-y-auto">
                {users.filter(u => u.id !== newActRespId).map(u => {
                  const isChecked = newActAuxIds.includes(u.id);
                  return (
                    <label key={u.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs font-semibold ${isChecked ? 'bg-indigo-50 border-indigo-200 dark:bg-zinc-800 dark:border-zinc-700 text-indigo-750 dark:text-indigo-400' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-950 dark:border-zinc-850'}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAuxiliary(u.id)}
                        className="rounded text-indigo-650"
                      />
                      <span>{u.nome}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-400 italic">Defina o Responsável Principal primeiro para liberar a escolha de auxiliares.</p>
            )}
          </div>

          {/* Option: Does it occur more than once in the month? */}
          <div className="md:col-span-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isMultipleExecutions}
                  onChange={e => {
                    setIsMultipleExecutions(e.target.checked);
                    if (e.target.checked && multipleDates.length === 0) {
                      // Pre-populate with the current limit date as first entry
                      setMultipleDates([newActLimit]);
                    }
                  }}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                📅 Ocorre mais de uma vez no mês? (Múltiplas execuções)
              </label>
              {isMultipleExecutions && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                  {multipleDates.length} Execuções agendadas
                </span>
              )}
            </div>

            {isMultipleExecutions && (
              <div className="space-y-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 animate-fade-in text-left">
                <p className="text-[10px] text-zinc-500">
                  Defina as datas limites para cada execução desejada. Uma atividade individual na tabela será cadastrada para cada execução agendada.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Agendar Próxima Data</label>
                    <input
                      type="date"
                      value={tempDate}
                      onChange={e => setTempDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-850 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-blue-600 dark:text-blue-400 font-mono focus:outline-none focus:ring-1 focus:ring-blue-550"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!tempDate) return;
                      if (multipleDates.includes(tempDate)) return; // Prevent duplicate dates
                      setMultipleDates(prev => [...prev, tempDate].sort());
                    }}
                    className="flex items-center justify-center gap-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition cursor-pointer select-none"
                  >
                    + Adicionar Execução
                  </button>
                </div>

                {/* Displaying Dates Badges List */}
                {multipleDates.length === 0 ? (
                  <p className="text-[10px] text-rose-500 italic">Adicione pelo menos uma data para salvar as execuções.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {multipleDates.map((d, index) => {
                      const parts = d.split('-');
                      const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
                      return (
                        <div key={d} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-850 hover:bg-rose-50/20 hover:border-rose-200 border border-zinc-200 dark:border-zinc-800 rounded-full text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition">
                          <span className="text-zinc-400">#{index + 1}:</span>
                          <span className="font-mono text-[11px] font-bold">{formatted}</span>
                          <button
                            type="button"
                            onClick={() => setMultipleDates(prev => prev.filter(x => x !== d))}
                            className="text-rose-500 hover:text-rose-700 font-black pl-1 cursor-pointer"
                            title="Remover data de execução"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 md:col-span-2 pt-2 select-none">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newActRecorrente}
                onChange={e => setNewActRecorrente(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              Atividade Recorrente Mensal (Gera automaticamente na próxima competência)
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2 md:col-span-1">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setIsMultipleExecutions(false);
                setMultipleDates([]);
              }}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 rounded-xl text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isMultipleExecutions && multipleDates.length === 0}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition ${
                isMultipleExecutions && multipleDates.length === 0
                  ? 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-650 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
              }`}
            >
              Criar Atividade
            </button>
          </div>
        </form>
      )}

      {/* Spreadsheet List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 select-none">
              <th className="px-6 py-3.5 font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Atividade</th>
              <th className="px-6 py-3.5 font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Responsáveis</th>
              <th className="px-6 py-3.5 font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Prioridade</th>
              <th className="px-6 py-3.5 font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Status</th>
              <th className="px-6 py-3.5 font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Data Limite</th>
              <th className="px-6 py-3.5 font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px] text-center">Interatividade</th>
              <th className="px-6 py-3.5 font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {currentActivities.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-zinc-400">
                  Nenhuma atividade cadastrada para esta competência.
                </td>
              </tr>
            ) : (
              currentActivities.map((act) => {
                const isRedistributed = act.responsavelOriginalId !== act.responsavelAtualId;
                const origUser = users.find(u => u.id === act.responsavelOriginalId);
                const currentUser = users.find(u => u.id === act.responsavelAtualId);

                return (
                  <tr key={act.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-all duration-150">
                    {/* Activity name */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-900 dark:text-white">{act.nome}</span>
                          {act.recorrente && (
                            <span className="inline-flex items-center text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200/40">
                              RECORRENTE
                            </span>
                          )}
                          {act.mesesAtividadeComMesmoResponsavel >= 12 && (
                            <span 
                              title="Rodízio de atividades recomendado! Executor está há 12 meses ou mais com esta rotina." 
                              className="text-amber-500 cursor-help"
                            >
                              <ShieldAlert size={14} className="animate-bounce" />
                            </span>
                          )}
                        </div>
                        {/* Subtexto */}
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1 select-none">
                          <span>Competência: {act.competencia}</span>
                          <span>•</span>
                          <span>Rodízio: {act.mesesAtividadeComMesmoResponsavel} meses</span>
                        </div>
                      </div>
                    </td>

                    {/* Responsible mapping */}
                    <td className="px-6 py-4">
                      {isRedistributed ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] line-through text-zinc-400">{origUser?.nome || 'Incompleto'}</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{currentUser?.nome}</span>
                          </div>
                          <div className="text-zinc-600 dark:text-zinc-400 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg" title="Atividade sob redistribuição ativa">
                            <ArrowRightLeft size={12} className="animate-spin-slow text-indigo-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{currentUser?.nome || 'Incompleto'}</span>
                        </div>
                      )}
                      
                      {/* Auxiliary list */}
                      {act.responsaveisAuxiliaresIds && act.responsaveisAuxiliaresIds.length > 0 && (
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1" title="Responsáveis Auxiliares">
                          Aux: {act.responsaveisAuxiliaresIds.map(id => users.find(u => u.id === id)?.nome?.split(' ')[0]).join(', ')}
                        </div>
                      )}
                    </td>

                    {/* Priority tag */}
                    <td className="px-6 py-4 select-none">
                      {canWrite ? (
                        <select
                          value={act.prioridade}
                          onChange={e => onUpdateActivity(act.id, { prioridade: e.target.value as Priority })}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border-0 focus:ring-0 ${
                            act.prioridade === 'Crítica' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                            act.prioridade === 'Alta' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400' :
                            act.prioridade === 'Média' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                            'bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          <option value="Baixa">Baixa</option>
                          <option value="Média">Média</option>
                          <option value="Alta">Alta</option>
                          <option value="Crítica">Crítica</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                          act.prioridade === 'Crítica' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                          act.prioridade === 'Alta' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400' :
                          act.prioridade === 'Média' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                          'bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {act.prioridade}
                        </span>
                      )}
                    </td>

                    {/* Status tag */}
                    <td className="px-6 py-4 select-none">
                      {canWrite ? (
                        <select
                          value={act.status}
                          onChange={e => onUpdateActivity(act.id, { status: e.target.value as ActivityStatus })}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-xl border-0 focus:ring-0 ${
                            act.status === 'Concluída' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                            act.status === 'Em andamento' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400' :
                            'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-450'
                          }`}
                        >
                          <option value="Pendente">⏱️ Pendente</option>
                          <option value="Em andamento">⚡ Em andamento</option>
                          <option value="Concluída">✅ Concluída</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-xl ${
                          act.status === 'Concluída' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                          act.status === 'Em andamento' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400' :
                          'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-450'
                        }`}>
                          {act.status}
                        </span>
                      )}
                    </td>

                    {/* Deadline */}
                    <td className="px-6 py-4 text-zinc-550 dark:text-zinc-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-zinc-400" />
                        <span>{act.dataLimite}</span>
                      </div>
                    </td>

                    {/* Interactivity details counts */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-3">
                        <button
                          onClick={() => setActiveCommentsAct(act)}
                          className="flex items-center gap-1 py-1 px-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 dark:text-zinc-400 text-xs transition"
                          title="Melhorar cooperação: ver comentários"
                        >
                          <MessageSquare size={13} />
                          <span className="font-semibold">{act.comentarios.length}</span>
                        </button>

                        <button
                          onClick={() => triggerFileUpload(act.id)}
                          className="flex items-center gap-1 py-1 px-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 dark:text-zinc-400 text-xs transition"
                          title="Anexar arquivos relevantes da competência"
                        >
                          <Paperclip size={13} />
                          <span className="font-semibold">{act.anexos.length}</span>
                        </button>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canWrite && (
                          <button
                            onClick={() => {
                              setEditingActivity(act);
                              setEditActNome(act.nome);
                              setEditActCompetencia(act.competencia);
                              setEditActRespId(act.responsavelAtualId);
                              setEditActAuxIds(act.responsaveisAuxiliaresIds || []);
                              setEditActPriority(act.prioridade);
                              setEditActStatus(act.status);
                              setEditActLimit(act.dataLimite);
                              setEditActRecorrente(act.recorrente);
                              setEditActMeses(act.mesesAtividadeComMesmoResponsavel);
                            }}
                            className="p-1 px-2.5 bg-zinc-50 hover:bg-indigo-50/50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-indigo-600 dark:hover:bg-indigo-950/20 rounded-lg transition"
                            title="Editar atividade"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}

                        {canDelete ? (
                          <button
                            onClick={() => onDeleteActivity(act.id)}
                            className="p-1 px-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-600 dark:hover:bg-rose-950/20 rounded-lg transition"
                            title="Deletar atividade"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          !canWrite && <span className="text-zinc-300 dark:text-zinc-650 font-mono text-[9px] select-none">Sem Permissão</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Comments Modal */}
      {activeCommentsAct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full sm:w-[420px] bg-white dark:bg-zinc-950 h-full p-6 flex flex-col shadow-2xl border-l border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  💬 Comentários
                </h4>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">Atividade: {activeCommentsAct.nome}</p>
              </div>
              <button
                onClick={() => setActiveCommentsAct(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                Fechar
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              {activeCommentsAct.comentarios.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 dark:text-zinc-650">
                  Nenhum comentário cadastrado. Use o campo abaixo para iniciar o diálogo operacional!
                </div>
              ) : (
                activeCommentsAct.comentarios.map((c) => (
                  <div key={c.id} className="p-3.5 bg-zinc-50 dark:bg-zinc-900/45 rounded-2xl border border-zinc-100 dark:border-zinc-900 space-y-2 text-xs relative group">
                    {editingCommentId === c.id ? (
                      <div className="space-y-2 font-semibold">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 font-semibold text-zinc-900 dark:text-white"
                          rows={2}
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentText('');
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-650 bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded transition"
                            title="Cancelar"
                          >
                            <X size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditComment(c.id)}
                            className="p-1 text-emerald-605 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded transition"
                            title="Confirmar"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-[10px] text-zinc-400">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">{c.autorNome}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">{c.dataHora}</span>
                            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingCommentText(c.texto);
                                }}
                                className="p-0.5 text-zinc-400 hover:text-indigo-600 rounded hover:bg-zinc-100 dark:hover:bg-zinc-855"
                                title="Editar"
                              >
                                <Edit2 size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="p-0.5 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-100 dark:hover:bg-zinc-855"
                                title="Excluir"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line font-medium leading-relaxed">{c.texto}</p>
                      </>
                    )}
                  </div>
                ))
              )}

              {/* Attachments Section Inside Panel */}
              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Documentos e Planilhas no Mês</h5>
                  <button
                    type="button"
                    onClick={() => triggerFileUpload(activeCommentsAct.id)}
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-zinc-900 dark:text-indigo-400 px-2 py-0.5 rounded font-extrabold flex items-center gap-1 transition"
                  >
                    <Plus size={10} /> Anexar
                  </button>
                </div>
                {activeCommentsAct.anexos.length === 0 ? (
                  <p className="text-[11px] text-zinc-400">Nenhum arquivo anexado para esta atividade na competência.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeCommentsAct.anexos.map((a) => (
                      <div key={a.id} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/60 p-2 border border-zinc-200/50 dark:border-zinc-800/80 rounded-xl text-xs gap-2">
                        <div className="truncate flex items-center gap-1 text-zinc-700 dark:text-zinc-300 flex-1 min-w-0">
                          <Paperclip size={12} className="text-indigo-400 shrink-0" />
                          <span className="truncate font-medium block" title={a.nome}>{a.nome}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-mono text-zinc-400 mr-1.5">{a.tamanho}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment({ ...a, mimeType: a.mimeType || 'application/octet-stream' })}
                            className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition"
                            title="Visualizar anexo"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(a.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition"
                            title="Excluir anexo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Input Form */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Seu comentário operacional..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white"
                />
                <button
                  onClick={() => {
                    if (!newCommentText.trim()) return;
                    onAddComment(activeCommentsAct.id, newCommentText);
                    // Dynamically refresh local state in modal too
                    const updatedAct = { ...activeCommentsAct };
                    const newComObj: Comment = {
                      id: String(Date.now()),
                      autorId: activeUser?.id || 'anon',
                      autorNome: activeUser?.nome || 'Operador',
                      texto: newCommentText,
                      dataHora: new Date().toISOString().replace('T', ' ').substring(0, 16)
                    };
                    updatedAct.comentarios = [...updatedAct.comentarios, newComObj];
                    setActiveCommentsAct(updatedAct);
                    setNewCommentText('');
                  }}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50">
          <form 
            onSubmit={handleEditSubmit}
            className="w-full sm:w-[460px] bg-white dark:bg-zinc-950 h-full p-6 flex flex-col shadow-2xl border-l border-zinc-200 dark:border-zinc-800 text-xs overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-zinc-150 dark:border-zinc-800 pb-4">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  ✏️ Editar Atividade
                </h4>
                <p className="text-xs text-zinc-500 mt-1">Altere os parâmetros operacionais da demanda.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex-1 space-y-4 py-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Atividade</label>
                <input
                  type="text"
                  required
                  value={editActNome}
                  onChange={e => setEditActNome(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Competência de Vinculação</label>
                <select
                  value={editActCompetencia}
                  onChange={e => setEditActCompetencia(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-purple-600 dark:text-purple-400 font-bold cursor-pointer focus:ring-1 focus:ring-purple-500"
                >
                  {COMPETENCIAS_LIST.map(comp => (
                    <option key={comp} value={comp} className="text-purple-600 dark:text-purple-450 font-bold bg-white dark:bg-zinc-900">
                      {comp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Responsável Principal</label>
                <select
                  required
                  value={editActRespId}
                  onChange={e => {
                    setEditActRespId(e.target.value);
                    setEditActAuxIds(prev => prev.filter(id => id !== e.target.value));
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white"
                >
                  <option value="">Selecione...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prioridade</label>
                  <select
                    value={editActPriority}
                    onChange={e => setEditActPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-850 rounded-xl text-xs text-black dark:text-white"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</label>
                  <select
                    value={editActStatus}
                    onChange={e => setEditActStatus(e.target.value as ActivityStatus)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-850 rounded-xl text-xs text-black dark:text-white"
                  >
                    <option value="Pendente">⏱️ Pendente</option>
                    <option value="Em andamento">⚡ Em andamento</option>
                    <option value="Concluída">✅ Concluída</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prazo Limite (SLA)</label>
                  <input
                    type="date"
                    required
                    value={editActLimit}
                    onChange={e => setEditActLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Meses com o Executor</label>
                  <input
                    type="number"
                    min={1}
                    value={editActMeses}
                    onChange={e => setEditActMeses(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Auxiliary Selection */}
              <div className="space-y-1.5 select-none">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Responsáveis Auxiliares (Opcional)</label>
                {editActRespId ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-805 rounded-xl max-h-32 overflow-y-auto">
                    {users.filter(u => u.id !== editActRespId).map(u => {
                      const isChecked = editActAuxIds.includes(u.id);
                      return (
                        <label key={u.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer text-xs font-semibold ${isChecked ? 'bg-indigo-50 border-indigo-200 dark:bg-zinc-800 dark:border-zinc-750 text-indigo-750 dark:text-indigo-400' : 'bg-white border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-850'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEditAuxiliary(u.id)}
                            className="rounded text-indigo-650"
                          />
                          <span>{u.nome}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-400 italic">Defina o Responsável Principal primeiro.</p>
                )}
              </div>

              <div className="pt-2 select-none">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActRecorrente}
                    onChange={e => setEditActRecorrente(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  Atividade Recorrente Mensal
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="px-3.5 py-2 border border-zinc-250 dark:border-zinc-800 text-zinc-650 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-300 rounded-xl font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-extrabold text-white rounded-xl transition shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 animate-fade-in text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xl space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="text-indigo-600 dark:text-indigo-400" size={16} />
                <div>
                  <h4 className="font-extrabold text-[13px] text-zinc-900 dark:text-white uppercase tracking-wide">
                    Visualizador de Anexo
                  </h4>
                  <p className="text-[10px] text-zinc-400">Auditoria & Compliance de Documentos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewAttachment(null);
                  setDownloadedFeedback(false);
                }}
                className="text-zinc-400 hover:text-rose-500 font-bold text-base bg-zinc-50 dark:bg-zinc-900 p-1 rounded-lg transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Document Info */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-800 rounded-xl text-[10px]">
              <div>
                <span className="text-zinc-400 block uppercase font-bold text-[8px]">Nome do Arquivo</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block">{previewAttachment.nome}</span>
              </div>
              <div>
                <span className="text-zinc-400 block uppercase font-bold text-[8px]">Tamanho / Tipo</span>
                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 block">
                  {previewAttachment.tamanho} — {previewAttachment.mimeType}
                </span>
              </div>
            </div>

            {/* Simulated document contents */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 border-b border-zinc-150 dark:border-zinc-800 text-[9px] uppercase font-bold text-zinc-400 flex justify-between items-center">
                <span>Visualização prévia do conteúdo</span>
                <span className="text-emerald-600 flex items-center gap-0.5 font-sans font-extrabold">
                  ✓ Assinatura SGO Válida
                </span>
              </div>
              
              <div className="bg-zinc-50/30 dark:bg-zinc-950 p-4 font-mono text-[9px] text-zinc-550 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                {previewAttachment.nome.endsWith('.csv') || previewAttachment.nome.endsWith('.xlsx') || previewAttachment.nome.includes('planilha') ? (
                  `id,competencia,responsavel,quantidade_faturas,data_fechamento,status_auditoria\n1039,${competenciaAtual},${activeUser?.nome || 'Operador'},344,2026-06-05,APROVADO_SGO_INTEGRAL\n1040,${competenciaAtual},Coordenação Geral,128,2026-06-05,APROVADO_AUTOMATICO\n1041,${competenciaAtual},Operador Interno,429,2026-06-05,VERIFICADO_COM_AVISO_SLA`
                ) : (
                  `--- RELATÓRIO DE COMPROVAÇÃO DE FECHAMENTO ---\nCompetência: ${competenciaAtual}\nData de Emissão: 05/06/2026 14:54\nResponsável Técnico: ${activeUser?.nome || 'Operador Central'}\nStatus da Homologação das Metas: REVISADO E REGISTRADO\n\nEste documento assegura para todos os fins regulatórios e de auditoria que os volumes descritos nas faturas e metas setoriais estão auditados com o sistema central. Nenhuma incongruência ou inconsistência foi identificada no processamento eletrônico do lote.`
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setPreviewAttachment(null);
                  setDownloadedFeedback(false);
                }}
                className="px-4 py-1.5 border border-zinc-200 dark:border-zinc-850 hover:text-zinc-900 dark:hover:text-white text-zinc-500 rounded-lg transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleDownloadAttachmentFile}
                className={`px-4 py-1.5 font-extrabold rounded-lg flex items-center gap-1.5 transition-all duration-300 shadow-sm ${
                  downloadedFeedback 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white scale-95" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {downloadedFeedback ? (
                  <>
                    <Check size={12} /> Download Iniciado!
                  </>
                ) : (
                  <>
                    <Download size={12} /> Baixar Arquivo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
