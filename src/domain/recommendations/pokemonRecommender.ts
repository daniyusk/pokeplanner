import { analyzeTeam, type TeamAnalysisReport } from '@/domain/analysis';
import { calculateDefensiveMultiplier, calculateTypeEffectiveness } from '@/domain/mechanics';
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
      const base = calculateDefensiveMultiplier(
        attackType,
        { types: species.types },
        context,
        dex,
      ).multiplier;
      const withAbility = calculateDefensiveMultiplier(
        attackType,
        { types: species.types, abilitySlug },
        context,
        dex,
      ).multiplier;
      if (withAbility < base) {
        mitigated += withAbility === 0 ? 2 : 1;
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
        score += 24;
        coveredCritical.push(row.attackType);
      } else if (isWarning) {
        score += 14;
        coveredWarning.push(row.attackType);
      } else if (row.weakCount >= 1) {
        score += 5;
      }
    } else if (mult < 1) {
      const resistBonus = mult <= 0.25 ? 1.3 : 1;
      if (isCritical) {
        score += 18 * resistBonus;
        coveredCritical.push(row.attackType);
      } else if (isWarning) {
        score += 10 * resistBonus;
        coveredWarning.push(row.attackType);
      } else if (row.weakCount >= 1) {
        score += 4;
      }
    } else if (mult >= 2) {
      if (isCritical || row.weakCount >= 2) {
        score -= mult >= 4 ? 18 : 11;
        addedExposure += 1;
      }
    }
  }

  const allCovered = [...coveredCritical, ...coveredWarning];
  if (allCovered.length === 0) {
    return { score };
  }

  const abilityNote =
    abilitySlug &&
    allCovered.some((t) => {
      const base = calculateDefensiveMultiplier(
        t,
        { types: species.types },
        context,
        dex,
      ).multiplier;
      const withAb = calculateDefensiveMultiplier(
        t,
        { types: species.types, abilitySlug },
        context,
        dex,
      ).multiplier;
      return withAb < base;
    })
      ? ` (with ${dex.getAbility(abilitySlug, context.generation)?.name ?? abilitySlug})`
      : '';

  const targetList = allCovered.slice(0, 3);
  const summary =
    coveredCritical.length > 0
      ? `Covers critical ${targetList.join(', ')} weakness${targetList.length > 1 ? 'es' : ''}${abilityNote}`
      : `Resists exposed ${targetList.join(', ')} attack${targetList.length > 1 ? 's' : ''}${abilityNote}`;

  return {
    score: score - addedExposure * 2,
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

  const pointsPerHit = blindSpots.length > 0 ? 9 : 2.5;
  const score = Math.min(newlyCovered.length * pointsPerHit, 34);
  const listed = newlyCovered.slice(0, 4);

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

  const { atk, spa, spe, hp, def, spd } = species.baseStats;
  const roleNotes: string[] = [];
  let score = 0;

  const needsSpecial =
    report.stats.biasSplit.specialAttackers === 0 && report.stats.biasSplit.physicalAttackers >= 2;
  const needsPhysical =
    report.stats.biasSplit.physicalAttackers === 0 && report.stats.biasSplit.specialAttackers >= 2;

  if (needsSpecial && spa >= 95 && spa >= atk) {
    score += 14;
    roleNotes.push(`Special firepower (${spa} SpA)`);
  } else if (needsPhysical && atk >= 95 && atk >= spa) {
    score += 14;
    roleNotes.push(`Physical firepower (${atk} Atk)`);
  }

  if (report.stats.peaks.spe < 95 && spe >= 100) {
    score += 12;
    roleNotes.push(`high Speed (${spe} Spe)`);
  }

  const avgBulk = (hp + def + spd) / 3;
  const teamBulk =
    (report.stats.averages.hp + report.stats.averages.def + report.stats.averages.spd) / 3;
  if (teamBulk < 80 && avgBulk >= 95) {
    score += 8;
    roleNotes.push('defensive bulk');
  }

  if (roleNotes.length === 0) {
    return { score: 0 };
  }

  return {
    score,
    reason: {
      category: 'role',
      impact: score >= 14 ? 'high' : 'medium',
      summary: `Balances team stats with ${roleNotes.join(' and ')}`,
    },
  };
}

function computeEffectiveBstScore(species: SpeciesData): number {
  const { hp, atk, def, spa, spd, spe } = species.baseStats;
  const primaryOffense = Math.max(atk, spa);
  const secondaryOffense = Math.min(atk, spa);
  const effectiveBst = hp + primaryOffense + secondaryOffense * 0.35 + def + spd + spe;
  return Math.min(Math.max((effectiveBst - 340) / 14, 0), 16);
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
    limit = 12,
    excludeNfe = true,
    excludeLegendaries = false,
    allowMegas = context.mechanics.gimmick === 'mega',
    replaceSlotIndex,
    allowedSpeciesSlugs,
  } = options;

  // When replacing a specific slot, evaluate the team without that slot
  const baselineTeam = [...team] as Team;
  if (replaceSlotIndex !== undefined) {
    baselineTeam[replaceSlotIndex] = null;
  }

  const report = analyzeTeam(baselineTeam, context, dex);
  const existingBaseSlugs = new Set<string>();
  for (const slot of baselineTeam) {
    if (!slot) continue;
    const sp = dex.getSpecies(slot.speciesSlug, context.generation);
    if (sp) existingBaseSlugs.add(sp.baseSpeciesSlug);
  }

  const priorityWeakTypes = [
    ...report.defense.criticalWeaknesses,
    ...report.defense.uncoveredWeaknesses,
  ];

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

    const fitLabel: PokemonRecommendation['fitLabel'] =
      totalScore >= 38 ? 'Top Synergy' : totalScore >= 24 ? 'Strong Fit' : 'Balanced Pick';

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
