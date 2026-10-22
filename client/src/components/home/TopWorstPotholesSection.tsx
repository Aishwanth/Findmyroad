import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  AlertTriangle,
  Clock,
  ThumbsUp,
  MapPin,
  ArrowRight,
  Info,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  Map,
  X,
  ExternalLink,
  Download,
  FileDown,
  Loader2,
} from 'lucide-react';
import { fetchTopWorstPotholes } from '../../services/api';
import { SeverityBadge, StatusBadge } from '../common/Badge';
import { ITopWorstReport } from '../../types';
import { generateTopWorstPotholesPdf } from '../../utils/pdfGenerator';
import { useToast } from '../../context/ToastContext';

interface TopWorstPotholesProps {
  onSelectReportOnMap?: (report: ITopWorstReport) => void;
}

export const TopWorstPotholesSection: React.FC<TopWorstPotholesProps> = ({ onSelectReportOnMap }) => {
  const { toast } = useToast();
  const [filterMode, setFilterMode] = useState<string>('all');
  const [selectedLocality, setSelectedLocality] = useState<string>('all');
  const [activeBreakdownReport, setActiveBreakdownReport] = useState<ITopWorstReport | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['top-worst-potholes', filterMode, selectedLocality],
    queryFn: () =>
      fetchTopWorstPotholes({
        filterMode,
        locality: selectedLocality,
        limit: 5,
      }),
  });

  const reports = data?.data || [];

  const handleDownloadPdf = async () => {
    if (reports.length === 0) {
      toast({ type: 'info', title: 'No Data Available', message: 'There are no reports to export in this category.' });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await generateTopWorstPotholesPdf({
        reports,
        cityName: selectedLocality !== 'all' ? selectedLocality : 'Hyderabad Metropolitan Area',
        filterMode,
        scoringModel: data?.scoringModel,
      });

      toast({
        type: 'success',
        title: 'Report Downloaded Successfully',
        message: 'FixMyRoad Top 5 Worst Potholes PDF report generated.',
      });
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      toast({
        type: 'error',
        title: 'PDF Generation Error',
        message: 'Could not generate report. Trying server endpoint...',
      });
      // Graceful fallback to server endpoint
      window.open(`/api/reports/top-worst/pdf?locality=${selectedLocality}&filterMode=${filterMode}`, '_blank');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <section id="worst-potholes" className="py-20 bg-slate-50 relative border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100 border border-rose-200 text-rose-800 text-xs font-extrabold uppercase tracking-wider mb-3">
              <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>Critical Civic Leaderboard</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Top 5 Worst Potholes in Your City
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl font-medium">
              See the road hazards that need the most urgent municipal attention. Ranked transparently by cavity depth severity, elapsed response time, and verified citizen reports.
            </p>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Prominent PDF Download Action Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || reports.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              title="Download Top 5 Worst Potholes PDF report for municipal dispatch"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileDown className="w-4 h-4 text-emerald-200" />
              )}
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Top 5 Report (PDF)'}</span>
            </button>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1 shadow-xs">
              {[
                { id: 'all', label: 'Overall Worst' },
                { id: 'high', label: 'High Hazard' },
                { id: 'overdue', label: 'Most Overdue' },
                { id: 'upvoted', label: 'Most Upvoted' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-[#15803d] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveBreakdownReport(reports[0] || null)}
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-[#15803d] hover:border-emerald-300 transition-colors cursor-pointer shadow-xs"
              title="How is priority score calculated?"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Leaderboard Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row items-center gap-5 animate-pulse shadow-xs"
              >
                <div className="w-12 h-12 bg-slate-200 rounded-2xl shrink-0" />
                <div className="w-28 h-20 bg-slate-200 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2 w-full">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                </div>
                <div className="w-32 h-10 bg-slate-200 rounded-2xl shrink-0" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xs">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Failed to Load Leaderboard</h3>
            <p className="text-sm text-slate-600 mt-1 mb-4">
              Unable to compute live road priority scoring. Please verify server connection.
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-2xl bg-[#22c55e] text-slate-950 font-bold text-xs hover:bg-[#16a34a] shadow-md transition-all cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-[#22c55e] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Critical Unresolved Potholes</h3>
            <p className="text-sm text-slate-600 mt-1">
              All reported hazards in this category have been attended to by municipal road crews.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;

              return (
                <motion.div
                  key={report.ticketId}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  className={`bg-white border rounded-3xl p-5 sm:p-6 transition-all hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                    isFirst
                      ? 'border-rose-300 ring-2 ring-rose-200 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Left: Rank Badge, Photo & Core Details */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-extrabold text-sm shrink-0 shadow-xs ${
                        rank === 1
                          ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                          : rank === 2
                          ? 'bg-amber-500 text-white'
                          : rank === 3
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className="text-[10px] leading-tight font-medium uppercase tracking-tighter opacity-80">
                        RANK
                      </span>
                      <span className="text-base leading-tight">#{rank}</span>
                    </div>

                    {/* Photo Thumbnail */}
                    <div className="relative w-full sm:w-28 h-20 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      <img
                        src={report.imageUrl}
                        alt={report.location}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-1.5 left-1.5">
                        <SeverityBadge
                          severity={report.severity}
                          numericalScore={report.numericalSeverityScore}
                          category={report.severityCategory}
                        />
                      </div>
                    </div>

                    {/* Metadata & Headline */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-500">{report.ticketId}</span>
                        <span className="text-slate-300">&bull;</span>
                        <StatusBadge status={report.status} />
                        {report.weatherData?.isRaining && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            🌧️ RAIN HAZARD
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 truncate">
                        {report.location}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap font-medium">
                        {report.landmark && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[200px]">{report.landmark}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Open for {report.scoreBreakdown?.daysUnresolved || 1} days</span>
                        </span>
                        <span className="flex items-center gap-1 text-[#15803d] font-bold">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{report.upvotes} upvotes</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Priority Score & Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    {/* Priority Score Pill */}
                    <button
                      type="button"
                      onClick={() => setActiveBreakdownReport(report)}
                      className="text-left bg-slate-50 hover:bg-slate-100 p-2.5 rounded-2xl border border-slate-200 transition-colors cursor-pointer"
                      title="Click to view full priority score math breakdown"
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                        <span>PRIORITY SCORE</span>
                        <Info className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="text-lg font-mono font-extrabold text-slate-900 mt-0.5">
                        {report.priorityScore || 50} <span className="text-xs font-normal text-slate-500">pts</span>
                      </div>
                    </button>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {report.coordinates && onSelectReportOnMap && (
                        <button
                          type="button"
                          onClick={() => onSelectReportOnMap(report)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                        >
                          <Map className="w-3.5 h-3.5 text-[#15803d]" />
                          <span>View on Map</span>
                        </button>
                      )}

                      <Link
                        to={`/citizen/reports/${report.ticketId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <span>View Report</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Bottom Callout & Transparency Notice */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#15803d] border border-emerald-200 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-slate-600 font-medium">
              <strong className="text-slate-900">Democratized Road Triage:</strong> Rankings dynamically recalculate in real-time as citizens submit photographic proof and upvote hazards in their neighborhoods.
            </p>
          </div>

          <Link
            to="/citizen"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15803d] hover:text-[#16a34a] hover:underline shrink-0"
          >
            <span>Explore All Civic Reports ({reports.length}+)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Transparent Scoring Breakdown Modal */}
      <AnimatePresence>
        {activeBreakdownReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-600" />
                  <h3 className="text-lg font-bold text-slate-900">Priority Score Formula</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveBreakdownReport(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <span className="text-xs font-mono font-bold text-[#15803d]">
                  {activeBreakdownReport.ticketId} &bull; {activeBreakdownReport.location}
                </span>
                <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                  FixMyRoad AI ranks civic road hazards deterministically to guarantee urgent safety hazards are addressed before minor cosmetic cracks.
                </p>
              </div>

              {/* Point Allocation Table */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Severity Classification ({activeBreakdownReport.severity.toUpperCase()}):</span>
                  <span className="font-mono font-bold text-slate-900">
                    +{activeBreakdownReport.scoreBreakdown?.severityPoints || 50} pts
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">
                    Aging Burden ({activeBreakdownReport.scoreBreakdown?.daysUnresolved || 1} days unresolved):
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    +{activeBreakdownReport.scoreBreakdown?.agingPoints || 0} pts
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Community Upvotes ({activeBreakdownReport.upvotes} votes):</span>
                  <span className="font-mono font-bold text-slate-900">
                    +{activeBreakdownReport.scoreBreakdown?.upvotePoints || 0} pts
                  </span>
                </div>
                {activeBreakdownReport.scoreBreakdown?.rainHazardBonus > 0 && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-amber-800">
                    <span className="font-medium">Active Monsoon Rain / Submerged Hazard Bonus:</span>
                    <span className="font-mono font-bold">+{activeBreakdownReport.scoreBreakdown.rainHazardBonus} pts</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 font-bold text-sm text-slate-900">
                  <span>Total Calculated Priority:</span>
                  <span className="font-mono text-base text-[#15803d]">
                    {activeBreakdownReport.priorityScore} pts
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveBreakdownReport(null)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Breakdown
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
