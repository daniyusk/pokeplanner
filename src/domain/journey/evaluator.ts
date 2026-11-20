import { calculateDefensiveMultiplier, calculateTypeEffectiveness } from '@/domain/mechanics';
import type {
  Checkpoint,
  DexGateway,
  GameContext,
  GameDexEntry,
  GameManifest,
  SpeciesData,
  Team,
  TeamSlotIndex,
} from '@/domain/types';
import { buildCheckpointOrderMap, type JourneyFilterOptions } from './availability';

export type JourneySlotStatus =
  | 'ready'
  | 'early-stage-recommended'
  | 'unavailable-yet'
  | 'version-exclusive'
  | 'trade-blocked'
  | 'not-in-game';

export interface JourneySlotDiagnostic {
  slotIndex: TeamSlotIndex;
  species: SpeciesData;
  status: JourneySlotStatus;
  dexEntry?: GameDexEntry;
  unlockCheckpoint?: Checkpoint;
  messages: readonly string[];
}

export interface BossPokemonMatchup {
  bossSpecies: SpeciesData;
  counteredBy: readonly string[];
  threatens: readonly string[];
  status: 'countered' | 'neutral' | 'dangerous';
}

export interface CheckpointEvaluation {
  checkpoint: Checkpoint;
  slots: readonly (JourneySlotDiagnostic | null)[];
  bossMatchups: readonly BossPokemonMatchup[];
  overallRating: 'Favorable' | 'Even' | 'Risky';
}

function evaluateSlotAtCheckpoint(
  slotIndex: TeamSlotIndex,
  species: SpeciesData,
  checkpoint: Checkpoint,
  manifest: GameManifest,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  options: JourneyFilterOptions,
): JourneySlotDiagnostic {
  const dexEntry = manifest.dex[species.slug];
  if (!dexEntry) {
    return {
      slotIndex,
      species,
      status: 'not-in-game',
      messages: [`${species.name} is not in the ${manifest.shortName} regional Pokédex.`],
    };
  }

  const unlockCheckpoint = checkpointMap.get(dexEntry.earliestCheckpointId);
  const messages: string[] = [];
  let status: JourneySlotStatus = 'ready';

  if (
    options.versionId &&
    dexEntry.exclusiveToVersions &&
    dexEntry.exclusiveToVersions.length > 0 &&
    !dexEntry.exclusiveToVersions.includes(options.versionId)
  ) {
    status = 'version-exclusive';
    messages.push(
      `Exclusive to ${dexEntry.exclusiveToVersions.join(' / ')} (not catchable in ${options.versionId}).`,
    );
  } else if (options.excludeTradeEvolutions && dexEntry.evolutionNotes?.requiresTrade) {
    status = 'trade-blocked';
    messages.push(`${species.name} requires a trade evolution (excluded by your campaign rules).`);
  } else if (unlockCheckpoint && unlockCheckpoint.order > checkpoint.order) {
    status = 'unavailable-yet';
    messages.push(
      `Unlocked later at ${unlockCheckpoint.name}. Consider using a temporary teammate for this checkpoint.`,
    );
  }

  const minEvoLv = dexEntry.evolutionNotes?.minEvolutionLevel;
  if (minEvoLv !== undefined && minEvoLv > checkpoint.levelCap) {
    if (status === 'ready') {
      status = 'early-stage-recommended';
    }
    messages.push(
      `${species.name} evolves at Lv ${minEvoLv}, above this checkpoint's Lv ${checkpoint.levelCap} cap.`,
    );
  }

  if (messages.length === 0 && dexEntry.locations[0]) {
    const loc = dexEntry.locations[0];
    messages.push(
      loc.minLevel !== undefined && loc.maxLevel !== undefined
        ? `${loc.areaName} (Lv ${loc.minLevel}–${loc.maxLevel})`
        : loc.areaName,
    );
  }

  return {
    slotIndex,
    species,
    status,
    dexEntry,
    ...(unlockCheckpoint ? { unlockCheckpoint } : {}),
    messages,
  };
}

