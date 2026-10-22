import assert from 'node:assert';
import {
  calculateUnifiedRoadRiskScore,
  calculateSlaStatus,
  recommendRepairTeam,
  calculateLocalityHealthIndex,
  detectRecurrence,
  MUNICIPAL_REPAIR_TEAMS,
} from '../services/intelligenceService.js';
import { calculateNumericalSeverity } from '../utils/severityScoring.js';

console.log('====================================================');
console.log('FIXMYROAD AI — INTELLIGENCE & VERIFICATION TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
    failedTests++;
  }
}

// 1. Unified Road-Risk Scoring Engine Tests
runTest('Unified Risk Score: Normalizes within bounds 0-100 and categories', () => {
  const result = calculateUnifiedRoadRiskScore({
    severity: 'critical',
    confidence: 0.95,
    daysUnresolved: 10,
    upvotes: 15,
    hasWeatherHazard: true,
    isRecurrent: true,
    communityConfirmationsCount: 3,
  });

  assert.ok(result.score >= 0 && result.score <= 100, 'Score must be between 0 and 100');
  assert.strictEqual(result.category, 'critical', 'Category should be critical for high inputs');
  assert.ok(result.explanation.includes('score'), 'Explanation should mention score');
  assert.strictEqual(result.version, 'v2.1-unified');
});

runTest('Unified Risk Score: Handles missing / low inputs gracefully without NaN', () => {
  const result = calculateUnifiedRoadRiskScore({
    severity: 'low',
    confidence: 0,
    daysUnresolved: 0,
    upvotes: 0,
    hasWeatherHazard: false,
  });

  assert.ok(!isNaN(result.score), 'Score should not be NaN');
  assert.ok(result.score >= 5, 'Score should have base minimum floor');
  assert.strictEqual(result.category, 'low');
});

// 2. Municipal Accountability & SLA Tracking Tests
runTest('SLA Tracker: Detects resolution breach when elapsed time exceeds target', () => {
  const pastDate = new Date(Date.now() - 150 * 60 * 60 * 1000); // 150 hours ago
  const sla = calculateSlaStatus('high', 'Assigned', pastDate, [
    { status: 'Submitted', changedAt: pastDate },
    { status: 'Assigned', changedAt: new Date(Date.now() - 100 * 60 * 60 * 1000) },
  ]);

  assert.strictEqual(sla.isResolutionBreached, true, 'Should mark resolution breached after 150h for high severity');
  assert.strictEqual(sla.isOverdue, true);
  assert.strictEqual(sla.escalationLevel, 'BREACHED_ESCALATED');
  assert.strictEqual(sla.delayStageAttribution, 'FIELD_RESOLUTION');
});

runTest('SLA Tracker: Resolved tickets within SLA are not marked overdue', () => {
  const submittedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const resolvedAt = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const sla = calculateSlaStatus(
    'medium',
    'Resolved',
    submittedAt,
    [
      { status: 'Submitted', changedAt: submittedAt },
      { status: 'Resolved', changedAt: resolvedAt },
    ],
    resolvedAt
  );

  assert.strictEqual(sla.isResolutionBreached, false);
  assert.strictEqual(sla.isOverdue, false);
});

// 3. Smart Repair-Team Assignment Tests
runTest('Smart Team Recommender: Matches locality and balances workload', () => {
  const rec = recommendRepairTeam('Uppal Ring Road Corridor', 'high', 'Pothole', MUNICIPAL_REPAIR_TEAMS);

  assert.ok(rec.suggestedTeam.length > 0, 'Should suggest a team name');
  assert.ok(rec.matchScore >= 50, 'Match score should be elevated for matching locality');
  assert.ok(rec.reason.length > 0, 'Should provide transparent explanation');
});

// 4. Locality Road Health Index Tests
runTest('Locality Road Health Index: 100 = Healthiest roads, penalizes unresolved craters', () => {
  const pristineReports: any[] = [];
  const pristine = calculateLocalityHealthIndex('Jubilee Hills', pristineReports);
  assert.strictEqual(pristine.healthIndex, 100, 'Empty area should have 100 health index');
  assert.strictEqual(pristine.healthTier, 'EXCELLENT');

  const distressedReports = [
    { status: 'Submitted', severity: 'high', submittedAt: new Date(Date.now() - 20 * 86400000), isRecurrent: true },
    { status: 'Under Review', severity: 'high', submittedAt: new Date(Date.now() - 15 * 86400000), isRecurrent: true },
    { status: 'Assigned', severity: 'high', submittedAt: new Date(Date.now() - 10 * 86400000), isRecurrent: false },
  ];
  const distressed = calculateLocalityHealthIndex('Uppal Heavy Corridor', distressedReports);
  assert.ok(distressed.healthIndex < 60, 'Distressed corridor must score lower health index');
  assert.strictEqual(distressed.healthTier, 'CRITICAL');
});

// 5. Pothole Recurrence Detection Tests
runTest('Recurrence Detection: Identifies nearby coordinates and matching historical repairs', () => {
  const history = [
    {
      ticketId: 'FMR-2025-001',
      location: 'Uppal Ring Road',
      status: 'Resolved',
      coordinates: { lat: 17.4018, lng: 78.5602 },
      submittedAt: new Date(Date.now() - 100 * 86400000),
      resolvedAt: new Date(Date.now() - 90 * 86400000),
    },
  ];

  const check = detectRecurrence(
    { lat: 17.4019, lng: 78.5601 }, // ~20 meters away
    'Uppal Ring Road',
    history
  );

  assert.strictEqual(check.isRecurrent, true);
  assert.strictEqual(check.recurrenceTier, 'LIKELY_RECURRENCE');
  assert.strictEqual(check.historicalRepairsCount, 1);
  assert.ok(check.matchingTickets.includes('FMR-2025-001'));
});

// 6. Numerical Severity Standardizer Tests
runTest('Severity Scoring: Computes deterministic 0-100 numerical score with factor breakdown', () => {
  const result = calculateNumericalSeverity({
    severity: 'high',
    aiConfidence: 0.95,
    damageType: 'Severe Crater',
    observations: ['Exposed aggregate', 'Sharp edge breakdown', 'Water logged'],
    location: 'Uppal',
    description: 'Deep hole',
  });

  assert.ok(result.numericalScore >= 80, 'High severity with critical observations should score >= 80');
  assert.strictEqual(result.category, 'critical');
  assert.ok(result.breakdown.aiDamagePoints > 0);
});

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
