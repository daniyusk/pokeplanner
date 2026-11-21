export const STAT_BIAS_DIFF_THRESHOLD = 15;

export const DEFENSE_SEVERITY_THRESHOLDS = {
  criticalUncoveredWeakMin: 3,
  criticalQuadComboWeakMin: 2,
  warningAnyWeakMin: 3,
  warningUncoveredWeakMin: 2,
  strongMitigationMin: 2,
} as const;

export const ANALYSIS_INSIGHT_THRESHOLDS = {
  minMembersForOffense: 2,
  minMembersForFullOffense: 3,
  minMembersForStatBias: 3,
  minDamagingMovesForSkewCheck: 4,
  lowSpeedPeakThreshold: 80,
  lowSpeedAvgThreshold: 65,
} as const;

export const POKEMON_RECOMMENDER_WEIGHTS = {
  defaultLimit: 12,
  abilityImmunityMitigationWeight: 2,
  abilityResistMitigationWeight: 1,
  defense: {
    immuneCritical: 24,
    immuneWarning: 14,
    immuneMinor: 5,
    resistCritical: 18,
    resistWarning: 10,
    resistMinor: 4,
    quadResistMultiplier: 1.3,
    quadWeakPenalty: 18,
    doubleWeakPenalty: 11,
    addedExposurePenalty: 2,
    maxSummaryTypes: 3,
  },
  offense: {
    blindSpotPerHit: 9,
    generalPerHit: 2.5,
    maxScore: 34,
    maxSummaryTypes: 4,
  },
  role: {
    minBiasAttackersForNeed: 2,
    firepowerMinStat: 95,
    firepowerBonus: 14,
    lowTeamSpeedPeak: 95,
    highCandidateSpeed: 100,
    speedBonus: 12,
    lowTeamBulkAvg: 80,
    highCandidateBulkAvg: 95,
    bulkBonus: 8,
    highImpactThreshold: 14,
  },
  viability: {
    secondaryOffenseWeight: 0.35,
    bstBaseline: 340,
    bstDivisor: 14,
    maxBstScore: 16,
  },
  fitThresholds: {
    topSynergy: 38,
    strongFit: 24,
  },
} as const;

export const BUILD_RECOMMENDER_WEIGHTS = {
  abilityFallbackScore: 10,
  abilityImmunityTeamNeed: 85,
  abilityImmunityGeneral: 62,
  abilityResistTeamNeed: 50,
  abilityResistGeneral: 35,
  nature: {
    offensiveStatDiff: 10,
    fastSpeedThreshold: 80,
  },
  item: {
    evioliteMinGen: 5,
    quadGroundThreshold: 4,
    bulkyAvgThreshold: 92,
    lowOffenseThreshold: 85,
    sweeperSpeedThreshold: 85,
    sweeperOffenseThreshold: 95,
  },
  move: {
    stabMultiplier: 1.5,
    selfKoOrRechargePenalty: 0.45,
    priorityBonus: 18,
    categoryMismatchPenalty: 0.45,
    blindSpotBonus: 22,
    matchingStabBonus: 20,
    maxCoveragePreUtility: 3,
    maxSummaryBlindSpots: 2,
  },
} as const;
