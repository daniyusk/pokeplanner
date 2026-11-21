import { LEVEL_BOUNDS, MAX_EVOLUTION_CHAIN_DEPTH } from '@/domain/constants';
import type {
  Checkpoint,
  DexGateway,
  GameDexEntry,
  GameManifest,
  GenerationNumber,
  SpeciesData,
  SpeciesSlug,
} from '@/domain/types';

export const FINAL_SEGMENT_CHECKPOINT_ID = '__final__';

export function buildVirtualFinalCheckpoint(manifest: GameManifest): Checkpoint {
  const maxOrder = manifest.checkpoints.reduce((max, cp) => Math.max(max, cp.order), 0);
  return {
    id: FINAL_SEGMENT_CHECKPOINT_ID,
    order: maxOrder + 1,
    name: 'Final Team',
    category: 'champion',
    levelCap: LEVEL_BOUNDS.max,
    bossName: 'Final Team',
    bossNotablePokemon: [],
    unlockedLocations: [],
  };
}

export interface JourneyFilterOptions {
  versionId?: string;
  excludeTradeEvolutions?: boolean;
  excludePostGame?: boolean;
}

export function buildCheckpointOrderMap(manifest: GameManifest): ReadonlyMap<string, Checkpoint> {
  return new Map(manifest.checkpoints.map((cp) => [cp.id, cp]));
}

export function isExclusiveToOtherVersion(entry: GameDexEntry, versionId?: string): boolean {
  return Boolean(
    versionId &&
      entry.exclusiveToVersions &&
      entry.exclusiveToVersions.length > 0 &&
      !entry.exclusiveToVersions.includes(versionId),
  );
}

/**
 * Walks backwards from `finalSpecies` along `prevoSlug` links up to `MAX_EVOLUTION_CHAIN_DEPTH`.
 */
export function getEvolutionChain(
  finalSpecies: SpeciesData,
  generation: GenerationNumber,
  dex: DexGateway,
): SpeciesData[] {
  const chain: SpeciesData[] = [finalSpecies];
  let current = finalSpecies;
  let guard = 0;

  while (current.prevoSlug && guard < MAX_EVOLUTION_CHAIN_DEPTH) {
    const prevo = dex.getSpecies(current.prevoSlug, generation);
    if (!prevo) break;
    chain.unshift(prevo);
    current = prevo;
    guard += 1;
  }

  return chain;
}

export type ManifestAvailabilityStatus =
  | 'ok'
  | 'not-in-game'
  | 'version-exclusive'
  | 'trade-blocked'
  | 'unavailable-yet';

export interface ManifestAvailabilityDiagnosis {
  status: ManifestAvailabilityStatus;
  dexEntry?: GameDexEntry;
  unlockCheckpoint?: Checkpoint;
  messages: string[];
}

function shouldExcludePostGame(
  targetCheckpointId?: string,
  options: JourneyFilterOptions = {},
): boolean {
  if (options.excludePostGame !== undefined) return options.excludePostGame;
  return targetCheckpointId !== FINAL_SEGMENT_CHECKPOINT_ID;
}

function matchesBaseAvailability(
  entry: GameDexEntry,
  options: JourneyFilterOptions,
  targetCheckpointId?: string,
): boolean {
  if (shouldExcludePostGame(targetCheckpointId, options) && entry.availability === 'post-game') {
    return false;
  }
  if (options.excludeTradeEvolutions && entry.evolutionNotes?.requiresTrade) {
    return false;
  }
  if (isExclusiveToOtherVersion(entry, options.versionId)) {
    return false;
  }
  return true;
}

/**
 * Evaluates whether a species can be obtained before or at `targetCheckpoint`
 * under the active version, trade-evolution, and post-game rules, returning structured diagnostics.
 */
export function diagnoseManifestAvailability(
  speciesSlug: SpeciesSlug,
  speciesName: string,
  targetCheckpoint: Checkpoint,
  manifest: GameManifest,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  options: JourneyFilterOptions = {},
): ManifestAvailabilityDiagnosis {
  const dexEntry = manifest.dex[speciesSlug];
  if (!dexEntry) {
    return {
      status: 'not-in-game',
      messages: [`${speciesName} is not in the ${manifest.shortName} regional Pokédex.`],
    };
  }

  const unlockCheckpoint = checkpointMap.get(dexEntry.earliestCheckpointId);
  const messages: string[] = [];
  let status: ManifestAvailabilityStatus = 'ok';

  if (isExclusiveToOtherVersion(dexEntry, options.versionId)) {
    status = 'version-exclusive';
    messages.push(
      `Exclusive to ${dexEntry.exclusiveToVersions?.join(' / ')} (not catchable in ${options.versionId}).`,
    );
  } else if (options.excludeTradeEvolutions && dexEntry.evolutionNotes?.requiresTrade) {
    status = 'trade-blocked';
    messages.push(`${speciesName} requires a trade evolution (excluded by your campaign rules).`);
  } else if (
    shouldExcludePostGame(targetCheckpoint.id, options) &&
    dexEntry.availability === 'post-game'
  ) {
    status = 'unavailable-yet';
    messages.push(`${speciesName} is unlocked in the post-game after completing the main story.`);
  } else if (
    targetCheckpoint.id !== FINAL_SEGMENT_CHECKPOINT_ID &&
    unlockCheckpoint &&
    unlockCheckpoint.order > targetCheckpoint.order
  ) {
    status = 'unavailable-yet';
    messages.push(
      `Unlocked later at ${unlockCheckpoint.name}. Consider using a temporary teammate for this checkpoint.`,
    );
  }

  return {
    status,
    dexEntry,
    ...(unlockCheckpoint ? { unlockCheckpoint } : {}),
    messages,
  };
}

export function isEntryAvailableAtCheckpoint(
  entry: GameDexEntry,
  targetCheckpoint: Checkpoint,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  options: JourneyFilterOptions = {},
): boolean {
  if (!matchesBaseAvailability(entry, options, targetCheckpoint.id)) {
    return false;
  }

  if (targetCheckpoint.id === FINAL_SEGMENT_CHECKPOINT_ID) {
    return true;
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
  if (checkpointId === FINAL_SEGMENT_CHECKPOINT_ID) {
    return getAvailableSpeciesInGame(manifest, {
      ...options,
      excludePostGame: options.excludePostGame ?? false,
    });
  }

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
  const available = new Set<string>();

  for (const [slug, entry] of Object.entries(manifest.dex)) {
    if (matchesBaseAvailability(entry, options)) {
      available.add(slug);
    }
  }

  return available;
}
