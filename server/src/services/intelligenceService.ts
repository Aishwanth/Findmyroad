export interface IScoringFactors {
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  daysUnresolved: number;
  upvotes: number;
  hasWeatherHazard: boolean;
  isRecurrent?: boolean;
  communityConfirmationsCount?: number;
  estimatedDepthInches?: number;
  roadType?: 'highway' | 'arterial' | 'residential' | 'alley';
}

export interface IRiskScoreResult {
  score: number;
  category: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  version: string;
  evidenceQuality: 'verified_photo' | 'citizen_report' | 'sensor_data' | 'insufficient_evidence';
  breakdown: {
    baseSeverityPoints: number;
    agingPoints: number;
    exposureAndCommunityPoints: number;
    weatherHazardBonus: number;
    recurrencePoints: number;
  };
}

export interface ISlaConfig {
  reviewHours: { critical: number; high: number; medium: number; low: number };
  assignmentHours: { critical: number; high: number; medium: number; low: number };
  resolutionHours: { critical: number; high: number; medium: number; low: number };
}

export const DEFAULT_SLA_CONFIG: ISlaConfig = {
  reviewHours: { critical: 6, high: 12, medium: 24, low: 48 },
  assignmentHours: { critical: 12, high: 24, medium: 48, low: 72 },
  resolutionHours: { critical: 36, high: 72, medium: 120, low: 168 },
};

export interface ISlaStatus {
  targetReviewHours: number;
  targetAssignmentHours: number;
  targetResolutionHours: number;
  elapsedHours: number;
  isReviewBreached: boolean;
  isAssignmentBreached: boolean;
  isResolutionBreached: boolean;
  isOverdue: boolean;
  escalationLevel: 'NORMAL' | 'APPROACHING_DEADLINE' | 'BREACHED_ESCALATED';
  delayStageAttribution: 'NONE' | 'REVIEW' | 'ASSIGNMENT' | 'FIELD_RESOLUTION';
  remainingResolutionHours: number;
}

export interface IRepairTeam {
  id: string;
  name: string;
  localitySpecialty: string[];
  capabilities: string[];
  maxCapacity: number;
  activeTickets: number;
  status: 'AVAILABLE' | 'HIGH_WORKLOAD' | 'FULL';
  contact: string;
}

export const MUNICIPAL_REPAIR_TEAMS: IRepairTeam[] = [
  {
    id: 'TEAM-HYD-CENTRAL-01',
    name: 'GHMC Central Rapid Asphalt Division',
    localitySpecialty: ['Banjara Hills', 'Jubilee Hills', 'Panjagutta', 'Somajiguda', 'Khairatabad'],
    capabilities: ['Asphalt Hot Mix', 'Subgrade Compaction', 'Emergency Pothole Patching', 'Arterial Resurfacing'],
    maxCapacity: 10,
    activeTickets: 4,
    status: 'AVAILABLE',
    contact: '+91 40 2322 5501',
  },
  {
    id: 'TEAM-HYD-WEST-02',
    name: 'Cyberabad IT Corridor Road Tech Squad',
    localitySpecialty: ['Madhapur', 'Hitec City', 'Gachibowli', 'Kondapur', 'Financial District'],
    capabilities: ['Heavy Traffic Management', 'Mastic Asphalt', 'Quick-Set Slurry', 'Sensor Re-profiling'],
    maxCapacity: 12,
    activeTickets: 6,
    status: 'AVAILABLE',
    contact: '+91 40 2311 8840',
  },
  {
    id: 'TEAM-HYD-NORTH-03',
    name: 'Secunderabad & Cantonment Infra Unit',
    localitySpecialty: ['Begumpet', 'Secunderabad', 'Tarnaka', 'Alwal', 'Maredpally'],
    capabilities: ['Concrete Joint Sealing', 'Base Course Paving', 'Drainage Culvert Alignment'],
    maxCapacity: 8,
    activeTickets: 3,
    status: 'AVAILABLE',
    contact: '+91 40 2780 1210',
  },
  {
    id: 'TEAM-HYD-OLD-04',
    name: 'Charminar Heritage & Historic District Crew',
    localitySpecialty: ['Charminar', 'Abids', 'Koti', 'Malakpet', 'Mehdipatnam'],
    capabilities: ['Narrow Lane Compact Rollers', 'Hand-Laid Asphalt', 'Cobblestone Transition'],
    maxCapacity: 8,
    activeTickets: 5,
    status: 'AVAILABLE',
    contact: '+91 40 2452 3390',
  },
  {
    id: 'TEAM-HYD-EAST-05',
    name: 'LB Nagar & Outer Ring Road Taskforce',
    localitySpecialty: ['LB Nagar', 'Uppal', 'Dilsukhnagar', 'Nagole', 'Hayathnagar'],
    capabilities: ['Heavy Vehicle Corridors', 'Bituminous Macadam', 'Monsoon Cold-Patching'],
    maxCapacity: 10,
    activeTickets: 7,
    status: 'AVAILABLE',
    contact: '+91 40 2404 7712',
  },
];

