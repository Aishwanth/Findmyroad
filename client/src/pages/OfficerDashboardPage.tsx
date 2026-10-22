import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  AlertOctagon,
  Clock,
  Wrench,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Layers,
  ArrowUpRight,
  UserCheck,
  ChevronRight,
  Activity,
  SlidersHorizontal,
  CloudRain,
  Thermometer,
  Sun,
  Trash2,
  Users,
  Flame,
  Check,
} from 'lucide-react';
import {
  fetchDashboardStats,
  fetchReports,
  fetchDashboardActivity,
  fetchRepairTeams,
  fetchHotspots,
  updateReportStatus,
  deleteReport,
} from '../services/api';
import { SeverityBadge, StatusBadge } from '../components/common/Badge';
import {
  DashboardCardSkeleton,
  TableRowSkeleton,
  ChartSkeleton,
} from '../components/common/Skeletons';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { useToast } from '../context/ToastContext';
import { useRole } from '../context/RoleContext';
import { ReportStatus } from '../types';

export const OfficerDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { officerName } = useRole();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching: statsRefetching,
  } = useQuery({
    queryKey: ['officer-stats'],
    queryFn: fetchDashboardStats,
  });

  const {
    data: activity,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['officer-activity'],
    queryFn: fetchDashboardActivity,
  });

  const {
    data: reportsData,
    isLoading: reportsLoading,
    refetch: refetchReports,
    isRefetching: reportsRefetching,
  } = useQuery({
    queryKey: ['officer-reports', statusFilter, severityFilter, locationFilter, searchTerm, sortBy, sortOrder, page],
    queryFn: () =>
      fetchReports({
        status: statusFilter,
        severity: severityFilter,
        location: locationFilter,
        search: searchTerm,
        sortBy,
        sortOrder,
        page,
        limit: 10,
      }),
  });

  const { data: teamsData } = useQuery({
    queryKey: ['officer-repair-teams'],
    queryFn: fetchRepairTeams,
  });

  const { data: hotspotsData } = useQuery({
    queryKey: ['officer-hotspots'],
    queryFn: fetchHotspots,
  });

  const teams = teamsData || [];
  const hotspots = hotspotsData || [];

  // Quick Status Advance Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: ReportStatus }) =>
      updateReportStatus(id, nextStatus, 'Quick status triage from Operations Console', officerName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['officer-reports'] });
      queryClient.invalidateQueries({ queryKey: ['officer-stats'] });
      queryClient.invalidateQueries({ queryKey: ['officer-activity'] });
      toast({
        type: 'success',
        title: 'Status Updated',
        message: `Ticket ${variables.id} moved to ${variables.nextStatus}.`,
      });
    },
    onError: () => {
      toast({ type: 'error', title: 'Update Failed', message: 'Could not change status.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ticketId: string) => deleteReport(ticketId),
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['officer-reports'] });
      queryClient.invalidateQueries({ queryKey: ['officer-stats'] });
      queryClient.invalidateQueries({ queryKey: ['officer-activity'] });
      toast({
        type: 'success',
        title: 'Complaint Deleted from MongoDB',
        message: `Ticket ${ticketId} has been permanently deleted from database.`,
      });
    },
    onError: (err: any) => {
      toast({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Could not delete report from MongoDB.',
      });
    },
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchReports();
    refetchActivity();
    toast({ type: 'info', title: 'Data Refreshed', message: 'Municipal records synchronized.' });
  };

  const getNextStatusAction = (currentStatus: ReportStatus): { label: string; next: ReportStatus } | null => {
    switch (currentStatus) {
      case 'Submitted':
        return { label: 'Mark Under Review', next: 'Under Review' };
      case 'Under Review':
        return { label: 'Dispatch Repair', next: 'Assigned' };
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Operations Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider font-mono">
                Municipal Operations Center &bull; Zonal Triage
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Road Infrastructure Command Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Logged In As: <span className="text-slate-900 font-bold">{officerName}</span> &bull;{' '}
              <span className="font-mono text-slate-500">{new Date().toDateString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={statsRefetching || reportsRefetching}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${statsRefetching || reportsRefetching ? 'animate-spin text-[#22c55e]' : ''}`}
              />
              <span>Refresh Sync</span>
            </button>

            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-xs tracking-wide shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>+ New Defect Ticket</span>
            </Link>
          </div>
        </div>

        {/* KPI Statistic Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statsLoading ? (
            <>
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <span className="text-xs text-slate-500 font-medium">Total Complaints</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {stats?.totalReports || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Live DB records</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <span className="text-xs text-slate-500 font-medium">Awaiting Review</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">
                  {stats?.awaitingReview || 0}
                </div>
                <span className="text-[11px] text-amber-600/80 mt-1 block font-medium">Pending engineer review</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <span className="text-xs text-slate-500 font-medium">High Severity</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-1">
                  {stats?.highSeverity || 0}
                </div>
                <span className="text-[11px] text-red-600/80 mt-1 block font-medium">Critical hazard tier</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <span className="text-xs text-slate-500 font-medium">Assigned Crews</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-1">
                  {stats?.assignedRepairs || 0}
                </div>
                <span className="text-[11px] text-purple-600/80 mt-1 block font-medium">Active work orders</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <span className="text-xs text-slate-500 font-medium">Verified Resolved</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#15803d] mt-1">
                  {stats?.resolvedReports || 0}
                </div>
                <span className="text-[11px] text-[#15803d] mt-1 block font-semibold">
                  {stats?.resolutionRate}% completed
                </span>
              </div>
            </>
          )}
        </div>

        {/* Visual Analytics Grid (Recharts) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Severity Distribution Pie Chart */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-500" />
                <span>Severity Breakdown</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Live Ratios</span>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              {statsLoading ? (
                <div className="animate-pulse w-32 h-32 rounded-full border-4 border-slate-200" />
              ) : stats?.severityDistribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.severityDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={45}
                      paddingAngle={4}
                    >
                      {stats.severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '12px',
                        color: '#0f172a',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      formatter={(value) => <span className="text-slate-600 font-medium">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          {/* Status Distribution Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#22c55e]" />
                <span>Workflow Status Queue</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Pipeline</span>
            </div>

            <div className="h-56 w-full">
              {statsLoading ? (
                <div className="animate-pulse h-full bg-slate-100 rounded-xl" />
              ) : stats?.statusDistribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.statusDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          {/* Recent Activity Mini-Feed */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Recent Triage Activity</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Realtime</span>
            </div>

            <div className="h-56 overflow-y-auto space-y-2.5 pr-1">
              {activityLoading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : activity && activity.length > 0 ? (
                activity.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <span className="text-[#15803d] font-bold">{item.ticketId}</span>
                        <span className="text-slate-500">&bull; {item.action}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{item.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-8">No recent activity logged.</p>
              )}
            </div>
          </div>
        </div>

        {/* Active Rain Hazard Triage Alert */}
        {reportsData?.reports && reportsData.reports.some((r) => r.weatherPriorityBoost || r.weatherData?.isRaining) && (
          <div className="p-5 bg-amber-50 border border-amber-300 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                <CloudRain className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Monsoon &amp; Active Precipitation Triage Alert</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                    TOP PRIORITY BOOST ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5">
                  Precipitation hazards active in corridor reports. These defects are pinned to the <strong>TOP OF THE TRIAGE QUEUE</strong> with live rain duration tracking and scheduled dry-adhesion worker dispatch windows.
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs font-mono font-bold text-amber-800 bg-white px-3 py-1.5 rounded-xl border border-amber-300 inline-flex items-center gap-1.5 shadow-xs">
                <Clock className="w-3.5 h-3.5" />
                Optimal Dispatch Mode Active
              </span>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ticket ID, location, or notes..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#22c55e] focus:bg-white transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#22c55e] focus:bg-white cursor-pointer transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="Submitted">Submitted (Needs Triage)</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Crew Assigned</option>
                <option value="Resolved">Resolved &amp; Closed</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="lg:col-span-2">
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#22c55e] focus:bg-white cursor-pointer transition-colors"
              >
                <option value="all">All Severities</option>
                <option value="high">High Severity Only</option>
                <option value="medium">Medium Severity</option>
                <option value="low">Low Severity</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="lg:col-span-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split('-');
                  setSortBy(sb);
                  setSortOrder(so as 'asc' | 'desc');
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#22c55e] focus:bg-white cursor-pointer transition-colors"
              >
                <option value="submittedAt-desc">Newest Submissions</option>
                <option value="submittedAt-asc">Oldest First</option>
                <option value="severity-desc">Highest Priority First</option>
                <option value="upvotes-desc">Highest Community Upvotes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions Management Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#22c55e]" />
              <span>Complaint Triage &amp; Work Orders Table</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Showing {reportsData?.reports.length || 0} of {reportsData?.total || 0} reports
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Ticket &amp; Photo</th>
                  <th className="py-3.5 px-4">Location &amp; Landmark</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Crew</th>
                  <th className="py-3.5 px-4">Reported</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {reportsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : reportsData?.reports && reportsData.reports.length > 0 ? (
                  reportsData.reports.map((report) => {
                    const quickAction = getNextStatusAction(report.status);
                    const isRainEmergency = Boolean(report.weatherPriorityBoost || report.weatherData?.isRaining);
                    return (
                      <tr
                        key={report.ticketId}
                        className={`transition-colors group ${
                          isRainEmergency
                            ? 'bg-amber-50/60 hover:bg-amber-50 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Ticket & Photo */}
                        <td className="py-3 px-4">
                          <Link
                            to={`/officer/reports/${report.ticketId}`}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <img
                              src={report.imageUrl}
                              alt="Damage thumbnail"
                              className="w-12 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-slate-900 group-hover:text-[#15803d] transition-colors">
                                  {report.ticketId}
                                </span>
                                {isRainEmergency && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    <CloudRain className="w-3 h-3" /> RAIN BOOST
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                👍 {report.upvotes} votes
                              </span>
                            </div>
                          </Link>
                        </td>

                        {/* Location & Climate Forecast */}
                        <td className="py-3 px-4 max-w-xs">
                          <span className="font-bold text-slate-900 block truncate">
                            {report.location}
                          </span>
                          {report.landmark && (
                            <span className="text-[11px] text-slate-500 block truncate">
                              {report.landmark}
                            </span>
                          )}
                          {report.weatherData && (
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                              {report.weatherData.isRaining ? (
                                <>
                                  <span className="font-mono bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                    🌧️ {report.weatherData.rainStartTime || '11:15 AM'} → {report.weatherData.rainStopTime || '12:45 PM'}
                                  </span>
                                  <span className="font-mono bg-emerald-50 text-[#15803d] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                    🚜 Work: {report.weatherData.optimalDispatchTime}
                                  </span>
                                </>
                              ) : (
                                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                  ☀️ {report.weatherData.temperature}°C • Dry Window
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Severity & SLA */}
                        <td className="py-3 px-4">
                          <SeverityBadge
                            severity={report.severity}
                            numericalScore={report.numericalSeverityScore}
                            category={report.severityCategory}
                          />
                          {report.sla && (
                            <div className="mt-1">
                              {report.sla.isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                  <Clock className="w-3 h-3" /> SLA Breached ({report.sla.delayStageAttribution})
                                </span>
                              ) : report.sla.escalationLevel === 'APPROACHING_DEADLINE' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3" /> {report.sla.remainingResolutionHours}h left
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3" /> SLA On Track
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <StatusBadge status={report.status} />
                          {report.recurrence?.isRecurrent && (
                            <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 block w-fit">
                              🔄 Recurrent Defect
                            </span>
                          )}
                          {report.repairVerification?.status === 'REPAIR_APPEARS_COMPLETE' && (
                            <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 block w-fit">
                              ✓ AI Proof Attached
                            </span>
                          )}
                        </td>

                        {/* Assigned Crew */}
                        <td className="py-3 px-4 text-slate-700">
                          {report.assignedTeam ? (
                            <span className="font-semibold text-purple-700 block truncate max-w-[160px]">
                              {report.assignedTeam}
                            </span>
                          ) : report.smartAssignmentRecommendation ? (
                            <div>
                              <span className="text-slate-400 italic block">Unassigned</span>
                              <span className="text-[10px] text-emerald-700 font-semibold block truncate max-w-[160px]">
                                Rec: {report.smartAssignmentRecommendation.suggestedTeam} ({report.smartAssignmentRecommendation.matchScore}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Reported date */}
                        <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                          {new Date(report.submittedAt).toLocaleDateString()}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {quickAction && (
                              <button
                                type="button"
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: report.ticketId,
                                    nextStatus: quickAction.next,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#15803d] border border-emerald-200 font-bold text-[11px] transition-colors cursor-pointer"
                                title={quickAction.label}
                              >
                                {quickAction.label}
                              </button>
                            )}

                            <Link
                              to={`/officer/reports/${report.ticketId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 transition-colors cursor-pointer"
                            >
                              <span>Manage</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Permanently delete complaint ${report.ticketId} from the MongoDB database?`)) {
                                  deleteMutation.mutate(report.ticketId);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                              title="Delete / Dismiss complaint from MongoDB"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <EmptyState
                        title="No Reports In Triage Queue"
                        description="No records match the current operational filters."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {reportsData && reportsData.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {page} of {reportsData.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold disabled:opacity-40 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= reportsData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold disabled:opacity-40 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
