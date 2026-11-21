import { analyzeTeam, type TeamAnalysisReport } from '@/domain/analysis';
import {
  ABILITY_SLUG,
  BUILD_RECOMMENDER_WEIGHTS,
  ITEM_SLUG,
  MAX_MOVES_PER_MEMBER,
  MOVE_CATEGORY,
  MOVE_SLUG,
  NATURE_ID,
  POKEMON_TYPE,
  SPECIES_SLUG,
  STAT_BIAS_DIFF_THRESHOLD,
} from '@/domain/constants';
import {
  calculateDefensiveMultiplier,
  calculateTypeEffectiveness,
  evaluateAbilityDefensiveDelta,
  filterLearnableMoves,
  resolveMoveCategory,
} from '@/domain/mechanics';
import type {
  DexGateway,
  GameContext,
  MoveCategory,
  MoveData,
  PokemonType,
  SpeciesData,
  Team,
  TeamSlotIndex,
} from '@/domain/types';
import type {
  BuildRecommendation,
  RecommendedAbility,
  RecommendedItem,
  RecommendedMove,
  RecommendedNature,
} from './types';

const ABILITY_BASE_PRIORITIES: Readonly<Record<string, { score: number; note: string }>> = {
  [ABILITY_SLUG.WonderGuard]: {
    score: 90,
    note: 'Grants immunity to all non-super-effective attacks',
  },
  [ABILITY_SLUG.HugePower]: { score: 65, note: 'Doubles Physical Attack stat' },
  [ABILITY_SLUG.PurePower]: { score: 65, note: 'Doubles Physical Attack stat' },
  [ABILITY_SLUG.SpeedBoost]: { score: 58, note: 'Raises Speed every turn' },
  [ABILITY_SLUG.MagicGuard]: {
    score: 56,
    note: 'Blocks indirect damage (hazards, burn, Life Orb recoil)',
  },
  [ABILITY_SLUG.Multiscale]: { score: 54, note: 'Halves damage taken at full HP' },
  [ABILITY_SLUG.Intimidate]: { score: 52, note: 'Lowers opposing Attack on switch-in' },
  [ABILITY_SLUG.Contrary]: { score: 50, note: 'Inverts stat drops into boosts' },
  [ABILITY_SLUG.Regenerator]: { score: 50, note: 'Restores 33% HP when switching out' },
  [ABILITY_SLUG.Prankster]: { score: 48, note: 'Gives priority to Status moves' },
  [ABILITY_SLUG.Technician]: { score: 46, note: 'Boosts moves with 60 base power or less by 50%' },
  [ABILITY_SLUG.SheerForce]: { score: 46, note: 'Boosts moves with secondary effects by 30%' },
  [ABILITY_SLUG.Adaptability]: { score: 45, note: 'Increases STAB multiplier from 1.5× to 2×' },
  [ABILITY_SLUG.Moxie]: { score: 44, note: 'Raises Attack after each knockout' },
  [ABILITY_SLUG.RoughSkin]: { score: 42, note: 'Punishes contact attackers with chip damage' },
  [ABILITY_SLUG.IronBarbs]: { score: 42, note: 'Punishes contact attackers with chip damage' },
  [ABILITY_SLUG.Guts]: { score: 40, note: 'Boosts Attack by 50% when statused' },
  [ABILITY_SLUG.Sturdy]: { score: 38, note: 'Prevents one-hit knockouts from full HP' },
  [ABILITY_SLUG.NaturalCure]: { score: 36, note: 'Heals status conditions upon switching out' },
  [ABILITY_SLUG.MoldBreaker]: { score: 36, note: 'Ignores opposing defensive abilities' },
  [ABILITY_SLUG.FlameBody]: { score: 32, note: '30% chance to burn contact attackers' },
  [ABILITY_SLUG.Static]: { score: 30, note: '30% chance to paralyze contact attackers' },
};