/**
 * Unified Road-Risk Scoring Engine
 * Computes deterministic, normalized 0-100 score with transparent factor attribution.
 */
export function calculateUnifiedRoadRiskScore(factors: IScoringFactors): IRiskScoreResult {
  // 1. Base Severity Points (max 50 pts)
  let baseSeverityPoints = 20;
  if (factors.severity === 'critical') baseSeverityPoints = 48;
  else if (factors.severity === 'high') baseSeverityPoints = 38;
  else if (factors.severity === 'medium') baseSeverityPoints = 24;
  else baseSeverityPoints = 12;

  // Visual confidence scaling
  const confidenceMultiplier = Math.min(Math.max(factors.confidence || 0.8, 0.5), 1.0);
  baseSeverityPoints = Math.round(baseSeverityPoints * confidenceMultiplier);

  // 2. Aging Points (max 25 pts)
  // 1 pt per day unresolved up to 25 pts
  const agingPoints = Math.min(Math.round(factors.daysUnresolved * 1.5), 25);

  // 3. Exposure and Community Verification Points (max 15 pts)
  const upvotePts = Math.min((factors.upvotes || 1) * 2, 8);
  const communityPts = Math.min((factors.communityConfirmationsCount || 0) * 2.5, 7);
  const exposureAndCommunityPoints = Math.round(upvotePts + communityPts);

  // 4. Weather Hazard Bonus (max 10 pts)
  const weatherHazardBonus = factors.hasWeatherHazard ? 10 : 0;

  // 5. Recurrence Points (max 10 pts)
  const recurrencePoints = factors.isRecurrent ? 8 : 0;

  // Total raw score capped at 100
  const rawScore = baseSeverityPoints + agingPoints + exposureAndCommunityPoints + weatherHazardBonus + recurrencePoints;
  const score = Math.max(5, Math.min(100, rawScore));

  // Determine standard Category
  let category: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  if (score >= 80) category = 'critical';
  else if (score >= 60) category = 'high';
  else if (score >= 35) category = 'medium';
  else category = 'low';

  // Construct transparent explanation
  const reasons: string[] = [];
  if (category === 'critical' || category === 'high') {
    reasons.push(`High visual damage severity (${factors.severity})`);
  } else {
    reasons.push(`Moderate surface degradation`);
  }

  if (factors.daysUnresolved > 3) {
    reasons.push(`remained unresolved for ${factors.daysUnresolved.toFixed(0)} days`);
  }

  if (factors.hasWeatherHazard) {
    reasons.push(`active rain/moisture hazards exacerbate road deterioration`);
  }

  if (factors.isRecurrent) {
    reasons.push(`location has documented recurring road damage history`);
  }

  if ((factors.communityConfirmationsCount || 0) > 0) {
    reasons.push(`confirmed by ${factors.communityConfirmationsCount} citizen verifications`);
  }

  const explanation = reasons.length > 0
    ? `Priority assessed at score ${score}/100 based on: ${reasons.join(', ')}.`
    : `Standard civic road priority score of ${score}/100.`;

  return {
    score,
    category,
    explanation,
    version: 'v2.1-unified',
    evidenceQuality: factors.confidence > 0.85 ? 'verified_photo' : 'citizen_report',
    breakdown: {
      baseSeverityPoints,
      agingPoints,
      exposureAndCommunityPoints,
      weatherHazardBonus,
      recurrencePoints,
    },
  };
}

