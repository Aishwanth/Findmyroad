import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Report } from '../models/Report.js';
import { v4 as uuidv4 } from 'uuid';
import { calculateNumericalSeverity } from '../utils/severityScoring.js';
import {
  calculateUnifiedRoadRiskScore,
  calculateSlaStatus,
  recommendRepairTeam,
} from '../services/intelligenceService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixmyroad';

const sampleImages = {
  potholeSevere1: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=900&q=80',
  potholeSevere2: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80',
  potholeWaterlogged: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=900&q=80',
  potholeMedium1: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=900&q=80',
  potholeMedium2: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=900&q=80',
  resolvedRepaired1: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=80',
};

const sampleReports = [
  {
    ticketId: 'FMR-2026-1042',
    imageUrl: sampleImages.potholeSevere1,
    beforeImageUrl: sampleImages.potholeSevere1,
    location: 'Uppal Ring Road',
    landmark: 'Opposite Asian Cinespace & Metro Pillar 912',
    description: 'Deep hazardous crater on the slow-lane curve. Water pooling makes it invisible at night. Two scooterists skidded yesterday.',
    damageType: 'Severe Crater & Surface Shear',
    isPothole: true,
    severity: 'high',
    aiConfidence: 0.94,
    aiExplanation: 'Deep depression detected with exposed aggregate subgrade and fractured asphalt edges on heavy-traffic artery.',
    aiObservations: ['Substantial loss of bitumen (> 4.5 in depth)', 'Immediate hazard to two-wheelers', 'Water accumulation exacerbating edge breakdown'],
    aiReviewRequired: false,
    isAiFallback: false,
    aiProvider: 'Google Gemini 1.5 Flash Vision',
    status: 'Assigned',
    assignedTeam: 'GHMC Central Rapid Asphalt Division',
    assignedOfficer: 'Asst. Exec. Eng. P. Suresh',
    citizenReference: 'CIT-78210',
    upvotes: 42,
    upvotedBy: ['demo-voter-1', 'demo-voter-2'],
    submittedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    recurrence: {
      isRecurrent: true,
      recurrenceTier: 'LIKELY_RECURRENCE',
      matchingTickets: ['FMR-2026-1038', 'FMR-2025-9821'],
      historicalRepairsCount: 2,
      explanation: 'Corridor has documented repeated subsurface erosion after heavy monsoon events.',
      officerConfirmed: true,
    },
    communityVerifications: [
      {
        id: uuidv4(),
        verificationType: 'STILL_DAMAGED',
        verifiedBy: 'commuter-hyd-01',
        submittedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        notes: 'Crater has widened after evening drizzle.',
        isOfficerReviewed: true,
      },
      {
        id: uuidv4(),
        verificationType: 'PHOTO_UPDATE',
        verifiedBy: 'citizen-app-99',
        submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        notes: 'Traffic police placed temporary orange cone.',
        isOfficerReviewed: true,
      },
    ],
    statusHistory: [
      {
        status: 'Submitted',
        changedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        changedBy: 'Citizen Submission',
        notes: 'Initial public report logged via citizen portal.',
      },
      {
        status: 'Under Review',
        changedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
        changedBy: 'Triage Officer Ananya Rao',
        notes: 'AI high severity confirmed. Priority dispatch flagged.',
      },
      {
        status: 'Assigned',
        changedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        changedBy: 'Superintendent K. Reddy',
        notes: 'Assigned to GHMC Central Rapid Asphalt Division.',
      },
    ],
    officerNotes: [
      {
        id: uuidv4(),
        note: 'Traffic police notified for lane diversion between 10:00 PM and 1:00 AM tonight.',
        officerName: 'P. Suresh',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        isInternal: true,
      },
    ],
    publicUpdates: [
      {
        id: uuidv4(),
        message: 'Work order dispatched. Bitumen cold-mix patch team scheduled for tonight.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        author: 'GHMC East Operations',
      },
    ],
    coordinates: { lat: 17.4018, lng: 78.5602 },
    weatherData: {
      condition: 'Active Monsoon Rain & Flash Inundation',
      temperature: 24,
      isRaining: true,
      precipitation: 11.2,
      humidity: 91,
      rainStartTime: '10:45 AM',
      rainStopTime: '01:30 PM',
      weatherHazardRisk: 'CRITICAL',
      optimalDispatchTime: 'Today at 02:15 PM (Post-Rain Adhesion Window)',
      dryingWindow: '01:30 PM – 02:15 PM (45 mins solar evaporation)',
      actionProtocol: 'CRITICAL RAIN PROTOCOL: High water table. Deploy vacuum dewatering truck before laying cold-mix asphalt.',
      weatherAdvisory: 'Heavy downpour started at 10:45 AM. Rain forecasted to stop by 01:30 PM. Road surface currently submerged.',
    },
    weatherPriorityBoost: true,
    isDemo: true,
  },
  {
    ticketId: 'FMR-2026-1038',
    imageUrl: sampleImages.potholeWaterlogged,
    beforeImageUrl: sampleImages.potholeWaterlogged,
    afterImageUrl: sampleImages.resolvedRepaired1,
    location: 'Mallapur Industrial Road',
    landmark: 'Near Nacharam Bridge Junction & Gate 4',
    description: 'Persistent waterlogging caused full pavement disintegration across 2 meters width.',
    damageType: 'Waterlogged Cavity & Erosion',
    isPothole: true,
    severity: 'high',
    aiConfidence: 0.91,
    aiExplanation: 'Substantial multi-layer roadway cavity with standing storm water and structural sub-base collapse.',
    aiObservations: ['Standing water concealed crater depth', 'Eroded road shoulder', 'Industrial truck load stress fracture'],
    aiReviewRequired: false,
    isAiFallback: false,
    aiProvider: 'Google Gemini 1.5 Flash Vision',
    status: 'Resolved',
    assignedTeam: 'Cyberabad IT Corridor Road Tech Squad',
    assignedOfficer: 'Divisional Eng. M. Venkat',
    citizenReference: 'CIT-65239',
    upvotes: 68,
    upvotedBy: ['demo-voter-3', 'demo-voter-4'],
    resolutionNotes: 'Water pumped out, sub-base reconstructed with dense bituminous macadam (DBM) and sealed with 40mm asphalt concrete.',
    submittedAt: new Date(Date.now() - 96 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    repairVerification: {
      status: 'REPAIR_APPEARS_COMPLETE',
      aiConfidence: 0.94,
      aiExplanation: 'AI Vision comparison confirms fresh bituminous overlay flush with adjacent lane gradient.',
      observations: ['Hot-mix asphalt patch covers entire previous cavity', 'No standing water detected', 'Even surface finish'],
      visualMatchScore: 94,
      afterImageUrl: sampleImages.resolvedRepaired1,
      submittedAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
      verifiedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      officerVerdict: 'CONFIRMED_REPAIRED',
      officerNotes: 'Inspected and certified to municipal civil standard.',
      verifiedByOfficer: 'Divisional Eng. M. Venkat',
      isAiFallback: false,
      aiProvider: 'Google Gemini 1.5 Flash Vision',
    },
    communityVerifications: [
      {
        id: uuidv4(),
        verificationType: 'REPAIR_CONFIRMED',
        verifiedBy: 'auto-driver-hyd',
        submittedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        notes: 'Smooth ride now, road is clean.',
        isOfficerReviewed: true,
      },
    ],
    statusHistory: [
      {
        status: 'Submitted',
        changedAt: new Date(Date.now() - 96 * 60 * 60 * 1000),
        changedBy: 'Citizen Submission',
        notes: 'Submitted with photo evidence.',
      },
      {
        status: 'Under Review',
        changedAt: new Date(Date.now() - 84 * 60 * 60 * 1000),
        changedBy: 'Inspector David Paul',
        notes: 'Site inspected. Drainage clearing required before hot-mix application.',
      },
      {
        status: 'Assigned',
        changedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        changedBy: 'Zonal Superintending Engineer',
        notes: 'Assigned to Cyberabad IT Corridor Road Tech Squad.',
      },
      {
        status: 'Resolved',
        changedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        changedBy: 'Divisional Eng. M. Venkat',
        notes: 'Cavity excavated, compacted, and resurfaced. Photographic verification approved.',
      },
    ],
    officerNotes: [
      {
        id: uuidv4(),
        note: 'Completed under Emergency Monsoon Repair Fund voucher #EM-8841.',
        officerName: 'M. Venkat',
        createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
        isInternal: true,
      },
    ],
    publicUpdates: [
      {
        id: uuidv4(),
        message: 'Road fully resurfaced and opened for unrestricted vehicular transit. Verified by GHMC Quality Audit.',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        author: 'GHMC Quality Control',
      },
    ],
    coordinates: { lat: 17.4333, lng: 78.5721 },
    isDemo: true,
  },
  {
    ticketId: 'FMR-2026-1055',
    imageUrl: sampleImages.potholeMedium1,
    beforeImageUrl: sampleImages.potholeMedium1,
    location: 'Habsiguda Street 8',
    landmark: 'Behind NGRI Main Gate, near Community Park',
    description: 'Chipped bitumen creating sharp 3-inch ledge. Bicycles and rickshaws having difficult transit.',
    damageType: 'Pothole & Edge Breakdown',
    isPothole: true,
    severity: 'medium',
    aiConfidence: 0.88,
    aiExplanation: 'Localized asphalt fracture with loose gravel surrounding 3-inch depression.',
    aiObservations: ['Sharp cavity perimeter', 'Loose stone aggregate scattered on road surface'],
    aiReviewRequired: false,
    isAiFallback: false,
    aiProvider: 'Google Gemini 1.5 Flash Vision',
    status: 'Under Review',
    assignedTeam: '',
    assignedOfficer: 'Field Inspector Sneha Kulkarni',
    citizenReference: 'CIT-89012',
    upvotes: 19,
    submittedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    statusHistory: [
      {
        status: 'Submitted',
        changedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
        changedBy: 'Citizen Submission',
        notes: 'Complaint registered by local resident association member.',
      },
      {
        status: 'Under Review',
        changedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        changedBy: 'Inspector Sneha Kulkarni',
        notes: 'Verification underway; assessing queue against nearby pipeline trenching work.',
      },
    ],
    officerNotes: [],
    publicUpdates: [
      {
        id: uuidv4(),
        message: 'Complaint acknowledged by Ward 12 field inspector. On-site assessment pending.',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        author: 'Ward 12 Control Desk',
      },
    ],
    coordinates: { lat: 17.4178, lng: 78.5482 },
    isDemo: true,
  },
  {
    ticketId: 'FMR-2026-1061',
    imageUrl: sampleImages.potholeMedium2,
    beforeImageUrl: sampleImages.potholeMedium2,
    location: 'Tarnaka Flyover Underpass',
    landmark: 'Below Pillar T-14, Secunderabad bound lane',
    description: 'Multiple connected potholes in quick succession causing zig-zag braking behavior by RTC buses.',
    damageType: 'Clustered Asphalt Cavities',
    isPothole: true,
    severity: 'medium',
    aiConfidence: 0.86,
    aiExplanation: 'Multiple interconnected asphalt voids across vehicular wheel-path.',
    aiObservations: ['Cluster of 3 distinct cavities', 'Traffic slowing bottleneck hazard'],
    aiReviewRequired: false,
    isAiFallback: false,
    aiProvider: 'Google Gemini 1.5 Flash Vision',
    status: 'Submitted',
    assignedTeam: '',
    assignedOfficer: '',
    citizenReference: 'CIT-11234',
    upvotes: 31,
    submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    statusHistory: [
      {
        status: 'Submitted',
        changedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        changedBy: 'Citizen Submission',
        notes: 'Uploaded by commuter via mobile portal.',
      },
    ],
    officerNotes: [],
    publicUpdates: [
      {
        id: uuidv4(),
        message: 'Report received. Enqueued for zonal engineering inspection.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        author: 'Automated Ingestion',
      },
    ],
    coordinates: { lat: 17.4279, lng: 78.5342 },
    isDemo: true,
  },
  {
    ticketId: 'FMR-2026-1029',
    imageUrl: sampleImages.potholeSevere2,
    beforeImageUrl: sampleImages.potholeSevere2,
    location: 'LB Nagar Ring Road',
    landmark: 'Service Road merge point near Kamineni Hospital',
    description: 'Trench sinkage across median entrance. Heavy vibration felt by ambulances turning into emergency wing.',
    damageType: 'Trench Settlement & Cavity',
    isPothole: true,
    severity: 'high',
    aiConfidence: 0.95,
    aiExplanation: 'Significant structural trench depression with severe risk of vehicle undercarriage impact.',
    aiObservations: ['Deep crater crossing lane boundary', 'Urgent medical corridor vulnerability', 'Loose subgrade debris'],
    aiReviewRequired: false,
    isAiFallback: false,
    aiProvider: 'Google Gemini 1.5 Flash Vision',
    status: 'Assigned',
    assignedTeam: 'LB Nagar & Outer Ring Road Taskforce',
    assignedOfficer: 'Exec. Eng. Rameshwar Reddy',
    citizenReference: 'CIT-90312',
    upvotes: 84,
    submittedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    statusHistory: [
      {
        status: 'Submitted',
        changedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        changedBy: 'Citizen Submission',
        notes: 'High urgency reported by hospital ambulance driver.',
      },
      {
        status: 'Under Review',
        changedAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
        changedBy: 'Eng. K. Ramesh',
        notes: 'Confirmed critical medical transit hazard.',
      },
      {
        status: 'Assigned',
        changedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
        changedBy: 'Superintending Eng. LB Nagar',
        notes: 'Dispatched to LB Nagar & Outer Ring Road Taskforce.',
      },
    ],
    officerNotes: [
      {
        id: uuidv4(),
        note: 'Hospital administration notified that repair will commence tonight at 11 PM.',
        officerName: 'Rameshwar Reddy',
        createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
        isInternal: true,
      },
    ],
    publicUpdates: [
      {
        id: uuidv4(),
        message: 'Assigned to Taskforce. Site preparation initiated.',
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
        author: 'South Zonal Office',
      },
    ],
    coordinates: { lat: 17.3457, lng: 78.5522 },
    isDemo: true,
  },
  {
    ticketId: 'FMR-2026-1077',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80',
    beforeImageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80',
    location: 'Banjara Hills Road No. 12',
    landmark: 'Near MLA Colony Junction & Lotus Pond Curve',
    description: 'Cracked asphalt rim with sharp pothole cavity along steep incline. Two-wheelers lose traction during rain.',
    damageType: 'Asphalt Shear on Incline',
    isPothole: true,
    severity: 'high',
    aiConfidence: 0.93,
    aiExplanation: 'Steep road grade pothole with high dynamic shear stress from braking vehicles.',
    aiObservations: ['Incline slope hazard', 'Asphalt rim detachment > 5 inches', 'Rainwater runoff channelization'],
    aiReviewRequired: false,
    isAiFallback: false,
    aiProvider: 'Google Gemini 1.5 Flash Vision',
    status: 'Under Review',
    assignedTeam: '',
    assignedOfficer: 'Zonal Inspector Farhan Khan',
    citizenReference: 'CIT-34981',
    upvotes: 56,
    submittedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    statusHistory: [
      {
        status: 'Submitted',
        changedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
        changedBy: 'Citizen Submission',
        notes: 'Reported by commuter with geotagged photo.',
      },
      {
        status: 'Under Review',
        changedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        changedBy: 'Inspector Farhan Khan',
        notes: 'Priority slope inspection conducted. Cold mix patching enqueued.',
      },
    ],
    officerNotes: [],
    publicUpdates: [
      {
        id: uuidv4(),
        message: 'Under review by Central Zone engineering desk. Speed warning sign placed on slope.',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        author: 'GHMC Central Zone',
      },
    ],
    coordinates: { lat: 17.4156, lng: 78.4358 },
    isDemo: true,
  },
  {
    ticketId: 'FMR-2026-1085',
    imageUrl: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=900&q=80',
    beforeImageUrl: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=900&q=80',
    location: 'Gachibowli Outer Ring Road Slip Road',
    landmark: 'Adjacent to Biodiversity Park Flyover Exit',
    description: 'Pavement wear and surface depression near heavy tech corridor exit ramp.',
    damageType: 'Surface Depression & Cracking',
    isPothole: true,
    severity: 'medium',
    aiConfidence: 0.89,
    aiExplanation: 'Moderate surface depression in vehicular deceleration lane.',
    aiObservations: ['Moderate depth (2.5 inches)', 'Heavy evening transit zone'],
    aiReviewRequired: false,
    isAiFallback: false,
    aiProvider: 'Google Gemini 1.5 Flash Vision',
    status: 'Submitted',
    assignedTeam: '',
    assignedOfficer: '',
    citizenReference: 'CIT-55102',
    upvotes: 24,
    submittedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    statusHistory: [
      {
        status: 'Submitted',
        changedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        changedBy: 'Citizen Submission',
        notes: 'Submitted via FixMyRoad AI portal.',
      },
    ],
    officerNotes: [],
    publicUpdates: [
      {
        id: uuidv4(),
        message: 'Ticket enqueued for West Zone inspection.',
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000),
        author: 'Automated Ingestion',
      },
    ],
    coordinates: { lat: 17.4435, lng: 78.3772 },
    isDemo: true,
  },
];

