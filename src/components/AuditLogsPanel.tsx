import React from 'react';
import { AuditLog } from '../types';
import { 
  History, User, Clock, ArrowRightLeft, ShieldAlert
} from 'lucide-react';

interface AuditLogsPanelProps {
  auditLogs: AuditLog[];
}

export function AuditLogsPanel({ auditLogs }: AuditLogsPanelProps) {
  // Order logs by date descending
  const sortedLogs = [...auditLogs].reverse();

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
      {/* Title */}
      <div>
        <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none">
          <History size={16} className="text-zinc-500" /> Log de Auditoria & Conformidade Regulatória
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Rastreamento imutável das ações administrativas efetuadas por toda a equipe na competência ativa.
        </p>
      </div>

      {/* Chronological List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {sortedLogs.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-6 border border-dashed rounded-xl dark:border-zinc-800">
            Nenhuma alteração registrada até o momento.
          </p>
        ) : (
          sortedLogs.map((log) => (
            <div 
              key={log.id} 
              className="p-3.5 bg-zinc-50/50 dark:bg-zinc-900/60 border border-zinc-150/60 dark:border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{log.acao}</span>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-bold">
                    Operador: {log.usuarioNome}
                  </span>
                </div>
                
                {/* Details state changes */}
                <div className="flex items-center gap-1.5 flex-wrap text-zinc-500 dark:text-zinc-400 text-[11px] mt-1">
                  {log.infoAnterior && (
                    <span className="line-through text-zinc-400">{log.infoAnterior}</span>
                  )}
                  {log.infoAnterior && log.infoNova && (
                    <span className="text-indigo-500 font-bold">→</span>
                  )}
                  {log.infoNova && (
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 bg-indigo-50/40 dark:bg-zinc-850 px-1 rounded">{log.infoNova}</span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className="font-mono text-[10px] text-zinc-450 flex items-center gap-1 shrink-0 bg-white dark:bg-zinc-900 border dark:border-zinc-850 p-1 rounded-lg">
                <Clock size={11} /> {log.dataHora}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