/**
 * SLA and Accountability Tracker
 */
export function calculateSlaStatus(
  severity: 'low' | 'medium' | 'high' | 'critical',
  status: 'Submitted' | 'Under Review' | 'Assigned' | 'Resolved',
  submittedAt: Date,
  statusHistory: Array<{ status: string; changedAt: Date }>,
  resolvedAt?: Date
): ISlaStatus {
  const normSeverity = severity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical';
  const targetReview = DEFAULT_SLA_CONFIG.reviewHours[normSeverity] || 24;
  const targetAssignment = DEFAULT_SLA_CONFIG.assignmentHours[normSeverity] || 48;
  const targetResolution = DEFAULT_SLA_CONFIG.resolutionHours[normSeverity] || 120;

  const now = new Date();
  const start = new Date(submittedAt);
  const end = resolvedAt ? new Date(resolvedAt) : now;
  const totalElapsedHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));

  // Find first review timestamp
  const firstReview = statusHistory.find(
    (h) => h.status === 'Under Review' || h.status === 'Assigned' || h.status === 'Resolved'
  );
  const reviewTime = firstReview ? new Date(firstReview.changedAt) : null;
  const reviewElapsedHours = reviewTime
    ? (reviewTime.getTime() - start.getTime()) / (1000 * 60 * 60)
    : totalElapsedHours;

  const isReviewBreached = !reviewTime && totalElapsedHours > targetReview;

  // Find assignment timestamp
  const firstAssignment = statusHistory.find(
    (h) => h.status === 'Assigned' || h.status === 'Resolved'
  );
  const assignmentTime = firstAssignment ? new Date(firstAssignment.changedAt) : null;
  const isAssignmentBreached = !assignmentTime && totalElapsedHours > targetAssignment;

  // Resolution breach
  const isResolutionBreached = status !== 'Resolved' && totalElapsedHours > targetResolution;

  const isOverdue = isReviewBreached || isAssignmentBreached || isResolutionBreached;

  let escalationLevel: 'NORMAL' | 'APPROACHING_DEADLINE' | 'BREACHED_ESCALATED' = 'NORMAL';
  if (isOverdue) {
    escalationLevel = 'BREACHED_ESCALATED';
  } else if (status !== 'Resolved' && totalElapsedHours > targetResolution * 0.75) {
    escalationLevel = 'APPROACHING_DEADLINE';
  }

  let delayStageAttribution: 'NONE' | 'REVIEW' | 'ASSIGNMENT' | 'FIELD_RESOLUTION' = 'NONE';
  if (isReviewBreached) delayStageAttribution = 'REVIEW';
  else if (isAssignmentBreached) delayStageAttribution = 'ASSIGNMENT';
  else if (isResolutionBreached) delayStageAttribution = 'FIELD_RESOLUTION';

  const remainingResolutionHours = Math.max(0, targetResolution - totalElapsedHours);

  return {
    targetReviewHours: targetReview,
    targetAssignmentHours: targetAssignment,
    targetResolutionHours: targetResolution,
    elapsedHours: Math.round(totalElapsedHours * 10) / 10,
    isReviewBreached,
    isAssignmentBreached,
    isResolutionBreached,
    isOverdue,
    escalationLevel,
    delayStageAttribution,
    remainingResolutionHours: Math.round(remainingResolutionHours * 10) / 10,
  };
}

/**
 * Smart Repair-Team Assignment Recommendation Engine
 */
