import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, AlertTriangle, TrendingUp, Search, Info } from 'lucide-react';
import { fetchLocalityHealthIndex } from '../../services/api';

export const RoadHealthIndexSection: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['localityHealthIndex'],
    queryFn: fetchLocalityHealthIndex,
    refetchInterval: 30000,
  });

  const localities = data?.localities || [];
  const cityAvg = data?.cityAverageHealthIndex ?? 82;
  const cityTier = data?.cityAverageTier || 'GOOD';

  const filtered = localities.filter((loc) =>
    loc.locality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section id="health-index" className="py-20 bg-[#0f172a] text-white border-t border-slate-800 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Activity className="w-3.5 h-3.5" />
            Civic Transparency & Road Analytics
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Locality Road Health Index
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg leading-relaxed">
            Standardized index measuring municipal road quality. <span className="text-emerald-400 font-semibold">100 = Healthiest Road Conditions</span>, penalized by unresolved hazard density, aging craters, and recurrence patterns.
          </p>
        </div>

        {/* City Overview Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase">City-Wide Road Health</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{cityAvg}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-emerald-400">
              Tier: {cityTier} Quality
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase">Evaluated Corridors</span>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{data?.totalLocalitiesEvaluated || localities.length}</span>
              <span className="text-xs text-slate-400">Districts</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Active observation zones
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase">Top Performing Zone</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white truncate">
                {localities.length > 0 ? localities[localities.length - 1].locality : 'Banjara Hills'}
              </span>
            </div>
            <div className="mt-2 text-xs text-emerald-400 font-medium">
              Score: {localities.length > 0 ? localities[localities.length - 1].healthIndex : 92}/100
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase">Critical Priority Zone</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white truncate">
                {localities.length > 0 ? localities[0].locality : 'Uppal Corridor'}
              </span>
            </div>
            <div className="mt-2 text-xs text-amber-400 font-medium">
              Score: {localities.length > 0 ? localities[0].healthIndex : 45}/100 (Immediate Dispatch)
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search locality e.g. Uppal, Banjara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated live from municipal report database</span>
          </div>
        </div>

        {/* Health Index Table */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Loading locality road health data...</div>
          ) : isError ? (
            <div className="p-12 text-center text-red-400">Unable to load road health index.</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No matching locality found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-4 px-6">Locality / Corridor</th>
                    <th className="py-4 px-6">Road Health Index</th>
                    <th className="py-4 px-6">Quality Tier</th>
                    <th className="py-4 px-6 text-center">Unresolved Hazards</th>
                    <th className="py-4 px-6 text-center">Avg Days Open</th>
                    <th className="py-4 px-6 text-center">Resolution Rate</th>
                    <th className="py-4 px-6">Municipal Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filtered.map((loc) => {
                    const isHealthy = loc.healthIndex >= 70;
                    const isWarning = loc.healthIndex < 70 && loc.healthIndex >= 50;
                    const isCritical = loc.healthIndex < 50;

                    const barColor = isHealthy ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-red-500';
                    const textColor = isHealthy ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-red-400';
                    const badgeBg = isHealthy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : isWarning ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20';

                    return (
                      <tr key={loc.locality} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{loc.locality}</span>
                            {loc.recurringIssuesCount > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {loc.recurringIssuesCount} Recurrent
                              </span>
                            )}
                          </div>
                          {!loc.isSufficientData && (
                            <span className="text-[11px] text-slate-500 block font-normal">
                              Preliminary (Low sample count)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="w-40">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className={`font-bold text-sm ${textColor}`}>{loc.healthIndex}</span>
                              <span className="text-[11px] text-slate-400">/ 100</span>
                            </div>
                            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${loc.healthIndex}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${barColor}`}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
                            {loc.healthTier}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`font-bold ${loc.unresolvedCount > 2 ? 'text-red-400' : 'text-slate-300'}`}>
                            {loc.unresolvedCount}
                          </span>
                          {loc.highSeverityCount > 0 && (
                            <span className="text-[11px] text-red-400/80 block">
                              ({loc.highSeverityCount} Critical)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-300">
                          {loc.avgUnresolvedDays}d
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="font-semibold text-emerald-400">{loc.resolutionRatePct}%</span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400 max-w-xs">
                          {loc.statusDescription}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
