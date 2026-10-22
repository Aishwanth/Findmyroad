import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  ThumbsUp,
  Cpu,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldAlert,
  Sparkles,
  AlertOctagon,
  Share2,
  Activity,
  Layers,
  CloudRain,
  Sun,
  Thermometer,
  UserCheck,
  Check,
} from 'lucide-react';
import { fetchReportById, upvoteReport, submitCommunityVerification } from '../services/api';
import { SeverityBadge, StatusBadge, AiVerificationBadge } from '../components/common/Badge';
import { PageLoader } from '../components/common/Skeletons';
import { ErrorState } from '../components/common/ErrorState';
import { useToast } from '../context/ToastContext';

export const CitizenReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: report,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['report-detail', id],
    queryFn: () => fetchReportById(id!),
    enabled: !!id,
  });

  const upvoteMutation = useMutation({
    mutationFn: () => upvoteReport(report!.ticketId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['citizen-reports'] });
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] });
      toast({
        type: 'success',
        title: data.hasUpvoted ? 'Upvote Added' : 'Upvote Removed',
        message: `Total upvotes: ${data.upvotes}`,
      });
    },
    onError: () => {
      toast({ type: 'error', title: 'Action Failed', message: 'Could not update vote.' });
    },
  });

  const communityVerifyMutation = useMutation({
    mutationFn: ({ type, notes }: { type: string; notes?: string }) =>
      submitCommunityVerification(report!.ticketId, type, notes),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['report-detail', id] });
      toast({
        type: 'success',
        title: 'Feedback Registered',
        message: 'Your community verification signal has been submitted to municipal triage.',
      });
    },
    onError: (err: any) => {
      toast({
        type: 'info',
        title: 'Notice',
        message: err.message || 'Feedback already registered for this report.',
      });
    },
  });

  if (isLoading) {
    return <PageLoader message={`Retrieving tracking timeline for ${id}...`} />;
  }

  if (isError || !report) {
    return (
      <div className="max-w-3xl mx-auto pt-32 pb-20 px-4">
        <ErrorState
          title={`Ticket ${id} Not Found`}
          message="Could not locate this civic report. Please verify the ticket ID or return to the dashboard."
          onRetry={refetch}
        />
        <div className="text-center mt-4">
          <Link to="/citizen" className="text-xs text-[#15803d] font-bold hover:underline cursor-pointer">
            Back to Citizen Hub
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'Submitted', num: 1, label: 'Report Submitted', desc: 'Photo geotagged & enqueued', color: 'bg-emerald-500' },
    { key: 'Under Review', num: 2, label: 'AI & Triage Review', desc: 'Cavity severity classified', color: 'bg-blue-500' },
    { key: 'Assigned', num: 3, label: 'Municipal Crew Dispatched', desc: 'Repair crew on schedule', color: 'bg-amber-500' },
    { key: 'Resolved', num: 4, label: 'Repaired & Verified', desc: 'Photo closure approved', color: 'bg-purple-600' },
  ];

  const getStepStatus = (stepKey: string) => {
    const order = ['Submitted', 'Under Review', 'Assigned', 'Resolved'];
    const currentIndex = order.indexOf(report.status);
    const stepIndex = order.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <Link
            to="/citizen"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Reports</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm">
              Ticket: {report.ticketId}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ type: 'info', title: 'Link Copied', message: 'Report tracking link copied to clipboard.' });
              }}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer shadow-sm"
              title="Share Tracking Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Report Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <SeverityBadge
                  severity={report.severity}
                  numericalScore={report.numericalSeverityScore}
                  category={report.severityCategory}
                />
                <StatusBadge status={report.status} />
                {report.weatherData?.isRaining && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-amber-600" /> TOP MUNICIPAL PRIORITY &bull; ACTIVE MONSOON RAIN
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#15803d] shrink-0" />
                <span>{report.location}</span>
              </h1>
              {report.landmark && (
                <p className="text-sm text-slate-500 mt-1 font-medium">Landmark: {report.landmark}</p>
              )}
            </div>

            {/* Upvote Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => upvoteMutation.mutate()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 font-bold text-xs transition-all hover:scale-105 cursor-pointer shadow-sm"
              >
                <ThumbsUp className="w-4 h-4 text-[#15803d]" />
                <span>Support Issue ({report.upvotes})</span>
              </button>
            </div>
          </div>

          {/* Live Weather Forecast Advisory */}
          {report.weatherData && (
            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                report.weatherData.isRaining
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  {report.weatherData.isRaining ? (
                    <CloudRain className="w-5 h-5 text-amber-600 animate-bounce" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Hyperlocal Climate &amp; Municipal Work Schedule
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Conditions at site: {report.weatherData.condition} ({report.weatherData.temperature}°C)
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1 rounded-xl border border-slate-200">
                  Humidity: {report.weatherData.humidity}% &bull; Precipitation: {report.weatherData.precipitation} mm/h
                </span>
              </div>

              {report.weatherData.isRaining && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Rain Started</span>
                    <span className="font-mono text-sm font-extrabold text-amber-900 block mt-0.5">
                      {report.weatherData.rainStartTime || '10:45 AM'}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Forecasted Stop</span>
                    <span className="font-mono text-sm font-extrabold text-amber-900 block mt-0.5">
                      {report.weatherData.rainStopTime || '01:30 PM'}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Drying Window</span>
                    <span className="font-mono text-sm font-extrabold text-emerald-800 block mt-0.5">
                      {report.weatherData.dryingWindow || '45 mins post-rain'}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed italic">
                {report.weatherData.weatherAdvisory}
              </p>
            </div>
          )}

          {/* 4-Step Resolution Progress Matching 'How It Works' */}
          <div className="py-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Workflow Resolution Progress
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {steps.map((st) => {
                const state = getStepStatus(st.key);
                return (
                  <div
                    key={st.key}
                    className={`p-4 rounded-2xl border flex flex-col gap-1 transition-all ${
                      state === 'completed'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : state === 'current'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full ${st.color} text-white flex items-center justify-center text-[10px]`}>
                          {st.num}
                        </span>
                        <span>{st.label}</span>
                      </span>
                      {state === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {state === 'current' && <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />}
                    </div>
                    <span className={`text-[11px] leading-tight ${state === 'current' ? 'text-slate-300' : 'text-slate-500'}`}>
                      {st.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Photographs: Before & After Verification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            {/* Initial Photo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Initial Complaint Photograph
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(report.submittedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-72 shadow-sm">
                <img
                  src={report.imageUrl}
                  alt="Initial defect"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* After Photo or Pending Card */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Repair Verification Proof
                </span>
                {report.status === 'Resolved' && (
                  <span className="text-xs text-[#15803d] font-bold">
                    Verified Complete
                  </span>
                )}
              </div>

              {report.afterImageUrl ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-100 h-72 shadow-sm">
                  <img
                    src={report.afterImageUrl}
                    alt="Repaired road"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-[#15803d] text-white text-xs font-bold px-3 py-1 rounded-xl shadow-md">
                    ✓ Asphalt Resurfaced &amp; Signed Off
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 h-72 flex flex-col items-center justify-center p-6 text-center">
                  <Wrench className="w-10 h-10 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">
                    {report.status === 'Assigned'
                      ? 'Repair Crew Dispatched to Site'
                      : 'Awaiting Municipal Crew Allocation'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Once roadwork is completed, municipal engineers upload photographic sign-off proof here.
                  </p>
                  {report.assignedTeam && (
                    <span className="mt-3 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                      Assigned Crew: {report.assignedTeam}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Resolution Notes if Resolved */}
          {report.resolutionNotes && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <span className="font-extrabold uppercase tracking-wider text-[11px] text-[#15803d]">
                Municipal Resolution Audit Notes:
              </span>
              <p className="text-slate-800 leading-relaxed font-medium">{report.resolutionNotes}</p>
            </div>
          )}

          {/* Community Verification & Citizen Trust Actions */}
          <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Community Ground-Truth Verification</h3>
              </div>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 font-bold">
                {report.communityVerifications?.length || 0} Confirmations Logged
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Help maintain civic road accountability. Confirm whether this location has been repaired or remains hazardous.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => communityVerifyMutation.mutate({ type: 'STILL_DAMAGED' })}
                disabled={communityVerifyMutation.isPending}
                className="px-3.5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                <span>Still Damaged</span>
              </button>

              <button
                type="button"
                onClick={() => communityVerifyMutation.mutate({ type: 'REPAIR_CONFIRMED' })}
                disabled={communityVerifyMutation.isPending}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Confirm Repaired</span>
              </button>

              <button
                type="button"
                onClick={() => communityVerifyMutation.mutate({ type: 'INCORRECT_INFO' })}
                disabled={communityVerifyMutation.isPending}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Report Inaccurate</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Assessment & Audit History Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Assessment Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-extrabold text-slate-900">AI Vision Assessment</h2>
              </div>
              <AiVerificationBadge
                isAiFallback={report.isAiFallback}
                reviewRequired={report.aiReviewRequired}
                confidence={report.aiConfidence}
                provider={report.aiProvider}
              />
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block">
                  Model Explanation
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {report.aiExplanation || 'Road surface crater with exposed aggregate identified.'}
                </p>
              </div>

              {report.aiObservations && report.aiObservations.length > 0 && (
                <div>
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-2">
                    Visual Defects Observed
                  </span>
                  <div className="space-y-1.5">
                    {report.aiObservations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 text-slate-700 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#15803d] shrink-0 mt-0.5" />
                        <span>{obs}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audit Timeline Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Activity className="w-5 h-5 text-[#15803d]" />
              <h2 className="text-base font-extrabold text-slate-900">Timestamped Audit Timeline</h2>
            </div>

            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {report.statusHistory && report.statusHistory.length > 0 ? (
                report.statusHistory.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-sm" />
                    <div className="text-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-bold text-slate-900 text-xs">{item.status}</span>
                        <span className="font-mono text-[10px]">
                          {new Date(item.changedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        {item.notes || 'Status updated'}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                        By: {item.changedBy}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Initial submission logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
