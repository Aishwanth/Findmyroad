import mongoose from 'mongoose';
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { Report, ReportStatus, SeverityLevel } from '../models/Report.js';
import { analyzePotholeImage, analyzeImageFallback, verifyRepairImages } from '../services/aiService.js';
import { detectWeatherForLocation, getCoordinatesForLocation } from '../services/weatherService.js';
import { calculateNumericalSeverity } from '../utils/severityScoring.js';
import {
  calculateUnifiedRoadRiskScore,
  calculateSlaStatus,
  recommendRepairTeam,
  calculateLocalityHealthIndex,
  detectRecurrence,
  MUNICIPAL_REPAIR_TEAMS,
} from '../services/intelligenceService.js';

/**
 * Safe query builder for ticketId or ObjectId
 */
function buildIdOrTicketQuery(rawId: string | string[] | undefined) {
  const id = Array.isArray(rawId) ? rawId[0] : String(rawId || '');
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ ticketId: id }, { _id: id }] } : { ticketId: id };
}

/**
 * Generate human readable ticket ID e.g. FMR-2026-8492
 */
function generateTicketId(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `FMR-${year}-${randomSuffix}`;
}

/**
 * Enrich report document with live SLA, Risk Score, and Team recommendations
 */
function enrichReportDocument(report: any) {
  const now = Date.now();
  const daysUnresolved = Math.max(0, (now - new Date(report.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
  const hasWeatherHazard = Boolean(report.weatherPriorityBoost || report.weatherData?.isRaining);

  // Compute live unified road risk score
  const riskResult = calculateUnifiedRoadRiskScore({
    severity: report.severityCategory || report.severity || 'medium',
    confidence: report.aiConfidence || 0.85,
    daysUnresolved,
    upvotes: report.upvotes || 1,
    hasWeatherHazard,
    isRecurrent: Boolean(report.recurrence?.isRecurrent),
    communityConfirmationsCount: report.communityVerifications?.length || 0,
  });

  // Compute live SLA Status
  const slaStatus = calculateSlaStatus(
    report.severityCategory || report.severity || 'medium',
    report.status,
    report.submittedAt,
    report.statusHistory || [],
    report.resolvedAt
  );

  // Recommendation if not assigned
  const smartRec = recommendRepairTeam(
    report.location,
    report.severityCategory || report.severity || 'medium',
    report.damageType || 'Pothole'
  );

  return {
    ...report,
    roadRiskScore: riskResult.score,
    riskCategory: riskResult.category,
    scoringExplanation: riskResult.explanation,
    evidenceQuality: riskResult.evidenceQuality,
    sla: slaStatus,
    smartAssignmentRecommendation: report.smartAssignmentRecommendation || {
      suggestedTeam: smartRec.suggestedTeam,
      teamId: smartRec.teamId,
      matchScore: smartRec.matchScore,
      reason: smartRec.reason,
      teamWorkloadCount: smartRec.teamWorkloadCount,
    },
  };
}

/**
 * GET /api/reports
 * Fetch reports with filtering, search, sorting, and pagination
 */
export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const {
      status,
      severity,
      location,
      search,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
      page = '1',
      limit = '12',
    } = req.query;

    const filter: Record<string, any> = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (severity && severity !== 'all') {
      filter.severity = severity;
    }

    if (location && location !== 'all') {
      filter.location = { $regex: new RegExp(String(location), 'i') };
    }

    if (search && String(search).trim() !== '') {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { ticketId: searchRegex },
        { location: searchRegex },
        { landmark: searchRegex },
        { description: searchRegex },
        { assignedTeam: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(String(limit), 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const sortOption: Record<string, 1 | -1> = {
      weatherPriorityBoost: -1,
      [String(sortBy)]: sortOrder === 'asc' ? 1 : -1,
    };

    const [rawReports, total] = await Promise.all([
      Report.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
      Report.countDocuments(filter),
    ]);

    const enrichedReports = rawReports.map(enrichReportDocument);

    res.json({
      success: true,
      data: enrichedReports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[Reports] Error fetching reports:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve reports' });
  }
}

/**
 * GET /api/reports/:id
 * Fetch single report by ticketId or MongoDB _id
 */
export async function getReportById(req: Request, res: Response): Promise<void> {
  try {
    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id)).lean();

    if (!report) {
      res.status(404).json({ success: false, message: `Report ${req.params.id} not found` });
      return;
    }

    res.json({ success: true, data: enrichReportDocument(report) });
  } catch (error) {
    console.error('[Reports] Error fetching report by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve report' });
  }
}

/**
 * POST /api/ai/analyze
 * Standalone vision analysis for pre-submission preview
 */
export async function analyzeImageStandalone(req: Request, res: Response): Promise<void> {
  try {
    let filePath = '';
    let mimeType = 'image/jpeg';

    if (req.file) {
      filePath = req.file.path;
      mimeType = req.file.mimetype;
    } else if (req.body.imageUrl) {
      const imgUrl = req.body.imageUrl;
      if (imgUrl.startsWith('/uploads/')) {
        filePath = path.join(process.cwd(), imgUrl);
      }
    }

    const location = req.body.location || '';
    const description = req.body.description || '';

    let analysis;
    if (filePath && fs.existsSync(filePath)) {
      analysis = await analyzePotholeImage(filePath, mimeType, location, description);
    } else {
      analysis = analyzeImageFallback('', location, description);
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[AI] Standalone analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'AI analysis service encountered an error',
      data: analyzeImageFallback('', req.body.location, req.body.description),
    });
  }
}

/**
 * POST /api/reports
 * Submit a new report with photo, location, and intelligence enrichment
 */
export async function createReport(req: Request, res: Response): Promise<void> {
  try {
    const { location, landmark, description, damageType, citizenReference } = req.body;

    if (!location || location.trim() === '') {
      res.status(400).json({ success: false, message: 'Location is required' });
      return;
    }

    let imageUrl = '';
    let filePath = '';
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      filePath = req.file.path;
      mimeType = req.file.mimetype;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
      if (imageUrl.startsWith('/uploads/')) {
        filePath = path.join(process.cwd(), imageUrl);
      }
    } else {
      res.status(400).json({ success: false, message: 'Photo upload is required' });
      return;
    }

    // Run AI Analysis
    let aiResult;
    if (req.body.aiAssessment) {
      try {
        aiResult = typeof req.body.aiAssessment === 'string'
          ? JSON.parse(req.body.aiAssessment)
          : req.body.aiAssessment;
      } catch {
        aiResult = null;
      }
    }

    if (!aiResult) {
      if (filePath && fs.existsSync(filePath)) {
        aiResult = await analyzePotholeImage(filePath, mimeType, location, description);
      } else {
        aiResult = analyzeImageFallback(filePath, location, description);
      }
    }

    // Generate unique Ticket ID
    let ticketId = generateTicketId();
    let collision = await Report.findOne({ ticketId });
    while (collision) {
      ticketId = generateTicketId();
      collision = await Report.findOne({ ticketId });
    }

    // Detect Coordinates & Weather
    const userLat = req.body.lat ? parseFloat(req.body.lat) : undefined;
    const userLng = req.body.lng ? parseFloat(req.body.lng) : undefined;
    const coords = userLat && userLng ? { lat: userLat, lng: userLng } : getCoordinatesForLocation(location);

    let weatherData;
    if (req.body.weatherData) {
      try {
        weatherData = typeof req.body.weatherData === 'string' ? JSON.parse(req.body.weatherData) : req.body.weatherData;
      } catch {
        weatherData = null;
      }
    }
    if (!weatherData) {
      weatherData = await detectWeatherForLocation(location, userLat, userLng, description);
    }

    const weatherPriorityBoost = Boolean(weatherData.isRaining || weatherData.weatherHazardRisk === 'CRITICAL');

    let finalSeverity = aiResult.severity || 'medium';
    if (weatherPriorityBoost && finalSeverity !== 'high') {
      finalSeverity = 'high';
    }

    // Recurrence Detection across historical database
    const allPastReports = await Report.find({}).select('ticketId location status coordinates submittedAt resolvedAt').lean();
    const recurrenceCheck = detectRecurrence(coords, location, allPastReports.map(r => ({
      ticketId: r.ticketId,
      location: r.location,
      status: r.status,
      coordinates: r.coordinates,
      submittedAt: r.submittedAt,
      resolvedAt: r.resolvedAt,
    })));

    // Duplicate Check
    const recentDuplicate = await Report.findOne({
      location: { $regex: new RegExp(`^${location.trim()}$`, 'i') },
      status: { $ne: 'Resolved' },
      createdAt: { $gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    const duplicateOf = recentDuplicate ? recentDuplicate.ticketId : undefined;

    // Severity & Risk Scoring
    const scoreResult = calculateNumericalSeverity({
      severity: finalSeverity,
      aiConfidence: aiResult.confidence,
      damageType: damageType || aiResult.damageType,
      observations: aiResult.observations,
      location,
      description,
    });

    const unifiedRisk = calculateUnifiedRoadRiskScore({
      severity: scoreResult.category,
      confidence: aiResult.confidence || 0.85,
      daysUnresolved: 0,
      upvotes: 1,
      hasWeatherHazard: weatherPriorityBoost,
      isRecurrent: recurrenceCheck.isRecurrent,
    });

    // Smart team recommendation
    const smartRec = recommendRepairTeam(location, scoreResult.category, damageType || 'Pothole');

    // Default SLA setup
    const initialSla = calculateSlaStatus(
      scoreResult.category,
      'Submitted',
      new Date(),
      [{ status: 'Submitted', changedAt: new Date() }]
    );

    const report = new Report({
      ticketId,
      imageUrl,
      beforeImageUrl: imageUrl,
      location: location.trim(),
      landmark: landmark ? landmark.trim() : '',
      description: description ? description.trim() : '',
      damageType: damageType || 'Pothole',
      isPothole: aiResult.isPothole ?? true,
      severity: finalSeverity,
      numericalSeverityScore: scoreResult.numericalScore,
      severityCategory: scoreResult.category,
      roadRiskScore: unifiedRisk.score,
      riskCategory: unifiedRisk.category,
      scoringExplanation: unifiedRisk.explanation,
      evidenceQuality: unifiedRisk.evidenceQuality,
      scoringVersion: 'v2.1-unified',
      scoringHistory: [
        {
          score: unifiedRisk.score,
          category: unifiedRisk.category,
          calculatedAt: new Date(),
          reason: 'Initial intake assessment calculation',
          version: 'v2.1-unified',
        },
      ],
      severityScoreBreakdown: scoreResult.breakdown,
      aiConfidence: aiResult.confidence || 0.85,
      aiExplanation: aiResult.explanation || 'Visual analysis completed.',
      aiObservations: aiResult.observations || ['Asphalt cavity detected'],
      aiReviewRequired: aiResult.reviewRequired || false,
      isAiFallback: aiResult.isAiFallback || false,
      aiProvider: aiResult.aiProvider || 'heuristic-engine',
      status: 'Submitted',
      citizenReference: citizenReference || `CIT-${Math.floor(10000 + Math.random() * 90000)}`,
      upvotes: 1,
      duplicateOf,
      coordinates: coords,
      weatherData,
      weatherPriorityBoost,
      recurrence: recurrenceCheck,
      smartAssignmentRecommendation: {
        suggestedTeam: smartRec.suggestedTeam,
        teamId: smartRec.teamId,
        matchScore: smartRec.matchScore,
        reason: smartRec.reason,
        teamWorkloadCount: smartRec.teamWorkloadCount,
      },
      sla: initialSla,
      statusHistory: [
        {
          status: 'Submitted',
          changedAt: new Date(),
          changedBy: 'Citizen Submission',
          notes: weatherData.isRaining
            ? `Monsoon Emergency Logged: Active rainfall (${weatherData.rainStartTime} – ${weatherData.rainStopTime}). Optimal worker dispatch window: ${weatherData.optimalDispatchTime}.`
            : duplicateOf
            ? `Report logged. Potential proximity duplicate of ${duplicateOf}.`
            : recurrenceCheck.isRecurrent
            ? `Report logged. Flagged for Recurrence: ${recurrenceCheck.explanation}`
            : 'Initial complaint recorded in municipal queue.',
        },
      ],
      publicUpdates: [
        {
          id: uuidv4(),
          message: weatherData.isRaining
            ? `Weather Alert: Active rainfall detected. Optimal repair crew deployment window calculated: ${weatherData.optimalDispatchTime}.`
            : 'Your report has been received and queued for engineer review.',
          timestamp: new Date(),
          author: 'Civic Meteorological Triage',
        },
      ],
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: enrichReportDocument(report.toObject()),
    });
  } catch (error) {
    console.error('[Reports] Error creating report:', error);
    res.status(500).json({ success: false, message: 'Failed to create report' });
  }
}

/**
 * GET /api/reports/weather/current
 * Live weather forecast and climate detection for location
 */
export async function getLiveWeather(req: Request, res: Response): Promise<void> {
  try {
    const location = String(req.query.location || 'Hyderabad');
    const lat = req.query.lat ? parseFloat(String(req.query.lat)) : undefined;
    const lng = req.query.lng ? parseFloat(String(req.query.lng)) : undefined;
    const description = String(req.query.description || '');

    const weather = await detectWeatherForLocation(location, lat, lng, description);
    res.json({ success: true, data: weather });
  } catch (error) {
    console.error('[Weather] Error fetching live weather:', error);
    res.status(500).json({ success: false, message: 'Could not fetch weather forecast' });
  }
}

/**
 * PATCH /api/reports/:id/status
 * Update report status with workflow validation and SLA tracking
 */
export async function updateReportStatus(req: Request, res: Response): Promise<void> {
  try {
    const { status, officerName = 'Municipal Operations Officer', notes = '' } = req.body;

    const validStatuses: ReportStatus[] = ['Submitted', 'Under Review', 'Assigned', 'Resolved'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const prevStatus = report.status;
    report.status = status;
    report.updatedAt = new Date();

    if (status === 'Resolved' && !report.resolvedAt) {
      report.resolvedAt = new Date();
    }

    report.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: officerName,
      notes: notes || `Status updated from ${prevStatus} to ${status}`,
    });

    report.publicUpdates.push({
      id: uuidv4(),
      message: `Ticket status advanced to: ${status}. ${notes ? `(${notes})` : ''}`,
      timestamp: new Date(),
      author: officerName,
    });

    // Update SLA record
    report.sla = calculateSlaStatus(
      report.severityCategory || report.severity || 'medium',
      report.status,
      report.submittedAt,
      report.statusHistory,
      report.resolvedAt
    );

    await report.save();

    res.json({
      success: true,
      message: `Status transitioned to ${status}`,
      data: enrichReportDocument(report.toObject()),
    });
  } catch (error) {
    console.error('[Reports] Error updating status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
}

/**
 * PATCH /api/reports/:id/assignment
 * Assign team and officer with audit history
 */
export async function updateAssignment(req: Request, res: Response): Promise<void> {
  try {
    const { assignedTeam, assignedOfficer, officerName = 'Operations Superintendent', reason } = req.body;

    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    report.assignedTeam = assignedTeam;
    report.assignedOfficer = assignedOfficer;
    report.updatedAt = new Date();

    if (report.status === 'Submitted' || report.status === 'Under Review') {
      report.status = 'Assigned';
    }

    if (!report.assignmentHistory) {
      report.assignmentHistory = [];
    }

    report.assignmentHistory.push({
      teamName: assignedTeam,
      assignedBy: officerName,
      assignedAt: new Date(),
      reason: reason || 'Scheduled municipal crew dispatch',
    });

    report.statusHistory.push({
      status: report.status,
      changedAt: new Date(),
      changedBy: officerName,
      notes: `Assigned to team: "${assignedTeam}" (Officer: ${assignedOfficer || 'Unassigned'})`,
    });

    report.publicUpdates.push({
      id: uuidv4(),
      message: `Work order dispatched to repair crew: ${assignedTeam}.`,
      timestamp: new Date(),
      author: officerName,
    });

    // Recalculate SLA
    report.sla = calculateSlaStatus(
      report.severityCategory || report.severity || 'medium',
      report.status,
      report.submittedAt,
      report.statusHistory,
      report.resolvedAt
    );

    await report.save();

    res.json({
      success: true,
      message: 'Assignment recorded successfully',
      data: enrichReportDocument(report.toObject()),
    });
  } catch (error) {
    console.error('[Reports] Error updating assignment:', error);
    res.status(500).json({ success: false, message: 'Failed to update assignment' });
  }
}

/**
 * PATCH /api/reports/:id/severity
 * Authoritative officer correction of severity
 */
export async function updateSeverity(req: Request, res: Response): Promise<void> {
  try {
    const { severity, officerName = 'Municipal Engineer', notes = '' } = req.body;

    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      res.status(400).json({ success: false, message: 'Invalid severity level' });
      return;
    }

    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const prevSeverity = report.severity;
    const prevScore = report.numericalSeverityScore || 55;
    const prevCategory = report.severityCategory || prevSeverity;

    const scoreResult = calculateNumericalSeverity({
      severity: severity === 'critical' ? 'high' : severity,
      aiConfidence: report.aiConfidence,
      damageType: report.damageType,
      observations: report.aiObservations,
      location: report.location,
      description: report.description,
    });

    const newScore = req.body.numericalScore ? Number(req.body.numericalScore) : scoreResult.numericalScore;
    const category = severity === 'critical' ? 'critical' : scoreResult.category;

    report.severity = (severity === 'critical' ? 'high' : severity) as SeverityLevel;
    report.numericalSeverityScore = newScore;
    report.severityCategory = category;
    report.severityScoreBreakdown = scoreResult.breakdown;
    report.officerSeverityOverride = {
      originalScore: prevScore,
      originalCategory: prevCategory,
      overrideScore: newScore,
      overrideCategory: category,
      overriddenBy: officerName,
      overriddenAt: new Date(),
      reason: notes || 'Authoritative municipal officer field re-evaluation',
    };
    report.aiReviewRequired = false;
    report.updatedAt = new Date();

    if (!report.scoringHistory) {
      report.scoringHistory = [];
    }
    report.scoringHistory.push({
      score: newScore,
      category,
      calculatedAt: new Date(),
      reason: `Officer re-assessment by ${officerName}: ${notes}`,
      version: 'v2.1-unified',
    });

    report.statusHistory.push({
      status: report.status,
      changedAt: new Date(),
      changedBy: officerName,
      notes: `Severity re-evaluated from "${prevCategory.toUpperCase()} (${prevScore}/100)" to "${category.toUpperCase()} (${newScore}/100)". ${notes}`,
    });

    await report.save();

    res.json({
      success: true,
      message: `Severity successfully updated to ${severity}`,
      data: enrichReportDocument(report.toObject()),
    });
  } catch (error) {
    console.error('[Reports] Error updating severity:', error);
    res.status(500).json({ success: false, message: 'Failed to update severity' });
  }
}

/**
 * POST /api/reports/:id/verify-repair
 * AI-Assisted Repair Verification workflow
 */
export async function verifyRepairWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    let afterImageUrl = '';
    let afterFilePath = '';

    if (req.file) {
      afterImageUrl = `/uploads/${req.file.filename}`;
      afterFilePath = req.file.path;
    } else if (req.body.afterImageUrl) {
      afterImageUrl = req.body.afterImageUrl;
      if (afterImageUrl.startsWith('/uploads/')) {
        afterFilePath = path.join(process.cwd(), afterImageUrl);
      }
    } else {
      res.status(400).json({ success: false, message: 'After-repair photo is required for verification' });
      return;
    }

    // Locate before photo
    let beforeFilePath = '';
    const beforeUrl = report.beforeImageUrl || report.imageUrl;
    if (beforeUrl.startsWith('/uploads/')) {
      beforeFilePath = path.join(process.cwd(), beforeUrl);
    }

    const { officerVerdict, officerNotes, officerName = 'Municipal Quality Inspector' } = req.body;

    // Run AI comparison
    let aiVerification = await verifyRepairImages(
      beforeFilePath,
      afterFilePath,
      officerNotes || 'Asphalt patch inspection'
    );

    const verdict = officerVerdict || (aiVerification.status === 'REPAIR_APPEARS_COMPLETE' ? 'CONFIRMED_REPAIRED' : 'PENDING');

    report.afterImageUrl = afterImageUrl;
    report.repairVerification = {
      status: aiVerification.status,
      aiConfidence: aiVerification.confidence,
      aiExplanation: aiVerification.explanation,
      observations: aiVerification.observations,
      visualMatchScore: aiVerification.visualMatchScore,
      afterImageUrl,
      submittedAt: new Date(),
      verifiedAt: new Date(),
      officerVerdict: verdict,
      officerNotes: officerNotes || '',
      verifiedByOfficer: officerName,
      isAiFallback: aiVerification.isAiFallback,
      aiProvider: aiVerification.aiProvider,
    };

    if (verdict === 'CONFIRMED_REPAIRED') {
      report.status = 'Resolved';
      report.resolvedAt = new Date();
      report.resolutionNotes = officerNotes || 'Repair verified with before/after AI vision proof.';
    }

    report.statusHistory.push({
      status: report.status,
      changedAt: new Date(),
      changedBy: officerName,
      notes: `Repair verification submitted: ${verdict} (${aiVerification.status}, Match: ${aiVerification.visualMatchScore}%)`,
    });

    report.publicUpdates.push({
      id: uuidv4(),
      message: `Repair verification processed: ${verdict === 'CONFIRMED_REPAIRED' ? 'Completed and Signed Off' : 'Under Review'}.`,
      timestamp: new Date(),
      author: officerName,
    });

    await report.save();

    res.json({
      success: true,
      message: 'Repair verification completed',
      data: enrichReportDocument(report.toObject()),
    });
  } catch (error) {
    console.error('[Reports] Error verifying repair:', error);
    res.status(500).json({ success: false, message: 'Failed to verify repair' });
  }
}

/**
 * POST /api/reports/:id/resolve
 * Record repair completion, after-photo, and close ticket
 */
export async function resolveReport(req: Request, res: Response): Promise<void> {
  try {
    const { resolutionNotes, officerName = 'Site Inspector' } = req.body;

    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    let afterImageUrl = '';
    if (req.file) {
      afterImageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.afterImageUrl) {
      afterImageUrl = req.body.afterImageUrl;
    }

    if (afterImageUrl) {
      report.afterImageUrl = afterImageUrl;
    }

    report.status = 'Resolved';
    report.resolvedAt = new Date();
    report.updatedAt = new Date();
    report.resolutionNotes = resolutionNotes || 'Pothole cavity cold-mix patched and steam-rolled to grade.';

    report.statusHistory.push({
      status: 'Resolved',
      changedAt: new Date(),
      changedBy: officerName,
      notes: `Repair verified and marked complete. Notes: ${report.resolutionNotes}`,
    });

    report.publicUpdates.push({
      id: uuidv4(),
      message: `Road damage resolved. Repair work verified by ${officerName}. Inspection closed.`,
      timestamp: new Date(),
      author: officerName,
    });

    // Update SLA
    report.sla = calculateSlaStatus(
      report.severityCategory || report.severity || 'medium',
      report.status,
      report.submittedAt,
      report.statusHistory,
      report.resolvedAt
    );

    await report.save();

    res.json({
      success: true,
      message: 'Report resolved and closed with proof of repair',
      data: enrichReportDocument(report.toObject()),
    });
  } catch (error) {
    console.error('[Reports] Error resolving report:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve report' });
  }
}

/**
 * POST /api/reports/:id/community-verify
 * Citizen community verification ("STILL_DAMAGED", "REPAIR_CONFIRMED", etc.)
 */
export async function submitCommunityVerification(req: Request, res: Response): Promise<void> {
  try {
    const { verificationType, notes } = req.body;
    const voterId = req.ip || req.body.voterId || 'citizen-session';

    if (!['STILL_DAMAGED', 'REPAIR_CONFIRMED', 'PHOTO_UPDATE', 'INCORRECT_INFO'].includes(verificationType)) {
      res.status(400).json({ success: false, message: 'Invalid community verification type' });
      return;
    }

    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    if (!report.communityVerifications) {
      report.communityVerifications = [];
    }

    // Rate limit: 1 per user per ticket
    const alreadySubmitted = report.communityVerifications.find(
      (v) => v.verifiedBy === voterId && v.verificationType === verificationType
    );

    if (alreadySubmitted) {
      res.status(429).json({ success: false, message: 'You have already submitted this feedback for this ticket.' });
      return;
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    report.communityVerifications.push({
      id: uuidv4(),
      verificationType,
      verifiedBy: voterId,
      submittedAt: new Date(),
      notes: notes || '',
      imageUrl,
      isOfficerReviewed: false,
    });

    // If report was resolved but community reports STILL_DAMAGED, flag for review
    if (report.status === 'Resolved' && verificationType === 'STILL_DAMAGED') {
      report.aiReviewRequired = true;
      report.publicUpdates.push({
        id: uuidv4(),
        message: 'Community notification: Citizen reported surface defect persists after resolution. Queued for audit.',
        timestamp: new Date(),
        author: 'Community Verification Engine',
      });
    }

    await report.save();

    res.json({
      success: true,
      message: 'Community verification logged successfully',
      data: enrichReportDocument(report.toObject()),
    });
  } catch (error) {
    console.error('[Reports] Error logging community verification:', error);
    res.status(500).json({ success: false, message: 'Failed to record verification' });
  }
}

/**
 * PATCH /api/reports/:id/recurrence
 * Confirm or reject recurrence link by officer
 */
export async function confirmRecurrence(req: Request, res: Response): Promise<void> {
  try {
    const { confirmed, notes, officerName = 'Municipal Civil Engineer' } = req.body;

    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    if (!report.recurrence) {
      report.recurrence = {
        isRecurrent: Boolean(confirmed),
        recurrenceTier: confirmed ? 'LIKELY_RECURRENCE' : 'NONE',
        matchingTickets: [],
        historicalRepairsCount: 0,
        explanation: notes || 'Recurrence status updated by officer',
        officerConfirmed: confirmed,
      };
    } else {
      report.recurrence.officerConfirmed = confirmed;
      if (notes) report.recurrence.explanation = notes;
    }

    report.statusHistory.push({
      status: report.status,
      changedAt: new Date(),
      changedBy: officerName,
      notes: `Recurrence link ${confirmed ? 'CONFIRMED' : 'DISMISSED'}: ${notes || 'Engineering assessment recorded'}`,
    });

    await report.save();

    res.json({
      success: true,
      message: 'Recurrence record updated',
      data: enrichReportDocument(report.toObject()),
    });
  } catch (error) {
    console.error('[Reports] Error updating recurrence:', error);
    res.status(500).json({ success: false, message: 'Failed to update recurrence' });
  }
}

/**
 * GET /api/reports/teams
 * Returns municipal repair teams with active workload
 */
export async function getRepairTeams(req: Request, res: Response): Promise<void> {
  try {
    const reports = await Report.find({ status: 'Assigned' }).select('assignedTeam').lean();
    const teamCounts: Record<string, number> = {};

    reports.forEach((r) => {
      if (r.assignedTeam) {
        teamCounts[r.assignedTeam] = (teamCounts[r.assignedTeam] || 0) + 1;
      }
    });

    const teams = MUNICIPAL_REPAIR_TEAMS.map((t) => {
      const active = teamCounts[t.name] || teamCounts[t.id] || t.activeTickets;
      return {
        ...t,
        activeTickets: active,
        status: active >= t.maxCapacity ? 'FULL' : active >= t.maxCapacity * 0.7 ? 'HIGH_WORKLOAD' : 'AVAILABLE',
      };
    });

    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('[Reports] Error fetching repair teams:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve repair teams' });
  }
}

/**
 * GET /api/reports/health-index
 * Locality Road Health Index across all localities in the city
 */
export async function getLocalityRoadHealthIndex(req: Request, res: Response): Promise<void> {
  try {
    const allReports = await Report.find({}).select('location status severity submittedAt resolvedAt recurrence').lean();

    const localityGroups: Record<string, any[]> = {};

    allReports.forEach((r) => {
      let loc = r.location.split(',')[0].trim();
      if (loc.includes('Banjara')) loc = 'Banjara Hills';
      else if (loc.includes('Jubilee')) loc = 'Jubilee Hills';
      else if (loc.includes('Madhapur') || loc.includes('Hitec')) loc = 'Madhapur / Hitec City';
      else if (loc.includes('Gachibowli')) loc = 'Gachibowli';
      else if (loc.includes('Secunderabad')) loc = 'Secunderabad';
      else if (loc.includes('Uppal')) loc = 'Uppal';
      else if (loc.includes('Tarnaka')) loc = 'Tarnaka';
      else if (loc.includes('Charminar') || loc.includes('Abids')) loc = 'Charminar / Old City';

      if (!localityGroups[loc]) {
        localityGroups[loc] = [];
      }
      localityGroups[loc].push({
        status: r.status,
        severity: r.severity,
        submittedAt: r.submittedAt,
        resolvedAt: r.resolvedAt,
        isRecurrent: Boolean(r.recurrence?.isRecurrent),
      });
    });

    const results = Object.keys(localityGroups).map((loc) =>
      calculateLocalityHealthIndex(loc, localityGroups[loc])
    );

    results.sort((a, b) => a.healthIndex - b.healthIndex);

    const cityAvgHealth = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.healthIndex, 0) / results.length)
      : 100;

    res.json({
      success: true,
      data: {
        localities: results,
        cityAverageHealthIndex: cityAvgHealth,
        cityAverageTier: cityAvgHealth >= 85 ? 'EXCELLENT' : cityAvgHealth >= 68 ? 'GOOD' : cityAvgHealth >= 45 ? 'FAIR' : 'CRITICAL',
        totalLocalitiesEvaluated: results.length,
        methodology: 'Road Health Index (0-100, 100=Best) derived from unresolved complaint burden, high-severity craters, ticket aging, and recurrence rate.',
      },
    });
  } catch (error) {
    console.error('[Reports] Error calculating road health index:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate road health index' });
  }
}

