import mongoose, { Document, Schema } from 'mongoose';

export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'Resolved';
export type SeverityLevel = 'low' | 'medium' | 'high';
export type SeverityCategory = 'low' | 'medium' | 'high' | 'critical';

export interface IStatusHistoryItem {
  status: ReportStatus;
  changedAt: Date;
  changedBy: string;
  notes?: string;
}

export interface IOfficerNote {
  id: string;
  note: string;
  officerName: string;
  createdAt: Date;
  isInternal: boolean;
}

export interface IPublicUpdate {
  id: string;
  message: string;
  timestamp: Date;
  author: string;
}

export interface IScoringHistoryItem {
  score: number;
  category: SeverityCategory;
  calculatedAt: Date;
  reason: string;
  version: string;
}

export interface ICommunityVerification {
  id: string;
  verificationType: 'STILL_DAMAGED' | 'REPAIR_CONFIRMED' | 'PHOTO_UPDATE' | 'INCORRECT_INFO';
  verifiedBy: string; // Session / IP hash for rate limit & deduplication
  submittedAt: Date;
  notes?: string;
  imageUrl?: string;
  isOfficerReviewed?: boolean;
}

export interface IAssignmentHistoryItem {
  teamName: string;
  assignedBy: string;
  assignedAt: Date;
  reason?: string;
}

