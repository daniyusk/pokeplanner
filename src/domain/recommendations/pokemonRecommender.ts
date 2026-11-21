import { analyzeTeam, type TeamAnalysisReport } from '@/domain/analysis';
import { BATTLE_GIMMICK, POKEMON_RECOMMENDER_WEIGHTS } from '@/domain/constants';
import {
  calculateDefensiveMultiplier,
  calculateTypeEffectiveness,
  doesAbilityMitigateAnyType,
  evaluateAbilityDefensiveDelta,
} from '@/domain/mechanics';
import { withTeamSlot } from '@/domain/team';
import type { DexGateway, GameContext, PokemonType, SpeciesData, Team } from '@/domain/types';
import type { PokemonRecommendation, RecommendationReason, RecommendPokemonOptions } from './types';

function pickBestDefensiveAbility(
  species: SpeciesData,
  priorityWeakTypes: readonly PokemonType[],
  context: GameContext,
  dex: DexGateway,
): string | undefined {
  if (!context.mechanics.hasAbilities || species.abilities.length === 0) return undefined;

  let bestSlug = species.abilities[0];
  let bestMitigated = -1;

  for (const abilitySlug of species.abilities) {
    let mitigated = 0;
    for (const attackType of priorityWeakTypes) {
      const delta = evaluateAbilityDefensiveDelta(
        attackType,
        species.types,
        abilitySlug,
        context,
        dex,
      );
      if (delta.mitigates) {
        mitigated += delta.grantsImmunity
          ? POKEMON_RECOMMENDER_WEIGHTS.abilityImmunityMitigationWeight
          : POKEMON_RECOMMENDER_WEIGHTS.abilityResistMitigationWeight;
      }
    }
    if (mitigated > bestMitigated) {
      bestMitigated = mitigated;
      bestSlug = abilitySlug;
    }
  }

  return bestSlug;
}

function evaluateDefensiveScore(
  species: SpeciesData,
  abilitySlug: string | undefined,
  report: TeamAnalysisReport,
  context: GameContext,
  dex: DexGateway,
): { score: number; reason?: RecommendationReason } {
  const weights = POKEMON_RECOMMENDER_WEIGHTS.defense;
  let score = 0;
  const coveredCritical: PokemonType[] = [];
  const coveredWarning: PokemonType[] = [];
  let addedExposure = 0;

  for (const row of report.defense.rows) {
    const mult = calculateDefensiveMultiplier(
      row.attackType,
      {
        types: species.types,
        ...(abilitySlug ? { abilitySlug } : {}),
      },
      context,
      dex,
    ).multiplier;

    const isCritical = row.severity === 'critical';
    const isWarning =
      row.severity === 'warning' || (row.weakCount >= 2 && row.resistCount + row.immuneCount === 0);

    if (mult === 0) {
      if (isCritical) {
        score += weights.immuneCritical;
        coveredCritical.push(row.attackType);
      } else if (isWarning) {
        score += weights.immuneWarning;
        coveredWarning.push(row.attackType);
      } else if (row.weakCount >= 1) {
        score += weights.immuneMinor;
      }
    } else if (mult < 1) {
      const resistBonus = mult <= 0.25 ? weights.quadResistMultiplier : 1;
      if (isCritical) {
        score += weights.resistCritical * resistBonus;
        coveredCritical.push(row.attackType);
      } else if (isWarning) {
        score += weights.resistWarning * resistBonus;
        coveredWarning.push(row.attackType);
      } else if (row.weakCount >= 1) {
        score += weights.resistMinor;
      }
    } else if (mult >= 2) {
      if (isCritical || row.weakCount >= 2) {
        score -= mult >= 4 ? weights.quadWeakPenalty : weights.doubleWeakPenalty;
        addedExposure += 1;
      }
    }
  }

  const finalScore = score - addedExposure * weights.addedExposurePenalty;
  const allCovered = [...coveredCritical, ...coveredWarning];
  if (allCovered.length === 0) {
    return { score: finalScore };
  }

  const abilityMitigates =
    abilitySlug !== undefined &&
    doesAbilityMitigateAnyType(allCovered, species.types, abilitySlug, context, dex);

  const abilityNote =
    abilitySlug && abilityMitigates
      ? ` (with ${dex.getAbility(abilitySlug, context.generation)?.name ?? abilitySlug})`
      : '';

  const targetList = allCovered.slice(0, weights.maxSummaryTypes);
  const summary =
    coveredCritical.length > 0
      ? `Covers critical ${targetList.join(', ')} weakness${targetList.length > 1 ? 'es' : ''}${abilityNote}`
      : `Resists exposed ${targetList.join(', ')} attack${targetList.length > 1 ? 's' : ''}${abilityNote}`;

  return {
    score: finalScore,
    reason: {
      category: 'defense',
      impact: coveredCritical.length > 0 ? 'high' : 'medium',
      summary,
      types: targetList,
    },
  };
}