/**
 * POST /api/reports/:id/upvote
 * Community citizen upvote toggle
 */
export async function upvoteReport(req: Request, res: Response): Promise<void> {
  try {
    const voterId = req.ip || req.body.voterId || 'anonymous-citizen';

    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const hasUpvoted = report.upvotedBy.includes(voterId);

    if (hasUpvoted) {
      report.upvotes = Math.max(1, report.upvotes - 1);
      report.upvotedBy = report.upvotedBy.filter((v) => v !== voterId);
    } else {
      report.upvotes += 1;
      report.upvotedBy.push(voterId);
    }

    await report.save();

    res.json({
      success: true,
      upvotes: report.upvotes,
      hasUpvoted: !hasUpvoted,
    });
  } catch (error) {
    console.error('[Reports] Error upvoting:', error);
    res.status(500).json({ success: false, message: 'Failed to record upvote' });
  }
}

/**
 * POST /api/reports/:id/notes
 * Append internal officer note
 */
export async function addOfficerNote(req: Request, res: Response): Promise<void> {
  try {
    const { note, officerName = 'Municipal Officer', isInternal = true } = req.body;

    if (!note || note.trim() === '') {
      res.status(400).json({ success: false, message: 'Note text is required' });
      return;
    }

    const report = await Report.findOne(buildIdOrTicketQuery(req.params.id));

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    report.officerNotes.push({
      id: uuidv4(),
      note: note.trim(),
      officerName,
      createdAt: new Date(),
      isInternal,
    });

    await report.save();

    res.json({ success: true, data: report.officerNotes });
  } catch (error) {
    console.error('[Reports] Error adding officer note:', error);
    res.status(500).json({ success: false, message: 'Failed to add officer note' });
  }
}

