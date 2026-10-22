import {
  IReport,
  IDashboardStats,
  IActivityItem,
  IAiAnalysisResult,
  IWeatherData,
  ReportStatus,
  SeverityLevel,
  ITopWorstReport,
  IHotspot,
  IMapReport,
  ILocalityHealthIndexResponse,
  IRepairTeam,
} from '../types';

const API_BASE = '/api';

export async function fetchReports(params?: {
  status?: string;
  severity?: string;
  location?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<{ reports: IReport[]; total: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.severity && params.severity !== 'all') query.set('severity', params.severity);
  if (params?.location && params.location !== 'all') query.set('location', params.location);
  if (params?.search) query.set('search', params.search);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/reports?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  const json = await res.json();
  return {
    reports: json.data,
    total: json.pagination.total,
    totalPages: json.pagination.totalPages,
  };
}

export async function fetchReportById(id: string): Promise<IReport> {
  const res = await fetch(`${API_BASE}/reports/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Report "${id}" not found`);
    throw new Error('Failed to fetch report');
  }
  const json = await res.json();
  return json.data;
}

export async function submitReport(formData: FormData): Promise<IReport> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Submission failed' }));
    throw new Error(error.message || 'Failed to submit report');
  }
  const json = await res.json();
  return json.data;
}

export const createReport = submitReport;

export async function analyzeImage(formData: FormData): Promise<IAiAnalysisResult> {
  const res = await fetch(`${API_BASE}/ai/analyze`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Analysis failed' }));
    throw new Error(error.message || 'Failed to analyze photograph');
  }
  const json = await res.json();
  return json.data;
}

export async function updateReportStatus(
  ticketId: string,
  status: ReportStatus,
  notes?: string,
  officerName?: string
): Promise<IReport> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes, officerName }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  const json = await res.json();
  return json.data;
}

export async function updateReportAssignment(
  ticketId: string,
  assignedTeam: string,
  assignedOfficer: string,
  officerName?: string,
  reason?: string
): Promise<IReport> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}/assignment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedTeam, assignedOfficer, officerName, reason }),
  });
  if (!res.ok) throw new Error('Failed to assign team');
  const json = await res.json();
  return json.data;
}

export async function updateReportSeverity(
  ticketId: string,
  severity: SeverityLevel | 'critical',
  notes?: string,
  officerName?: string,
  numericalScore?: number
): Promise<IReport> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}/severity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ severity, notes, officerName, numericalScore }),
  });
  if (!res.ok) throw new Error('Failed to update severity');
  const json = await res.json();
  return json.data;
}

export async function resolveReport(
  ticketId: string,
  formData: FormData
): Promise<IReport> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}/resolve`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to mark report as resolved');
  const json = await res.json();
  return json.data;
}

export async function verifyRepairWorkflow(
  ticketId: string,
  formData: FormData
): Promise<IReport> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}/verify-repair`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to verify repair');
  const json = await res.json();
  return json.data;
}

export async function submitCommunityVerification(
  ticketId: string,
  verificationType: string,
  notes?: string,
  photo?: File
): Promise<IReport> {
  const formData = new FormData();
  formData.append('verificationType', verificationType);
  if (notes) formData.append('notes', notes);
  if (photo) formData.append('photo', photo);

  const res = await fetch(`${API_BASE}/reports/${ticketId}/community-verify`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to record verification' }));
    throw new Error(err.message || 'Failed to record verification');
  }
  const json = await res.json();
  return json.data;
}

export async function updateRecurrence(
  ticketId: string,
  confirmed: boolean,
  notes?: string
): Promise<IReport> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}/recurrence`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmed, notes }),
  });
  if (!res.ok) throw new Error('Failed to update recurrence status');
  const json = await res.json();
  return json.data;
}

export async function fetchLocalityHealthIndex(): Promise<ILocalityHealthIndexResponse> {
  const res = await fetch(`${API_BASE}/reports/health-index`);
  if (!res.ok) throw new Error('Failed to fetch road health index');
  const json = await res.json();
  return json.data;
}

export async function fetchRepairTeams(): Promise<IRepairTeam[]> {
  const res = await fetch(`${API_BASE}/reports/teams`);
  if (!res.ok) throw new Error('Failed to fetch repair teams');
  const json = await res.json();
  return json.data;
}

export async function upvoteReport(ticketId: string): Promise<{ upvotes: number; hasUpvoted: boolean }> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to record upvote');
  return res.json();
}

export async function addOfficerNote(
  ticketId: string,
  note: string,
  officerName?: string,
  isInternal = true
): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, officerName, isInternal }),
  });
  if (!res.ok) throw new Error('Failed to add officer note');
}

export async function fetchDashboardStats(): Promise<IDashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
  const json = await res.json();
  return json.data;
}

export async function fetchDashboardActivity(): Promise<IActivityItem[]> {
  const res = await fetch(`${API_BASE}/dashboard/activity`);
  if (!res.ok) throw new Error('Failed to fetch activity feed');
  const json = await res.json();
  return json.data;
}

export async function fetchLiveWeather(params: {
  location?: string;
  lat?: number;
  lng?: number;
  description?: string;
}): Promise<IWeatherData> {
  const query = new URLSearchParams();
  if (params.location) query.set('location', params.location);
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
  if (params.description) query.set('description', params.description);

  const res = await fetch(`${API_BASE}/reports/weather/current?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch live weather forecast');
  const json = await res.json();
  return json.data;
}

export async function deleteReport(ticketId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${ticketId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete report' }));
    throw new Error(error.message || 'Failed to delete report');
  }
}

export async function fetchTopWorstPotholes(params?: {
  locality?: string;
  severity?: string;
  filterMode?: string;
  limit?: number;
}): Promise<{ data: ITopWorstReport[]; totalCandidates: number; scoringModel: Record<string, string> }> {
  const query = new URLSearchParams();
  if (params?.locality && params.locality !== 'all') query.set('locality', params.locality);
  if (params?.severity && params.severity !== 'all') query.set('severity', params.severity);
  if (params?.filterMode && params.filterMode !== 'all') query.set('filterMode', params.filterMode);
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/reports/top-worst?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch top worst potholes');
  return res.json();
}

export async function fetchHotspots(): Promise<IHotspot[]> {
  const res = await fetch(`${API_BASE}/reports/hotspots`);
  if (!res.ok) throw new Error('Failed to fetch road damage hotspots');
  const json = await res.json();
  return json.data;
}

export async function fetchMapReports(params?: {
  status?: string;
  severity?: string;
  locality?: string;
}): Promise<{ data: IMapReport[]; totalOnMap: number }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.severity && params.severity !== 'all') query.set('severity', params.severity);
  if (params?.locality && params.locality !== 'all') query.set('locality', params.locality);

  const res = await fetch(`${API_BASE}/reports/map?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch map reports');
  return res.json();
}
