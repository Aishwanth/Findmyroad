import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  PlusCircle,
  ThumbsUp,
  MapPin,
  Clock,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { fetchReports, fetchDashboardStats, upvoteReport } from '../services/api';
import { SeverityBadge, StatusBadge } from '../components/common/Badge';
import { ReportCardSkeleton, DashboardCardSkeleton } from '../components/common/Skeletons';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { useToast } from '../context/ToastContext';

export const CitizenDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);

  // Fetch KPI Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  // Fetch Reports with filters
  const {
    data: reportsData,
    isLoading: reportsLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['citizen-reports', statusFilter, severityFilter, searchTerm, sortBy, sortOrder, page],
    queryFn: () =>
      fetchReports({
        status: statusFilter,
        severity: severityFilter,
        search: searchTerm,
        sortBy,
        sortOrder,
        page,
        limit: 12,
      }),
  });

  // Upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: (ticketId: string) => upvoteReport(ticketId),
    onSuccess: (data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['citizen-reports'] });
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        type: 'success',
        title: data.hasUpvoted ? 'Upvote Recorded' : 'Upvote Removed',
        message: `Total community upvotes: ${data.upvotes}`,
      });
    },
    onError: () => {
      toast({ type: 'error', title: 'Upvote Failed', message: 'Could not record upvote.' });
    },
  });

  const handleUpvote = (e: React.MouseEvent, ticketId: string) => {
    e.preventDefault();
    e.stopPropagation();
    upvoteMutation.mutate(ticketId);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#15803d] text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span>CITIZEN TRACKING PORTAL</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Community Pothole Tracking
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Search citizen complaints, inspect AI verification details, and monitor municipal road repairs.
            </p>
          </div>

          <Link
            to="/report"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-extrabold text-sm shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4 text-slate-950" />
            <span>Report Road Hazard</span>
          </Link>
        </div>

        {/* Summary KPI Cards Matching the Clean Theme */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {statsLoading ? (
            <>
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Total Complaints
                </span>
                <div className="text-3xl font-extrabold text-slate-900">
                  {stats?.totalReports || 0}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                  Civic reports recorded
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Awaiting Triage
                </span>
                <div className="text-3xl font-extrabold text-amber-500">
                  {stats?.awaitingReview || 0}
                </div>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  In submission &amp; review
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Crews Dispatched
                </span>
                <div className="text-3xl font-extrabold text-blue-600">
                  {stats?.assignedRepairs || 0}
                </div>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  Active work orders
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Verified Repairs
                </span>
                <div className="text-3xl font-extrabold text-[#15803d]">
                  {stats?.resolvedReports || 0}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                  {stats?.resolutionRate}% resolution rate
                </span>
              </div>
            </>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ticket ID (FMR-2026), street name, or notes..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="Submitted">Submitted (Queued)</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Crew Assigned</option>
                <option value="Resolved">Resolved &amp; Repaired</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="md:col-span-2">
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Severity: All</option>
                <option value="high">High Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="low">Low Severity</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="md:col-span-2">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split('-');
                  setSortBy(sb);
                  setSortOrder(so as 'asc' | 'desc');
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="submittedAt-desc">Newest First</option>
                <option value="submittedAt-asc">Oldest First</option>
                <option value="upvotes-desc">Most Upvoted</option>
              </select>
            </div>
          </div>

          {(statusFilter !== 'all' || severityFilter !== 'all' || searchTerm) && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>Filters active</span>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setSeverityFilter('all');
                  setSearchTerm('');
                }}
                className="text-[#15803d] hover:underline font-bold text-xs cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Reports Grid */}
        {isError ? (
          <ErrorState
            title="Could not load reports"
            message="Server communication failed while loading reports. Check if the backend is running."
            onRetry={refetch}
          />
        ) : reportsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ReportCardSkeleton key={i} />
            ))}
          </div>
        ) : reportsData?.reports && reportsData.reports.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportsData.reports.map((report) => (
                <div
                  key={report.ticketId}
                  className="bg-white border border-slate-200 hover:border-emerald-400 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Photo Thumbnail */}
                    <Link
                      to={`/citizen/reports/${report.ticketId}`}
                      className="relative h-48 bg-slate-100 overflow-hidden block cursor-pointer"
                    >
                      <img
                        src={report.imageUrl}
                        alt={report.location}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <SeverityBadge
                          severity={report.severity}
                          numericalScore={report.numericalSeverityScore}
                          category={report.severityCategory}
                        />
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <StatusBadge status={report.status} />
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                        <span className="font-bold text-slate-900">{report.ticketId}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(report.submittedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <Link
                        to={`/citizen/reports/${report.ticketId}`}
                        className="font-bold text-base text-slate-900 group-hover:text-[#15803d] transition-colors line-clamp-1 flex items-center gap-1.5 cursor-pointer block"
                      >
                        <MapPin className="w-4 h-4 text-[#15803d] shrink-0" />
                        <span>{report.location}</span>
                      </Link>

                      {report.landmark && (
                        <p className="text-xs text-slate-500 line-clamp-1 italic">
                          Near: {report.landmark}
                        </p>
                      )}

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {report.description || 'Pothole damage registered by citizen.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Upvote */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => handleUpvote(e, report.ticketId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 transition-colors cursor-pointer hover:scale-105"
                      title="Support this complaint with community upvote"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-[#15803d]" />
                      <span>{report.upvotes} votes</span>
                    </button>

                    <Link
                      to={`/citizen/reports/${report.ticketId}`}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      <span>Track Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {reportsData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-slate-500 px-3">
                  Page {page} of {reportsData.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page === reportsData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
            <EmptyState
              title="No Road Reports Found"
              description="No reports match your selected search or filter criteria."
              actionLabel="Report a Hazard"
              onAction={() => setStatusFilter('all')}
            />
          </div>
        )}
      </div>
    </div>
  );
};
