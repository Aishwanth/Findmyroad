import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Heart, Github, ExternalLink, Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-navy-950 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-emerald flex items-center justify-center text-navy-950 font-black">
                <ShieldAlert className="w-4 h-4 text-navy-950" />
              </div>
              <span className="text-base font-bold text-white">FixMyRoad AI</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              AI-assisted road defect detection, severity triage, and transparent civic repair tracking for smart municipalities.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-brand-emerald pt-1">
              <span className="w-2 h-2 rounded-full bg-brand-emerald animate-ping" />
              <span>GHMC Pilot Corridor Engine Online</span>
            </div>
          </div>

          {/* Citizen Links */}
          <div>
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Citizen Portal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/report" className="hover:text-brand-emerald transition-colors">
                  Report a Pothole
                </Link>
              </li>
              <li>
                <Link to="/citizen" className="hover:text-brand-emerald transition-colors">
                  Track My Reports
                </Link>
              </li>
              <li>
                <Link to="/citizen" className="hover:text-brand-emerald transition-colors">
                  Community Upvotes
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-brand-emerald transition-colors">
                  Reporting Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Municipal Ops */}
          <div>
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Municipal Operations
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/officer" className="hover:text-brand-emerald transition-colors">
                  Operations Center
                </Link>
              </li>
              <li>
                <Link to="/officer" className="hover:text-brand-emerald transition-colors">
                  Triage &amp; Priority Queue
                </Link>
              </li>
              <li>
                <Link to="/officer" className="hover:text-brand-emerald transition-colors">
                  Work Order Dispatch
                </Link>
              </li>
              <li>
                <Link to="/officer" className="hover:text-brand-emerald transition-colors">
                  Repair Verification Audits
                </Link>
              </li>
            </ul>
          </div>

          {/* Hackathon Disclaimer */}
          <div>
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Civic Hackathon MVP
            </h4>
            <div className="p-3 rounded-xl bg-navy-900 border border-slate-800 text-[11px] leading-relaxed text-slate-400">
              <p className="mb-2">
                Demonstration environment. Sample reports, maps, and AI assessments are illustrative for engineering evaluation.
              </p>
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
                <span>Mongoose &bull; React &bull; Gemini AI</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} FixMyRoad AI Civic Infrastructure Project. Built for urban safety.</p>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-slate-300">
              Architecture
            </Link>
            <Link to="/officer" className="hover:text-slate-300">
              Officer Console
            </Link>
            <Link to="/report" className="hover:text-slate-300">
              Submit Report
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
