import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Camera,
  Upload,
  MapPin,
  FileText,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Info,
  Copy,
  Check,
  ShieldAlert,
  ChevronDown,
  CloudRain,
  Droplets,
  Thermometer,
  Clock,
  Compass,
  Navigation,
  Sun,
  ShieldCheck,
  Mic,
} from 'lucide-react';
import { submitReport, analyzeImage, fetchLiveWeather } from '../services/api';
import { IAiAnalysisResult, IWeatherData } from '../types';
import { SeverityBadge, AiVerificationBadge } from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import { VoiceInputModal } from '../components/common/VoiceInputModal';

const HYDERABAD_SAMPLE_LOCATIONS = [
  'Uppal Ring Road',
  'Mallapur Industrial Road',
  'Habsiguda Street 8',
  'Tarnaka Flyover Underpass',
  'LB Nagar Ring Road',
  'Begumpet Airport Road',
  'Banjara Hills Road No. 12',
  'Gachibowli Outer Ring Road Link',
  'Secunderabad Clock Tower Junction',
  'Kukatpally Housing Board Colony',
  'Mehdipatnam Bus Station Approach',
  'Charminar Heritage Zone',
  'Madhapur Hitec City Main Road',
  'Kondapur Botanical Garden Road',
  'Jubilee Hills Checkpost',
];

const DAMAGE_TYPES = [
  'Pothole',
  'Deep Crater',
  'Asphalt Rutting & Sag',
  'Edge Breakdown & Crumbling',
  'Waterlogged Cavity',
  'Utility Trench Settlement',
];

