import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import {
  Camera,
  Search,
  MapPin,
  ChevronDown,
  User,
  Shield,
  X,
  Menu,
  ExternalLink,
  BookOpen,
  PhoneCall,
  CheckCircle,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { role, setRole } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const [resourcesOpen, setResourcesOpen] = useState(false);

  // Auto-hiding navigation states
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isHoveredTop, setIsHoveredTop] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<number | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const isOfficerPortal = location.pathname.startsWith('/officer');

  // Scroll listener for auto-hide / reveal
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const delta = currentScrollY - lastScrollY.current;

          // Always visible at the top of the page
          if (currentScrollY <= 20) {
            setIsNavbarVisible(true);
          } else if (isHoveredTop || mobileMenuOpen || searchOpen || locationDropdownOpen || resourcesOpen) {
            setIsNavbarVisible(true);
          } else if (delta > 8) {
            // Scrolling down - hide navbar
            setIsNavbarVisible(false);
          } else if (delta < -12) {
            // Scrolling up meaningfully - reveal navbar
            setIsNavbarVisible(true);
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isHoveredTop, mobileMenuOpen, searchOpen, locationDropdownOpen, resourcesOpen]);

  // Handle global mousemove to detect top 40px cursor zone
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 40) {
        setIsHoveredTop(true);
        setIsNavbarVisible(true);
      } else if (e.clientY > 90 && window.scrollY > 20 && !mobileMenuOpen && !searchOpen && !locationDropdownOpen && !resourcesOpen) {
        setIsHoveredTop(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mobileMenuOpen, searchOpen, locationDropdownOpen, resourcesOpen]);

  // Keep navbar visible when modals or dropdowns are open
  useEffect(() => {
    if (mobileMenuOpen || searchOpen || locationDropdownOpen || resourcesOpen) {
      setIsNavbarVisible(true);
    }
  }, [mobileMenuOpen, searchOpen, locationDropdownOpen, resourcesOpen]);

  const cityOptions = [
    'Hyderabad',
    'Secunderabad',
    'Uppal Zone',
    'Hitec City & Cyberabad',
    'Banjara Hills',
    'Gachibowli Corridor',
    'Tarnaka & Nacharam',
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    navigate(`/citizen?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <>
      {/* Top 40px Hover Zone Detector */}
      <div
        className="fixed top-0 left-0 right-0 h-10 z-40 pointer-events-auto"
        onMouseEnter={() => {
          setIsHoveredTop(true);
          setIsNavbarVisible(true);
        }}
        aria-hidden="true"
      />

      <header
        onMouseEnter={() => setIsHoveredTop(true)}
        onMouseLeave={() => {
          if (window.scrollY > 20 && !mobileMenuOpen && !searchOpen && !locationDropdownOpen && !resourcesOpen) {
            setIsHoveredTop(false);
          }
        }}
        className={`fixed top-0 left-0 right-0 z-50 w-full bg-[#0d141e] border-b border-slate-800 shadow-2xl text-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isNavbarVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Area (Left) */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              {/* Green triangular road badge icon matching reference */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#22c55e] to-[#15803d] flex items-center justify-center shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition-transform p-1.5">
                <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
                  <path
                    d="M16 3L4 28H28L16 3Z"
                    fill="#15803d"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 11V15M16 19V24"
                    stroke="#fde047"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 leading-none">
                  FixMyRoad
                </span>
                <span className="text-[11px] text-emerald-400 font-medium tracking-wide mt-1">
                  Safer Roads. Stronger Communities.
                </span>
              </div>
            </Link>

            {/* Center Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors relative py-1.5 ${
                    isActive ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>Home</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>

              <NavLink
                to="/report"
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors relative py-1.5 ${
                    isActive ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>Report Hazard</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>

              <NavLink
                to="/citizen"
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors relative py-1.5 ${
                    isActive ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>Track Reports</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>

              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors relative py-1.5 ${
                    isActive ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>About</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>

              <button
                type="button"
                onClick={() => setResourcesOpen(true)}
                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer py-1.5"
              >
                Resources
              </button>
            </nav>

            {/* Right Action Controls Matching Reference Image */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Search Icon Button */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Search complaints or streets"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* City Dropdown Selector: Hyderabad ⌵ */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedCity}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {locationDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0f172a] border border-white/15 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                      Select Municipal Zone
                    </div>
                    {cityOptions.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setSelectedCity(city);
                          setLocationDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                          selectedCity === city
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{city}</span>
                        {selectedCity === city && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Segmented Role Toggle: [ 👤 Citizen | 🛡️ Officer ] matching reference */}
              <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/15">
                <button
                  type="button"
                  onClick={() => {
                    setRole('citizen');
                    if (isOfficerPortal) navigate('/');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isOfficerPortal
                      ? 'bg-[#22c55e] text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Citizen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('officer');
                    if (!isOfficerPortal) navigate('/officer');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isOfficerPortal
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Officer</span>
                </button>
              </div>

              {/* [ 📷 Report Now ] Green Button Matching Reference Image */}
              <Link
                to="/report"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-xs tracking-tight shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                <span>Report Now</span>
              </Link>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center gap-2 sm:hidden">
              <Link
                to="/report"
                className="p-2 rounded-xl bg-[#22c55e] text-slate-950 font-bold text-xs"
              >
                <Camera className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#0d141e] px-4 pt-4 pb-6 space-y-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/10"
            >
              Home
            </Link>
            <Link
              to="/report"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/10"
            >
              Report Hazard
            </Link>
            <Link
              to="/citizen"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/10"
            >
              Track Reports
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/10"
            >
              About
            </Link>
            <Link
              to="/officer"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-purple-300 hover:bg-white/10"
            >
              Municipal Officer Console
            </Link>
          </div>
        )}
      </header>

      {/* Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-white/20 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" /> Search Road Reports &amp; Locations
              </span>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Ticket ID (e.g. FMR-2026-1042) or Road Name..."
                className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
              />

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  Tip: Search "Uppal", "Hitec City", or "Resolved"
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-xs"
                >
                  Search Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resources & Citizen Guidelines Modal */}
      {resourcesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl p-7 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Municipal Citizen Resources</h3>
                  <p className="text-xs text-slate-500">Official guidelines, SLAs &amp; helpline contacts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResourcesOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Pothole Severity Standards
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  <strong>High Severity:</strong> Cavities &gt; 4 inches deep on arterial corridors. Dispatched within 24 hours.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>Medium Severity:</strong> Edge breakdown and fractured bitumen (2–4 inches). Repaired within 48 hours.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  Emergency Municipal Helplines
                </h4>
                <p className="text-slate-600">GHMC Central Control: <strong>040-21111111</strong></p>
                <p className="text-slate-600">Traffic Police WhatsApp: <strong>+91 9010203626</strong></p>
                <p className="text-slate-600">Monsoon Disaster Cell: <strong>Toll-free 1070</strong></p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 space-y-1">
              <div className="font-bold">✨ AI Computer Vision Verification</div>
              <p className="text-emerald-800 leading-relaxed">
                Photos are analyzed using server-side Gemini 1.5 Flash Vision. For highest accuracy, capture photos during daylight at a 45-degree angle showing adjacent road markings.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setResourcesOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
