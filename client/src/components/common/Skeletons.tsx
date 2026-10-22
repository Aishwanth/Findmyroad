import React from 'react';

export const DashboardCardSkeleton: React.FC = () => (
  <div className="bg-navy-800/80 border border-slate-700/50 rounded-2xl p-5 shadow-card animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 bg-slate-700/60 rounded w-28" />
      <div className="w-9 h-9 rounded-xl bg-slate-700/60" />
    </div>
    <div className="h-8 bg-slate-700/80 rounded w-20 mb-2" />
    <div className="h-3 bg-slate-800 rounded w-36" />
  </div>
);

export const ReportCardSkeleton: React.FC = () => (
  <div className="bg-navy-800/80 border border-slate-700/50 rounded-2xl overflow-hidden shadow-card animate-pulse flex flex-col">
    <div className="h-48 bg-slate-800 w-full" />
    <div className="p-5 flex-1 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-700 rounded w-24" />
        <div className="h-5 bg-slate-700 rounded-full w-20" />
      </div>
      <div className="h-6 bg-slate-700 rounded w-3/4" />
      <div className="h-4 bg-slate-800 rounded w-full" />
      <div className="h-4 bg-slate-800 rounded w-2/3" />
      <div className="mt-auto pt-4 border-t border-slate-700/40 flex items-center justify-between">
        <div className="h-4 bg-slate-800 rounded w-20" />
        <div className="h-8 bg-slate-700 rounded-lg w-24" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <tr className="animate-pulse border-b border-slate-800/80">
    <td className="py-4 px-4"><div className="h-4 bg-slate-700 rounded w-24" /></td>
    <td className="py-4 px-4"><div className="h-10 w-14 bg-slate-800 rounded-lg" /></td>
    <td className="py-4 px-4">
      <div className="h-4 bg-slate-700 rounded w-36 mb-1" />
      <div className="h-3 bg-slate-800 rounded w-24" />
    </td>
    <td className="py-4 px-4"><div className="h-6 bg-slate-700 rounded-full w-20" /></td>
    <td className="py-4 px-4"><div className="h-6 bg-slate-700 rounded-full w-24" /></td>
    <td className="py-4 px-4"><div className="h-4 bg-slate-700 rounded w-28" /></td>
    <td className="py-4 px-4"><div className="h-8 bg-slate-700 rounded-lg w-16" /></td>
  </tr>
);

export const ChartSkeleton: React.FC = () => (
  <div className="bg-navy-800/80 border border-slate-700/50 rounded-2xl p-6 shadow-card animate-pulse h-80 flex flex-col justify-between">
    <div className="flex justify-between items-center mb-4">
      <div className="h-5 bg-slate-700 rounded w-40" />
      <div className="h-4 bg-slate-800 rounded w-20" />
    </div>
    <div className="flex items-end justify-center gap-4 h-48 w-full px-4">
      <div className="h-28 w-12 bg-slate-700/50 rounded-t" />
      <div className="h-44 w-12 bg-slate-700/70 rounded-t" />
      <div className="h-32 w-12 bg-slate-700/60 rounded-t" />
      <div className="h-20 w-12 bg-slate-700/40 rounded-t" />
      <div className="h-36 w-12 bg-slate-700/65 rounded-t" />
    </div>
    <div className="h-3 bg-slate-800 rounded w-full" />
  </div>
);

export const ImageSkeleton: React.FC<{ className?: string }> = ({ className = 'h-64 w-full' }) => (
  <div className={`bg-navy-900 border border-slate-800 rounded-xl animate-pulse flex items-center justify-center text-slate-600 ${className}`}>
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-brand-emerald animate-spin" />
      <span className="text-xs text-slate-500 font-medium">Loading high-resolution asset...</span>
    </div>
  </div>
);

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Synchronizing municipal records...' }) => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-brand-emerald animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center text-xs">🛡️</div>
    </div>
    <p className="text-sm text-slate-400 font-medium tracking-wide animate-pulse">{message}</p>
  </div>
);
