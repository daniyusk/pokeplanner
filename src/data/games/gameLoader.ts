import { STORAGE_KEYS } from '@/data/config/storageKeys';
import { fetchWithIndexedDbFallback } from '@/data/storage/idbCache';
import type { GameCatalogEntry, GameManifest } from '@/domain/types';
import { gameCatalogSchema, gameManifestSchema } from './gameManifestSchema';

const memoryManifestCache = new Map<string, GameManifest>();
let memoryCatalogCache: readonly GameCatalogEntry[] | null = null;

/**
 * Loads the list of curated campaign games (`public/data/games/index.json`),
 * caching in memory and IndexedDB for offline access.
 */
export async function loadGameCatalog(): Promise<readonly GameCatalogEntry[]> {
  if (memoryCatalogCache) return memoryCatalogCache;

  const loaded = await fetchWithIndexedDbFallback(
    '/data/games/index.json',
    STORAGE_KEYS.gameCatalog,
    gameCatalogSchema,
  );
  if (loaded) {
    memoryCatalogCache = loaded;
    return loaded;
  }

  return [];
}

/**
 * Loads and validates a specific GameManifest by ID, caching in memory and IndexedDB.
 */
export async function loadGameManifest(gameId: string): Promise<GameManifest | null> {
  const mem = memoryManifestCache.get(gameId);
  if (mem) return mem;

  const loaded = await fetchWithIndexedDbFallback(
    `/data/games/${gameId}.json`,
    `${STORAGE_KEYS.gameManifestPrefix}${gameId}`,
    gameManifestSchema,
  );
  if (loaded) {
    memoryManifestCache.set(gameId, loaded);
    return loaded;
  }

  return null;
}
