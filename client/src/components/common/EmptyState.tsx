import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, PlusCircle, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No reports found',
  description = 'Try adjusting your search criteria or filter tags to discover civic road reports.',
  actionText,
  actionLabel,
  actionHref,
  onAction,
  icon,
}) => {
  const displayLabel = actionText || actionLabel;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-4 shadow-xs">
        {icon || <FileQuestion className="w-8 h-8 text-slate-400" />}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 max-w-sm mb-6 leading-relaxed font-medium">{description}</p>
      {actionHref && displayLabel && (
        <Link
          to={actionHref}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#22c55e] text-slate-950 font-bold text-sm hover:bg-[#16a34a] transition-all shadow-md hover:scale-105 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{displayLabel}</span>
        </Link>
      )}
      {onAction && displayLabel && !actionHref && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-all border border-slate-300 shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{displayLabel}</span>
        </button>
      )}
    </div>
  );
};
