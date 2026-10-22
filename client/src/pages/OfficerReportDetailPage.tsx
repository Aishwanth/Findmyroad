import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Wrench,
  UserCheck,
  CheckCircle2,
  Clock,
  Cpu,
  AlertTriangle,
  Upload,
  PlusCircle,
  ShieldCheck,
  FileText,
  RotateCcw,
  Sparkles,
  X,
  MessageSquare,
  CloudRain,
  Sun,
  Thermometer,
  Droplets,
  Trash2,
} from 'lucide-react';
import {
  fetchReportById,
  updateReportStatus,
  updateReportAssignment,
  updateReportSeverity,
  resolveReport,
  verifyRepairWorkflow,
  updateRecurrence,
  addOfficerNote,
  deleteReport,
} from '../services/api';
import { SeverityBadge, StatusBadge, AiVerificationBadge } from '../components/common/Badge';
import { PageLoader } from '../components/common/Skeletons';
import { ErrorState } from '../components/common/ErrorState';
import { useToast } from '../context/ToastContext';
import { useRole } from '../context/RoleContext';
import { ReportStatus, SeverityLevel } from '../types';

const MUNICIPAL_TEAMS = [
  'GHMC Rapid Patch Crew Alpha (Uppal Ward 9)',
  'East Zone Heavy Maintenance Unit',
  'Central Zone Mobile Asphalt Van #2',
  'South Zone Rapid Action Taskforce',
  'North-West Division Paving Crew',
  'South-West Corridor Emergency Unit',
  'Secunderabad Zonal Maintenance Team',
];