function evaluateOffensiveScore(
  species: SpeciesData,
  report: TeamAnalysisReport,
  context: GameContext,
  dex: DexGateway,
): { score: number; reason?: RecommendationReason } {
  const weights = POKEMON_RECOMMENDER_WEIGHTS.offense;
  const blindSpots = report.offense.hasDamagingMoves
    ? report.offense.movesetBlindSpots
    : report.offense.stabBlindSpots;

  const targetPool =
    blindSpots.length > 0 ? blindSpots : report.offense.entries.map((e) => e.targetType);

  const newlyCovered: PokemonType[] = [];

  for (const targetType of targetPool) {
    const hitsSuperEffectively = species.types.some(
      (stab) => calculateTypeEffectiveness(stab, [targetType], context.generation, dex) >= 2,
    );
    if (hitsSuperEffectively) {
      newlyCovered.push(targetType);
    }
  }

  if (newlyCovered.length === 0) {
    return { score: 0 };
  }

  const pointsPerHit = blindSpots.length > 0 ? weights.blindSpotPerHit : weights.generalPerHit;
  const score = Math.min(newlyCovered.length * pointsPerHit, weights.maxScore);
  const listed = newlyCovered.slice(0, weights.maxSummaryTypes);

  return {
    score,
    reason: {
      category: 'offense',
      impact: blindSpots.length > 0 && newlyCovered.length >= 2 ? 'high' : 'medium',
      summary:
        blindSpots.length > 0
          ? `STAB hits ${listed.join(', ')} super-effectively (fills ${newlyCovered.length} blind spot${newlyCovered.length > 1 ? 's' : ''})`
          : `Adds super-effective STAB pressure vs. ${listed.join(', ')}`,
      types: listed,
    },
  };
}

function evaluateRoleScore(
  species: SpeciesData,
  report: TeamAnalysisReport,
): { score: number; reason?: RecommendationReason } {
  if (report.memberCount === 0) {
    return { score: 0 };
  }

  const weights = POKEMON_RECOMMENDER_WEIGHTS.role;
  const { atk, spa, spe, hp, def, spd } = species.baseStats;
  const roleNotes: string[] = [];
  let score = 0;

  const needsSpecial =
    report.stats.biasSplit.specialAttackers === 0 &&
    report.stats.biasSplit.physicalAttackers >= weights.minBiasAttackersForNeed;
  const needsPhysical =
    report.stats.biasSplit.physicalAttackers === 0 &&
    report.stats.biasSplit.specialAttackers >= weights.minBiasAttackersForNeed;

  if (needsSpecial && spa >= weights.firepowerMinStat && spa >= atk) {
    score += weights.firepowerBonus;
    roleNotes.push(`Special firepower (${spa} SpA)`);
  } else if (needsPhysical && atk >= weights.firepowerMinStat && atk >= spa) {
    score += weights.firepowerBonus;
    roleNotes.push(`Physical firepower (${atk} Atk)`);
  }

  if (report.stats.peaks.spe < weights.lowTeamSpeedPeak && spe >= weights.highCandidateSpeed) {
    score += weights.speedBonus;
    roleNotes.push(`high Speed (${spe} Spe)`);
  }

  const avgBulk = (hp + def + spd) / 3;
  const teamBulk =
    (report.stats.averages.hp + report.stats.averages.def + report.stats.averages.spd) / 3;
  if (teamBulk < weights.lowTeamBulkAvg && avgBulk >= weights.highCandidateBulkAvg) {
    score += weights.bulkBonus;
    roleNotes.push('defensive bulk');
  }

  if (roleNotes.length === 0) {
    return { score: 0 };
  }

  return {
    score,
    reason: {
      category: 'role',
      impact: score >= weights.highImpactThreshold ? 'high' : 'medium',
      summary: `Balances team stats with ${roleNotes.join(' and ')}`,
    },
  };
}

