import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building2,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { fetchHotspots } from '../../services/api';
import { IHotspot } from '../../types';

interface HotspotsSectionProps {
  onSelectLocality?: (locality: string, coordinates?: { lat: number; lng: number }) => void;
}

export const HotspotsSection: React.FC<HotspotsSectionProps> = ({ onSelectLocality }) => {
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  const { data: hotspots, isLoading, isError } = useQuery({
    queryKey: ['road-hotspots'],
    queryFn: fetchHotspots,
  });

  return (
    <section id="hotspots" className="py-20 bg-slate-50 border-b border-slate-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider mb-3">
              <TrendingUp className="w-4 h-4 text-amber-700" />
              <span>Municipal Infrastructure Analytics</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Road Damage Hotspots
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl font-medium">
              Localities with the highest unresolved road-damage burden. Calculated objectively from live municipal complaint queues to guide rapid maintenance resource allocation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs self-start md:self-auto"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Calculation Methodology</span>
          </button>
        </div>

        {/* Hotspots Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-10 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : isError || !hotspots || hotspots.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-md mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-[#22c55e] mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900">No Critical Hotspots</h3>
            <p className="text-xs text-slate-600 mt-1">
              All reported areas are operating within acceptable road safety thresholds.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {hotspots.map((spot, idx) => {
              const total = spot.highSeverityCount + spot.mediumSeverityCount + spot.lowSeverityCount || 1;
              const highPct = (spot.highSeverityCount / total) * 100;
              const medPct = (spot.mediumSeverityCount / total) * 100;
              const lowPct = (spot.lowSeverityCount / total) * 100;

              return (
                <motion.div
                  key={spot.locality}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        ZONE #{idx + 1}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        {spot.severityWeightedBurden} burden pts
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2 min-h-[40px]">
                      {spot.locality}
                    </h3>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">Unresolved:</span>
                        <span className="font-mono text-sm font-extrabold text-slate-900">
                          {spot.unresolvedCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">High Severity:</span>
                        <span className="font-mono text-sm font-extrabold text-red-600">
                          {spot.highSeverityCount}
                        </span>
                      </div>
                    </div>

                    {/* Compact Severity Distribution Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Severity Ratio</span>
                        <span>Avg Age: {spot.avgAgeDays}d</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div style={{ width: `${highPct}%` }} className="bg-red-500 h-full" title={`High: ${spot.highSeverityCount}`} />
                        <div style={{ width: `${medPct}%` }} className="bg-amber-500 h-full" title={`Medium: ${spot.mediumSeverityCount}`} />
                        <div style={{ width: `${lowPct}%` }} className="bg-emerald-500 h-full" title={`Low: ${spot.lowSeverityCount}`} />
                      </div>
                    </div>
                  </div>

                  {/* View on Map Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectLocality) {
                        onSelectLocality(spot.locality, spot.coordinates);
                        const mapEl = document.getElementById('damage-map');
                        if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-slate-100 hover:bg-[#15803d] hover:text-white text-slate-800 text-xs font-bold transition-all cursor-pointer border border-slate-200 hover:border-transparent shadow-xs"
                  >
                    <span>View Area on Map</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Methodology Info Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Hotspot Calculation Methodology</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              FixMyRoad AI ranks civic hotspots objectively based on verified open tickets in each municipal sector rather than arbitrary estimates.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs text-slate-700 font-medium">
              <div className="font-bold text-slate-900">Weighting Metrics:</div>
              <p>&bull; <strong>High Severity Hazard:</strong> 3 points per incident</p>
              <p>&bull; <strong>Medium Severity Pothole:</strong> 2 points per incident</p>
              <p>&bull; <strong>Low Severity Crack:</strong> 1 point per incident</p>
              <p>&bull; <strong>Aging Duration:</strong> Average elapsed days since citizen verification</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
