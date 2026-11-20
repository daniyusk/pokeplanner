import { analyzeTeam, type TeamAnalysisReport } from '@/domain/analysis';
import {
  calculateDefensiveMultiplier,
  calculateTypeEffectiveness,
  getEffectiveMoveCategory,
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
  wonderguard: { score: 90, note: 'Grants immunity to all non-super-effective attacks' },
  hugepower: { score: 65, note: 'Doubles Physical Attack stat' },
  purepower: { score: 65, note: 'Doubles Physical Attack stat' },
  speedboost: { score: 58, note: 'Raises Speed every turn' },
  magicguard: { score: 56, note: 'Blocks indirect damage (hazards, burn, Life Orb recoil)' },
  multiscale: { score: 54, note: 'Halves damage taken at full HP' },
  intimidate: { score: 52, note: 'Lowers opposing Attack on switch-in' },
  contrary: { score: 50, note: 'Inverts stat drops into boosts' },
  regenerator: { score: 50, note: 'Restores 33% HP when switching out' },
  prankster: { score: 48, note: 'Gives priority to Status moves' },
  technician: { score: 46, note: 'Boosts moves with 60 base power or less by 50%' },
  sheerforce: { score: 46, note: 'Boosts moves with secondary effects by 30%' },
  adaptability: { score: 45, note: 'Increases STAB multiplier from 1.5× to 2×' },
  moxie: { score: 44, note: 'Raises Attack after each knockout' },
  roughskin: { score: 42, note: 'Punishes contact attackers with chip damage' },
  ironbarbs: { score: 42, note: 'Punishes contact attackers with chip damage' },
  guts: { score: 40, note: 'Boosts Attack by 50% when statused' },
  sturdy: { score: 38, note: 'Prevents one-hit knockouts from full HP' },
  naturalcure: { score: 36, note: 'Heals status conditions upon switching out' },
  moldbreaker: { score: 36, note: 'Ignores opposing defensive abilities' },
  flamebody: { score: 32, note: '30% chance to burn contact attackers' },
  static: { score: 30, note: '30% chance to paralyze contact attackers' },
};

const SETUP_AND_UTILITY_MOVES: Readonly<Record<string, { score: number; reason: string }>> = {
  swordsdance: { score: 78, reason: 'Doubles Physical Attack for sweeping' },
  nastyplot: { score: 78, reason: 'Doubles Special Attack for sweeping' },
  dragondance: { score: 82, reason: 'Boosts both Attack and Speed simultaneously' },
  quiverdance: { score: 85, reason: 'Boosts Sp. Atk, Sp. Def, and Speed simultaneously' },
  calmmind: { score: 72, reason: 'Boosts Special Attack and Special Defense' },
  bulkup: { score: 66, reason: 'Boosts Physical Attack and Defense' },
  recover: { score: 74, reason: 'Provides reliable HP recovery' },
  roost: { score: 74, reason: 'Provides reliable HP recovery' },
  slackoff: { score: 74, reason: 'Provides reliable HP recovery' },
  softboiled: { score: 74, reason: 'Provides reliable HP recovery' },
  synthesis: { score: 64, reason: 'Provides HP recovery' },
  stealthrock: { score: 70, reason: 'Sets entry hazard to punish switches' },
  willowisp: { score: 68, reason: 'Burns Physical threats to halve their damage' },
  thunderwave: { score: 66, reason: 'Paralyzes fast threats for speed control' },
  uturn: { score: 72, reason: 'Maintains momentum with switch-out chip damage' },
  voltswitch: { score: 72, reason: 'Maintains momentum with Electric switch-out damage' },
  protect: { score: 56, reason: 'Scouts moves and stalls for Leftovers/status' },
};

