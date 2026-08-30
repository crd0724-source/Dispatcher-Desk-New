import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: 'purple' | 'blue' | 'emerald' | 'amber' | 'slate';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'slate',
}) => {
  const colorMap = {
    purple: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
    blue: 'text-sky-400 bg-sky-950/40 border-sky-800/40',
    emerald: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    amber: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    slate: 'text-slate-400 bg-slate-900 border-slate-800',
  };

  return (
    <div
      id={id}
      className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1 tracking-tight">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg border ${colorMap[accentColor]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
