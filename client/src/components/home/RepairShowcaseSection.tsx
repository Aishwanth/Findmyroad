import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface ShowcaseItem {
  id: string;
  ticketId: string;
  location: string;
  landmark: string;
  beforeImage: string;
  afterImage: string;
  repairMethod: string;
  resolvedIn: string;
  engineer: string;
  costSaved: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: '1',
    ticketId: 'FMR-2026-1038',
    location: 'Mallapur Industrial Road',
    landmark: 'Near Nacharam Bridge Junction & Gate 4',
    beforeImage: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=900&q=80',
    afterImage: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=80',
    repairMethod: 'Sub-base excavation & Dense Bituminous Macadam (DBM) compaction',
    resolvedIn: '48 hours',
    engineer: 'Divisional Eng. M. Venkat',
    costSaved: '₹1.8 Lakhs prevented vehicle damage',
  },
  {
    id: '2',
    ticketId: 'FMR-2026-0914',
    location: 'Hitec City - Cyber Towers Junction',
    landmark: 'Opposite Mindspace Entry Flyover Ramp',
    beforeImage: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=900&q=80',
    afterImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=900&q=80',
    repairMethod: 'Night-shift rapid 40mm Bituminous Concrete laying & roller compaction',
    resolvedIn: '24 hours',
    engineer: 'Asst. Exec. Eng. P. Suresh',
    costSaved: 'Zero transit disruption during peak tech commute',
  },
];

export const RepairShowcaseSection: React.FC = () => {
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'after' | 'before'>('after');

  const currentItem = SHOWCASE_ITEMS[activeItemIndex];

  return (
    <section className="py-20 bg-white border-b border-slate-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#15803d] text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
              <span>Verified Infrastructure Transparency</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Before &amp; After Restoration Showcase
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl font-medium">
              Every resolved complaint requires photographic civil engineering verification before public closure. See how citizen reports translate to durable asphalt repairs.
            </p>
          </div>

          {/* Project Selector Tabs */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-2xl self-start md:self-auto shadow-xs">
            {SHOWCASE_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveItemIndex(idx);
                  setActiveTab('after');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeItemIndex === idx
                    ? 'bg-[#15803d] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Case #{idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Showcase Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Photo with Before / After Toggle */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 h-72 sm:h-96 shadow-md bg-slate-100">
              <img
                src={activeTab === 'after' ? currentItem.afterImage : currentItem.beforeImage}
                alt={`${activeTab} repair photo for ${currentItem.location}`}
                className="w-full h-full object-cover transition-opacity duration-300"
              />

              {/* Status Badge Tag */}
              <div className="absolute top-4 left-4">
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-md uppercase tracking-wider flex items-center gap-1.5 ${
                    activeTab === 'after'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {activeTab === 'after' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>AFTER: Verified Resurfacing</span>
                    </>
                  ) : (
                    <>
                      <span>BEFORE: Hazardous Pothole</span>
                    </>
                  )}
                </span>
              </div>

              {/* Photo Toggle Pill */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center">
                <div className="bg-slate-900/85 backdrop-blur-md p-1 rounded-2xl border border-white/20 shadow-lg flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('before')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'before'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    1. Citizen Photo
                  </button>
                  <button
                    onClick={() => setActiveTab('after')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'after'
                        ? 'bg-[#22c55e] text-slate-950 shadow-xs font-black'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    2. Completed Repair &check;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Technical Engineering Details */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-[#15803d] uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Ticket {currentItem.ticketId} &bull; Verified Closure
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-2">
                {currentItem.location}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentItem.landmark}</span>
              </p>
            </div>

            <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200 text-xs shadow-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Turnaround Time:</span>
                <span className="font-mono font-bold text-[#15803d] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentItem.resolvedIn}</span>
                </span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Supervising Engineer:</span>
                <span className="font-bold text-slate-800">{currentItem.engineer}</span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-slate-500 block font-medium">Restoration Method Applied:</span>
                <p className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {currentItem.repairMethod}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-[#15803d]">
              <Sparkles className="w-5 h-5 text-[#22c55e] shrink-0" />
              <span className="font-bold">{currentItem.costSaved}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
