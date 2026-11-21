import { ANALYSIS_INSIGHT_THRESHOLDS } from '@/domain/constants';
import type { DexGateway, GameContext, PokemonType, Team } from '@/domain/types';
import { analyzeTeamDefense, type DefensiveProfile } from './defensiveAnalysis';
import { analyzeTeamOffense, type OffensiveCoverage } from './offensiveAnalysis';
import { analyzeTeamStats, type TeamStatProfile } from './statAnalysis';

export interface TeamInsight {
  id: string;
  severity: 'danger' | 'warning' | 'positive';
  category: 'defense' | 'offense' | 'stats';
  title: string;
  detail: string;
  types?: readonly PokemonType[];
}

export interface TeamAnalysisReport {
  memberCount: number;
  defense: DefensiveProfile;
  offense: OffensiveCoverage;
  stats: TeamStatProfile;
  insights: readonly TeamInsight[];
}

function buildInsights(
  defense: DefensiveProfile,
  offense: OffensiveCoverage,
  stats: TeamStatProfile,
): TeamInsight[] {
  if (stats.memberCount === 0) return [];

  const insights: TeamInsight[] = [];

  if (defense.criticalWeaknesses.length > 0) {
    insights.push({
      id: 'critical-weaknesses',
      severity: 'danger',
      category: 'defense',
      title: `Critical shared weakness to ${defense.criticalWeaknesses.join(', ')}`,
      detail:
        '3 or more teammates take super-effective damage with zero resistances or immunities.',
      types: defense.criticalWeaknesses,
    });
  } else if (defense.uncoveredWeaknesses.length > 0) {
    insights.push({
      id: 'uncovered-weaknesses',
      severity: 'warning',
      category: 'defense',
      title: `Uncovered weaknesses: ${defense.uncoveredWeaknesses.join(', ')}`,
      detail: 'Multiple team members are weak to these types without a safe switch-in resistance.',
      types: defense.uncoveredWeaknesses,
    });
  }

  const activeBlindSpots = offense.hasDamagingMoves
    ? offense.movesetBlindSpots
    : offense.stabBlindSpots;

  if (
    activeBlindSpots.length > 0 &&
    stats.memberCount >= ANALYSIS_INSIGHT_THRESHOLDS.minMembersForOffense
  ) {
    const modeLabel = offense.hasDamagingMoves ? 'selected moveset' : 'STAB typing';
    insights.push({
      id: 'offensive-blind-spots',
      severity: 'warning',
      category: 'offense',
      title: `${activeBlindSpots.length} offensive blind spot${activeBlindSpots.length === 1 ? '' : 's'} (${modeLabel})`,
      detail: `Your team currently lacks super-effective hits against: ${activeBlindSpots.join(', ')}.`,
      types: activeBlindSpots,
    });
  } else if (
    stats.memberCount >= ANALYSIS_INSIGHT_THRESHOLDS.minMembersForFullOffense &&
    activeBlindSpots.length === 0
  ) {
    insights.push({
      id: 'complete-offense',
      severity: 'positive',
      category: 'offense',
      title: 'Full super-effective type coverage',
      detail: offense.hasDamagingMoves
        ? 'Your configured moveset hits every single type super-effectively.'
        : 'Your team STABs already hit every single type super-effectively.',
    });
  }

  if (stats.memberCount >= ANALYSIS_INSIGHT_THRESHOLDS.minMembersForStatBias) {
    const totalDamaging = stats.moveSplit.physical + stats.moveSplit.special;
    const isPhysicalSkew =
      totalDamaging >= ANALYSIS_INSIGHT_THRESHOLDS.minDamagingMovesForSkewCheck
        ? stats.moveSplit.special === 0
        : stats.biasSplit.specialAttackers === 0 && stats.biasSplit.mixedAttackers === 0;
    const isSpecialSkew =
      totalDamaging >= ANALYSIS_INSIGHT_THRESHOLDS.minDamagingMovesForSkewCheck
        ? stats.moveSplit.physical === 0
        : stats.biasSplit.physicalAttackers === 0 && stats.biasSplit.mixedAttackers === 0;

    if (isPhysicalSkew) {
      insights.push({
        id: 'physical-skew',
        severity: 'warning',
        category: 'stats',
        title: 'Heavily Physical offense',
        detail:
          'Your team relies purely on Physical damage and may struggle against high-Defense walls, Burn, or Intimidate.',
      });
    } else if (isSpecialSkew) {
      insights.push({
        id: 'special-skew',
        severity: 'warning',
        category: 'stats',
        title: 'Heavily Special offense',
        detail:
          'Your team relies purely on Special damage and may struggle against high-Sp.Def walls.',
      });
    }

    if (
      stats.peaks.spe < ANALYSIS_INSIGHT_THRESHOLDS.lowSpeedPeakThreshold &&
      stats.averages.spe < ANALYSIS_INSIGHT_THRESHOLDS.lowSpeedAvgThreshold
    ) {
      insights.push({
        id: 'low-speed-tier',
        severity: 'warning',
        category: 'stats',
        title: 'Low team Speed ceiling',
        detail: `Your fastest member has ${stats.peaks.spe} base Speed (team avg ${stats.averages.spe}). Consider adding a fast sweeper or priority moves.`,
      });
    }
  }

  if (defense.strongResistances.length > 0) {
    insights.push({
      id: 'strong-resistances',
      severity: 'positive',
      category: 'defense',
      title: `Strong defensive core vs. ${defense.strongResistances.slice(0, 5).join(', ')}`,
      detail: '2 or more teammates resist or negate these types with zero weaknesses.',
      types: defense.strongResistances,
    });
  }

  return insights;
}

/**
 * Generates a complete defensive, offensive, and stat balance report for a team.
 */
export function analyzeTeam(team: Team, context: GameContext, dex: DexGateway): TeamAnalysisReport {
  const defense = analyzeTeamDefense(team, context, dex);
  const offense = analyzeTeamOffense(team, context, dex);
  const stats = analyzeTeamStats(team, context, dex);
  const insights = buildInsights(defense, offense, stats);

  return {
    memberCount: stats.memberCount,
    defense,
    offense,
    stats,
    insights,
  };
}
