import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Cpu,
  Layers,
  CheckCircle2,
  Users,
  Compass,
  ArrowRight,
  Database,
  Code2,
  Sparkles,
  Zap,
  Building2,
  UserCircle2,
  CloudRain,
  MapPin,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-[#15803d] text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-[#22c55e]" />
            <span>CIVIC INFRASTRUCTURE AI &bull; HYDERABAD MUNICIPALITY</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            About{' '}
            <span className="text-[#22c55e]">FixMyRoad AI</span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal">
            A next-generation municipal governance system replacing archaic complaint hotlines with automated computer vision verification, real-time GPS tracking, and intelligent weather-informed engineering workflows.
          </p>
        </div>

        {/* TWO DEDICATED ROLE PORTALS SHOWCASE */}
        <div className="space-y-6">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest font-extrabold text-[#15803d]">
              Segmented Civic Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Two Dedicated Role Portals
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto mt-1">
              Engineered with strict separation of concerns between public citizens and municipal operations engineers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PORTAL 1: CITIZEN PORTAL */}
            <div className="group rounded-3xl p-8 bg-white border border-slate-200 hover:border-emerald-400 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#15803d]">
                    <UserCircle2 className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#15803d]">
                    PUBLIC CITIZEN HUB
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-[#15803d] transition-colors">
                    Citizen Reporting &amp; Tracking Portal
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                    Designed for rapid, frictionless road hazard reporting with zero bureaucracy.
                  </p>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>High-Accuracy GPS:</strong> Live reverse-geocoded road name detection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Instant Vision AI:</strong> Immediate severity score &amp; cavity depth analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Community Upvotes:</strong> Amplify urgent neighborhood issues together</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Proof of Closure:</strong> Verified before &amp; after repair photography</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <Link
                  to="/citizen"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <span>Open Citizen Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* PORTAL 2: MUNICIPAL OFFICER PORTAL */}
            <div className="group rounded-3xl p-8 bg-slate-900 text-white shadow-xl flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    MUNICIPAL OPERATIONS CONSOLE
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    GHMC Engineering Command Center
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                    Designed for municipal engineers, superintendents, and rapid-response roadwork crews.
                  </p>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>Monsoon Weather Prioritization:</strong> Rain hazards automatically boosted to top</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>Rain Start &amp; Stop Window:</strong> Optimal dry-asphalt dispatch timing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>Work Order Dispatch:</strong> Assign to 7 municipal rapid patch divisions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>Live MongoDB Management:</strong> One-click dismiss and persistent deletion</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800">
                <Link
                  to="/officer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <span>Access Officer Console</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-3xl p-7 bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#15803d]">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Instant Citizen Triage</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              No long hold queues or lost paper petitions. A single smartphone photo geotags the defect and places it on the municipal engineer board in seconds.
            </p>
          </div>

          <div className="rounded-3xl p-7 bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Objective Vision AI</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Google Gemini multimodal vision inspects crater perimeter, depth classification, and water-shearing hazards, removing political or subjective bias.
            </p>
          </div>

          <div className="rounded-3xl p-7 bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Zero Phantom Closures</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              To resolve a work order, the officer must provide photographic after-repair proof and engineer badge verification, visible to every citizen.
            </p>
          </div>
        </div>

        {/* Technology Stack & Live Architecture */}
        <div className="rounded-3xl p-8 sm:p-10 bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <Code2 className="w-6 h-6 text-[#15803d]" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Engineering Stack &amp; Platform Architecture</h2>
              <p className="text-xs text-slate-500">Full-stack reactive orchestration powered by modern civic cloud technologies</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm text-slate-700">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Client &amp; Interface Layer</span>
              </h4>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">&bull;</span>
                  <span><strong className="text-slate-900">React 18 &amp; TypeScript:</strong> Strict typed client components with fast responsiveness.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">&bull;</span>
                  <span><strong className="text-slate-900">Outfit Typography:</strong> Modern rounded design system with high-contrast accessibility.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">&bull;</span>
                  <span><strong className="text-slate-900">OpenStreetMap Nominatim:</strong> Precision reverse-geocoding for real street &amp; ward discovery.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">&bull;</span>
                  <span><strong className="text-slate-900">TanStack React Query:</strong> Synchronized server cache with optimistic voting updates.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Backend, AI &amp; Persistent Database</span>
              </h4>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">&bull;</span>
                  <span><strong className="text-slate-900">Express.js &amp; Node.js:</strong> High-throughput REST API with multipart file handling.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">&bull;</span>
                  <span><strong className="text-slate-900">MongoDB &amp; Mongoose:</strong> Document persistence for complaint lifecycles and deletions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">&bull;</span>
                  <span><strong className="text-slate-900">Gemini 1.5 Flash Vision:</strong> Neural damage classification with confidence indicators.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">&bull;</span>
                  <span><strong className="text-slate-900">Live Weather Forecast Engine:</strong> Monsoon rain duration detection and optimal work windows.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Gateway Card */}
        <div className="rounded-3xl p-8 sm:p-12 text-center bg-slate-900 text-white shadow-2xl space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Experience the Live Portals</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
            Choose your journey: report a street defect as a citizen or inspect the live dispatch queue as a municipal engineer.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/report"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Report a Pothole Now
            </Link>
            <Link
              to="/officer"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition-all cursor-pointer"
            >
              Open Municipal Command Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