const SETUP_AND_UTILITY_MOVES: Readonly<Record<string, { score: number; reason: string }>> = {
  [MOVE_SLUG.SwordsDance]: { score: 78, reason: 'Doubles Physical Attack for sweeping' },
  [MOVE_SLUG.NastyPlot]: { score: 78, reason: 'Doubles Special Attack for sweeping' },
  [MOVE_SLUG.DragonDance]: {
    score: 82,
    reason: 'Boosts both Attack and Speed simultaneously',
  },
  [MOVE_SLUG.QuiverDance]: {
    score: 85,
    reason: 'Boosts Sp. Atk, Sp. Def, and Speed simultaneously',
  },
  [MOVE_SLUG.CalmMind]: { score: 72, reason: 'Boosts Special Attack and Special Defense' },
  [MOVE_SLUG.BulkUp]: { score: 66, reason: 'Boosts Physical Attack and Defense' },
  [MOVE_SLUG.Recover]: { score: 74, reason: 'Provides reliable HP recovery' },
  [MOVE_SLUG.Roost]: { score: 74, reason: 'Provides reliable HP recovery' },
  [MOVE_SLUG.SlackOff]: { score: 74, reason: 'Provides reliable HP recovery' },
  [MOVE_SLUG.SoftBoiled]: { score: 74, reason: 'Provides reliable HP recovery' },
  [MOVE_SLUG.Synthesis]: { score: 64, reason: 'Provides HP recovery' },
  [MOVE_SLUG.StealthRock]: { score: 70, reason: 'Sets entry hazard to punish switches' },
  [MOVE_SLUG.WillOWisp]: { score: 68, reason: 'Burns Physical threats to halve their damage' },
  [MOVE_SLUG.ThunderWave]: { score: 66, reason: 'Paralyzes fast threats for speed control' },
  [MOVE_SLUG.UTurn]: { score: 72, reason: 'Maintains momentum with switch-out chip damage' },
  [MOVE_SLUG.VoltSwitch]: {
    score: 72,
    reason: 'Maintains momentum with Electric switch-out damage',
  },
  [MOVE_SLUG.Protect]: { score: 56, reason: 'Scouts moves and stalls for Leftovers/status' },
};

const SELF_KO_OR_RECHARGE_PENALTY: ReadonlySet<string> = new Set([
  MOVE_SLUG.Explosion,
  MOVE_SLUG.SelfDestruct,
  MOVE_SLUG.HyperBeam,
  MOVE_SLUG.GigaImpact,
  MOVE_SLUG.FrenzyPlant,
  MOVE_SLUG.BlastBurn,
  MOVE_SLUG.HydroCannon,
  MOVE_SLUG.FinalGambit,
  MOVE_SLUG.Memento,
]);