function evaluateBossMatchups(
  snapshotTeam: Team,
  checkpoint: Checkpoint,
  context: GameContext,
  dex: DexGateway,
): { matchups: BossPokemonMatchup[]; overallRating: CheckpointEvaluation['overallRating'] } {
  const activeMembers = snapshotTeam
    .map((member) => {
      if (!member) return null;
      const species = dex.getSpecies(member.speciesSlug, context.generation);
      if (!species) return null;
      return { member, species };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  let favorableCount = 0;
  let dangerousCount = 0;

  const matchups: BossPokemonMatchup[] = checkpoint.bossNotablePokemon
    .map((bossSlug) => dex.getSpecies(bossSlug, context.generation))
    .filter((sp): sp is SpeciesData => Boolean(sp))
    .map((bossSpecies) => {
      const counteredBy: string[] = [];
      const threatens: string[] = [];

      for (const { member, species } of activeMembers) {
        // Check if our teammate hits the boss Pokémon super-effectively (moveset or STAB)
        const moveHitsSe = member.moveSlugs.some((moveSlug) => {
          const move = dex.getMove(moveSlug, context.generation);
          if (!move || move.category === 'Status' || move.basePower <= 0) return false;
          return (
            calculateTypeEffectiveness(move.type, bossSpecies.types, context.generation, dex) >= 2
          );
        });

        const stabHitsSe = species.types.some(
          (stab) =>
            calculateTypeEffectiveness(stab, bossSpecies.types, context.generation, dex) >= 2,
        );

        if (moveHitsSe || (member.moveSlugs.length === 0 && stabHitsSe)) {
          counteredBy.push(species.name);
        }

        // Check if boss's STABs threaten our teammate
        const bossThreatens = bossSpecies.types.some((bossStab) => {
          const mult = calculateDefensiveMultiplier(
            bossStab,
            {
              types: species.types,
              ...(member.abilitySlug ? { abilitySlug: member.abilitySlug } : {}),
              ...(member.itemSlug ? { itemSlug: member.itemSlug } : {}),
            },
            context,
            dex,
          ).multiplier;
          return mult >= 2;
        });

        if (bossThreatens) {
          threatens.push(species.name);
        }
      }

      const status: BossPokemonMatchup['status'] =
        counteredBy.length > 0 && threatens.length <= counteredBy.length
          ? 'countered'
          : counteredBy.length === 0 && threatens.length > 0
            ? 'dangerous'
            : 'neutral';

      if (status === 'countered') favorableCount += 1;
      if (status === 'dangerous') dangerousCount += 1;

      return {
        bossSpecies,
        counteredBy,
        threatens,
        status,
      };
    });

  const overallRating: CheckpointEvaluation['overallRating'] =
    activeMembers.length === 0
      ? 'Risky'
      : favorableCount >= Math.ceil(matchups.length * 0.5) && dangerousCount === 0
        ? 'Favorable'
        : dangerousCount > favorableCount
          ? 'Risky'
          : 'Even';

  return { matchups, overallRating };
}

/**
 * Validates a checkpoint team snapshot against unlock timing, level caps, version exclusives,
 * trade evolution rules, and boss type matchups.
 */
export function evaluateJourneyCheckpoint(
  snapshotTeam: Team,
  checkpointId: string,
  manifest: GameManifest,
  context: GameContext,
  dex: DexGateway,
  options: JourneyFilterOptions = {},
): CheckpointEvaluation {
  const checkpointMap = buildCheckpointOrderMap(manifest);
  const checkpoint = checkpointMap.get(checkpointId) ?? manifest.checkpoints[0];
  if (!checkpoint) {
    throw new Error(`GameManifest "${manifest.id}" has no checkpoints.`);
  }

  const slots: (JourneySlotDiagnostic | null)[] = [null, null, null, null, null, null];
  for (let i = 0; i < 6; i++) {
    const slotIndex = i as TeamSlotIndex;
    const member = snapshotTeam[slotIndex];
    if (!member) continue;
    const species = dex.getSpecies(member.speciesSlug, context.generation);
    if (!species) continue;

    slots[slotIndex] = evaluateSlotAtCheckpoint(
      slotIndex,
      species,
      checkpoint,
      manifest,
      checkpointMap,
      options,
    );
  }

  const { matchups, overallRating } = evaluateBossMatchups(snapshotTeam, checkpoint, context, dex);

  return {
    checkpoint,
    slots,
    bossMatchups: matchups,
    overallRating,
  };
}