async function seedDatabase() {
  try {
    console.log(`[Seed] Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);

    console.log('[Seed] Clearing existing demo records...');
    await Report.deleteMany({});

    const enrichedReports = sampleReports.map((r) => {
      const scoreResult = calculateNumericalSeverity({
        severity: r.severity,
        aiConfidence: r.aiConfidence,
        damageType: r.damageType,
        observations: r.aiObservations,
        location: r.location,
        description: r.description,
      });

      const now = Date.now();
      const daysUnresolved = Math.max(0, (now - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
      const hasWeatherHazard = Boolean(r.weatherPriorityBoost || r.weatherData?.isRaining);

      const riskResult = calculateUnifiedRoadRiskScore({
        severity: scoreResult.category,
        confidence: r.aiConfidence || 0.85,
        daysUnresolved,
        upvotes: r.upvotes || 1,
        hasWeatherHazard,
        isRecurrent: Boolean(r.recurrence?.isRecurrent),
        communityConfirmationsCount: r.communityVerifications?.length || 0,
      });

      const slaStatus = calculateSlaStatus(
        scoreResult.category,
        r.status as any,
        r.submittedAt,
        r.statusHistory || [],
        (r as any).resolvedAt
      );

      const smartRec = recommendRepairTeam(r.location, scoreResult.category, r.damageType);

      return {
        ...r,
        numericalSeverityScore: scoreResult.numericalScore,
        severityCategory: scoreResult.category,
        severityScoreBreakdown: scoreResult.breakdown,
        roadRiskScore: riskResult.score,
        riskCategory: riskResult.category,
        scoringExplanation: riskResult.explanation,
        evidenceQuality: riskResult.evidenceQuality,
        scoringVersion: 'v2.1-unified',
        scoringHistory: [
          {
            score: riskResult.score,
            category: riskResult.category,
            calculatedAt: new Date(),
            reason: 'Seeded initial baseline risk score',
            version: 'v2.1-unified',
          },
        ],
        sla: slaStatus,
        smartAssignmentRecommendation: {
          suggestedTeam: smartRec.suggestedTeam,
          teamId: smartRec.teamId,
          matchScore: smartRec.matchScore,
          reason: smartRec.reason,
          teamWorkloadCount: smartRec.teamWorkloadCount,
        },
      };
    });

    console.log(`[Seed] Inserting ${enrichedReports.length} enriched intelligence reports...`);
    await Report.insertMany(enrichedReports);

    console.log('[Seed] Successfully seeded FixMyRoad AI demonstration database!');
    console.log(`[Seed] Sample ticket IDs ready for testing:`);
    enrichedReports.forEach((r) => {
      console.log(`  - ${r.ticketId} (${r.status} | Score: ${r.numericalSeverityScore}/100 | Risk: ${r.roadRiskScore}/100 [${r.riskCategory.toUpperCase()}] | ${r.location})`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
