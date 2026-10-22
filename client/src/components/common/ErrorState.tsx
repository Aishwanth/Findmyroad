import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load records',
  message = 'An unexpected server error occurred while retrieving data. Please check your connection and retry.',
  onRetry,
}) => {
  return (
    <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6">
      <div className="w-12 h-12 rounded-2xl bg-red-900/40 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-xs text-slate-300 max-w-sm mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-medium text-xs transition-colors shadow-glow-red/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};
