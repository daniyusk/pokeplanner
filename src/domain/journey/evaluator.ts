import { MOVE_CATEGORY, TEAM_SLOT_INDICES } from '@/domain/constants';
import { calculateDefensiveMultiplier, calculateTypeEffectiveness } from '@/domain/mechanics';
import { resolveTeamEntries } from '@/domain/team';
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
import {
  buildCheckpointOrderMap,
  diagnoseManifestAvailability,
  type JourneyFilterOptions,
} from './availability';

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
  const diagnosis = diagnoseManifestAvailability(
    species.slug,
    species.name,
    checkpoint,
    manifest,
    checkpointMap,
    options,
  );

  if (diagnosis.status === 'not-in-game' || !diagnosis.dexEntry) {
    return {
      slotIndex,
      species,
      status: 'not-in-game',
      messages: diagnosis.messages,
    };
  }

  const messages = [...diagnosis.messages];
  let status: JourneySlotStatus = diagnosis.status === 'ok' ? 'ready' : diagnosis.status;

  const minEvoLv = diagnosis.dexEntry.evolutionNotes?.minEvolutionLevel;
  if (minEvoLv !== undefined && minEvoLv > checkpoint.levelCap) {
    if (status === 'ready') {
      status = 'early-stage-recommended';
    }
    messages.push(
      `${species.name} evolves at Lv ${minEvoLv}, above this checkpoint's Lv ${checkpoint.levelCap} cap.`,
    );
  }

  if (messages.length === 0 && diagnosis.dexEntry.locations[0]) {
    const loc = diagnosis.dexEntry.locations[0];
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
    dexEntry: diagnosis.dexEntry,
    ...(diagnosis.unlockCheckpoint ? { unlockCheckpoint: diagnosis.unlockCheckpoint } : {}),
    messages,
  };
}

function evaluateBossMatchups(
  snapshotTeam: Team,
  checkpoint: Checkpoint,
  context: GameContext,
  dex: DexGateway,
): { matchups: BossPokemonMatchup[]; overallRating: CheckpointEvaluation['overallRating'] } {
  const activeMembers = resolveTeamEntries(snapshotTeam, context.generation, dex);

  let favorableCount = 0;
  let dangerousCount = 0;

  const matchups: BossPokemonMatchup[] = checkpoint.bossNotablePokemon
    .map((bossSlug) => dex.getSpecies(bossSlug, context.generation))
    .filter((sp): sp is SpeciesData => Boolean(sp))
    .map((bossSpecies) => {
      const counteredBy: string[] = [];
      const threatens: string[] = [];

      for (const { member, species } of activeMembers) {
        const moveHitsSe = member.moveSlugs.some((moveSlug) => {
          const move = dex.getMove(moveSlug, context.generation);
          if (!move || move.category === MOVE_CATEGORY.Status || move.basePower <= 0) return false;
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
  checkpointMap: ReadonlyMap<string, Checkpoint> = buildCheckpointOrderMap(manifest),
): CheckpointEvaluation {
  const checkpoint = checkpointMap.get(checkpointId) ?? manifest.checkpoints[0];
  if (!checkpoint) {
    throw new Error(`GameManifest "${manifest.id}" has no checkpoints.`);
  }

  const slots: (JourneySlotDiagnostic | null)[] = [null, null, null, null, null, null];
  for (const slotIndex of TEAM_SLOT_INDICES) {
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