const SELF_KO_OR_RECHARGE_PENALTY = new Set([
  'explosion',
  'selfdestruct',
  'hyperbeam',
  'gigaimpact',
  'frenzyplant',
  'blastburn',
  'hydrocannon',
  'finalgambit',
  'memento',
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

    let score = ABILITY_BASE_PRIORITIES[slug]?.score ?? 10;
    let reason = ABILITY_BASE_PRIORITIES[slug]?.note ?? data.shortDesc;

    for (const type of dex.getAvailableTypes(context.generation)) {
      const base = calculateDefensiveMultiplier(
        type,
        { types: species.types },
        context,
        dex,
      ).multiplier;
      const withAb = calculateDefensiveMultiplier(
        type,
        { types: species.types, abilitySlug: slug },
        context,
        dex,
      ).multiplier;

      if (withAb < base) {
        const isTeamNeed = teamPriorityTypes.has(type);
        score += withAb === 0 ? (isTeamNeed ? 85 : 62) : isTeamNeed ? 50 : 35;
        reason =
          withAb === 0
            ? `${data.name} grants ${type} immunity${isTeamNeed ? ' and covers a team weakness' : ''}`
            : `${data.name} reduces incoming ${type} damage`;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = { slug: data.slug, name: data.name, reason, data };
    }
  }

  return best;
}

function pickRecommendedNature(
  species: SpeciesData,
  context: GameContext,
  dex: DexGateway,
): RecommendedNature | undefined {
  if (!context.mechanics.hasNatures) return undefined;

  const { atk, spa, spe, def, spd } = species.baseStats;
  const isPhysical = atk - spa >= 10;
  const isSpecial = spa - atk >= 10;
  const isFast = spe >= 80;

  let targetNature = 'Hardy';
  let reason = 'Neutral nature fits balanced mixed stats';

  if (isPhysical) {
    if (isFast) {
      targetNature = 'Jolly';
      reason = `Boosts Speed (${spe} Spe) while preserving Physical Attack`;
    } else {
      targetNature = 'Adamant';
      reason = `Maximizes high Physical Attack (${atk} Atk)`;
    }
  } else if (isSpecial) {
    if (isFast) {
      targetNature = 'Timid';
      reason = `Boosts Speed (${spe} Spe) while preserving Special Attack`;
    } else {
      targetNature = 'Modest';
      reason = `Maximizes high Special Attack (${spa} SpA)`;
    }
  } else if (isFast) {
    targetNature = def >= spd ? 'Naive' : 'Hasty';
    reason = `Boosts Speed (${spe} Spe) for mixed attacking`;
  } else {
    targetNature = def >= spd ? 'Bold' : 'Calm';
    reason = 'Supports mixed defensive bulk';
  }

  const data = dex.getNature(targetNature, context.generation);
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

  if (species.baseSpeciesSlug === 'pikachu') {
    const lightBall = tryItem('lightball', 'Doubles Pikachu’s Attack and Special Attack');
    if (lightBall) return lightBall;
  }

  if (species.nfe && context.generation >= 5) {
    const eviolite = tryItem('eviolite', 'Boosts Defense and Sp. Def by 50% for unevolved Pokémon');
    if (eviolite) return eviolite;
  }

  const groundMult = calculateDefensiveMultiplier(
    'Ground',
    {
      types: species.types,
      ...(abilitySlug ? { abilitySlug } : {}),
    },
    context,
    dex,
  ).multiplier;

  if (groundMult >= 4) {
    const balloon = tryItem('airballoon', 'Negates 4× Ground weakness while unpopped');
    if (balloon) return balloon;
  }

  const { hp, def, spd, spe, atk, spa } = species.baseStats;
  const bulkAvg = (hp + def + spd) / 3;
  const maxOffense = Math.max(atk, spa);

  if (bulkAvg >= 92 || maxOffense < 85) {
    const leftovers = tryItem('leftovers', 'Provides passive HP recovery every turn');
    if (leftovers) return leftovers;
  }

  if (spe >= 85 && maxOffense >= 95) {
    const lifeOrb = tryItem('lifeorb', 'Boosts all damaging moves by 30% for wallbreaking');
    if (lifeOrb) return lifeOrb;
  }

  return tryItem('leftovers', 'Consistent passive recovery across long battles');
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
  const isStab = species.types.includes(move.type);
  const accuracyFactor = move.accuracy === true ? 1 : Math.min(move.accuracy / 100, 1);
  let effectivePower = move.basePower * (isStab ? 1.5 : 1) * accuracyFactor;

  if (SELF_KO_OR_RECHARGE_PENALTY.has(move.slug)) {
    effectivePower *= 0.45;
  }
  if (move.priority > 0) {
    effectivePower += 18;
  }

  // Penalize category mismatch against the Pokémon's stronger attacking stat
  const categoryMatches = preferredCategory === 'Mixed' || effectiveCategory === preferredCategory;
  if (!categoryMatches) {
    effectivePower *= 0.45;
  }

  const coveredBlindSpots: PokemonType[] = [];
  for (const target of blindSpots) {
    if (calculateTypeEffectiveness(move.type, [target], context.generation, dex) >= 2) {
      coveredBlindSpots.push(target);
    }
  }

  let score = effectivePower + coveredBlindSpots.length * 22;
  if (isStab && categoryMatches) score += 20;

  let reason = `${move.type} ${effectiveCategory} coverage`;
  if (isStab) {
    reason = `Primary ${move.type} STAB (${move.basePower} BP)`;
  } else if (coveredBlindSpots.length > 0) {
    reason = `Covers team blind spot vs. ${coveredBlindSpots.slice(0, 2).join(', ')}`;
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
    atk - spa >= 15 ? 'Physical' : spa - atk >= 15 ? 'Special' : 'Mixed';

  const blindSpots = report.offense.hasDamagingMoves
    ? report.offense.movesetBlindSpots
    : report.offense.stabBlindSpots;

  const allGenMoves = dex.listMoves(context.generation);
  const learnableSet = learnableMoveSlugs ? new Set(learnableMoveSlugs) : null;
  const candidatePool = learnableSet
    ? allGenMoves.filter(
        (m) =>
          learnableSet.has(m.slug) ||
          (m.slug.startsWith('hiddenpower') && learnableSet.has('hiddenpower')),
      )
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
    const effectiveCategory = getEffectiveMoveCategory(move.slug, context, dex);
    if (!effectiveCategory) continue;

    const setupMeta = SETUP_AND_UTILITY_MOVES[move.slug];
    if (
      setupMeta &&
      (effectiveCategory === 'Status' || move.slug === 'uturn' || move.slug === 'voltswitch')
    ) {
      utilityCandidates.push({
        move,
        effectiveCategory,
        score: setupMeta.score,
        reason: setupMeta.reason,
      });
    }

    if (effectiveCategory !== 'Status' && move.basePower > 0) {
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

  // 1. Best STAB for each of the species' types
  for (const stabType of species.types) {
    const bestStab = damagingCandidates.find(
      (c) => c.move.type === stabType && !usedMoveSlugs.has(c.move.slug),
    );
    if (bestStab && selected.length < 4) {
      selected.push({
        move: bestStab.move,
        effectiveCategory: bestStab.effectiveCategory,
        reason: bestStab.reason,
      });
      usedMoveSlugs.add(bestStab.move.slug);
      coveredMoveTypes.add(bestStab.move.type);
    }
  }

  // 2. Best distinct-type coverage move(s)
  for (const cand of damagingCandidates) {
    if (selected.length >= 3) break;
    if (usedMoveSlugs.has(cand.move.slug) || coveredMoveTypes.has(cand.move.type)) continue;
    selected.push({
      move: cand.move,
      effectiveCategory: cand.effectiveCategory,
      reason: cand.reason,
    });
    usedMoveSlugs.add(cand.move.slug);
    coveredMoveTypes.add(cand.move.type);
  }

  // 3. Optional top utility/setup move in slot 4 if available
  const bestUtility = utilityCandidates.find((u) => !usedMoveSlugs.has(u.move.slug));
  if (bestUtility && selected.length < 4) {
    selected.push({
      move: bestUtility.move,
      effectiveCategory: bestUtility.effectiveCategory,
      reason: bestUtility.reason,
    });
    usedMoveSlugs.add(bestUtility.move.slug);
  }

  // 4. Fill remaining slots with highest-scoring distinct-type damaging moves
  for (const cand of damagingCandidates) {
    if (selected.length >= 4) break;
    if (usedMoveSlugs.has(cand.move.slug) || coveredMoveTypes.has(cand.move.type)) continue;
    selected.push({
      move: cand.move,
      effectiveCategory: cand.effectiveCategory,
      reason: cand.reason,
    });
    usedMoveSlugs.add(cand.move.slug);
    coveredMoveTypes.add(cand.move.type);
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
