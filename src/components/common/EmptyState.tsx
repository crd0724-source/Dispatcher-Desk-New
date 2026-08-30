import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  id,
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div
      id={id}
      className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 my-4"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mt-1.5 leading-relaxed">{description}</p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              id={`${id}-action-btn`}
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLabel}</span>
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              id={`${id}-secondary-btn`}
              onClick={onSecondaryAction}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
