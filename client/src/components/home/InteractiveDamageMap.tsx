import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Filter,
  Layers,
  Search,
  Maximize2,
  ExternalLink,
  ThumbsUp,
  Clock,
  Sparkles,
  CloudRain,
  ListFilter,
  CheckCircle2,
} from 'lucide-react';
import { fetchMapReports } from '../../services/api';
import { SeverityBadge, StatusBadge } from '../common/Badge';
import { IMapReport } from '../../types';

// Custom SVG map marker generator
const createSeverityIcon = (severity: 'high' | 'medium' | 'low', isSelected: boolean) => {
  const color = severity === 'high' ? '#EF4444' : severity === 'medium' ? '#F59E0B' : '#10B981';
  const size = isSelected ? 38 : 30;
  const pulseHtml = isSelected
    ? `<div style="position:absolute; width:${size + 14}px; height:${size + 14}px; top:-7px; left:-7px; border-radius:50%; background:${color}33; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
    : '';

  return L.divIcon({
    className: 'custom-road-marker',
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center;">
        ${pulseHtml}
        <div style="width:${size}px; height:${size}px; border-radius:50%; background:${color}; border:3px solid #ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:12px; font-weight:bold;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map Recenter Helper Component
const MapController: React.FC<{
  center?: [number, number];
  zoom?: number;
  reports: IMapReport[];
  shouldFitBounds?: boolean;
  onBoundsFitted?: () => void;
}> = ({ center, zoom, reports, shouldFitBounds, onBoundsFitted }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    if (shouldFitBounds && reports.length > 0) {
      const bounds = L.latLngBounds(
        reports.map((r) => [r.coordinates.lat, r.coordinates.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      onBoundsFitted?.();
    }
  }, [shouldFitBounds, reports, map, onBoundsFitted]);

  return null;
};

interface InteractiveDamageMapProps {
  selectedReport?: IMapReport | null;
  onMarkerSelect?: (report: IMapReport) => void;
}

export const InteractiveDamageMap: React.FC<InteractiveDamageMapProps> = ({
  selectedReport: externalSelectedReport,
  onMarkerSelect,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localityFilter, setLocalityFilter] = useState<string>('all');
  const [activeReport, setActiveReport] = useState<IMapReport | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'split'>('split');
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<boolean>(true);

  // Default coordinates centered on Hyderabad
  const defaultCenter: [number, number] = [17.4065, 78.5000];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['map-reports', severityFilter, statusFilter, localityFilter],
    queryFn: () =>
      fetchMapReports({
        severity: severityFilter,
        status: statusFilter,
        locality: localityFilter,
      }),
  });

  const mapReports = data?.data || [];

  // Respond to external selection from leaderboard or hotspots
  useEffect(() => {
    if (externalSelectedReport && externalSelectedReport.coordinates) {
      setActiveReport(externalSelectedReport);
    }
  }, [externalSelectedReport]);

  const handleMarkerClick = (report: IMapReport) => {
    setActiveReport(report);
    onMarkerSelect?.(report);
  };

  const handleFitAll = () => {
    setFitBoundsTrigger(true);
  };

  return (
    <section id="damage-map" className="py-20 bg-white border-b border-slate-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#15803d] text-xs font-bold uppercase tracking-wider mb-3">
              <MapPin className="w-4 h-4 text-[#22c55e]" />
              <span>Realtime Geographic Intelligence</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Interactive Road Damage Map
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl font-medium">
              Explore reported road hazards across your city. Click any marker to view photo evidence, AI depth estimates, and live municipal work orders.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#22c55e] cursor-pointer shadow-xs"
            >
              <option value="all">All Severities</option>
              <option value="high">🔴 High Hazard</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#22c55e] cursor-pointer shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted (Queued)</option>
              <option value="Under Review">Under Review</option>
              <option value="Assigned">Crew Dispatched</option>
              <option value="Resolved">Resolved</option>
            </select>

            <button
              type="button"
              onClick={handleFitAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-all cursor-pointer shadow-xs"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#15803d]" />
              <span>Fit All Markers</span>
            </button>
          </div>
        </div>

        {/* Map & Split List Container */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          {/* Left / Main Map Area (8 or 12 Cols) */}
          <div className="lg:col-span-8 relative h-[450px] lg:h-full min-h-[450px] z-0">
            {isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 space-y-3">
                <div className="w-10 h-10 border-4 border-slate-300 border-t-[#22c55e] rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-600">Loading Geospatial Road Markers...</span>
              </div>
            ) : isError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <p className="text-xs text-rose-600 font-semibold mb-2">Map coordinates unavailable.</p>
                <button
                  onClick={handleFitAll}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold"
                >
                  Reload Map
                </button>
              </div>
            ) : (
              <MapContainer
                center={
                  activeReport?.coordinates
                    ? [activeReport.coordinates.lat, activeReport.coordinates.lng]
                    : defaultCenter
                }
                zoom={12}
                scrollWheelZoom={false}
                style={{ width: '100%', height: '100%', minHeight: '450px' }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController
                  center={
                    activeReport?.coordinates
                      ? [activeReport.coordinates.lat, activeReport.coordinates.lng]
                      : undefined
                  }
                  zoom={15}
                  reports={mapReports}
                  shouldFitBounds={fitBoundsTrigger}
                  onBoundsFitted={() => setFitBoundsTrigger(false)}
                />

                {mapReports.map((report) => {
                  const isSelected = activeReport?.ticketId === report.ticketId;
                  return (
                    <Marker
                      key={report.ticketId}
                      position={[report.coordinates.lat, report.coordinates.lng]}
                      icon={createSeverityIcon(report.severity, isSelected)}
                      eventHandlers={{
                        click: () => handleMarkerClick(report),
                      }}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="p-1 space-y-2.5 max-w-[240px]">
                          <img
                            src={report.imageUrl}
                            alt={report.location}
                            className="w-full h-24 object-cover rounded-xl border border-slate-200"
                          />
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {report.ticketId}
                              </span>
                              <SeverityBadge
                                severity={report.severity}
                                numericalScore={report.numericalSeverityScore}
                                category={report.severityCategory}
                              />
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                              {report.location}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{report.landmark}</p>
                          </div>
                          <Link
                            to={`/citizen/reports/${report.ticketId}`}
                            className="block text-center py-1.5 px-3 rounded-xl bg-[#22c55e] text-slate-950 font-bold text-[11px] hover:bg-[#16a34a] transition-colors"
                          >
                            View Full Report &rarr;
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-md text-xs space-y-1.5 pointer-events-auto">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block">
                SEVERITY TIERS
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-xs" />
                  <span className="font-medium text-slate-700 text-[11px]">High Hazard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-xs" />
                  <span className="font-medium text-slate-700 text-[11px]">Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs" />
                  <span className="font-medium text-slate-700 text-[11px]">Low</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Active / Adjacent Report Inspector List (4 Cols) */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-[#15803d]" />
                  <span>Verified Pin Index ({mapReports.length})</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">Live GPS</span>
              </div>

              {/* Scrollable Report Thumbnails */}
              <div className="mt-3 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {mapReports.map((report) => {
                  const isSelected = activeReport?.ticketId === report.ticketId;
                  return (
                    <div
                      key={report.ticketId}
                      onClick={() => handleMarkerClick(report)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <img
                        src={report.imageUrl}
                        alt={report.location}
                        className="w-14 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-[11px] text-slate-900">
                            {report.ticketId}
                          </span>
                          <SeverityBadge
                            severity={report.severity}
                            numericalScore={report.numericalSeverityScore}
                            category={report.severityCategory}
                          />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 truncate mt-0.5">
                          {report.location}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-medium block truncate">
                          👍 {report.upvotes} votes &bull; {report.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Report Quick Inspector Footer */}
            {activeReport ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-[#15803d] uppercase tracking-wider">
                    Focused Map Location
                  </span>
                  <Link
                    to={`/citizen/reports/${activeReport.ticketId}`}
                    className="text-xs font-bold text-[#15803d] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">{activeReport.location}</p>
                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                  <span>GPS: {activeReport.coordinates.lat.toFixed(4)}, {activeReport.coordinates.lng.toFixed(4)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-2 italic font-medium">
                Click any marker pin on the map to inspect full report details.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