/**
 * DELETE /api/reports/:id
 * Remove a complaint directly from MongoDB database
 */
export async function deleteReport(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await Report.findOneAndDelete(buildIdOrTicketQuery(req.params.id));

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Report not found to delete' });
      return;
    }

    res.json({
      success: true,
      message: `Report ${deleted.ticketId} successfully removed from database`,
      ticketId: deleted.ticketId,
    });
  } catch (error) {
    console.error('[Reports] Error deleting report:', error);
    res.status(500).json({ success: false, message: 'Failed to delete report from database' });
  }
}

/**
 * GET /api/reports/top-worst
 * Returns Top Worst Potholes ranked by transparent priority scoring model
 */
export async function getTopWorstPotholes(req: Request, res: Response): Promise<void> {
  try {
    const { locality, severity, filterMode = 'all', limit = '5' } = req.query;

    const query: Record<string, any> = {
      status: { $ne: 'Resolved' },
    };

    if (locality && locality !== 'all') {
      query.$or = [
        { location: { $regex: new RegExp(String(locality), 'i') } },
        { landmark: { $regex: new RegExp(String(locality), 'i') } },
      ];
    }

    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    const reports = await Report.find(query).lean();
    const now = Date.now();

    const scoredReports = reports.map((r) => {
      const severityPts = r.severity === 'high' ? 50 : r.severity === 'medium' ? 30 : 10;
      const daysOpen = Math.max(0, (now - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
      const agePts = Math.min(30, Math.round(daysOpen * 3));
      const upvotePts = Math.min(20, Math.round((r.upvotes || 0) * 1.5));
      const rainPts = r.weatherPriorityBoost || r.weatherData?.isRaining ? 15 : 0;
      const recurrencePts = r.recurrence?.isRecurrent ? 10 : 0;

      const priorityScore = severityPts + agePts + upvotePts + rainPts + recurrencePts;
      const numScore = r.numericalSeverityScore || (r.severity === 'high' ? 88 : r.severity === 'medium' ? 55 : 25);
      const sevCategory = r.severityCategory || (numScore >= 80 ? 'critical' : numScore >= 60 ? 'high' : numScore >= 30 ? 'medium' : 'low');

      return enrichReportDocument({
        ...r,
        priorityScore,
        numericalSeverityScore: numScore,
        severityCategory: sevCategory,
        scoreBreakdown: {
          severityPoints: severityPts,
          agingPoints: agePts,
          upvotePoints: upvotePts,
          rainHazardBonus: rainPts,
          daysUnresolved: Math.round(daysOpen * 10) / 10,
        },
      });
    });

    let filtered = scoredReports;
    if (filterMode === 'high') {
      filtered = filtered.filter((r) => r.severity === 'high' || r.severityCategory === 'critical');
    } else if (filterMode === 'overdue') {
      filtered = [...filtered].sort((a, b) => b.scoreBreakdown.agingPoints - a.scoreBreakdown.agingPoints);
    } else if (filterMode === 'upvoted') {
      filtered = [...filtered].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    if (filterMode !== 'overdue' && filterMode !== 'upvoted') {
      filtered.sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });
    }

    const limitNum = Math.max(1, Math.min(20, parseInt(String(limit), 10) || 5));
    const topResults = filtered.slice(0, limitNum);

    res.json({
      success: true,
      data: topResults,
      totalCandidates: filtered.length,
      scoringModel: {
        highSeverity: '50 pts',
        mediumSeverity: '30 pts',
        lowSeverity: '10 pts',
        agingFactor: '3 pts / day (max 30)',
        upvoteFactor: '1.5 pts / vote (max 20)',
        rainHazardBonus: '15 pts',
        recurrenceBonus: '10 pts',
      },
    });
  } catch (error) {
    console.error('[Reports] Error fetching top worst potholes:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve top worst potholes' });
  }
}