export function recommendRepairTeam(
  location: string,
  severity: string,
  damageType: string,
  teams: IRepairTeam[] = MUNICIPAL_REPAIR_TEAMS
): {
  suggestedTeam: string;
  teamId: string;
  matchScore: number;
  reason: string;
  teamWorkloadCount: number;
  availableTeams: IRepairTeam[];
} {
  const normLocation = location.toLowerCase();
  const scored = teams.map((team) => {
    let score = 50; // base score

    // Locality match (+35)
    const matchesLocality = team.localitySpecialty.some((loc) =>
      normLocation.includes(loc.toLowerCase()) || loc.toLowerCase().includes(normLocation)
    );
    if (matchesLocality) score += 35;

    // Capability match (+15)
    if (severity === 'high' || severity === 'critical') {
      if (team.capabilities.some((c) => c.includes('Emergency') || c.includes('Asphalt') || c.includes('Heavy'))) {
        score += 15;
      }
    }

    // Workload penalty (lower is better)
    const loadRatio = team.activeTickets / team.maxCapacity;
    score -= Math.round(loadRatio * 20);

    return {
      team,
      score: Math.max(10, Math.min(99, score)),
      matchesLocality,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  const reason = best.matchesLocality
    ? `Designated regional team for ${location} with optimal capacity (${best.team.activeTickets}/${best.team.maxCapacity} active) and road repair capabilities.`
    : `Nearest available municipal team with active crew bandwidth and matching repair equipment.`;

  return {
    suggestedTeam: best.team.name,
    teamId: best.team.id,
    matchScore: best.score,
    reason,
    teamWorkloadCount: best.team.activeTickets,
    availableTeams: teams,
  };
}

/**
 * Locality Road Health Index Calculator
 * Standard: 100 = Healthiest roads / Best civic condition.
 * Deductions applied for unresolved burden, high-severity density, aging tickets, and recurrence.
 */
export interface ILocalityHealthIndex {
  locality: string;
  healthIndex: number; // 0 - 100 (100 = Best)
  healthTier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'CRITICAL';
  statusDescription: string;
  totalReports: number;
  unresolvedCount: number;
  resolvedCount: number;
  resolutionRatePct: number;
  highSeverityCount: number;
  avgUnresolvedDays: number;
  recurringIssuesCount: number;
  isSufficientData: boolean;
  lastCalculated: string;
}

export function calculateLocalityHealthIndex(
  locality: string,
  reports: Array<{
    status: string;
    severity: string;
    submittedAt: Date | string;
    resolvedAt?: Date | string;
    isRecurrent?: boolean;
  }>
): ILocalityHealthIndex {
  const total = reports.length;
  if (total === 0) {
    return {
      locality,
      healthIndex: 100,
      healthTier: 'EXCELLENT',
      statusDescription: 'No road damage complaints reported. Ideal road surface condition.',
      totalReports: 0,
      unresolvedCount: 0,
      resolvedCount: 0,
      resolutionRatePct: 100,
      highSeverityCount: 0,
      avgUnresolvedDays: 0,
      recurringIssuesCount: 0,
      isSufficientData: false,
      lastCalculated: new Date().toISOString(),
    };
  }

  const unresolved = reports.filter((r) => r.status !== 'Resolved');
  const resolved = reports.filter((r) => r.status === 'Resolved');
  const highSeverity = unresolved.filter(
    (r) => r.severity === 'high' || (r.severity as string) === 'critical'
  );
  const recurring = reports.filter((r) => r.isRecurrent).length;

  const resolutionRatePct = Math.round((resolved.length / total) * 100);

  // Calculate average age of unresolved reports in days
  const now = Date.now();
  const totalAgeDays = unresolved.reduce((sum, r) => {
    const age = (now - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
    return sum + Math.max(0, age);
  }, 0);
  const avgUnresolvedDays = unresolved.length > 0 ? Math.round((totalAgeDays / unresolved.length) * 10) / 10 : 0;

  // Formula:
  // Base 100
  // - (unresolvedCount * 7)
  // - (highSeverityCount * 12)
  // - (avgUnresolvedDays * 1.5)
  // - (recurring * 8)
  // + (resolutionRatePct * 0.15)
  let rawScore = 100;
  rawScore -= unresolved.length * 7;
  rawScore -= highSeverity.length * 12;
  rawScore -= Math.min(avgUnresolvedDays * 1.5, 20);
  rawScore -= recurring * 8;
  rawScore += Math.round(resolutionRatePct * 0.15);

  const healthIndex = Math.max(10, Math.min(100, Math.round(rawScore)));

  let healthTier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'CRITICAL' = 'FAIR';
  if (healthIndex >= 85) healthTier = 'EXCELLENT';
  else if (healthIndex >= 68) healthTier = 'GOOD';
  else if (healthIndex >= 45) healthTier = 'FAIR';
  else healthTier = 'CRITICAL';

  const isSufficientData = total >= 2;

  let statusDescription = '';
  if (!isSufficientData) {
    statusDescription = 'Preliminary estimate: Low sample size submitted for this locality.';
  } else if (healthTier === 'EXCELLENT') {
    statusDescription = 'Outstanding road quality with minimal reported hazards and swift municipal resolution.';
  } else if (healthTier === 'GOOD') {
    statusDescription = 'Stable corridor conditions with manageable surface distress and active repair workflows.';
  } else if (healthTier === 'FAIR') {
    statusDescription = 'Moderate asphalt wear with accumulated unresolved complaints requiring scheduled patchworks.';
  } else {
    statusDescription = 'Severe road distress detected: dense high-priority craters and overdue repair backlogs.';
  }

  return {
    locality,
    healthIndex,
    healthTier,
    statusDescription,
    totalReports: total,
    unresolvedCount: unresolved.length,
    resolvedCount: resolved.length,
    resolutionRatePct,
    highSeverityCount: highSeverity.length,
    avgUnresolvedDays,
    recurringIssuesCount: recurring,
    isSufficientData,
    lastCalculated: new Date().toISOString(),
  };
}

/**
 * Pothole Recurrence Detection
 * Checks geographical proximity (< 300m) or matching road corridor with historical reports
 */
export function detectRecurrence(
  newCoordinates: { lat: number; lng: number } | undefined,
  location: string,
  allReports: Array<{
    ticketId: string;
    location: string;
    status: string;
    coordinates?: { lat: number; lng: number };
    resolvedAt?: Date;
    submittedAt: Date;
  }>
): {
  isRecurrent: boolean;
  recurrenceTier: 'POSSIBLE_RECURRENCE' | 'LIKELY_RECURRENCE' | 'UNCERTAIN_MATCH' | 'NONE';
  matchingTickets: string[];
  historicalRepairsCount: number;
  explanation: string;
} {
  const normLocation = location.toLowerCase().trim();
  const matchingTickets: string[] = [];
  let historicalRepairs = 0;

  for (const rep of allReports) {
    let match = false;

    // Coordinate distance check (~300m = ~0.003 degrees)
    if (newCoordinates && rep.coordinates) {
      const dLat = Math.abs(newCoordinates.lat - rep.coordinates.lat);
      const dLng = Math.abs(newCoordinates.lng - rep.coordinates.lng);
      const distDegrees = Math.sqrt(dLat * dLat + dLng * dLng);
      if (distDegrees < 0.003) {
        match = true;
      }
    }

    // Name match fallback
    if (!match && rep.location) {
      const repLoc = rep.location.toLowerCase().trim();
      if (
        repLoc === normLocation ||
        (normLocation.length > 5 && repLoc.includes(normLocation)) ||
        (repLoc.length > 5 && normLocation.includes(repLoc))
      ) {
        match = true;
      }
    }

    if (match) {
      matchingTickets.push(rep.ticketId);
      if (rep.status === 'Resolved') {
        historicalRepairs++;
      }
    }
  }

  if (matchingTickets.length === 0) {
    return {
      isRecurrent: false,
      recurrenceTier: 'NONE',
      matchingTickets: [],
      historicalRepairsCount: 0,
      explanation: 'No previous damage reports logged within proximity of this road corridor.',
    };
  }

  const tier = historicalRepairs > 0 ? 'LIKELY_RECURRENCE' : 'POSSIBLE_RECURRENCE';
  const explanation = historicalRepairs > 0
    ? `Potential recurring road failure: ${historicalRepairs} previously resolved repairs identified within this corridor.`
    : `Associated with ${matchingTickets.length} adjacent damage reports logged in this vicinity.`;

  return {
    isRecurrent: true,
    recurrenceTier: tier,
    matchingTickets: matchingTickets.slice(0, 5),
    historicalRepairsCount: historicalRepairs,
    explanation,
  };
}
