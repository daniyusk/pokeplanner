import type {
  Checkpoint,
  DexGateway,
  GameManifest,
  SpeciesData,
  Team,
  TeamSlot,
  TeamSlotIndex,
} from '@/domain/types';
import { buildCheckpointOrderMap } from './availability';

function getEvolutionChain(
  finalSpecies: SpeciesData,
  manifest: GameManifest,
  dex: DexGateway,
): SpeciesData[] {
  const chain: SpeciesData[] = [finalSpecies];
  let current = finalSpecies;
  let guard = 0;

  while (current.prevoSlug && guard < 4) {
    const prevo = dex.getSpecies(current.prevoSlug, manifest.generation);
    if (!prevo) break;
    chain.unshift(prevo);
    current = prevo;
    guard += 1;
  }

  return chain;
}

function pickStageForCheckpoint(
  chain: readonly SpeciesData[],
  checkpoint: Checkpoint,
  manifest: GameManifest,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
): SpeciesData | null {
  // Check earliest unlock among any stage in the chain present in manifest
  let earliestOrder = Number.POSITIVE_INFINITY;
  for (const stage of chain) {
    const entry = manifest.dex[stage.slug];
    if (!entry) continue;
    const unlockCp = checkpointMap.get(entry.earliestCheckpointId);
    if (unlockCp && unlockCp.order < earliestOrder) {
      earliestOrder = unlockCp.order;
    }
  }

  if (earliestOrder > checkpoint.order) {
    return null;
  }

  // Pick the highest stage in the chain whose minEvolutionLevel <= checkpoint.levelCap
  let selected: SpeciesData | null = null;
  for (const stage of chain) {
    const entry = manifest.dex[stage.slug];
    if (!entry) continue;
    const unlockCp = checkpointMap.get(entry.earliestCheckpointId);
    if (unlockCp && unlockCp.order > checkpoint.order) continue;

    const minLv = entry.evolutionNotes?.minEvolutionLevel;
    if (minLv !== undefined && minLv > checkpoint.levelCap) {
      continue;
    }
    selected = stage;
  }

  return selected ?? chain.find((stage) => Boolean(manifest.dex[stage.slug])) ?? null;
}

/**
 * Generates an automatic checkpoint-by-checkpoint team progression from a planned Final Team,
 * devolving late-level stages to match each checkpoint's level cap and omitting Pokémon
 * not yet unlocked at earlier gyms.
 */
export function buildDefaultJourneyFromFinalTeam(
  finalTeam: Team,
  manifest: GameManifest,
  dex: DexGateway,
): Record<string, Team> {
  const checkpointMap = buildCheckpointOrderMap(manifest);
  const snapshots: Record<string, Team> = {};

  for (const checkpoint of manifest.checkpoints) {
    const teamAtCheckpoint: TeamSlot[] = [null, null, null, null, null, null];

    for (let i = 0; i < 6; i++) {
      const slotIndex = i as TeamSlotIndex;
      const member = finalTeam[slotIndex];
      if (!member) continue;

      const finalSpecies = dex.getSpecies(member.speciesSlug, manifest.generation);
      if (!finalSpecies) continue;

      const chain = getEvolutionChain(finalSpecies, manifest, dex);
      const stage = pickStageForCheckpoint(chain, checkpoint, manifest, checkpointMap);
      if (!stage) continue;

      teamAtCheckpoint[slotIndex] = {
        ...member,
        speciesSlug: stage.slug,
      };
    }

    snapshots[checkpoint.id] = teamAtCheckpoint as Team;
  }

  return snapshots;
}
