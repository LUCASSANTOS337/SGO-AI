import React from 'react';

interface MetricCardProps {
  titulo: string;
  valor: string | number;
  subtexto?: string;
  variant?: 'normal' | 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
  id?: string;
}

export function MetricCard({ titulo, valor, subtexto, variant = 'normal', icon, id }: MetricCardProps) {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800/40';
      case 'warning':
        return 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800/45';
      case 'danger':
        return 'bg-rose-50/70 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-900/40';
      case 'info':
        return 'bg-sky-50/70 border-sky-200 text-sky-900 dark:bg-sky-950/20 dark:border-sky-800/40';
      default:
        return 'bg-white border-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800/80';
    }
  };

  return (
    <div id={id} className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-sm flex items-center justify-between gap-4 ${getColors()}`}>
      <div className="space-y-1">
        <span className="text-xs font-semibold tracking-wider uppercase opacity-75">{titulo}</span>
        <div className="text-2xl font-bold tracking-tight">{valor}</div>
        {subtexto && <span className="text-xs opacity-80 block">{subtexto}</span>}
      </div>
      {icon && (
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl flex items-center justify-center">
          {icon}
        </div>
      )}
    </div>
  );
}

interface MiniBarChartProps {
  data: { label: string; value: number; max: number; colorClass: string }[];
}

export function MiniBarChart({ data }: MiniBarChartProps) {
  return (
    <div className="space-y-3.5">
      {data.map((item, idx) => {
        const percentage = Math.min(100, Math.round((item.value / item.max) * 100));
        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
              <span className="font-mono text-zinc-500 dark:text-zinc-400">
                {item.value} / {item.max} ({percentage}%)
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.colorClass}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TeamProductivityGaugeProps {
  concluido: number;
  total: number;
  meta: number;
}

export function TeamProductivityGauge({ concluido, total, meta }: TeamProductivityGaugeProps) {
  const percentage = total > 0 ? Math.round((concluido / total) * 100) : 0;
  const strokeDashoffset = 251.2 - (251.2 * percentage) / 100;
  const isOptimal = percentage >= meta;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Circular SVG representation */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r="40"
            className="stroke-zinc-100 dark:stroke-zinc-800"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="72"
            cy="72"
            r="40"
            className={isOptimal ? "stroke-emerald-500" : "stroke-amber-500"}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray="251.2"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            {percentage}%
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
            Concluído
          </span>
        </div>
      </div>
      <div className="text-center mt-3">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {concluido} de {total} Unidades
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          Meta de Rendimento: {meta}%
        </p>
      </div>
    </div>
  );
}