/**
 * GET /api/reports/top-worst/pdf
 * Generates an authoritative municipal PDF report of the Top 5 Worst Potholes
 */
export async function getTopWorstPotholesPdf(req: Request, res: Response): Promise<void> {
  try {
    const { locality, severity, filterMode = 'all' } = req.query;

    const query: Record<string, any> = {
      status: { $ne: 'Resolved' },
    };

    if (locality && locality !== 'all') {
      query.$or = [
        { location: { $regex: new RegExp(String(locality), 'i') } },
        { landmark: { $regex: new RegExp(String(locality), 'i') } },
      ];
    }

    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    const reports = await Report.find(query).lean();
    const now = Date.now();

    const scoredReports = reports.map((r) => {
      const severityPts = r.severity === 'high' ? 50 : r.severity === 'medium' ? 30 : 10;
      const daysOpen = Math.max(0, (now - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
      const agePts = Math.min(30, Math.round(daysOpen * 3));
      const upvotePts = Math.min(20, Math.round((r.upvotes || 0) * 1.5));
      const rainPts = r.weatherPriorityBoost || r.weatherData?.isRaining ? 15 : 0;

      const priorityScore = severityPts + agePts + upvotePts + rainPts;
      const numScore = r.numericalSeverityScore || (r.severity === 'high' ? 88 : r.severity === 'medium' ? 55 : 25);
      const sevCat = r.severityCategory || (numScore >= 80 ? 'critical' : numScore >= 60 ? 'high' : 'medium');

      return {
        ...r,
        priorityScore,
        numericalSeverityScore: numScore,
        severityCategory: sevCat,
        scoreBreakdown: {
          severityPoints: severityPts,
          agingPoints: agePts,
          upvotePoints: upvotePts,
          rainHazardBonus: rainPts,
          daysUnresolved: Math.round(daysOpen * 10) / 10,
        },
      };
    });

    let filtered = scoredReports;
    if (filterMode === 'high') {
      filtered = filtered.filter((r) => r.severity === 'high' || r.severityCategory === 'critical');
    } else if (filterMode === 'overdue') {
      filtered = [...filtered].sort((a, b) => b.scoreBreakdown.agingPoints - a.scoreBreakdown.agingPoints);
    } else if (filterMode === 'upvoted') {
      filtered = [...filtered].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    if (filterMode !== 'overdue' && filterMode !== 'upvoted') {
      filtered.sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });
    }

    const top5 = filtered.slice(0, 5);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `FixMyRoad_Top5_Worst_Potholes_${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // Top Header Banner
    doc.rect(40, 40, 515, 55).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('FIXMYROAD AI', 55, 50);
    doc.fontSize(8.5).font('Helvetica').fillColor('#22c55e').text('MUNICIPAL INFRASTRUCTURE & CIVIC ROAD SAFETY REPORT', 55, 70);
    doc.fontSize(7.5).fillColor('#94a3b8').text(`Generated: ${new Date().toLocaleString()} | Scope: ${locality && locality !== 'all' ? locality : 'City-Wide'}`, 300, 70, { align: 'right', width: 240 });

    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Top 5 Worst Potholes in Your City — Priority Assessment', 40, 110);
    doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Authoritative prioritization computed from computer vision severity, aging duration, citizen upvotes, recurrence history, and weather hazards.', 40, 126);

    // Summary Box
    doc.rect(40, 142, 515, 38).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
    doc.text(`Total Candidates Evaluated: ${filtered.length}`, 52, 150);
    doc.text(`High / Critical Hazards: ${top5.filter(r => r.severity === 'high' || r.severityCategory === 'critical').length}`, 220, 150);
    doc.text(`Municipal SLA Target: 24–48 Hours`, 380, 150);
    doc.font('Helvetica').fillColor('#64748b').text('Scoring Model: High Severity (50pts) + Aging (3pts/day, max 30) + Upvotes (1.5pts/ea, max 20) + Rain Flood Bonus (15pts) + Recurrence (10pts)', 52, 163);

    let yPos = 192;
    top5.forEach((item, idx) => {
      if (yPos > 690) {
        doc.addPage();
        yPos = 50;
      }

      const cardHeight = 92;
      const isCritical = item.numericalSeverityScore >= 80 || item.severity === 'high';
      const badgeBg = isCritical ? '#fee2e2' : '#fef3c7';
      const badgeText = isCritical ? '#991b1b' : '#92400e';

      doc.rect(40, yPos, 515, cardHeight).fill('#ffffff').stroke('#cbd5e1');

      // Rank Accent Strip
      doc.rect(40, yPos, 38, cardHeight).fill(idx === 0 ? '#15803d' : idx === 1 ? '#047857' : '#334155');
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(`#${idx + 1}`, 44, yPos + 36, { width: 30, align: 'center' });

      // Location & Ticket
      doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold').text(item.location, 88, yPos + 8, { width: 280 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text(`Landmark: ${item.landmark || 'N/A'}  |  Ticket ID: ${item.ticketId}`, 88, yPos + 22, { width: 280 });

      // Severity Pill
      doc.rect(380, yPos + 8, 165, 18).fill(badgeBg);
      doc.fillColor(badgeText).fontSize(7.5).font('Helvetica-Bold').text(`${(item.severityCategory || 'HIGH').toUpperCase()} — ${item.numericalSeverityScore}/100`, 385, yPos + 13, { width: 155, align: 'center' });

      // AI Summary
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(`AI Assessment: ${item.aiExplanation || item.description || 'Pothole cavity verified by computer vision.'}`, 88, yPos + 36, { width: 455 });

      // Bottom Metadata Row
      const daysOpenStr = `${item.scoreBreakdown.daysUnresolved} days unresolved`;
      const upvotesStr = `${item.upvotes || 0} community upvotes`;
      const coordsStr = item.coordinates ? `GPS: ${item.coordinates.lat.toFixed(4)}, ${item.coordinates.lng.toFixed(4)}` : 'GPS: Approximate';
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(`Status: ${item.status.toUpperCase()}  |  ${daysOpenStr}  |  ${upvotesStr}  |  ${coordsStr}  |  Priority: ${item.priorityScore} pts`, 88, yPos + 74, { width: 455 });

      yPos += cardHeight + 12;
    });

    // Report Footer
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text(
      'Disclaimer: FixMyRoad AI generates advisory severity estimates to support municipal operations dispatch. Official engineering field inspection is recommended prior to asphalt resurfacing.',
      40,
      780,
      { width: 515, align: 'center' }
    );

    doc.end();
  } catch (error) {
    console.error('[Reports] Error generating Top 5 PDF report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
  }
}

