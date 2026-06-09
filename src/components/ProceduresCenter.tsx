import React, { useState } from 'react';
import { Procedure, User } from '../types';
import { 
  BookOpen, Plus, ThumbsUp, Check, Eye, HelpCircle, FileText, Video, Image, Send, Edit, Trash2
} from 'lucide-react';

interface ProceduresCenterProps {
  procedures: Procedure[];
  users: User[];
  activeUser: User | null;
  onSuggestProcedure: (procedure: Omit<Procedure, 'id' | 'status' | 'dataSugerida'>) => void;
  onApproveProcedure: (procId: string) => void;
  onDeleteProcedure?: (procId: string) => void;
  onEditProcedure?: (procId: string, updatedFields: Partial<Procedure>) => void;
}

export function ProceduresCenter({
  procedures,
  users,
  activeUser,
  onSuggestProcedure,
  onApproveProcedure,
  onDeleteProcedure,
  onEditProcedure
}: ProceduresCenterProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [stepsText, setStepsText] = useState(''); // newline-separated steps
  const [pdfName, setPdfName] = useState('');

  // Selected procedure for detailed modal look
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);

  // States for editing a procedure
  const [editingProc, setEditingProc] = useState<Procedure | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStepsText, setEditStepsText] = useState('');
  const [editPdfName, setEditPdfName] = useState('');

  // Sate to confirm inline deletion (iframe-safe alternative to window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startEditing = (proc: Procedure) => {
    setEditingProc(proc);
    setEditTitle(proc.titulo);
    setEditDesc(proc.descricao);
    setEditStepsText(proc.passos.join('\n'));
    setEditPdfName(proc.pdfNome || '');
  };

  const canModify = (proc: Procedure) => {
    if (!activeUser) return false;
    // Admins and Coordination can edit/delete anything
    if (activeUser.role === 'Admin' || activeUser.role === 'Coordenação') return true;
    // Authors can edit/delete their own suggested procedures
    return proc.autorId === activeUser.id;
  };

  const canApprove = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';

  const handleSuggest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;

    const steps = stepsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    onSuggestProcedure({
      titulo: title,
      descricao: desc,
      passos: steps.length > 0 ? steps : ['Realizar a rotina de faturamento de forma integral.'],
      autorId: activeUser?.id || 'anon',
      pdfNome: pdfName.trim() || undefined
    });

    setTitle('');
    setDesc('');
    setStepsText('');
    setPdfName('');
    setShowAddForm(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            📖 Central de Procedimentos & Continuidade Operacional
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Reduza o risco operacional registrando o passo a passo detalhado de cada atividade setorial.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 transition font-medium text-white text-xs rounded-xl"
          >
            <Plus size={13} /> Sugerir Procedimento
          </button>
        )}
      </div>

      {/* Sugestão Form */}
      {showAddForm && (
        <form onSubmit={handleSuggest} className="p-4 bg-zinc-50 dark:bg-zinc-905 border dark:border-zinc-800 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Título da Rotina</label>
              <input
                type="text"
                required
                placeholder="Ex: Conciliação Klingo"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border dark:border-zinc-850 rounded-xl text-xs text-black dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Documento de Apoio (PDF, Imagem, Vídeo)</label>
              <input
                type="text"
                placeholder="Ex: manual_klingo_v2.pdf"
                value={pdfName}
                onChange={e => setPdfName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border dark:border-zinc-850 rounded-xl text-xs text-black dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição Resumida</label>
            <textarea
              required
              rows={2}
              placeholder="Explicação do propósito desta atividade operacional..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border dark:border-zinc-850 rounded-xl text-xs text-black dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Passo a Passo (Escreva um passo por linha)</label>
            <textarea
              rows={4}
              placeholder="Passo 1: Baixar os comprovantes no portal&#10;Passo 2: Abrir a planilha de validação&#10;Passo 3: Importar no SAP ERP"
              value={stepsText}
              onChange={e => setStepsText(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border dark:border-zinc-850 rounded-xl text-xs text-black dark:text-white font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t dark:border-zinc-850">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 rounded-xl text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              Sugerir para Aprovação
            </button>
          </div>
        </form>
      )}

      {/* Procedures Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {procedures.map((proc) => {
          const author = users.find(u => u.id === proc.autorId);
          const isPending = proc.status === 'Sugerido';

          return (
            <div 
              key={proc.id} 
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition ${
                isPending 
                  ? 'border-amber-200 bg-amber-50/5 dark:bg-amber-950/5 dark:border-amber-900/20' 
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isPending 
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/40' 
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/40'
                  }`}>
                    {proc.status}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">{proc.dataSugerida}</span>
                </div>

                <div>
                  <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white">{proc.titulo}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{proc.descricao}</p>
                </div>

                {/* Media indicators */}
                <div className="flex items-center gap-3 pt-2">
                  {proc.pdfNome && (
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <FileText size={12} className="text-indigo-400" /> {proc.pdfNome}
                    </span>
                  )}
                  {/* Image & Video previews placeholders */}
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400" title="Diagrama do processo incorporado">
                    <Image size={12} /> Imagem operacional
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400" title="Vídeo explicativo disponível para a equipe">
                    <Video size={12} /> Screencast rotina
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex justify-between items-center pt-3 border-t dark:border-zinc-850 text-xs">
                <span className="text-[10px] text-zinc-400 font-medium">Sugerido por: <strong>{author?.nome || 'Anon'}</strong></span>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedProc(proc)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 text-[10px] font-bold transition"
                  >
                    <Eye size={12} /> Ver Detalhes
                  </button>

                  {isPending && canApprove && (
                    <button
                      onClick={() => onApproveProcedure(proc.id)}
                      className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 text-[10px] font-bold transition"
                    >
                      <Check size={12} /> Aprovar Rotina
                    </button>
                  )}

                  {canModify(proc) && (
                    <>
                      <button
                        onClick={() => startEditing(proc)}
                        className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold transition"
                        title="Editar Procedimento"
                      >
                        <Edit size={11} /> Editar
                      </button>

                      {confirmDeleteId === proc.id ? (
                        <div className="flex items-center bg-rose-50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-lg p-0.5">
                          <button
                            onClick={() => {
                              onDeleteProcedure?.(proc.id);
                              setConfirmDeleteId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded"
                          >
                            Excluir?
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-zinc-500 dark:text-zinc-400 text-[9px] font-bold px-1.5 py-0.5"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(proc.id)}
                          className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 text-[10px] font-bold transition"
                          title="Excluir Procedimento"
                        >
                          <Trash2 size={11} /> Excluir
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Procedure details modal */}
      {selectedProc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-white dark:bg-zinc-950 max-w-lg w-full rounded-2xl p-6 border dark:border-zinc-800 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold bg-emerald-100 text-emerald-800">{selectedProc.status}</span>
                <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white mt-1.5">{selectedProc.titulo}</h4>
              </div>
              <button
                onClick={() => setSelectedProc(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                Fechar
              </button>
            </div>

            <p className="text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed italic border-l-2 border-indigo-500 pl-3">
              {selectedProc.descricao}
            </p>

            <div className="space-y-2">
              <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400">Passo a Passo Operacional</h5>
              <ol className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedProc.passos.map((p, idx) => (
                  <li key={idx} className="flex gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                    <span className="p-1 h-5 w-5 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{p}</span>
                  </li>
                ))}
              </ol>
            </div>

            {selectedProc.pdfNome && (
              <div className="p-3 bg-indigo-50/50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-400">{selectedProc.pdfNome}</span>
                </div>
                <button 
                  onClick={() => alert('Download do manual simulado com sucesso na competência atual!')}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Baixar Documento
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Procedure Modal */}
      {editingProc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-white dark:bg-zinc-950 max-w-lg w-full rounded-2xl p-6 border dark:border-zinc-805 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white">✍️ Editar Procedimento</h4>
                <p className="text-[10px] text-zinc-500 mt-1">Atualize as informações da rotina operacional.</p>
              </div>
              <button
                onClick={() => setEditingProc(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 text-xs font-bold"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editTitle.trim() || !editDesc.trim()) return;
              const steps = editStepsText
                .split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0);

              onEditProcedure?.(editingProc.id, {
                titulo: editTitle.trim(),
                descricao: editDesc.trim(),
                passos: steps.length > 0 ? steps : ['Realizar a rotina de faturamento de forma integral.'],
                pdfNome: editPdfName.trim() || undefined
              });
              setEditingProc(null);
            }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Título da Rotina</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Documento de Apoio</label>
                  <input
                    type="text"
                    value={editPdfName}
                    onChange={e => setEditPdfName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Descrição Resumida</label>
                <textarea
                  required
                  rows={2}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1 text-left font-sans">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Passo a Passo (Um passo por linha)</label>
                <textarea
                  rows={4}
                  value={editStepsText}
                  onChange={e => setEditStepsText(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => setEditingProc(null)}
                  className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-405 rounded-xl text-xs shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shrink-0"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
