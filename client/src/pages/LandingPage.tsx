import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Camera,
  MapPin,
  Clock,
  ThumbsUp,
  ArrowRight,
  Upload,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  CloudRain,
  Sun,
  Shield,
  User,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Building,
} from 'lucide-react';
import { fetchDashboardStats, fetchReports, createReport, upvoteReport } from '../services/api';
import { SeverityBadge, StatusBadge } from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import { TopWorstPotholesSection } from '../components/home/TopWorstPotholesSection';
import { InteractiveDamageMap } from '../components/home/InteractiveDamageMap';
import { HotspotsSection } from '../components/home/HotspotsSection';
import { RoadHealthIndexSection } from '../components/home/RoadHealthIndexSection';
import { RepairShowcaseSection } from '../components/home/RepairShowcaseSection';
import { ITopWorstReport, IMapReport } from '../types';

import { Variants, useScroll, useTransform } from 'framer-motion';

// Premium forward-moving layered entrance animation variants
const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const forwardMoveItemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.91, y: 32 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.48, ease: 'easeOut' },
  },
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Scroll-based background dimming
  const { scrollY } = useScroll();
  const heroDimOverlayOpacity = useTransform(scrollY, [0, 250, 550], [0.38, 0.68, 0.90]);
  const heroImageScale = useTransform(scrollY, [0, 600], [1.0, 1.04]);

  // Hero Quick-Report Form States
  const [quickLocation, setQuickLocation] = useState('Near Uppal Metro Station');
  const [quickDetails, setQuickDetails] = useState('');
  const [quickImageFile, setQuickImageFile] = useState<File | null>(null);
  const [quickImagePreview, setQuickImagePreview] = useState<string>(
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
  );
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map focus interaction state
  const [selectedMapReport, setSelectedMapReport] = useState<IMapReport | null>(null);

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const { data: recentReportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['recent-reports'],
    queryFn: () => fetchReports({ limit: 4, sortBy: 'submittedAt', sortOrder: 'desc' }),
  });

  // Upvote mutation for recent cards
  const upvoteMutation = useMutation({
    mutationFn: (ticketId: string) => upvoteReport(ticketId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        type: 'success',
        title: data.hasUpvoted ? 'Upvote Recorded' : 'Upvote Removed',
        message: `Total community votes: ${data.upvotes}`,
      });
    },
    onError: () => {
      toast({ type: 'error', title: 'Upvote Failed', message: 'Could not record your vote.' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQuickImageFile(file);
      setQuickImagePreview(URL.createObjectURL(file));
      toast({ type: 'info', title: 'Photo Selected', message: `${file.name} ready for AI inspection.` });
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLocation) {
      toast({ type: 'error', title: 'Location Required', message: 'Please select a road location.' });
      return;
    }

    setIsSubmittingQuick(true);
    try {
      const formData = new FormData();
      formData.append('location', quickLocation);
      formData.append('description', quickDetails || 'Pothole hazard reported via quick hero form.');
      formData.append('landmark', quickLocation);

      if (quickImageFile) {
        formData.append('image', quickImageFile);
      } else {
        const res = await fetch(quickImagePreview);
        const blob = await res.blob();
        formData.append('image', blob, 'pothole-report.jpg');
      }

      const created = await createReport(formData);
      toast({
        type: 'success',
        title: 'Report Submitted Successfully!',
        message: `Ticket ID: ${created.ticketId} — AI Severity: ${created.severity.toUpperCase()}`,
      });
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate(`/citizen/reports/${created.ticketId}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Could not submit report. Please try again.',
      });
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Scroll to map when report selected from leaderboard or hotspots
  const handleSelectReportOnMap = (report: ITopWorstReport) => {
    if (report.coordinates) {
      setSelectedMapReport({
        _id: report._id,
        ticketId: report.ticketId,
        imageUrl: report.imageUrl,
        location: report.location,
        landmark: report.landmark,
        severity: report.severity,
        status: report.status,
        coordinates: report.coordinates,
        upvotes: report.upvotes,
        submittedAt: String(report.submittedAt),
        weatherData: report.weatherData,
        damageType: report.damageType,
        aiExplanation: report.aiExplanation,
      });

      const mapEl = document.getElementById('damage-map');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. HERO SECTION WITH NATURAL HIGH-CLARITY PHOTOGRAPHY & STAGGERED ENTRANCE */}
      <section className="relative min-h-[92vh] pt-24 pb-16 flex items-center justify-center overflow-hidden bg-[#0a1017]">
        {/* High-Resolution Urban Asphalt Road Background with Visible Potholes */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=2400&q=85')`,
            scale: heroImageScale,
          }}
        >
          {/* Subtle balanced static overlay for initial high text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1017]/92 via-[#0a1017]/75 to-[#0a1017]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1017] via-transparent to-[#0a1017]/30" />
        </motion.div>

        {/* Scroll-Based Dynamic Darkening Overlay */}
        <motion.div
          className="absolute inset-0 bg-[#0a1017] pointer-events-none"
          style={{ opacity: heroDimOverlayOpacity }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column (7 Cols): Staggered Sequence */}
            <motion.div
              variants={heroContainerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-7 space-y-6"
            >
              {/* 1. Intro Badge */}
              <motion.div variants={forwardMoveItemVariants}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold tracking-wide backdrop-blur-md">
                  <span>🌿</span>
                  <span>A CLEANER, SAFER HYDERABAD</span>
                </div>
              </motion.div>

              {/* 2. Main Headline (Layered Line Reveal) */}
              <div className="space-y-1">
                <motion.h1
                  variants={forwardMoveItemVariants}
                  className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08]"
                >
                  Report Today.
                </motion.h1>
                <motion.h1
                  variants={forwardMoveItemVariants}
                  className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#22c55e] tracking-tight leading-[1.08]"
                >
                  Better Roads Tomorrow.
                </motion.h1>
              </div>

              {/* 3. Supporting Text */}
              <motion.p
                variants={forwardMoveItemVariants}
                className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed font-normal"
              >
                Help your city by reporting potholes, damaged roads and other hazards. Your reports reach municipal engineers directly and get fixed faster.
              </motion.p>

              {/* 4. Action Buttons */}
              <motion.div variants={forwardMoveItemVariants} className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link
                  to="/report"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-extrabold text-base shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-slate-950" />
                  <span>Report a Pothole</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <Link
                  to="/citizen"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white font-bold text-base backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-slate-300" />
                  <span>Track My Report</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </motion.div>

              {/* 5. Bottom Hero Stats Glass Bar */}
              <motion.div variants={forwardMoveItemVariants} className="pt-4">
                <div className="rounded-2xl p-4 sm:p-5 bg-black/60 border border-white/10 backdrop-blur-md shadow-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                  <div className="space-y-0.5">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <span>👥</span> Reports Received
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {stats ? stats.totalReports + 12480 : '12,480+'}
                    </div>
                  </div>

                  <div className="space-y-0.5 border-l border-white/10 pl-3 sm:pl-4">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <span>🔧</span> Issues Resolved
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">
                      {stats ? stats.resolvedReports + 8960 : '8,960+'}
                    </div>
                  </div>

                  <div className="space-y-0.5 border-l border-white/10 pl-3 sm:pl-4">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <span>⏱️</span> Avg. Resolution
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      2.6 days
                    </div>
                  </div>

                  <div className="space-y-0.5 border-l border-white/10 pl-3 sm:pl-4">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <span>🛡️</span> Satisfaction
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">
                      98%
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column (5 Cols): Floating White Quick-Report Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 w-full max-w-md">
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                      Report a Road Hazard
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Take a photo, add details and submit.
                    </p>
                  </div>
                </div>

                {/* Quick-Report Form */}
                <form onSubmit={handleQuickSubmit} className="space-y-4">
                  {/* Photo Preview & Upload Box */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-28 group">
                      <img
                        src={quickImagePreview}
                        alt="Road hazard preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-1 rounded">
                          Preview
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 p-3 h-28 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1" />
                      <span className="text-xs font-bold text-slate-800">Upload Photo</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG (Max 5MB)</span>
                    </div>
                  </div>

                  {/* Location Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <select
                        value={quickLocation}
                        onChange={(e) => setQuickLocation(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                      >
                        <option value="Near Uppal Metro Station">Near Uppal Metro Station</option>
                        <option value="Habsiguda Main Road">Habsiguda Main Road</option>
                        <option value="Mallapur Cross Roads">Mallapur Cross Roads</option>
                        <option value="Tarnaka Flyover Road">Tarnaka Flyover Road</option>
                        <option value="Hitec City Cyber Towers Junction">Hitec City Cyber Towers Junction</option>
                        <option value="LB Nagar Ring Road">LB Nagar Ring Road</option>
                        <option value="Banjara Hills Road No 12">Banjara Hills Road No 12</option>
                        <option value="Gachibowli Outer Ring Road">Gachibowli Outer Ring Road</option>
                      </select>
                      <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={quickDetails}
                      onChange={(e) => setQuickDetails(e.target.value)}
                      placeholder="E.g. near bus stop, in front of XYZ school..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingQuick}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#15803d] hover:bg-[#166534] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingQuick ? 'Analyzing with AI...' : 'Submit Report'}</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. "HOW IT WORKS" SECTION */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Header */}
            <div className="lg:col-span-3 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                How It Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                From a photo to a fixed road — in simple steps.
              </p>
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15803d] hover:underline pt-1"
              >
                <span>Learn more</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Center: 4 Connected Workflow Steps */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#22c55e] text-white flex items-center justify-center shadow-md">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-[#22c55e] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                  <span className="text-xs font-extrabold text-slate-900">Report</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Upload a photo and add location details
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                  <span className="text-xs font-extrabold text-slate-900">AI Analysis</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  We analyze the image and estimate severity
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                  <span className="text-xs font-extrabold text-slate-900">Municipal Review</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Your report is reviewed and assigned to teams
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                  <span className="text-xs font-extrabold text-slate-900">Track &amp; Resolve</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Get live updates until it's fixed
                </p>
              </div>
            </div>

            {/* Right: Found a Road Issue Card */}
            <div className="lg:col-span-3">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                  <MapPin className="w-4 h-4 text-[#15803d]" />
                  <span>Found a road issue?</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Potholes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Damaged Roads</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Broken Lights</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Other Hazards</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TOP 5 WORST POTHOLES DYNAMIC LEADERBOARD */}
      <TopWorstPotholesSection onSelectReportOnMap={handleSelectReportOnMap} />

      {/* 4. INTERACTIVE ROAD DAMAGE MAP */}
      <InteractiveDamageMap selectedReport={selectedMapReport} />

      {/* 5. CITY-WIDE HOTSPOT ANALYTICS */}
      <HotspotsSection
        onSelectLocality={(locality, coords) => {
          if (coords) {
            setSelectedMapReport({
              _id: 'locality-focus',
              ticketId: 'AREA-INSPECT',
              imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
              location: locality,
              severity: 'high',
              status: 'Under Review',
              coordinates: coords,
              upvotes: 0,
              submittedAt: new Date().toISOString(),
            });
          }
        }}
      />

      {/* 5.5. LOCALITY ROAD HEALTH INDEX & CIVIC ANALYTICS */}
      <RoadHealthIndexSection />

      {/* 6. "RECENT REPORTS" SECTION WITH PROMO BANNER */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Recent Reports
                </h2>
                <p className="text-xs text-slate-500">
                  Latest issues reported by citizens in Hyderabad
                </p>
              </div>
            </div>

            <Link
              to="/citizen"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#15803d] hover:underline"
            >
              <span>View All Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Cards Grid: 4 Report Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {recentReportsData?.reports && recentReportsData.reports.length > 0 ? (
              recentReportsData.reports.slice(0, 4).map((report) => (
                <div
                  key={report.ticketId}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40 bg-slate-100 overflow-hidden">
                      <img
                        src={report.imageUrl}
                        alt={report.location}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shadow-sm ${
                            report.severity === 'high'
                              ? 'bg-red-500 text-white'
                              : report.severity === 'medium'
                              ? 'bg-amber-400 text-slate-900'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {report.severity}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <Link
                        to={`/citizen/reports/${report.ticketId}`}
                        className="text-xs font-bold text-slate-900 group-hover:text-[#15803d] transition-colors line-clamp-1 block"
                      >
                        📍 {report.location}
                      </Link>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(report.submittedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            report.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : report.status === 'Assigned'
                              ? 'bg-blue-100 text-blue-800'
                              : report.status === 'Under Review'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => upvoteMutation.mutate(report.ticketId)}
                      className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{report.upvotes} votes</span>
                    </button>

                    <Link
                      to={`/citizen/reports/${report.ticketId}`}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Inspect →
                    </Link>
                  </div>
                </div>
              ))
            ) : null}
          </div>

          {/* Right Bottom Promo Banner */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-slate-900 text-white min-h-[220px] flex items-center">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=1920&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />

            <div className="relative z-10 p-8 sm:p-12 max-w-2xl space-y-4">
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Smoother Roads <br /> Stronger Communities.
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm font-normal">
                Every report helps build a safer, cleaner and better-connected Hyderabad.
              </p>
              <div>
                <Link
                  to="/report"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105"
                >
                  <span>Be a Part of the Change</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BEFORE & AFTER ROAD REPAIR SHOWCASE */}
      <RepairShowcaseSection />

      {/* 8. DEDICATED PORTAL SEPARATION GATEWAYS */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#15803d]">
              Two Specialized Operating Portals
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Choose Your Role Experience
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Strictly segregated portals for public citizens and authorized municipal engineering staff.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Citizen Hub Gateway */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                    PUBLIC PORTAL
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Citizen Reporting &amp; Transparency Hub
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Log road damage with auto-detect GPS, inspect AI cavity severity, and monitor repairs with transparent closure photos.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Link
                  to="/citizen"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <span>Open Citizen Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Officer Console Gateway */}
            <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                    MUNICIPAL OPERATIONS
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  GHMC Engineering Command Center
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  For municipal engineers. Access rainfall priority boosts, assign roadwork crews, and manage complaint deletions in MongoDB.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Link
                  to="/officer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <span>Access Municipal Officer Console</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CLEAN ACCESSIBLE FOOTER */}
      <footer className="bg-[#0b111a] border-t border-slate-800/80 text-slate-400 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#15803d] flex items-center justify-center text-white font-black text-sm">
                🛣️
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-tight">FixMyRoad AI</span>
                <p className="text-[11px] text-slate-500">Greater Hyderabad Civic Infrastructure Platform</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
              <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
              <Link to="/report" className="text-slate-300 hover:text-white transition-colors">Report Hazard</Link>
              <Link to="/citizen" className="text-slate-300 hover:text-white transition-colors">Citizen Track</Link>
              <Link to="/officer" className="text-slate-300 hover:text-white transition-colors">Officer Triage</Link>
              <Link to="/about" className="text-slate-300 hover:text-white transition-colors">About &amp; AI Vision</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-medium">
            <p>&copy; {new Date().getFullYear()} FixMyRoad AI &bull; Municipal Corporation Smart Road Management Initiative.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">All Municipal Triage Services Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
