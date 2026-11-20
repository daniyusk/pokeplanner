import type { Checkpoint, GameDexEntry, GameManifest } from '@/domain/types';

export interface JourneyFilterOptions {
  versionId?: string;
  excludeTradeEvolutions?: boolean;
  excludePostGame?: boolean;
}

export function buildCheckpointOrderMap(manifest: GameManifest): ReadonlyMap<string, Checkpoint> {
  return new Map(manifest.checkpoints.map((cp) => [cp.id, cp]));
}

export function isEntryAvailableAtCheckpoint(
  entry: GameDexEntry,
  targetCheckpoint: Checkpoint,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  options: JourneyFilterOptions = {},
): boolean {
  const { versionId, excludeTradeEvolutions = false, excludePostGame = false } = options;

  if (excludePostGame && entry.availability === 'post-game') {
    return false;
  }

  if (excludeTradeEvolutions && entry.evolutionNotes?.requiresTrade) {
    return false;
  }

  if (
    versionId &&
    entry.exclusiveToVersions &&
    entry.exclusiveToVersions.length > 0 &&
    !entry.exclusiveToVersions.includes(versionId)
  ) {
    return false;
  }

  const unlockCheckpoint = checkpointMap.get(entry.earliestCheckpointId);
  if (!unlockCheckpoint) return false;

  return unlockCheckpoint.order <= targetCheckpoint.order;
}

/**
 * Returns the set of species slugs obtainable in the game up through `checkpointId`,
 * factoring in version exclusives, trade-evolution restrictions, and story progression.
 */
export function getAvailableSpeciesAtCheckpoint(
  manifest: GameManifest,
  checkpointId: string,
  options: JourneyFilterOptions = {},
): ReadonlySet<string> {
  const checkpointMap = buildCheckpointOrderMap(manifest);
  const targetCheckpoint = checkpointMap.get(checkpointId);
  if (!targetCheckpoint) return new Set();

  const available = new Set<string>();
  for (const [slug, entry] of Object.entries(manifest.dex)) {
    if (isEntryAvailableAtCheckpoint(entry, targetCheckpoint, checkpointMap, options)) {
      available.add(slug);
    }
  }
  return available;
}

/**
 * Returns all species slugs present in the game's Pokédex under the given filter options.
 */
export function getAvailableSpeciesInGame(
  manifest: GameManifest,
  options: JourneyFilterOptions = {},
): ReadonlySet<string> {
  const { versionId, excludeTradeEvolutions = false, excludePostGame = true } = options;
  const available = new Set<string>();

  for (const [slug, entry] of Object.entries(manifest.dex)) {
    if (excludePostGame && entry.availability === 'post-game') continue;
    if (excludeTradeEvolutions && entry.evolutionNotes?.requiresTrade) continue;
    if (
      versionId &&
      entry.exclusiveToVersions &&
      entry.exclusiveToVersions.length > 0 &&
      !entry.exclusiveToVersions.includes(versionId)
    ) {
      continue;
    }
    available.add(slug);
  }

  return available;
}
