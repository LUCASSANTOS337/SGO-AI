import React, { useState } from 'react';
import { Holiday, User } from '../types';
import { 
  Calendar, Check, Plus, Trash2, ShieldAlert, AlertCircle, Info, Landmark, Compass, MapPin
} from 'lucide-react';
import { getTodayFormatted } from '../utils/competencias';

interface HolidaysCalendarProps {
  holidays: Holiday[];
  activeUser: User | null;
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  onDeleteHoliday: (holidayId: string) => void;
}

export function HolidaysCalendar({
  holidays,
  activeUser,
  onAddHoliday,
  onDeleteHoliday
}: HolidaysCalendarProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'Nacional' | 'Estadual' | 'Municipal'>('Nacional');
  const [data, setData] = useState(getTodayFormatted()); // default simulation
  
  const canManage = activeUser?.role === 'Admin' || activeUser?.role === 'Coordenação';
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !data) return;

    onAddHoliday({
      nome: nome.trim(),
      tipo,
      data
    });

    setNome('');
    setShowAdd(false);
  };

  const getTipoIcon = (tCode: 'Nacional' | 'Estadual' | 'Municipal') => {
    switch (tCode) {
      case 'Nacional': return <Landmark size={13} className="text-indigo-500" />;
      case 'Estadual': return <Compass size={13} className="text-amber-500" />;
      default: return <MapPin size={13} className="text-emerald-500" />;
    }
  };

  const getTipoColor = (tCode: 'Nacional' | 'Estadual' | 'Municipal') => {
    switch (tCode) {
      case 'Nacional': return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400';
      case 'Estadual': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400';
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400';
    }
  };

  // Sort holidays from earliest to latest
  const sortedHolidays = [...holidays].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            📅 Calendário Operacional & Feriados Regulados
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Mapeie recesso operacional para os cálculos volumétricos inteligentes de metas diárias.
          </p>
        </div>
        {!showAdd && canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 transition text-white font-bold text-xs rounded-xl"
          >
            <Plus size={13} /> Cadastrar Feriado
          </button>
        )}
      </div>

      {/* Info helper context */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 rounded-xl text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2 max-w-2xl">
        <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
        <div>
          Quando feriados são inseridos na mesma competência de trabalho, o sistema recalcula de forma transparente o faturamento volumétrico diário dos participantes activos, sem interrupção de produtividade real.
        </div>
      </div>

      {/* Sugestão / Add Form */}
      {showAdd && (
        <form onSubmit={handleSubmit} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl space-y-4 text-xs animate-fade-in">
          <h4 className="font-bold text-zinc-800 dark:text-white">🆕 Registrar Novo Recesso/Feriado</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Identificador/Nome</label>
              <input
                type="text"
                required
                placeholder="Ex: Proclamação da República"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-850 rounded-xl text-black dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Abrangência</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-855 rounded-xl text-black dark:text-white"
              >
                <option value="Nacional">Nacional (Sede e filiais)</option>
                <option value="Estadual">Estadual</option>
                <option value="Municipal">Municipal (Belo Horizonte / Filial)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data do Recesso</label>
              <input
                type="date"
                required
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-855 rounded-xl font-mono text-xs text-black dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 border dark:border-zinc-800 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-650 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
            >
              Salvar Recesso
            </button>
          </div>
        </form>
      )}

      {/* Grid listing holidays */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedHolidays.length === 0 ? (
          <div className="col-span-full border border-dashed rounded-xl p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 select-none">
            Nenhum feriado cadastrado para dedução de metas.
          </div>
        ) : (
          sortedHolidays.map(h => (
            <div 
              key={h.id} 
              className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border dark:border-zinc-850 rounded-2xl flex items-center justify-between gap-4 transition hover:border-zinc-200 dark:hover:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl shrink-0">
                  <Calendar size={15} className="text-zinc-400" />
                </div>
                
                <div className="truncate text-xs space-y-1">
                  <span className="font-extrabold text-zinc-900 dark:text-white block truncate" title={h.nome}>{h.nome}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-zinc-950 border dark:border-zinc-850 px-1 py-0.5 rounded">
                      {h.data.split('-').reverse().join('/')}
                    </span>
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border inline-flex items-center gap-1 font-bold ${getTipoColor(h.tipo)}`}>
                      {getTipoIcon(h.tipo)}
                      {h.tipo}
                    </span>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1">
                  {confirmDeleteId === h.id ? (
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-1 rounded-lg animate-scale-in">
                      <span className="text-[9px] font-bold text-rose-600 px-1">Excluir?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteHoliday(h.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-extrabold rounded cursor-pointer"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[9px] font-bold rounded cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(h.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                      title="remover feriado"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