function computeEffectiveBstScore(species: SpeciesData): number {
  const { secondaryOffenseWeight, bstBaseline, bstDivisor, maxBstScore } =
    POKEMON_RECOMMENDER_WEIGHTS.viability;
  const { hp, atk, def, spa, spd, spe } = species.baseStats;
  const primaryOffense = Math.max(atk, spa);
  const secondaryOffense = Math.min(atk, spa);
  const effectiveBst =
    hp + primaryOffense + secondaryOffense * secondaryOffenseWeight + def + spd + spe;
  return Math.min(Math.max((effectiveBst - bstBaseline) / bstDivisor, 0), maxBstScore);
}

/**
 * Recommends candidate Pokémon to add or swap into the team using deterministic
 * multi-criteria scoring (defensive synergy, offensive coverage, stat balance, viability),
 * returning structured explanations for every suggestion.
 */
export function recommendPokemonForTeam(
  team: Team,
  context: GameContext,
  dex: DexGateway,
  options: RecommendPokemonOptions = {},
): PokemonRecommendation[] {
  const {
    limit = POKEMON_RECOMMENDER_WEIGHTS.defaultLimit,
    excludeNfe = true,
    excludeLegendaries = false,
    allowMegas = context.mechanics.gimmick === BATTLE_GIMMICK.Mega,
    replaceSlotIndex,
    allowedSpeciesSlugs,
  } = options;

  // When replacing a specific slot, evaluate the team without that slot
  const baselineTeam =
    replaceSlotIndex !== undefined ? withTeamSlot(team, replaceSlotIndex, null) : team;

  const report = analyzeTeam(baselineTeam, context, dex);
  const existingBaseSlugs = new Set<string>();
  for (const slot of baselineTeam) {
    if (!slot) continue;
    const sp = dex.getSpecies(slot.speciesSlug, context.generation);
    if (sp) existingBaseSlugs.add(sp.baseSpeciesSlug);
  }

  const priorityWeakTypes = Array.from(
    new Set([...report.defense.criticalWeaknesses, ...report.defense.uncoveredWeaknesses]),
  );

  const candidates = dex.listSpecies(context.generation);
  const scored: PokemonRecommendation[] = [];

  for (const species of candidates) {
    if (allowedSpeciesSlugs && !allowedSpeciesSlugs.has(species.slug)) continue;
    if (existingBaseSlugs.has(species.baseSpeciesSlug)) continue;
    if (excludeNfe && species.nfe) continue;
    if (excludeLegendaries && species.isLegendary) continue;
    if (!allowMegas && species.isMega) continue;

    const recommendedAbilitySlug = pickBestDefensiveAbility(
      species,
      priorityWeakTypes,
      context,
      dex,
    );

    const defEval = evaluateDefensiveScore(species, recommendedAbilitySlug, report, context, dex);
    const offEval = evaluateOffensiveScore(species, report, context, dex);
    const roleEval = evaluateRoleScore(species, report);
    const bstScore = computeEffectiveBstScore(species);

    const totalScore = Number(
      (defEval.score + offEval.score + roleEval.score + bstScore).toFixed(2),
    );

    const reasons: RecommendationReason[] = [];
    if (defEval.reason) reasons.push(defEval.reason);
    if (offEval.reason) reasons.push(offEval.reason);
    if (roleEval.reason) reasons.push(roleEval.reason);

    if (reasons.length === 0) {
      const primaryOffense = Math.max(species.baseStats.atk, species.baseStats.spa);
      reasons.push({
        category: 'role',
        impact: 'medium',
        summary: `Strong all-around stats (${primaryOffense} offense, ${species.baseStats.spe} Spe)`,
        types: species.types,
      });
    }

    const { topSynergy, strongFit } = POKEMON_RECOMMENDER_WEIGHTS.fitThresholds;
    const fitLabel: PokemonRecommendation['fitLabel'] =
      totalScore >= topSynergy
        ? 'Top Synergy'
        : totalScore >= strongFit
          ? 'Strong Fit'
          : 'Balanced Pick';

    scored.push({
      species,
      ...(recommendedAbilitySlug ? { recommendedAbilitySlug } : {}),
      score: totalScore,
      fitLabel,
      reasons,
    });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.species.baseStats.spe - a.species.baseStats.spe ||
      a.species.dexNumber - b.species.dexNumber,
  );

  return scored.slice(0, limit);
}
