import React from 'react';
import { SeverityLevel, SeverityCategory, ReportStatus } from '../../types';
import { AlertTriangle, AlertOctagon, CheckCircle2, Clock, Wrench, Sparkles, ShieldAlert, Flame } from 'lucide-react';

interface SeverityBadgeProps {
  severity: SeverityLevel | SeverityCategory | string;
  numericalScore?: number;
  category?: SeverityCategory | string;
  className?: string;
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  numericalScore,
  category,
  className = '',
  showIcon = true,
}) => {
  const effectiveCat = (category || (numericalScore != null ? (numericalScore >= 80 ? 'critical' : numericalScore >= 60 ? 'high' : numericalScore >= 30 ? 'medium' : 'low') : severity)).toLowerCase();

  const configs: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
    critical: {
      bg: 'bg-red-950/85 border-red-500/60 text-red-300 shadow-sm shadow-red-950/50',
      icon: <Flame className="w-3.5 h-3.5 text-red-400" />,
      label: 'Critical Hazard',
    },
    high: {
      bg: 'bg-rose-950/75 border-rose-500/40 text-rose-300',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
      label: 'High Severity',
    },
    medium: {
      bg: 'bg-amber-950/75 border-amber-500/40 text-amber-300',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
      label: 'Medium Severity',
    },
    low: {
      bg: 'bg-emerald-950/75 border-emerald-500/40 text-emerald-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      label: 'Low Severity',
    },
  };

  const config = configs[effectiveCat] || configs.medium;
  const displayLabel = numericalScore != null
    ? `${config.label.replace(' Severity', '').replace(' Hazard', '').toUpperCase()} — ${numericalScore}/100`
    : config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg} ${className}`}
      role="status"
      aria-label={`Severity: ${displayLabel}`}
    >
      {showIcon && config.icon}
      <span>{displayLabel}</span>
    </span>
  );
};

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const configs: Record<ReportStatus, { bg: string; icon: React.ReactNode; label: string }> = {
    Submitted: {
      bg: 'bg-blue-950/70 border-blue-500/40 text-blue-300',
      icon: <Clock className="w-3.5 h-3.5" />,
      label: 'Submitted',
    },
    'Under Review': {
      bg: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: 'Under Review',
    },
    Assigned: {
      bg: 'bg-purple-950/70 border-purple-500/40 text-purple-300',
      icon: <Wrench className="w-3.5 h-3.5" />,
      label: 'Crew Assigned',
    },
    Resolved: {
      bg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-glow-emerald/20',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: 'Resolved & Repaired',
    },
  };

  const config = configs[status] || configs.Submitted;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};

interface AiVerificationBadgeProps {
  isAiFallback?: boolean;
  reviewRequired?: boolean;
  confidence?: number;
  provider?: string;
}

export const AiVerificationBadge: React.FC<AiVerificationBadgeProps> = ({
  isAiFallback,
  reviewRequired,
  confidence,
  provider,
}) => {
  if (isAiFallback || reviewRequired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-950/50 border-amber-500/40 text-amber-300">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        <span>Manual Review Flagged</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-950/40 border-brand-emerald/40 text-brand-emerald">
      <Sparkles className="w-3.5 h-3.5 text-brand-emerald" />
      <span>AI Verified {confidence ? `(${(confidence * 100).toFixed(0)}%)` : ''}</span>
    </span>
  );
};