export interface IRepairVerification {
  status: 'REPAIR_APPEARS_COMPLETE' | 'REPAIR_APPEARS_INCOMPLETE' | 'EVIDENCE_INCONCLUSIVE' | 'MANUAL_REVIEW_REQUIRED' | 'PENDING';
  aiConfidence: number;
  aiExplanation: string;
  observations: string[];
  visualMatchScore: number;
  afterImageUrl?: string;
  submittedAt?: Date;
  verifiedAt?: Date;
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

export interface IReport extends Document {
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
  numericalSeverityScore: number;
  severityCategory: SeverityCategory;
  roadRiskScore?: number;
  riskCategory?: SeverityCategory;
  scoringExplanation?: string;
  evidenceQuality?: 'verified_photo' | 'citizen_report' | 'sensor_data' | 'insufficient_evidence';
  scoringVersion?: string;
  scoringHistory?: IScoringHistoryItem[];
  severityScoreBreakdown?: {
    aiDamagePoints: number;
    dimensionPoints: number;
    roadRiskPoints: number;
    confidencePoints: number;
    isEstimatedDimension: boolean;
  };
  officerSeverityOverride?: {
    originalScore: number;
    originalCategory: string;
    overrideScore: number;
    overrideCategory: string;
    overriddenBy: string;
    overriddenAt: Date;
    reason: string;
  };
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
  upvotedBy: string[];
  duplicateOf?: string;
  resolutionNotes?: string;
  submittedAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  statusHistory: IStatusHistoryItem[];
  officerNotes: IOfficerNote[];
  publicUpdates: IPublicUpdate[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  weatherData?: {
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
  };
  weatherPriorityBoost?: boolean;
  isDemo?: boolean;
}

const ReportSchema = new Schema<IReport>(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    beforeImageUrl: {
      type: String,
    },
    afterImageUrl: {
      type: String,
    },
    location: {
      type: String,
      required: true,
      index: true,
    },
    landmark: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    damageType: {
      type: String,
      default: 'Pothole',
    },
    isPothole: {
      type: Boolean,
      default: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    numericalSeverityScore: {
      type: Number,
      default: 55,
      min: 0,
      max: 100,
      index: true,
    },
    severityCategory: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    roadRiskScore: {
      type: Number,
      default: 55,
      min: 0,
      max: 100,
      index: true,
    },
    riskCategory: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    scoringExplanation: {
      type: String,
      default: '',
    },
    evidenceQuality: {
      type: String,
      enum: ['verified_photo', 'citizen_report', 'sensor_data', 'insufficient_evidence'],
      default: 'verified_photo',
    },
    scoringVersion: {
      type: String,
      default: 'v2.1-unified',
    },
    scoringHistory: [
      {
        score: Number,
        category: String,
        calculatedAt: { type: Date, default: Date.now },
        reason: String,
        version: String,
      },
    ],
    severityScoreBreakdown: {
      aiDamagePoints: { type: Number, default: 30 },
      dimensionPoints: { type: Number, default: 10 },
      roadRiskPoints: { type: Number, default: 10 },
      confidencePoints: { type: Number, default: 8 },
      isEstimatedDimension: { type: Boolean, default: false },
    },
    officerSeverityOverride: {
      originalScore: Number,
      originalCategory: String,
      overrideScore: Number,
      overrideCategory: String,
      overriddenBy: String,
      overriddenAt: Date,
      reason: String,
    },
    aiConfidence: {
      type: Number,
      default: 0.85,
    },
    aiExplanation: {
      type: String,
      default: '',
    },
    aiObservations: {
      type: [String],
      default: [],
    },
    aiReviewRequired: {
      type: Boolean,
      default: false,
    },
    isAiFallback: {
      type: Boolean,
      default: false,
    },
    aiProvider: {
      type: String,
      default: 'heuristic-engine',
    },
    status: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Assigned', 'Resolved'],
      default: 'Submitted',
      index: true,
    },
    assignedTeam: {
      type: String,
      default: '',
    },
    assignedOfficer: {
      type: String,
      default: '',
    },
    assignmentHistory: [
      {
        teamName: { type: String, required: true },
        assignedBy: { type: String, required: true },
        assignedAt: { type: Date, default: Date.now },
        reason: { type: String, default: '' },
      },
    ],
    smartAssignmentRecommendation: {
      suggestedTeam: String,
      teamId: String,
      matchScore: Number,
      reason: String,
      teamWorkloadCount: Number,
    },
    repairVerification: {
      status: {
        type: String,
        enum: ['REPAIR_APPEARS_COMPLETE', 'REPAIR_APPEARS_INCOMPLETE', 'EVIDENCE_INCONCLUSIVE', 'MANUAL_REVIEW_REQUIRED', 'PENDING'],
        default: 'PENDING',
      },
      aiConfidence: { type: Number, default: 0 },
      aiExplanation: { type: String, default: '' },
      observations: { type: [String], default: [] },
      visualMatchScore: { type: Number, default: 0 },
      afterImageUrl: String,
      submittedAt: Date,
      verifiedAt: Date,
      officerVerdict: {
        type: String,
        enum: ['CONFIRMED_REPAIRED', 'REJECTED_REPAIR_INCOMPLETE', 'REQUEST_MORE_EVIDENCE', 'PENDING'],
        default: 'PENDING',
      },
      officerNotes: { type: String, default: '' },
      verifiedByOfficer: String,
      isAiFallback: Boolean,
      aiProvider: String,
    },
    sla: {
      targetReviewHours: { type: Number, default: 24 },
      targetAssignmentHours: { type: Number, default: 48 },
      targetResolutionHours: { type: Number, default: 120 },
      elapsedHours: { type: Number, default: 0 },
      isReviewBreached: { type: Boolean, default: false },
      isAssignmentBreached: { type: Boolean, default: false },
      isResolutionBreached: { type: Boolean, default: false },
      isOverdue: { type: Boolean, default: false },
      escalationLevel: {
        type: String,
        enum: ['NORMAL', 'APPROACHING_DEADLINE', 'BREACHED_ESCALATED'],
        default: 'NORMAL',
      },
      delayStageAttribution: {
        type: String,
        enum: ['NONE', 'REVIEW', 'ASSIGNMENT', 'FIELD_RESOLUTION'],
        default: 'NONE',
      },
      remainingResolutionHours: { type: Number, default: 120 },
    },
    recurrence: {
      isRecurrent: { type: Boolean, default: false },
      recurrenceTier: {
        type: String,
        enum: ['POSSIBLE_RECURRENCE', 'LIKELY_RECURRENCE', 'UNCERTAIN_MATCH', 'NONE'],
        default: 'NONE',
      },
      matchingTickets: { type: [String], default: [] },
      historicalRepairsCount: { type: Number, default: 0 },
      explanation: { type: String, default: '' },
      officerConfirmed: { type: Boolean, default: false },
    },
    communityVerifications: [
      {
        id: { type: String, required: true },
        verificationType: {
          type: String,
          enum: ['STILL_DAMAGED', 'REPAIR_CONFIRMED', 'PHOTO_UPDATE', 'INCORRECT_INFO'],
          required: true,
        },
        verifiedBy: { type: String, required: true },
        submittedAt: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
        imageUrl: String,
        isOfficerReviewed: { type: Boolean, default: false },
      },
    ],
    citizenReference: {
      type: String,
      default: '',
    },
    upvotes: {
      type: Number,
      default: 1,
    },
    upvotedBy: {
      type: [String],
      default: [],
    },
    duplicateOf: {
      type: String,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String, required: true },
        notes: { type: String, default: '' },
      },
    ],
    officerNotes: [
      {
        id: { type: String, required: true },
        note: { type: String, required: true },
        officerName: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        isInternal: { type: Boolean, default: true },
      },
    ],
    publicUpdates: [
      {
        id: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        author: { type: String, required: true },
      },
    ],
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    weatherData: {
      condition: { type: String, default: 'Overcast & Dry' },
      temperature: { type: Number, default: 26 },
      isRaining: { type: Boolean, default: false },
      precipitation: { type: Number, default: 0 },
      humidity: { type: Number, default: 75 },
      rainStartTime: { type: String },
      rainStopTime: { type: String },
      weatherHazardRisk: { type: String, enum: ['CRITICAL', 'ELEVATED', 'LOW'], default: 'LOW' },
      optimalDispatchTime: { type: String },
      dryingWindow: { type: String },
      actionProtocol: { type: String },
      weatherAdvisory: { type: String },
    },
    weatherPriorityBoost: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);