function pickRecommendedAbility(
  species: SpeciesData,
  report: TeamAnalysisReport,
  context: GameContext,
  dex: DexGateway,
): RecommendedAbility | undefined {
  if (!context.mechanics.hasAbilities || species.abilities.length === 0) return undefined;

  const teamPriorityTypes = new Set<PokemonType>([
    ...report.defense.criticalWeaknesses,
    ...report.defense.uncoveredWeaknesses,
  ]);

  let best: RecommendedAbility | undefined;
  let bestScore = -1;

  for (const slug of species.abilities) {
    const data = dex.getAbility(slug, context.generation);
    if (!data) continue;

    let score =
      ABILITY_BASE_PRIORITIES[slug]?.score ?? BUILD_RECOMMENDER_WEIGHTS.abilityFallbackScore;
    let reason = ABILITY_BASE_PRIORITIES[slug]?.note ?? data.shortDesc;

    const immuneTypes: PokemonType[] = [];
    const resistedTypes: PokemonType[] = [];

    for (const type of dex.getAvailableTypes(context.generation)) {
      const delta = evaluateAbilityDefensiveDelta(type, species.types, slug, context, dex);
      if (!delta.mitigates) continue;

      const isTeamNeed = teamPriorityTypes.has(type);
      if (delta.grantsImmunity) {
        immuneTypes.push(type);
        score += isTeamNeed
          ? BUILD_RECOMMENDER_WEIGHTS.abilityImmunityTeamNeed
          : BUILD_RECOMMENDER_WEIGHTS.abilityImmunityGeneral;
      } else {
        resistedTypes.push(type);
        score += isTeamNeed
          ? BUILD_RECOMMENDER_WEIGHTS.abilityResistTeamNeed
          : BUILD_RECOMMENDER_WEIGHTS.abilityResistGeneral;
      }
    }

    if (slug !== ABILITY_SLUG.WonderGuard) {
      if (immuneTypes.length > 0) {
        const solvesTeamNeed = immuneTypes.some((type) => teamPriorityTypes.has(type));
        reason = `${data.name} grants ${immuneTypes.join('/')} immunity${solvesTeamNeed ? ' and covers a team weakness' : ''}`;
      } else if (resistedTypes.length > 0) {
        const typeSummary =
          resistedTypes.length > 3
            ? `${resistedTypes.slice(0, 3).join('/')} (+${resistedTypes.length - 3} more)`
            : resistedTypes.join('/');
        reason = `${data.name} reduces incoming ${typeSummary} damage`;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = { slug: data.slug, name: data.name, reason, data };
    }
  }

  return best;
}

function resolveNatureTarget(species: SpeciesData): {
  id: (typeof NATURE_ID)[keyof typeof NATURE_ID];
  reason: string;
} {
  const { atk, spa, spe, def, spd } = species.baseStats;
  const { offensiveStatDiff, fastSpeedThreshold } = BUILD_RECOMMENDER_WEIGHTS.nature;
  const isPhysical = atk - spa >= offensiveStatDiff;
  const isSpecial = spa - atk >= offensiveStatDiff;
  const isFast = spe >= fastSpeedThreshold;

  if (isPhysical) {
    return isFast
      ? {
          id: NATURE_ID.Jolly,
          reason: `Boosts Speed (${spe} Spe) while preserving Physical Attack`,
        }
      : {
          id: NATURE_ID.Adamant,
          reason: `Maximizes high Physical Attack (${atk} Atk)`,
        };
  }

  if (isSpecial) {
    return isFast
      ? {
          id: NATURE_ID.Timid,
          reason: `Boosts Speed (${spe} Spe) while preserving Special Attack`,
        }
      : {
          id: NATURE_ID.Modest,
          reason: `Maximizes high Special Attack (${spa} SpA)`,
        };
  }

  if (isFast) {
    return {
      id: def >= spd ? NATURE_ID.Naive : NATURE_ID.Hasty,
      reason: `Boosts Speed (${spe} Spe) for mixed attacking`,
    };
  }

  return {
    id: def >= spd ? NATURE_ID.Bold : NATURE_ID.Calm,
    reason: 'Supports mixed defensive bulk',
  };
}

function pickRecommendedNature(
  species: SpeciesData,
  context: GameContext,
  dex: DexGateway,
): RecommendedNature | undefined {
  if (!context.mechanics.hasNatures) return undefined;

  const { id, reason } = resolveNatureTarget(species);
  const data = dex.getNature(id, context.generation);
  if (!data) return undefined;
  return { id: data.id, name: data.name, reason, data };
}

function pickRecommendedItem(
  species: SpeciesData,
  abilitySlug: string | undefined,
  context: GameContext,
  dex: DexGateway,
): RecommendedItem | undefined {
  if (!context.mechanics.hasHeldItems) return undefined;

  const tryItem = (slug: string, reason: string): RecommendedItem | undefined => {
    const data = dex.getItem(slug, context.generation);
    if (!data) return undefined;
    return { slug: data.slug, name: data.name, reason, data };
  };

  if (species.baseSpeciesSlug === SPECIES_SLUG.Pikachu) {
    const lightBall = tryItem(ITEM_SLUG.LightBall, 'Doubles Pikachu’s Attack and Special Attack');
    if (lightBall) return lightBall;
  }

  const itemRules = BUILD_RECOMMENDER_WEIGHTS.item;

  if (species.nfe && context.generation >= itemRules.evioliteMinGen) {
    const eviolite = tryItem(
      ITEM_SLUG.Eviolite,
      'Boosts Defense and Sp. Def by 50% for unevolved Pokémon',
    );
    if (eviolite) return eviolite;
  }

  const groundMult = calculateDefensiveMultiplier(
    POKEMON_TYPE.Ground,
    {
      types: species.types,
      ...(abilitySlug ? { abilitySlug } : {}),
    },
    context,
    dex,
  ).multiplier;

  if (groundMult >= itemRules.quadGroundThreshold) {
    const balloon = tryItem(ITEM_SLUG.AirBalloon, 'Negates 4× Ground weakness while unpopped');
    if (balloon) return balloon;
  }

  const { hp, def, spd, spe, atk, spa } = species.baseStats;
  const bulkAvg = (hp + def + spd) / 3;
  const maxOffense = Math.max(atk, spa);

  if (bulkAvg >= itemRules.bulkyAvgThreshold || maxOffense < itemRules.lowOffenseThreshold) {
    const leftovers = tryItem(ITEM_SLUG.Leftovers, 'Provides passive HP recovery every turn');
    if (leftovers) return leftovers;
  }

  if (spe >= itemRules.sweeperSpeedThreshold && maxOffense >= itemRules.sweeperOffenseThreshold) {
    const lifeOrb = tryItem(ITEM_SLUG.LifeOrb, 'Boosts all damaging moves by 30% for wallbreaking');
    if (lifeOrb) return lifeOrb;
  }

  return tryItem(ITEM_SLUG.Leftovers, 'Consistent passive recovery across long battles');
}

function scoreDamagingMove(
  move: MoveData,
  effectiveCategory: Exclude<MoveCategory, 'Status'>,
  species: SpeciesData,
  preferredCategory: 'Physical' | 'Special' | 'Mixed',
  blindSpots: readonly PokemonType[],
  context: GameContext,
  dex: DexGateway,
): { score: number; reason: string; isStab: boolean; coveredBlindSpots: PokemonType[] } {
  const moveRules = BUILD_RECOMMENDER_WEIGHTS.move;
  const isStab = species.types.includes(move.type);
  const accuracyFactor = move.accuracy === true ? 1 : Math.min(move.accuracy / 100, 1);
  let effectivePower = move.basePower * (isStab ? moveRules.stabMultiplier : 1) * accuracyFactor;

  if (SELF_KO_OR_RECHARGE_PENALTY.has(move.slug)) {
    effectivePower *= moveRules.selfKoOrRechargePenalty;
  }
  if (move.priority > 0) {
    effectivePower += moveRules.priorityBonus;
  }

  // Penalize category mismatch against the Pokémon's stronger attacking stat
  const categoryMatches = preferredCategory === 'Mixed' || effectiveCategory === preferredCategory;
  if (!categoryMatches) {
    effectivePower *= moveRules.categoryMismatchPenalty;
  }

  const coveredBlindSpots: PokemonType[] = [];
  for (const target of blindSpots) {
    if (calculateTypeEffectiveness(move.type, [target], context.generation, dex) >= 2) {
      coveredBlindSpots.push(target);
    }
  }

  let score = effectivePower + coveredBlindSpots.length * moveRules.blindSpotBonus;
  if (isStab && categoryMatches) score += moveRules.matchingStabBonus;

  let reason = `${move.type} ${effectiveCategory} coverage`;
  if (isStab) {
    reason = `Primary ${move.type} STAB (${move.basePower} BP)`;
  } else if (coveredBlindSpots.length > 0) {
    reason = `Covers team blind spot vs. ${coveredBlindSpots
      .slice(0, moveRules.maxSummaryBlindSpots)
      .join(', ')}`;
  }

  return { score, reason, isStab, coveredBlindSpots };
}

function pickRecommendedMoves(
  species: SpeciesData,
  report: TeamAnalysisReport,
  context: GameContext,
  dex: DexGateway,
  learnableMoveSlugs?: readonly string[],
): RecommendedMove[] {
  const { atk, spa } = species.baseStats;
  const preferredCategory: 'Physical' | 'Special' | 'Mixed' =
    atk - spa >= STAT_BIAS_DIFF_THRESHOLD
      ? MOVE_CATEGORY.Physical
      : spa - atk >= STAT_BIAS_DIFF_THRESHOLD
        ? MOVE_CATEGORY.Special
        : 'Mixed';

  const blindSpots = report.offense.hasDamagingMoves
    ? report.offense.movesetBlindSpots
    : report.offense.stabBlindSpots;

  const allGenMoves = dex.listMoves(context.generation);
  const candidatePool = learnableMoveSlugs
    ? filterLearnableMoves(allGenMoves, new Set(learnableMoveSlugs))
    : allGenMoves;

  const damagingCandidates: Array<{
    move: MoveData;
    effectiveCategory: Exclude<MoveCategory, 'Status'>;
    score: number;
    reason: string;
    isStab: boolean;
  }> = [];

  const utilityCandidates: Array<{
    move: MoveData;
    effectiveCategory: MoveCategory;
    score: number;
    reason: string;
  }> = [];

  for (const move of candidatePool) {
    const effectiveCategory = resolveMoveCategory(move, context);

    const setupMeta = SETUP_AND_UTILITY_MOVES[move.slug];
    if (
      setupMeta &&
      (effectiveCategory === MOVE_CATEGORY.Status ||
        move.slug === MOVE_SLUG.UTurn ||
        move.slug === MOVE_SLUG.VoltSwitch)
    ) {
      utilityCandidates.push({
        move,
        effectiveCategory,
        score: setupMeta.score,
        reason: setupMeta.reason,
      });
    }

    if (effectiveCategory !== MOVE_CATEGORY.Status && move.basePower > 0) {
      const evaluated = scoreDamagingMove(
        move,
        effectiveCategory,
        species,
        preferredCategory,
        blindSpots,
        context,
        dex,
      );
      damagingCandidates.push({
        move,
        effectiveCategory,
        score: evaluated.score,
        reason: evaluated.reason,
        isStab: evaluated.isStab,
      });
    }
  }

  damagingCandidates.sort((a, b) => b.score - a.score);
  utilityCandidates.sort((a, b) => b.score - a.score);

  const selected: RecommendedMove[] = [];
  const usedMoveSlugs = new Set<string>();
  const coveredMoveTypes = new Set<PokemonType>();

  const pushMove = (cand: { move: MoveData; effectiveCategory: MoveCategory; reason: string }) => {
    selected.push({
      move: cand.move,
      effectiveCategory: cand.effectiveCategory,
      reason: cand.reason,
    });
    usedMoveSlugs.add(cand.move.slug);
    coveredMoveTypes.add(cand.move.type);
  };

  // 1. Best STAB for each of the species' types
  for (const stabType of species.types) {
    if (selected.length >= MAX_MOVES_PER_MEMBER) break;
    const bestStab = damagingCandidates.find(
      (c) => c.move.type === stabType && !usedMoveSlugs.has(c.move.slug),
    );
    if (bestStab) pushMove(bestStab);
  }

  // 2. Best distinct-type coverage move(s)
  for (const cand of damagingCandidates) {
    if (selected.length >= BUILD_RECOMMENDER_WEIGHTS.move.maxCoveragePreUtility) break;
    if (usedMoveSlugs.has(cand.move.slug) || coveredMoveTypes.has(cand.move.type)) continue;
    pushMove(cand);
  }

  // 3. Optional top utility/setup move in slot 4 if available
  const bestUtility = utilityCandidates.find((u) => !usedMoveSlugs.has(u.move.slug));
  if (bestUtility && selected.length < MAX_MOVES_PER_MEMBER) {
    selected.push({
      move: bestUtility.move,
      effectiveCategory: bestUtility.effectiveCategory,
      reason: bestUtility.reason,
    });
    usedMoveSlugs.add(bestUtility.move.slug);
  }

  // 4. Fill remaining slots with highest-scoring distinct-type damaging moves
  for (const cand of damagingCandidates) {
    if (selected.length >= MAX_MOVES_PER_MEMBER) break;
    if (usedMoveSlugs.has(cand.move.slug) || coveredMoveTypes.has(cand.move.type)) continue;
    pushMove(cand);
  }

  return selected;
}

/**
 * Generates an explainable recommended build (Ability, Nature, Held Item, and up to 4 Moves)
 * for a team member, respecting active generation mechanics and team coverage gaps.
 */
export function recommendBuildForMember(
  slotIndex: TeamSlotIndex,
  team: Team,
  context: GameContext,
  dex: DexGateway,
  learnableMoveSlugs?: readonly string[],
): BuildRecommendation | undefined {
  const member = team[slotIndex];
  if (!member) return undefined;

  const species = dex.getSpecies(member.speciesSlug, context.generation);
  if (!species) return undefined;

  const report = analyzeTeam(team, context, dex);
  const ability = pickRecommendedAbility(species, report, context, dex);
  const nature = pickRecommendedNature(species, context, dex);
  const item = pickRecommendedItem(species, ability?.slug, context, dex);
  const moves = pickRecommendedMoves(species, report, context, dex, learnableMoveSlugs);

  return {
    ...(ability ? { ability } : {}),
    ...(item ? { item } : {}),
    ...(nature ? { nature } : {}),
    moves,
  };
}
