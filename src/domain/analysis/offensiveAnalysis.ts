import { calculateTypeEffectiveness, getAvailableTypes } from '@/domain/mechanics';
import type { DexGateway, GameContext, PokemonType, Team, TeamSlotIndex } from '@/domain/types';
import { resolveTeamEntries } from './helpers';

export interface OffensiveContributor {
  slotIndex: TeamSlotIndex;
  speciesName: string;
  attackType: PokemonType;
  moveName?: string;
  isStab: boolean;
}

export interface OffensiveCoverageEntry {
  targetType: PokemonType;
  stabContributors: readonly OffensiveContributor[];
  movesetContributors: readonly OffensiveContributor[];
  isCoveredByStab: boolean;
  isCoveredByMoveset: boolean;
}

export interface OffensiveCoverage {
  entries: readonly OffensiveCoverageEntry[];
  stabCoveredCount: number;
  movesetCoveredCount: number;
  totalTypes: number;
  hasDamagingMoves: boolean;
  stabBlindSpots: readonly PokemonType[];
  movesetBlindSpots: readonly PokemonType[];
}

/**
 * Evaluates super-effective offensive coverage across all types available in the active
 * generation in both STAB mode (intrinsic species types) and Moveset mode (configured moves).
 */
export function analyzeTeamOffense(
  team: Team,
  context: GameContext,
  dex: DexGateway,
): OffensiveCoverage {
  const availableTypes = getAvailableTypes(context.generation, dex);
  const teamEntries = resolveTeamEntries(team, context.generation, dex);

  let hasDamagingMoves = false;
  for (const entry of teamEntries) {
    for (const moveSlug of entry.member.moveSlugs) {
      const move = dex.getMove(moveSlug, context.generation);
      if (move && move.category !== 'Status' && move.basePower > 0) {
        hasDamagingMoves = true;
        break;
      }
    }
    if (hasDamagingMoves) break;
  }

  const entries: OffensiveCoverageEntry[] = [];
  const stabBlindSpots: PokemonType[] = [];
  const movesetBlindSpots: PokemonType[] = [];
  let stabCoveredCount = 0;
  let movesetCoveredCount = 0;

  for (const targetType of availableTypes) {
    const stabContributors: OffensiveContributor[] = [];
    const movesetContributors: OffensiveContributor[] = [];

    for (const entry of teamEntries) {
      for (const stabType of entry.species.types) {
        const eff = calculateTypeEffectiveness(stabType, [targetType], context.generation, dex);
        if (eff >= 2) {
          stabContributors.push({
            slotIndex: entry.slotIndex,
            speciesName: entry.species.name,
            attackType: stabType,
            isStab: true,
          });
        }
      }

      for (const moveSlug of entry.member.moveSlugs) {
        const move = dex.getMove(moveSlug, context.generation);
        if (!move || move.category === 'Status' || move.basePower <= 0) continue;

        const eff = calculateTypeEffectiveness(move.type, [targetType], context.generation, dex);
        if (eff >= 2) {
          movesetContributors.push({
            slotIndex: entry.slotIndex,
            speciesName: entry.species.name,
            attackType: move.type,
            moveName: move.name,
            isStab: entry.species.types.includes(move.type),
          });
        }
      }
    }

    const isCoveredByStab = stabContributors.length > 0;
    const isCoveredByMoveset = movesetContributors.length > 0;

    if (isCoveredByStab) stabCoveredCount += 1;
    else if (teamEntries.length > 0) stabBlindSpots.push(targetType);

    if (isCoveredByMoveset) movesetCoveredCount += 1;
    else if (teamEntries.length > 0) movesetBlindSpots.push(targetType);

    entries.push({
      targetType,
      stabContributors,
      movesetContributors,
      isCoveredByStab,
      isCoveredByMoveset,
    });
  }

  return {
    entries,
    stabCoveredCount,
    movesetCoveredCount,
    totalTypes: availableTypes.length,
    hasDamagingMoves,
    stabBlindSpots,
    movesetBlindSpots,
  };
}
