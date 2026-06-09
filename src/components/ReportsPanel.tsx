import React, { useState } from 'react';
import { Activity, Vacation, ProductionGoal, User, AuditLog } from '../types';
import { 
  FileSpreadsheet, FileText, Download, Play, BarChart, Calendar, AlertCircle, Award
} from 'lucide-react';

interface ReportsPanelProps {
  activities: Activity[];
  vacations: Vacation[];
  productionGoals: ProductionGoal[];
  users: User[];
  auditLogs: AuditLog[];
  competenciaAtual: string;
}

export function ReportsPanel({
  activities,
  vacations,
  productionGoals,
  users,
  auditLogs,
  competenciaAtual
}: ReportsPanelProps) {
  const [selectedReportType, setSelectedReportType] = useState<string>('completo');

  // Trigger Excel (CSV format) download
  const downloadCSV = (title: string, csvContent: string) => {
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}_${competenciaAtual.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (selectedReportType === 'completo' || selectedReportType === 'prod_colab') {
      // Build collaborator production report
      let csv = 'Nome;Role;Meta Diária;Hoje Produzido\n';
      productionGoals.forEach(goal => {
        goal.participantesIds.forEach(pId => {
          const user = users.find(u => u.id === pId);
          const metaHj = goal.quantidadeTotal / goal.diasUteis / goal.participantesIds.length;
          const hj = goal.producaHoje[pId] || 0;
          csv += `${user?.nome};${user?.role};${metaHj.toFixed(1)};${hj}\n`;
        });
      });
      downloadCSV('relatorio_producao_colaborador', csv);
    } 
    else if (selectedReportType === 'atividades') {
      let csv = 'Id;Atividade;Responsável;Prioridade;Status;Data Limite;Recorrente\n';
      const filtered = activities.filter(a => a.competencia === competenciaAtual);
      filtered.forEach(a => {
        const user = users.find(u => u.id === a.responsavelAtualId);
        csv += `${a.id};${a.nome};${user?.nome};${a.prioridade};${a.status};${a.dataLimite};${a.recorrente ? 'SIM' : 'NÃO'}\n`;
      });
      downloadCSV('atividades_competencia', csv);
    }
    else if (selectedReportType === 'ferias') {
      let csv = 'Colaborador;Data Inicio;Data Fim;Redistribuida\n';
      vacations.forEach(v => {
        const user = users.find(u => u.id === v.colaboradorId);
        csv += `${user?.nome};${v.dataInicio};${v.dataFim};${v.redistribuida ? 'SIM' : 'NÃO'}\n`;
      });
      downloadCSV('historico_ferias', csv);
    }
    else {
      // Fallback log
      let csv = 'Data;Usuario;Acao;Anterior;Novo\n';
      auditLogs.forEach(l => {
        csv += `${l.dataHora};${l.usuarioNome};${l.acao};${l.infoAnterior || ''};${l.infoNova || ''}\n`;
      });
      downloadCSV('logs_auditoria', csv);
    }
  };

  const handleExportPDF = () => {
    // Elegant mock print rendering trigger
    window.print();
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Title */}
      <div>
        <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5 leading-none">
          📊 Históricos & Relatórios Gerenciais Operacionais
        </h4>
        <p className="text-xs text-zinc-500 mt-1 dark:text-zinc-400">
          Gere arquivos consistentes contendo métricas de produção, ranking, férias e logs de auditoria.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Selector Option cards */}
        <div className="space-y-2 select-none">
          <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Tipo do Relatório</label>
          <div className="space-y-1.5">
            {[
              { id: 'completo', title: 'Relatório Operacional Completo', desc: 'Consolidado com todas as atividades, metas e histórico da competência.' },
              { id: 'atividades', title: 'Atividades e Demandas Atrasadas', desc: 'Listagem de atividades pendentes ordenadas por criticidade.' },
              { id: 'ferias', title: 'Histórico de Férias & Redistribuições', desc: 'Registro de suplência e substituições programadas ou passadas.' },
              { id: 'auditoria', title: 'Log de Auditoria e Conformidade', desc: 'Rastreabilidade detalhada de todas as alterações manuais do mês.' }
            ].map(r => (
              <label 
                key={r.id} 
                className={`p-3 rounded-xl border flex gap-3 cursor-pointer transition ${selectedReportType === r.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-zinc-850' : 'border-zinc-150 hover:bg-zinc-50 dark:border-zinc-800'}`}
              >
                <input 
                  type="radio" 
                  name="report_opt" 
                  checked={selectedReportType === r.id}
                  onChange={() => setSelectedReportType(r.id)}
                  className="mt-1 text-indigo-600 focus:ring-0" 
                />
                <div>
                  <span className="text-xs font-bold block dark:text-white">{r.title}</span>
                  <span className="text-[10px] text-zinc-500 block dark:text-zinc-400 mt-0.5">{r.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Controls & Format Selector */}
        <div className="flex flex-col justify-end p-5 bg-zinc-50 dark:bg-zinc-900/40 border dark:border-zinc-800 rounded-2xl gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">Competência Selecionada:</span>
            <span className="text-xs font-mono font-bold text-indigo-505 dark:text-indigo-400 block">{competenciaAtual}</span>
          </div>

          <div className="space-y-2 pt-2 border-t dark:border-zinc-800">
            <button
              onClick={handleExportExcel}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 transition font-bold text-white text-xs rounded-xl flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={15} /> Exportar para Excel (.xlsx/.csv)
            </button>

            <button
              onClick={handleExportPDF}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-900 transition font-bold text-white text-xs rounded-xl flex items-center justify-center gap-2"
            >
              <FileText size={15} /> Gerar PDF Imprimível (.pdf)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