/**
 * GET /api/reports/hotspots
 * Aggregates road damage hotspots by locality/corridor
 */
export async function getHotspots(req: Request, res: Response): Promise<void> {
  try {
    const reports = await Report.find({ status: { $ne: 'Resolved' } }).lean();
    const now = Date.now();

    const areaMap: Record<
      string,
      {
        id: string;
        locality: string;
        reports: any[];
        unresolvedCount: number;
        highSeverityCount: number;
        mediumSeverityCount: number;
        lowSeverityCount: number;
        highestRiskScore: number;
        totalDaysOpen: number;
        recurringCount: number;
        coordinates?: { lat: number; lng: number };
        sampleTicketIds: string[];
      }
    > = {};

    for (const r of reports) {
      let locName = r.location;
      if (locName.includes('Uppal')) locName = 'Uppal Corridor';
      else if (locName.includes('Mallapur') || locName.includes('Nacharam')) locName = 'Mallapur - Nacharam Industrial';
      else if (locName.includes('Habsiguda')) locName = 'Habsiguda Main';
      else if (locName.includes('Tarnaka')) locName = 'Tarnaka Flyover Zone';
      else if (locName.includes('Banjara')) locName = 'Banjara Hills';
      else if (locName.includes('Gachibowli')) locName = 'Gachibowli Outer';
      else if (locName.includes('Hitec') || locName.includes('Madhapur')) locName = 'Hitec City - Madhapur';
      else if (locName.includes('Secunderabad')) locName = 'Secunderabad Cantonment';
      else {
        locName = r.location.split(',')[0].trim();
      }

      if (!areaMap[locName]) {
        areaMap[locName] = {
          id: `HS-${locName.replace(/\s+/g, '-').toUpperCase()}`,
          locality: locName,
          reports: [],
          unresolvedCount: 0,
          highSeverityCount: 0,
          mediumSeverityCount: 0,
          lowSeverityCount: 0,
          highestRiskScore: 0,
          totalDaysOpen: 0,
          recurringCount: 0,
          coordinates: r.coordinates,
          sampleTicketIds: [],
        };
      }

      const daysOpen = Math.max(0, (now - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
      areaMap[locName].reports.push(r);
      areaMap[locName].sampleTicketIds.push(r.ticketId);
      areaMap[locName].unresolvedCount += 1;
      areaMap[locName].totalDaysOpen += daysOpen;

      const riskScore = r.numericalSeverityScore || (r.severity === 'high' ? 85 : 50);
      if (riskScore > areaMap[locName].highestRiskScore) {
        areaMap[locName].highestRiskScore = riskScore;
      }

      if (r.severity === 'high') areaMap[locName].highSeverityCount += 1;
      else if (r.severity === 'medium') areaMap[locName].mediumSeverityCount += 1;
      else areaMap[locName].lowSeverityCount += 1;

      if (r.recurrence?.isRecurrent) {
        areaMap[locName].recurringCount += 1;
      }

      if (!areaMap[locName].coordinates && r.coordinates) {
        areaMap[locName].coordinates = r.coordinates;
      }
    }

    const hotspots = Object.values(areaMap).map((area) => {
      const avgAgeDays =
        area.unresolvedCount > 0 ? Math.round((area.totalDaysOpen / area.unresolvedCount) * 10) / 10 : 0;
      const severityWeightedBurden =
        area.highSeverityCount * 3 + area.mediumSeverityCount * 2 + area.lowSeverityCount * 1;

      return {
        id: area.id,
        locality: area.locality,
        unresolvedCount: area.unresolvedCount,
        highSeverityCount: area.highSeverityCount,
        mediumSeverityCount: area.mediumSeverityCount,
        lowSeverityCount: area.lowSeverityCount,
        highestRiskScore: area.highestRiskScore,
        avgAgeDays,
        severityWeightedBurden,
        recurringCount: area.recurringCount,
        coordinates: area.coordinates,
        sampleTicketIds: area.sampleTicketIds.slice(0, 4),
        lastUpdated: new Date().toISOString(),
      };
    });

    hotspots.sort((a, b) => b.severityWeightedBurden - a.severityWeightedBurden);

    res.json({
      success: true,
      data: hotspots.slice(0, 6),
    });
  } catch (error) {
    console.error('[Reports] Error calculating hotspots:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate hotspots' });
  }
}

/**
 * GET /api/reports/map
 * Returns verified reports with coordinates for the interactive map
 */
export async function getMapReports(req: Request, res: Response): Promise<void> {
  try {
    const { status, severity, locality } = req.query;
    const filter: Record<string, any> = {
      'coordinates.lat': { $exists: true, $ne: null },
      'coordinates.lng': { $exists: true, $ne: null },
    };

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (severity && severity !== 'all') {
      filter.severity = severity;
    }
    if (locality && locality !== 'all') {
      filter.$or = [
        { location: { $regex: new RegExp(String(locality), 'i') } },
        { landmark: { $regex: new RegExp(String(locality), 'i') } },
      ];
    }

    const reports = await Report.find(filter)
      .select('ticketId imageUrl location landmark severity numericalSeverityScore severityCategory status coordinates upvotes submittedAt weatherData damageType aiExplanation recurrence repairVerification')
      .lean();

    res.json({
      success: true,
      data: reports,
      totalOnMap: reports.length,
    });
  } catch (error) {
    console.error('[Reports] Error fetching map reports:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve map reports' });
  }
}