export const OfficerReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { officerName } = useRole();

  // Dialog & Form States
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string>('');
  const afterPhotoInputRef = useRef<HTMLInputElement>(null);

  // Assignment states
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [assignedOfficerInput, setAssignedOfficerInput] = useState<string>('');

  // Status transition note
  const [statusNote, setStatusNote] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>('Submitted');

  // Severity override
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel>('medium');
  const [severityNote, setSeverityNote] = useState<string>('');

  // Officer Notes form
  const [internalNote, setInternalNote] = useState<string>('');

  const {
    data: report,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['officer-report-detail', id],
    queryFn: () => fetchReportById(id!),
    enabled: !!id,
  });

  // Keep local form values in sync with fetched report
  React.useEffect(() => {
    if (report) {
      setSelectedStatus(report.status);
      setSelectedSeverity(report.severity);
      setSelectedTeam(report.assignedTeam || MUNICIPAL_TEAMS[0]);
      setAssignedOfficerInput(report.assignedOfficer || officerName);
    }
  }, [report, officerName]);

  // Mutation: Update Status
  const statusMutation = useMutation({
    mutationFn: () => updateReportStatus(report!.ticketId, selectedStatus, statusNote, officerName),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['officer-report-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['officer-reports'] });
      queryClient.invalidateQueries({ queryKey: ['officer-stats'] });
      toast({
        type: 'success',
        title: 'Status Updated',
        message: `Report status transitioned to "${updated.status}".`,
      });
      setStatusNote('');
    },
    onError: (err: any) => {
      toast({ type: 'error', title: 'Status Update Failed', message: err.message });
    },
  });

  const handleStatusSubmit = () => {
    if (selectedStatus === report?.status && !statusNote.trim()) {
      toast({
        type: 'info',
        title: 'No Change Detected',
        message: 'Select a different status or enter transition remarks before saving.',
      });
      return;
    }
    statusMutation.mutate();
  };

  // Mutation: Delete / Dismiss Report from MongoDB
  const deleteMutation = useMutation({
    mutationFn: () => deleteReport(report!.ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer-reports'] });
      queryClient.invalidateQueries({ queryKey: ['officer-stats'] });
      queryClient.invalidateQueries({ queryKey: ['citizen-reports'] });
      toast({
        type: 'success',
        title: 'Complaint Deleted from MongoDB',
        message: `Ticket ${report?.ticketId} was permanently deleted from database.`,
      });
      navigate('/officer');
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Could not delete ticket from MongoDB.',
      });
    },
  });

  // Mutation: Assign Crew
  const assignmentMutation = useMutation({
    mutationFn: () =>
      updateReportAssignment(report!.ticketId, selectedTeam, assignedOfficerInput, officerName),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['officer-report-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['officer-reports'] });
      toast({
        type: 'success',
        title: 'Work Order Dispatched',
        message: `Assigned to ${updated.assignedTeam}.`,
      });
    },
    onError: (err: any) => {
      toast({ type: 'error', title: 'Assignment Failed', message: err.message });
    },
  });

  // Mutation: Override Severity
  const severityMutation = useMutation({
    mutationFn: () =>
      updateReportSeverity(report!.ticketId, selectedSeverity, severityNote, officerName),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['officer-report-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['officer-reports'] });
      queryClient.invalidateQueries({ queryKey: ['officer-stats'] });
      toast({
        type: 'success',
        title: 'Severity Re-evaluated',
        message: `Severity officially changed to ${updated.severity}.`,
      });
      setSeverityNote('');
    },
    onError: (err: any) => {
      toast({ type: 'error', title: 'Severity Override Failed', message: err.message });
    },
  });

  // Mutation: Resolve Report with After Photo
  const resolveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('resolutionNotes', resolutionNotes || 'Dense bituminous macadam compaction verified.');
      formData.append('officerName', officerName);
      if (afterPhotoFile) {
        formData.append('afterPhoto', afterPhotoFile);
      } else {
        // Fallback realistic repair photo
        formData.append(
          'afterImageUrl',
          'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'
        );
      }
      return resolveReport(report!.ticketId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer-report-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['officer-reports'] });
      queryClient.invalidateQueries({ queryKey: ['officer-stats'] });
      setShowResolveModal(false);
      toast({
        type: 'success',
        title: 'Ticket Marked Resolved',
        message: 'Photographic repair proof registered and ticket closed.',
      });
    },
    onError: (err: any) => {
      toast({ type: 'error', title: 'Resolution Failed', message: err.message });
    },
  });

  // Mutation: AI-Assisted Repair Verification
  const verifyRepairMutation = useMutation({
    mutationFn: ({ verdict, notes }: { verdict: string; notes: string }) => {
      const formData = new FormData();
      formData.append('officerVerdict', verdict);
      formData.append('officerNotes', notes);
      formData.append('officerName', officerName);
      if (afterPhotoFile) {
        formData.append('afterPhoto', afterPhotoFile);
      } else {
        formData.append(
          'afterImageUrl',
          'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'
        );
      }
      return verifyRepairWorkflow(report!.ticketId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer-report-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['officer-reports'] });
      setShowResolveModal(false);
      toast({
        type: 'success',
        title: 'Repair Verification Complete',
        message: 'AI Vision comparison & Officer Verdict recorded successfully.',
      });
    },
    onError: (err: any) => {
      toast({ type: 'error', title: 'Verification Failed', message: err.message });
    },
  });

  // Mutation: Recurrence Confirmation
  const recurrenceMutation = useMutation({
    mutationFn: (confirmed: boolean) =>
      updateRecurrence(report!.ticketId, confirmed, `Evaluated by ${officerName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer-report-detail', id] });
      toast({
        type: 'success',
        title: 'Recurrence Status Updated',
        message: 'Pothole corridor recurrence assessment updated.',
      });
    },
    onError: (err: any) => {
      toast({ type: 'error', title: 'Action Failed', message: err.message });
    },
  });

  // Mutation: Add Internal Officer Note
  const noteMutation = useMutation({
    mutationFn: () => addOfficerNote(report!.ticketId, internalNote, officerName, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer-report-detail', id] });
      setInternalNote('');
      toast({ type: 'success', title: 'Internal Note Added', message: 'Visible to officers only.' });
    },
    onError: (err: any) => {
      toast({ type: 'error', title: 'Note Failed', message: err.message });
    },
  });

  if (isLoading) {
    return <PageLoader message={`Opening operations work order for ${id}...`} />;
  }

  if (isError || !report) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">
        <ErrorState
          title={`Ticket ${id} Not Found`}
          message="Could not retrieve work order details. Return to Operations Console."
          onRetry={refetch}
        />
        <div className="text-center mt-4">
          <Link to="/officer" className="text-xs text-brand-emerald hover:underline cursor-pointer">
            Back to Operations Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <Link
            to="/officer"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Operations Center</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3.5 py-1.5 rounded-2xl">
              Officer Mode Active &bull; {officerName}
            </span>
            <StatusBadge status={report.status} />

            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Permanently remove ticket ${report.ticketId} from the MongoDB database? This cannot be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              title="Delete complaint from MongoDB"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Ticket</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Left Column Photo & AI, Right Column Operations Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Photos Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Citizen Photo Evidence
                </span>
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-64">
                  <img
                    src={report.imageUrl}
                    alt={report.location}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <SeverityBadge
                      severity={report.severity}
                      numericalScore={report.numericalSeverityScore}
                      category={report.severityCategory}
                    />
                  </div>
                </div>
              </div>

              {report.afterImageUrl && (
                <div>
                  <span className="text-xs font-bold text-[#15803d] uppercase tracking-wider block mb-2">
                    After-Repair Verified Photo
                  </span>
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-slate-100 h-52 shadow-xs">
                    <img
                      src={report.afterImageUrl}
                      alt="Repaired road"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-white text-[#15803d] text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs">
                      Repair Verified
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Ticket ID:</span>
                  <span className="font-mono font-bold text-slate-900">{report.ticketId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Damage Classification:</span>
                  <span className="font-bold text-slate-900">{report.damageType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Community Support:</span>
                  <span className="text-[#15803d] font-bold">👍 {report.upvotes} upvotes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Submission Date:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(report.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Inspection Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">AI Vision Analysis</h3>
                </div>
                <AiVerificationBadge
                  isAiFallback={report.isAiFallback}
                  reviewRequired={report.aiReviewRequired}
                  confidence={report.aiConfidence}
                  provider={report.aiProvider}
                />
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200 font-medium">
                {report.aiExplanation}
              </p>

              {report.aiObservations && (
                <ul className="space-y-1.5 text-xs">
                  {report.aiObservations.map((obs, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0 mt-0.5" />
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column Operations Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#22c55e] shrink-0" />
                <span>{report.location}</span>
              </h2>
              {report.landmark && (
                <p className="text-xs text-slate-600">Landmark: {report.landmark}</p>
              )}
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium">
                {report.description || 'No additional citizen remarks provided.'}
              </p>
            </div>

            {/* Municipal Weather Action Plan & Optimal Crew Dispatch Report Card */}
            {report.weatherData && (
              <div
                className={`border rounded-3xl p-6 shadow-xs space-y-5 ${
                  report.weatherData.isRaining
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-2xl ${
                        report.weatherData.isRaining
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-[#15803d] border border-emerald-200'
                      }`}
                    >
                      {report.weatherData.isRaining ? (
                        <CloudRain className="w-6 h-6 animate-bounce text-amber-600" />
                      ) : (
                        <Sun className="w-6 h-6 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          Municipal Weather Action Plan &amp; Worker Dispatch Report
                        </h3>
                        {report.weatherData.isRaining && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            🚨 RAIN EMERGENCY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Automated civil engineering advisory generated for road maintenance operations
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 inline-flex items-center gap-2 shadow-xs">
                      <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                      {report.weatherData.temperature}°C &bull; {report.weatherData.condition}
                    </span>
                  </div>
                </div>

                {/* Rain Start / Stop Times Banner */}
                {report.weatherData.isRaining ? (
                  <div className="bg-amber-100/60 border border-amber-300 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="text-amber-900 font-bold flex items-center gap-1.5">
                        <CloudRain className="w-4 h-4 text-amber-600" />
                        Active Rain Hydroplaning Risk: {report.weatherData.precipitation} mm/h ({report.weatherData.humidity}% humidity)
                      </span>
                      <span className="text-amber-800 font-bold bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-300 text-[11px]">
                        Priority Pinned to Top of Officer Queue
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="bg-white border border-amber-200/80 rounded-xl p-3.5 shadow-xs">
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          Rain Start Timestamp
                        </div>
                        <div className="text-xl font-mono font-extrabold text-slate-900">
                          {report.weatherData.rainStartTime || '11:15 AM'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Onset of road surface erosion &amp; puddle accumulation
                        </div>
                      </div>

                      <div className="bg-white border border-amber-200/80 rounded-xl p-3.5 shadow-xs">
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Rain Cessation Expected (Stop Time)
                        </div>
                        <div className="text-xl font-mono font-extrabold text-amber-700">
                          {report.weatherData.rainStopTime || '12:45 PM'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Calculated atmospheric clearing threshold
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>
                        <strong>Meteorological Status:</strong> Dry ambient weather conditions ({report.weatherData.humidity}% humidity).
                      </span>
                    </div>
                    <span className="text-[#15803d] font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Standard Dispatch Timeline
                    </span>
                  </div>
                )}

                {/* Optimal Municipal Worker Dispatch Timing Schedule */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Recommended Worker Dispatch Time &amp; Paving Window
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#15803d] bg-emerald-50 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                      Bitumen Adhesion Optimized
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider">
                        When Workers Should Go There:
                      </span>
                      <span className="font-mono text-2xl font-black text-[#15803d] block mt-1">
                        {report.weatherData.optimalDispatchTime}
                      </span>
                      <span className="text-xs text-slate-500 mt-1 block">
                        Target arrival hour for municipal repair crew
                      </span>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider">
                        Required Surface Drying Window:
                      </span>
                      <span className="font-mono text-2xl font-bold text-sky-700 block mt-1">
                        {report.weatherData.dryingWindow}
                      </span>
                      <span className="text-xs text-slate-500 mt-1 block">
                        Mandatory evaporation interval prior to bitumen pouring
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2 shadow-xs">
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#22c55e]" />
                      <span>Civil Engineering Action Protocol:</span>
                    </div>
                    <p className="leading-relaxed text-slate-700 font-medium">
                      {report.weatherData.actionProtocol}
                    </p>
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
                      {report.weatherData.weatherAdvisory}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Municipal SLA & Accountability Metrics Card */}
            {report.sla && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Municipal SLA &amp; Accountability Status</h3>
                  </div>
                  {report.sla.isOverdue ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
                      SLA BREACHED ({report.sla.delayStageAttribution})
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      WITHIN SLA TARGET
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Review SLA</span>
                    <span className="text-sm font-black text-slate-800 mt-1 block">{report.sla.targetReviewHours}h Target</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Assignment SLA</span>
                    <span className="text-sm font-black text-slate-800 mt-1 block">{report.sla.targetAssignmentHours}h Target</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Resolution SLA</span>
                    <span className="text-sm font-black text-slate-800 mt-1 block">{report.sla.targetResolutionHours}h Target</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex justify-between items-center">
                  <span>Total Elapsed Time: <strong>{report.sla.elapsedHours} hours</strong></span>
                  <span>Remaining: <strong>{report.sla.remainingResolutionHours} hours</strong></span>
                </div>
              </div>
            )}

            {/* Recurrence Detection & Historical Repair Link Card */}
            {report.recurrence && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-900">Pothole Recurrence &amp; Corridor History</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    report.recurrence.isRecurrent ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {report.recurrence.recurrenceTier}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.recurrence.explanation}
                </p>

                {report.recurrence.matchingTickets.length > 0 && (
                  <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-purple-950 block">Adjacent Corridor Tickets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.recurrence.matchingTickets.map((t) => (
                        <span key={t} className="font-mono bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-800 font-semibold text-[11px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Officer Confirmation:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => recurrenceMutation.mutate(true)}
                      className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Confirm Recurrence
                    </button>
                    <button
                      type="button"
                      onClick={() => recurrenceMutation.mutate(false)}
                      className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Operation 1: Workflow Status Transition */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#22c55e]" />
                  <span>Workflow State Transition</span>
                </h3>
                <span className="text-xs text-slate-600 font-medium">
                  Current: <strong className="text-slate-900">{report.status}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Change Target Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as ReportStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#22c55e] focus:bg-white cursor-pointer transition-colors"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Resolved">Resolved (Requires Closure Details)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Transition Remarks
                  </label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="e.g., Verified on site; ready for asphalt cold mix"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#22c55e] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {selectedStatus === 'Resolved' ? (
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(true)}
                    className="px-5 py-2.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    Proceed to Resolution &amp; Photo Upload
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStatusSubmit}
                    disabled={statusMutation.isPending}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
                  >
                    {statusMutation.isPending ? 'Updating...' : 'Update Status'}
                  </button>
                )}
              </div>
            </div>

            {/* Operation 2: Repair Crew & Officer Assignment */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-purple-600" />
                  <span>Work Order Crew Assignment</span>
                </h3>
              </div>

              {/* Smart Recommendation Banner */}
              {report.smartAssignmentRecommendation && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-950">AI Workload &amp; Specialty Recommendation:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-extrabold text-[10px]">
                        {report.smartAssignmentRecommendation.matchScore}% Match
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      {report.smartAssignmentRecommendation.reason}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam(report.smartAssignmentRecommendation!.suggestedTeam)}
                    className="px-3 py-1.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs shrink-0 transition-all shadow-xs cursor-pointer"
                  >
                    Select {report.smartAssignmentRecommendation.suggestedTeam.split(' ')[0]}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Repair Taskforce / Crew
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#22c55e] focus:bg-white cursor-pointer transition-colors"
                  >
                    {MUNICIPAL_TEAMS.map((tm) => (
                      <option key={tm} value={tm}>
                        {tm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Supervising Engineer
                  </label>
                  <input
                    type="text"
                    value={assignedOfficerInput}
                    onChange={(e) => setAssignedOfficerInput(e.target.value)}
                    placeholder="e.g., Asst. Exec. Eng. P. Suresh"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#22c55e] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => assignmentMutation.mutate()}
                  disabled={assignmentMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  {assignmentMutation.isPending ? 'Assigning...' : 'Dispatch Work Order'}
                </button>
              </div>
            </div>

            {/* Operation 3: Authoritative Severity Correction */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Authorized Severity Recalibration</span>
                </h3>
                <SeverityBadge
                  severity={report.severity}
                  numericalScore={report.numericalSeverityScore}
                  category={report.severityCategory}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Engineer Calibrated Severity
                  </label>
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value as SeverityLevel)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#22c55e] focus:bg-white cursor-pointer transition-colors"
                  >
                    <option value="low">Low Severity</option>
                    <option value="medium">Medium Severity</option>
                    <option value="high">High Severity (Priority)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Justification Note
                  </label>
                  <input
                    type="text"
                    value={severityNote}
                    onChange={(e) => setSeverityNote(e.target.value)}
                    placeholder="e.g., Cavity measures > 4 inches depth on site inspection"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#22c55e] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => severityMutation.mutate()}
                  disabled={severityMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                >
                  {severityMutation.isPending ? 'Updating...' : 'Save Severity Override'}
                </button>
              </div>
            </div>

            {/* Operation 4: Internal Officer Notes */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span>Internal Confidential Log (Officer Eyes Only)</span>
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Log internal note, voucher reference, or contractor detail..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#22c55e] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => noteMutation.mutate()}
                  disabled={!internalNote.trim() || noteMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Save Note
                </button>
              </div>

              {report.officerNotes && report.officerNotes.length > 0 && (
                <div className="space-y-2 pt-2">
                  {report.officerNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                    >
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1 font-semibold">
                        <span>{note.officerName}</span>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="font-medium text-slate-700">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RESOLUTION MODAL */}
        {showResolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
                  <h3 className="text-base font-bold text-slate-900">Record Repair Resolution</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                To transparently mark Ticket <strong className="text-slate-900">{report.ticketId}</strong> as Resolved, upload photographic evidence of the resurfaced asphalt.
              </p>

              {/* Photo Uploader */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  After-Repair Photograph
                </label>

                {afterPhotoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-300 h-44 shadow-xs">
                    <img
                      src={afterPhotoPreview}
                      alt="After repair preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAfterPhotoFile(null);
                        setAfterPhotoPreview('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white cursor-pointer hover:bg-slate-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => afterPhotoInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-[#22c55e] rounded-2xl p-6 text-center cursor-pointer bg-slate-50 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-[#22c55e] mx-auto mb-2" />
                    <span className="text-xs font-bold text-slate-800 block">
                      Click to select completed repair photograph
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Or proceed with default demo verification image
                    </span>
                    <input
                      ref={afterPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAfterPhotoFile(e.target.files[0]);
                          setAfterPhotoPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Resolution Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Engineering Notes &amp; Material Used
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g., Pothole cavity excavated, tack coat applied, 40mm bitumen hot-mix laid and rolled to level grade."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#22c55e] focus:bg-white leading-relaxed transition-colors"
                />
              </div>

              {/* Side-by-Side Thumbnail Check */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Original Damage</span>
                  <img src={report.imageUrl} alt="Before" className="w-full h-20 object-cover rounded-xl border border-slate-200" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">After Repair Work</span>
                  <img
                    src={afterPhotoPreview || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'}
                    alt="After"
                    className="w-full h-20 object-cover rounded-xl border border-emerald-300"
                  />
                </div>
              </div>

              {/* Officer Decision Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      verifyRepairMutation.mutate({
                        verdict: 'REQUEST_MORE_EVIDENCE',
                        notes: resolutionNotes || 'Additional close-up angle required',
                      })
                    }
                    disabled={verifyRepairMutation.isPending}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Request More Photo Proof
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      verifyRepairMutation.mutate({
                        verdict: 'CONFIRMED_REPAIRED',
                        notes: resolutionNotes || 'Asphalt patch inspected & certified',
                      })
                    }
                    disabled={verifyRepairMutation.isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{verifyRepairMutation.isPending ? 'Verifying with AI...' : 'AI Verify & Approve Closure'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
