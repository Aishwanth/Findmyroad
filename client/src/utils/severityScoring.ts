export type SeverityCategory = 'low' | 'medium' | 'high' | 'critical';

export interface ISeverityScoreBreakdown {
  aiDamagePoints: number; // up to 50
  dimensionPoints: number; // up to 20
  roadRiskPoints: number; // up to 20
  confidencePoints: number; // up to 10
  isEstimatedDimension: boolean;
}

export interface ISeverityScoreResult {
  numericalScore: number; // 0 - 100
  category: SeverityCategory; // 'low' | 'medium' | 'high' | 'critical'
  breakdown: ISeverityScoreBreakdown;
  label: string; // e.g. "HIGH SEVERITY — 85/100"
}

export function getCategoryFromScore(score: number): SeverityCategory {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export function calculateNumericalSeverity(params: {
  severity: string;
  aiConfidence?: number;
  damageType?: string;
  observations?: string[];
  location?: string;
  description?: string;
}): ISeverityScoreResult {
  // 1. AI damage points (up to 50)
  let aiDamagePoints = 30;
  const sev = (params.severity || 'medium').toLowerCase();
  if (sev === 'high' || sev === 'critical') {
    aiDamagePoints = 48;
  } else if (sev === 'medium') {
    aiDamagePoints = 32;
  } else {
    aiDamagePoints = 15;
  }

  // 2. Dimension / Depth points (up to 20)
  let dimensionPoints = 10;
  let isEstimatedDimension = false;
  const descLower = `${params.description || ''} ${params.damageType || ''} ${(params.observations || []).join(' ')}`.toLowerCase();

  if (
    descLower.includes('deep') ||
    descLower.includes('5 inch') ||
    descLower.includes('6 inch') ||
    descLower.includes('trench') ||
    descLower.includes('large cavity') ||
    descLower.includes('crater')
  ) {
    dimensionPoints = 18;
    isEstimatedDimension = true;
  } else if (
    descLower.includes('3 inch') ||
    descLower.includes('4 inch') ||
    descLower.includes('moderate') ||
    descLower.includes('depression')
  ) {
    dimensionPoints = 12;
    isEstimatedDimension = true;
  } else if (
    descLower.includes('shallow') ||
    descLower.includes('surface') ||
    descLower.includes('minor') ||
    descLower.includes('edge breakdown')
  ) {
    dimensionPoints = 6;
    isEstimatedDimension = true;
  } else {
    dimensionPoints = sev === 'high' ? 15 : sev === 'medium' ? 10 : 5;
  }

  // 3. Road-User Risk (up to 20)
  let roadRiskPoints = 10;
  const locLower = `${params.location || ''} ${params.description || ''}`.toLowerCase();
  if (
    locLower.includes('ring road') ||
    locLower.includes('flyover') ||
    locLower.includes('highway') ||
    locLower.includes('expressway') ||
    locLower.includes('incline') ||
    locLower.includes('main road') ||
    locLower.includes('junction')
  ) {
    roadRiskPoints = 18;
  } else if (
    locLower.includes('arterial') ||
    locLower.includes('corridor') ||
    locLower.includes('avenue') ||
    locLower.includes('market')
  ) {
    roadRiskPoints = 14;
  } else {
    roadRiskPoints = 8;
  }

  // 4. Confidence points (up to 10)
  const conf = params.aiConfidence != null ? params.aiConfidence : 0.85;
  const confidencePoints = Math.min(10, Math.max(2, Math.round(conf * 10)));

  const totalRaw = aiDamagePoints + dimensionPoints + roadRiskPoints + confidencePoints;
  const numericalScore = Math.min(100, Math.max(5, Math.round(totalRaw)));
  const category = getCategoryFromScore(numericalScore);

  const label = `${category.toUpperCase()} SEVERITY — ${numericalScore}/100`;

  return {
    numericalScore,
    category,
    breakdown: {
      aiDamagePoints,
      dimensionPoints,
      roadRiskPoints,
      confidencePoints,
      isEstimatedDimension,
    },
    label,
  };
}
