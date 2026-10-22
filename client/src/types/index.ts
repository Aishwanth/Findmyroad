export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'Resolved';
export type SeverityLevel = 'low' | 'medium' | 'high';
export type SeverityCategory = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'citizen' | 'officer';

export interface IStatusHistoryItem {
  status: ReportStatus;
  changedAt: string;
  changedBy: string;
  notes?: string;
}

export interface IOfficerNote {
  id: string;
  note: string;
  officerName: string;
  createdAt: string;
  isInternal: boolean;
}

export interface IPublicUpdate {
  id: string;
  message: string;
  timestamp: string;
  author: string;
}

export interface ISeverityScoreBreakdown {
  aiDamagePoints: number;
  dimensionPoints: number;
  roadRiskPoints: number;
  confidencePoints: number;
  isEstimatedDimension: boolean;
}

export interface IOfficerSeverityOverride {
  originalScore: number;
  originalCategory: string;
  overrideScore: number;
  overrideCategory: string;
  overriddenBy: string;
  overriddenAt: string;
  reason: string;
}

export interface IScoringHistoryItem {
  score: number;
  category: SeverityCategory;
  calculatedAt: string;
  reason: string;
  version: string;
}

export interface ICommunityVerification {
  id: string;
  verificationType: 'STILL_DAMAGED' | 'REPAIR_CONFIRMED' | 'PHOTO_UPDATE' | 'INCORRECT_INFO';
  verifiedBy: string;
  submittedAt: string;
  notes?: string;
  imageUrl?: string;
  isOfficerReviewed?: boolean;
}

export interface IAssignmentHistoryItem {
  teamName: string;
  assignedBy: string;
  assignedAt: string;
  reason?: string;
}

export interface IRepairVerification {
  status: 'REPAIR_APPEARS_COMPLETE' | 'REPAIR_APPEARS_INCOMPLETE' | 'EVIDENCE_INCONCLUSIVE' | 'MANUAL_REVIEW_REQUIRED' | 'PENDING';
  aiConfidence: number;
  aiExplanation: string;
  observations: string[];
  visualMatchScore: number;
  afterImageUrl?: string;
  submittedAt?: string;
  verifiedAt?: string;
  officerVerdict?: 'CONFIRMED_REPAIRED' | 'REJECTED_REPAIR_INCOMPLETE' | 'REQUEST_MORE_EVIDENCE' | 'PENDING';
  officerNotes?: string;
  verifiedByOfficer?: string;
  isAiFallback?: boolean;
  aiProvider?: string;
}

export interface ISlaRecord {
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

export interface IRecurrenceRecord {
  isRecurrent: boolean;
  recurrenceTier: 'POSSIBLE_RECURRENCE' | 'LIKELY_RECURRENCE' | 'UNCERTAIN_MATCH' | 'NONE';
  matchingTickets: string[];
  historicalRepairsCount: number;
  explanation: string;
  officerConfirmed?: boolean;
}

export interface ISmartAssignmentRecommendation {
  suggestedTeam: string;
  teamId: string;
  matchScore: number;
  reason: string;
  teamWorkloadCount: number;
}

export interface IReport {
  _id: string;
  ticketId: string;
  imageUrl: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  location: string;
  landmark?: string;
  description?: string;
  damageType: string;
  isPothole: boolean;
  severity: SeverityLevel;
  numericalSeverityScore?: number;
  severityCategory?: SeverityCategory;
  roadRiskScore?: number;
  riskCategory?: SeverityCategory;
  scoringExplanation?: string;
  evidenceQuality?: 'verified_photo' | 'citizen_report' | 'sensor_data' | 'insufficient_evidence';
  scoringVersion?: string;
  scoringHistory?: IScoringHistoryItem[];
  severityScoreBreakdown?: ISeverityScoreBreakdown;
  officerSeverityOverride?: IOfficerSeverityOverride;
  aiConfidence: number;
  aiExplanation: string;
  aiObservations: string[];
  aiReviewRequired: boolean;
  isAiFallback: boolean;
  aiProvider: string;
  status: ReportStatus;
  assignedTeam?: string;
  assignedOfficer?: string;
  assignmentHistory?: IAssignmentHistoryItem[];
  smartAssignmentRecommendation?: ISmartAssignmentRecommendation;
  repairVerification?: IRepairVerification;
  sla?: ISlaRecord;
  recurrence?: IRecurrenceRecord;
  communityVerifications?: ICommunityVerification[];
  citizenReference?: string;
  upvotes: number;
  duplicateOf?: string;
  resolutionNotes?: string;
  submittedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  statusHistory: IStatusHistoryItem[];
  officerNotes: IOfficerNote[];
  publicUpdates: IPublicUpdate[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  weatherData?: IWeatherData;
  weatherPriorityBoost?: boolean;
  isDemo?: boolean;
}

export interface IWeatherData {
  condition: string;
  temperature: number;
  isRaining: boolean;
  precipitation: number;
  humidity: number;
  rainStartTime?: string;
  rainStopTime?: string;
  weatherHazardRisk: 'CRITICAL' | 'ELEVATED' | 'LOW';
  optimalDispatchTime: string;
  dryingWindow: string;
  actionProtocol: string;
  weatherAdvisory: string;
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

export interface ILocalityHealthIndex {
  locality: string;
  healthIndex: number;
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

export interface ILocalityHealthIndexResponse {
  localities: ILocalityHealthIndex[];
  cityAverageHealthIndex: number;
  cityAverageTier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'CRITICAL';
  totalLocalitiesEvaluated: number;
  methodology: string;
}

export interface IDashboardStats {
  totalReports: number;
  awaitingReview: number;
  highSeverity: number;
  assignedRepairs: number;
  resolvedReports: number;
  resolutionRate: number;
  avgResolutionTimeHours: number;
  severityDistribution: Array<{ name: string; count: number; color: string }>;
  statusDistribution: Array<{ name: string; count: number; color: string }>;
  locationDistribution: Array<{ name: string; count: number }>;
}

export interface IActivityItem {
  id: string;
  ticketId: string;
  action: string;
  details: string;
  actor: string;
  timestamp: string;
  status: ReportStatus;
  severity: SeverityLevel;
  location: string;
}

export interface IAiAnalysisResult {
  isPothole: boolean;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  observations: string[];
  reviewRequired: boolean;
  isAiFallback: boolean;
  aiProvider: string;
}

export interface IScoreBreakdown {
  severityPoints: number;
  agingPoints: number;
  upvotePoints: number;
  rainHazardBonus: number;
  daysUnresolved: number;
}

export interface ITopWorstReport extends IReport {
  priorityScore: number;
  scoreBreakdown: IScoreBreakdown;
}

export interface IHotspot {
  id: string;
  locality: string;
  unresolvedCount: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  highestRiskScore: number;
  avgAgeDays: number;
  severityWeightedBurden: number;
  recurringCount?: number;
  coordinates?: { lat: number; lng: number };
  sampleTicketIds?: string[];
  lastUpdated?: string;
}

export interface IMapReport {
  _id: string;
  ticketId: string;
  imageUrl: string;
  location: string;
  landmark?: string;
  severity: SeverityLevel;
  numericalSeverityScore?: number;
  severityCategory?: SeverityCategory;
  status: ReportStatus;
  coordinates: {
    lat: number;
    lng: number;
  };
  upvotes: number;
  submittedAt: string;
  weatherData?: IWeatherData;
  damageType?: string;
  aiExplanation?: string;
  recurrence?: IRecurrenceRecord;
  repairVerification?: IRepairVerification;
}