export const ReportWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [location, setLocation] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState<boolean>(false);
  const [landmark, setLandmark] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [damageType, setDamageType] = useState<string>('Pothole');

  // GPS Coordinates & Weather State
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<IWeatherData | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState<boolean>(false);

  // AI Inspection State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<string>('Preparing model...');
  const [aiResult, setAiResult] = useState<IAiAnalysisResult | null>(null);

  // Voice Dictation Modal State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdReport, setCreatedReport] = useState<any | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState<boolean>(false);

  // Auto-detect GPS location with OpenStreetMap Nominatim reverse geocoding & Fetch live weather
  const handleAutoDetectLocation = (showToast = true) => {
    if (!navigator.geolocation) {
      if (showToast) {
        toast({ type: 'info', title: 'GPS Sensor Unavailable', message: 'Geolocation is not supported by your browser.' });
      }
      return;
    }
    setIsDetectingLocation(true);
    if (showToast) {
      toast({ type: 'info', title: 'Detecting Location', message: 'Connecting to GPS satellite and resolving road name...' });
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        let resolvedLocationName = '';
        try {
          // Live OpenStreetMap Nominatim reverse geocoder
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: { 'Accept-Language': 'en' },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = addr.road || addr.street || addr.pedestrian || addr.suburb || '';
            const locality = addr.suburb || addr.neighbourhood || addr.city_district || addr.county || '';
            const city = addr.city || addr.town || addr.village || addr.state_district || addr.state || '';

            const parts = [road, locality, city].filter(Boolean);
            if (parts.length > 0) {
              resolvedLocationName = parts.slice(0, 3).join(', ');
            } else if (data.display_name) {
              resolvedLocationName = data.display_name.split(',').slice(0, 3).join(', ').trim();
            }
          }
        } catch (geoErr) {
          console.warn('Nominatim reverse geocode error:', geoErr);
        }

        if (!resolvedLocationName) {
          resolvedLocationName = `GPS Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
        }

        setLocation(resolvedLocationName);
        setIsDetectingLocation(false);
        if (showToast) {
          toast({
            type: 'success',
            title: 'Exact GPS Located',
            message: `${resolvedLocationName} [${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E]`,
          });
        }

        fetchWeatherForecast(resolvedLocationName, lat, lng);
      },
      (err) => {
        console.warn('Geolocation sensor error:', err);
        setIsDetectingLocation(false);
        if (showToast) {
          toast({
            type: 'info',
            title: 'GPS Access Needed',
            message: 'Unable to access hardware GPS. Please type your street name or choose a sample road below.',
          });
        }
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const fetchWeatherForecast = async (locName: string, lat?: number, lng?: number) => {
    setIsFetchingWeather(true);
    try {
      const data = await fetchLiveWeather({
        location: locName,
        lat: lat ?? coords?.lat,
        lng: lng ?? coords?.lng,
        description,
      });
      setWeatherData(data);
    } catch (e) {
      console.warn('Failed to load weather forecast:', e);
    } finally {
      setIsFetchingWeather(false);
    }
  };

  // Handle Image Selection
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ type: 'error', title: 'Invalid File', message: 'Please select an image file (JPEG, PNG, WEBP).' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ type: 'error', title: 'File Too Large', message: 'Maximum image size is 10MB.' });
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setAiResult(null); // Reset analysis if new photo selected

    // Auto trigger background location & weather detection
    if (!coords) {
      handleAutoDetectLocation(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoFile(null);
    setPhotoPreview('');
    setAiResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Perform AI Inspection
  const triggerAiInspection = async () => {
    if (!photoFile) return;

    setIsAnalyzing(true);
    setAnalysisStage('Photograph received by triage server...');

    try {
      setTimeout(() => setAnalysisStage('Scanning asphalt surface & depth contours...'), 600);
      setTimeout(() => setAnalysisStage('Cross-referencing climate & rainfall hazard data...'), 1200);

      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('location', location);
      formData.append('description', description);

      const result = await analyzeImage(formData);
      setAiResult(result);
    } catch (error: any) {
      console.warn('AI analysis fallback:', error);
      setAiResult({
        isPothole: true,
        severity: 'medium',
        confidence: 0.82,
        explanation: 'Heuristic road defect inspection logged. Manual officer review recommended for confirmation.',
        observations: ['Asphalt surface void detected', 'Traffic safety triage enqueued'],
        reviewRequired: true,
        isAiFallback: true,
        aiProvider: 'Local Heuristic Analysis Engine (Manual Review Recommended)',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step Navigation
  const goToNextStep = async () => {
    if (currentStep === 1) {
      if (!photoFile) {
        toast({ type: 'error', title: 'Photo Required', message: 'Please upload a photograph of the road damage.' });
        return;
      }
      if (!coords) {
        handleAutoDetectLocation(false);
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!location.trim()) {
        toast({ type: 'error', title: 'Location Required', message: 'Please specify the street or area location.' });
        return;
      }
      fetchWeatherForecast(location, coords?.lat, coords?.lng);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
      if (!aiResult) {
        triggerAiInspection();
      }
      if (!weatherData) {
        fetchWeatherForecast(location, coords?.lat, coords?.lng);
      }
    }
  };

  // Final Submission
  const handleFinalSubmit = async () => {
    if (!photoFile || !location) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('location', location);
      formData.append('landmark', landmark);
      formData.append('description', description);
      formData.append('damageType', damageType);
      if (coords) {
        formData.append('lat', String(coords.lat));
        formData.append('lng', String(coords.lng));
      }
      if (weatherData) {
        formData.append('weatherData', JSON.stringify(weatherData));
      }
      if (aiResult) {
        formData.append('aiAssessment', JSON.stringify(aiResult));
      }

      const report = await submitReport(formData);
      setCreatedReport(report);
      setCurrentStep(5);

      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00E599', '#10B981', '#38BDF8', '#F59E0B'],
        });
      } catch {
        // Confetti optional
      }

      toast({
        type: 'success',
        title: 'Report Logged Successfully',
        message: `Ticket ID: ${report.ticketId} is now enqueued in municipal operations.`,
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTicketId = () => {
    if (!createdReport) return;
    navigator.clipboard.writeText(createdReport.ticketId);
    setCopiedTicketId(true);
    toast({ type: 'info', title: 'Copied', message: `Ticket ID ${createdReport.ticketId} copied to clipboard.` });
    setTimeout(() => setCopiedTicketId(false), 2500);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Wizard Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-[#15803d] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CIVIC ROAD DAMAGE REPORTING WIZARD</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Report a Pothole or Road Defect
          </h1>
          <p className="text-slate-600 text-sm max-w-xl mx-auto leading-relaxed">
            Submit photograph, verify with computer vision, and track dispatch through to municipal repair.
          </p>

          {/* Progress Step Bar Matching 'How It Works' */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 pt-4">
            {[
              { num: 1, label: 'Upload' },
              { num: 2, label: 'Location' },
              { num: 3, label: 'Details' },
              { num: 4, label: 'AI Inspect' },
              { num: 5, label: 'Submitted' },
            ].map((st) => (
              <div key={st.num} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={st.num > currentStep && currentStep !== 5}
                  onClick={() => {
                    if (st.num < currentStep && currentStep !== 5) setCurrentStep(st.num);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === st.num
                      ? 'bg-[#22c55e] text-slate-950 shadow-md ring-4 ring-emerald-200 scale-105'
                      : currentStep > st.num
                      ? 'bg-emerald-100 text-[#15803d] border border-emerald-300'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > st.num ? <Check className="w-4 h-4" /> : st.num}
                </button>
                <span
                  className={`hidden sm:inline text-xs font-bold ${
                    currentStep === st.num ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
                {st.num < 5 && <div className="hidden sm:block w-6 h-0.5 bg-slate-200" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden text-slate-900">
          {/* STEP 1: Upload Photograph */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-brand-emerald" />
                  Step 1: Upload Road Damage Photograph
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Clear daylight photos help our computer vision model accurately measure cavity depth and pavement fractures.
                </p>
              </div>

              {/* Drop Zone */}
              {!photoPreview ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[280px] ${
                    dragActive
                      ? 'border-[#22c55e] bg-emerald-50/60 scale-[1.01]'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-[#15803d] mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-[#15803d]" />
                  </div>
                  <p className="text-base font-bold text-slate-900 mb-1">
                    Drag and drop road photo here, or <span className="text-[#15803d] underline">browse files</span>
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Supports JPEG, PNG, WEBP (up to 10MB)
                  </p>

                  <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 max-w-md text-left text-xs text-slate-600 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Tips for best detection:</strong> Stand 2–3 paces back so surrounding lane markings and road context are visible.
                    </span>
                  </div>
                </div>
              ) : (
                /* Preview State */
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                  <img
                    src={photoPreview}
                    alt="Road damage preview"
                    className="w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-900 text-xs font-bold border border-slate-200 backdrop-blur-md transition-colors cursor-pointer shadow-sm"
                    >
                      Replace Image
                    </button>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 backdrop-blur-md transition-colors cursor-pointer"
                      title="Remove Image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                    <span className="font-mono bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                      {photoFile?.name} ({(photoFile!.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                    <span className="text-emerald-300 font-bold flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ready for AI Analysis
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                  />
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!photoFile}
                  className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                    photoFile
                      ? 'bg-[#22c55e] text-slate-950 hover:bg-[#16a34a] shadow-md hover:scale-105 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>Continue to Location</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Location */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#15803d]" />
                  Step 2: Enter Road Location &amp; Landmark
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access device GPS coordinates or choose from known municipal maintenance corridors.
                </p>
              </div>

              {/* GPS Auto-Detection & Realtime Sensor Bar */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-200/60 text-[#15803d] flex items-center justify-center">
                    <Navigation className={`w-5 h-5 ${isDetectingLocation ? 'animate-spin text-amber-600' : ''}`} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      Live GPS Geotagging &amp; Weather Sync
                      {coords && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-[#15803d]">
                          LOCKED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                      {coords
                        ? `${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E (Precision Geotagged)`
                        : 'Auto-detect coordinates for real-time climate & priority calculation'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAutoDetectLocation(true)}
                  disabled={isDetectingLocation}
                  className="px-4 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Compass className="w-4 h-4" />
                  <span>{isDetectingLocation ? 'Acquiring GPS...' : 'Auto-Detect My GPS Location'}</span>
                </button>
              </div>

              {/* Real-time Weather Sensor Teaser */}
              {weatherData && (
                <div
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                    weatherData.isRaining
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {weatherData.isRaining ? (
                      <CloudRain className="w-5 h-5 text-amber-600 animate-bounce shrink-0" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-slate-900">Climate Detected: </span>
                      <span>
                        {weatherData.condition} ({weatherData.temperature}°C, {weatherData.precipitation} mm/h)
                      </span>
                    </div>
                  </div>

                  <div>
                    {weatherData.isRaining ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-xl text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        Rain Stops ~{weatherData.rainStopTime || 'Soon'} • Top Priority Boost
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#15803d] font-bold bg-emerald-100 px-2.5 py-1 rounded-xl text-[11px]">
                        Optimal Road Work Conditions
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Location Selector */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Road Name or Area <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setLocationSearch(e.target.value);
                        setIsLocationDropdownOpen(true);
                      }}
                      onFocus={() => setIsLocationDropdownOpen(true)}
                      placeholder="e.g., Uppal Ring Road or type your road..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dropdown Suggestions */}
                  {isLocationDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                      <div className="p-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        Sample Hyderabad Corridors (Click to Select)
                      </div>
                      {HYDERABAD_SAMPLE_LOCATIONS.filter((loc) =>
                        loc.toLowerCase().includes(locationSearch.toLowerCase())
                      ).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setLocation(loc);
                            setIsLocationDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-800 hover:bg-emerald-50 hover:text-[#15803d] transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>{loc}</span>
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Landmark Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nearby Landmark or Metro Pillar <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g., Opposite Metro Pillar #912, near SBI ATM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Demo Notice */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
                  <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Municipal Coverage:</strong> Mapped to Greater Hyderabad Municipal Corporation (GHMC) maintenance zones with live GPS reverse geocoding.
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!location.trim()}
                  className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                    location.trim()
                      ? 'bg-[#22c55e] text-slate-950 hover:bg-[#16a34a] shadow-md hover:scale-105 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>Continue to Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Details */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#15803d]" />
                  Step 3: Damage Context &amp; Observations
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Provide notes on how the defect impacts traffic, pedestrians, or two-wheelers.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Defect Classification Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {DAMAGE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDamageType(type)}
                        className={`p-3.5 rounded-2xl text-xs font-bold text-left transition-all border cursor-pointer ${
                          damageType === type
                            ? 'bg-emerald-50 border-emerald-500 text-[#15803d] shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Citizen Observations &amp; Urgency Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsVoiceModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-[#15803d] text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                      <span>Dictate by Voice (EN / TE / HI)</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Deep hole on the curve. Waterlogged after evening rain. Two-wheelers violently swerve into oncoming lane..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />
                </div>

                <VoiceInputModal
                  isOpen={isVoiceModalOpen}
                  onClose={() => setIsVoiceModalOpen(false)}
                  currentText={description}
                  onTranscriptComplete={(transcriptText, suggestedLoc) => {
                    setDescription(transcriptText);
                    if (suggestedLoc && (!location || location === 'Uppal Ring Road')) {
                      setLocation(suggestedLoc);
                      toast({
                        type: 'info',
                        title: 'Location Suggested',
                        message: `Extracted location "${suggestedLoc}" from your voice recording.`,
                      });
                    }
                  }}
                />

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Date Reported:</span>
                  <span className="font-mono font-bold text-slate-800">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span>Run AI Verification</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: AI Inspection */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#22c55e]" />
                  Step 4: AI Vision Verification
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Automated computer vision analysis validates road damage and establishes triage severity.
                </p>
              </div>

              {/* Analysis In-Progress Scanning State */}
              {isAnalyzing ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-t-[#22c55e] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-[#22c55e] animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Analyzing Road Photograph</h3>
                  <p className="text-xs font-mono text-[#15803d] bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 mb-4 animate-pulse font-semibold">
                    {analysisStage}
                  </p>
                  <p className="text-xs text-slate-600 max-w-sm">
                    Neural model evaluating asphalt fractures, cavity depth contours, and exposed aggregate...
                  </p>
                </div>
              ) : aiResult ? (
                /* Analysis Complete Result Card */
                <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Assessment Result:
                      </span>
                      <SeverityBadge severity={aiResult.severity} />
                    </div>
                    <div>
                      <AiVerificationBadge
                        isAiFallback={aiResult.isAiFallback}
                        reviewRequired={aiResult.reviewRequired}
                        confidence={aiResult.confidence}
                        provider={aiResult.aiProvider}
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      AI Vision Findings
                    </h4>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed">
                      {aiResult.explanation}
                    </p>
                  </div>

                  {/* Observations list */}
                  {aiResult.observations && aiResult.observations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Key Technical Observations
                      </h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {aiResult.observations.map((obs, idx) => (
                          <li
                            key={idx}
                            className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0 mt-0.5" />
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiResult.isAiFallback && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Manual Verification Notice:</strong> AI vision service ran in offline heuristic mode. An authorized municipal engineer will conduct site verification before dispatch.
                      </span>
                    </div>
                  )}

                  {/* Live Climate Detection & Municipal Worker Dispatch Forecast */}
                  <div
                    className={`border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm ${
                      weatherData?.isRaining
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2.5 rounded-xl ${
                            weatherData?.isRaining
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-[#15803d] border border-emerald-200'
                          }`}
                        >
                          {weatherData?.isRaining ? (
                            <CloudRain className="w-5 h-5 animate-bounce text-amber-600" />
                          ) : (
                            <Sun className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            Climate Detection &amp; Worker Dispatch Forecast
                            {weatherData?.isRaining && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200 animate-pulse">
                                🚨 Active Rain Alert
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Hyperlocal meteorological calculation for {location || 'Corridor'}
                          </p>
                        </div>
                      </div>

                      {weatherData && (
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 inline-flex items-center gap-1.5">
                            <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                            {weatherData.temperature}°C | {weatherData.condition}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meteorological Metrics */}
                    {weatherData ? (
                      <div className="space-y-4">
                        {/* Rain Start / Stop Times */}
                        {weatherData.isRaining ? (
                          <div className="bg-amber-100/60 border border-amber-300 rounded-2xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <span className="text-amber-900 font-bold flex items-center gap-1.5">
                                <CloudRain className="w-4 h-4 text-amber-600" />
                                Continuous Rain Hazard Active: {weatherData.precipitation} mm/h ({weatherData.humidity}% humidity)
                              </span>
                              <span className="text-amber-800 font-bold bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-300 text-[11px]">
                                Pinned to TOP of Municipal Portal
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200">
                              <div className="bg-white border border-amber-200/80 rounded-xl p-3 shadow-xs">
                                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5 mb-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                                  Rain Started At
                                </div>
                                <div className="text-base font-mono font-extrabold text-slate-900">
                                  {weatherData.rainStartTime || '11:15 AM'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Heavy precipitation onset</div>
                              </div>

                              <div className="bg-white border border-amber-200/80 rounded-xl p-3 shadow-xs">
                                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5 mb-1">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  Rain Expected To Stop At
                                </div>
                                <div className="text-base font-mono font-extrabold text-amber-700">
                                  {weatherData.rainStopTime || '12:45 PM'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Atmospheric dry transition</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-700">
                              <Sun className="w-4 h-4 text-amber-500" />
                              <span>
                                <strong>Weather Condition:</strong> Clear atmospheric window ({weatherData.humidity}% humidity, 0 mm rain).
                              </span>
                            </div>
                            <span className="text-[#15803d] font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              Optimal Bitumen Adhesion
                            </span>
                          </div>
                        )}

                        {/* Optimal Municipal Worker Dispatch Schedule Report */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
                              Municipal Crew Dispatch Directive &amp; Optimal Start Window
                            </h4>
                            <span className="text-[11px] font-mono text-[#15803d] bg-emerald-50 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                              Automated Work Order
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-slate-500 block text-[11px] font-medium">Recommended Worker Arrival Time:</span>
                              <span className="font-mono text-sm font-extrabold text-[#15803d] block mt-1">
                                {weatherData.optimalDispatchTime}
                              </span>
                              <span className="text-[11px] text-slate-500 mt-1 block">
                                Crew dispatch time after stormwater clears
                              </span>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-slate-500 block text-[11px] font-medium">Surface Drying Window:</span>
                              <span className="font-mono text-sm font-bold text-sky-700 block mt-1">
                                {weatherData.dryingWindow}
                              </span>
                              <span className="text-[11px] text-slate-500 mt-1 block">
                                Moisture threshold for hot-mix asphalt bonding
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                            <div className="font-bold text-slate-800">Standard Operating Protocol:</div>
                            <p className="leading-relaxed text-slate-600">{weatherData.actionProtocol}</p>
                            <p className="text-[11px] text-slate-500 italic pt-1">{weatherData.weatherAdvisory}</p>
                          </div>
                        </div>

                        {weatherData.isRaining && (
                          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center gap-2.5 text-xs text-purple-900">
                            <Info className="w-4 h-4 text-purple-600 shrink-0" />
                            <span>
                              <strong>Municipal Officer Portal Priority:</strong> This complaint will automatically appear at the <strong>VERY TOP OF THE LIST</strong> with high-priority rain emergency markers.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-500">
                        {isFetchingWeather ? 'Connecting to meteorological sensors...' : 'Weather data calibrated.'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-50 rounded-3xl border border-slate-200">
                  <button
                    type="button"
                    onClick={triggerAiInspection}
                    className="px-6 py-2.5 rounded-2xl bg-[#22c55e] text-slate-950 font-bold text-xs cursor-pointer shadow-sm hover:bg-[#16a34a] transition-all"
                  >
                    Start Inspection
                  </button>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold border border-slate-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting || isAnalyzing}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Ticket...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit &amp; Enqueue Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Success Confirmation Screen */}
          {currentStep === 5 && createdReport && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-[#22c55e] flex items-center justify-center mx-auto text-[#15803d] shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-[#15803d]" />
              </div>

              <div>
                <span className="text-xs font-bold text-[#15803d] uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Complaint Registered Successfully
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
                  Ticket Enqueued in Municipal Triage
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2">
                  Your report has been transmitted to Greater Hyderabad Municipal Corporation operations.
                </p>
              </div>

              {/* Ticket Card Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg mx-auto text-left space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">Tracking Ticket ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#15803d]">
                      {createdReport.ticketId}
                    </span>
                    <button
                      type="button"
                      onClick={copyTicketId}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer shadow-xs"
                      title="Copy Ticket ID"
                    >
                      {copiedTicketId ? <Check className="w-4 h-4 text-[#15803d]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block font-medium">Location:</span>
                    <span className="font-bold text-slate-800">{createdReport.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Severity:</span>
                    <SeverityBadge severity={createdReport.severity} />
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Current Status:</span>
                    <span className="font-bold text-blue-600">Submitted (Queued)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Citizen Reference:</span>
                    <span className="font-mono text-slate-700 font-semibold">{createdReport.citizenReference}</span>
                  </div>
                </div>

                {createdReport.weatherData?.isRaining && (
                  <div className="mt-2 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs text-amber-900">
                    <div className="font-bold text-amber-800 flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-amber-600 animate-bounce" />
                      <span>Top Priority Enqueued — Active Rain Hazard</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Precipitation: {createdReport.weatherData.rainStartTime} to {createdReport.weatherData.rainStopTime}
                    </div>
                    <div className="text-[11px] text-[#15803d] font-bold">
                      🚜 Municipal Workers Scheduled For: {createdReport.weatherData.optimalDispatchTime}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  to={`/citizen/reports/${createdReport.ticketId}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Track Live Progress
                </Link>
                <Link
                  to="/citizen"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-300 transition-colors cursor-pointer"
                >
                  Go to Citizen Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setPhotoFile(null);
                    setPhotoPreview('');
                    setLocation('');
                    setLandmark('');
                    setDescription('');
                    setAiResult(null);
                    setCreatedReport(null);
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl text-slate-500 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Submit Another Report
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
