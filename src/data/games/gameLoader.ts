import { get, set } from 'idb-keyval';
import type { GameCatalogEntry, GameManifest } from '@/domain/types';
import { gameCatalogSchema, gameManifestSchema } from './gameManifestSchema';

const CATALOG_CACHE_KEY = 'pokeplanner:game-catalog:v1';
const MANIFEST_CACHE_PREFIX = 'pokeplanner:game-manifest:v1:';

const memoryManifestCache = new Map<string, GameManifest>();
let memoryCatalogCache: readonly GameCatalogEntry[] | null = null;

/**
 * Loads the list of curated campaign games (`public/data/games/index.json`),
 * caching in memory and IndexedDB for offline access.
 */
export async function loadGameCatalog(): Promise<readonly GameCatalogEntry[]> {
  if (memoryCatalogCache) return memoryCatalogCache;

  try {
    const response = await fetch('/data/games/index.json');
    if (response.ok) {
      const json = await response.json();
      const parsed = gameCatalogSchema.parse(json);
      memoryCatalogCache = parsed;
      await set(CATALOG_CACHE_KEY, parsed).catch(() => undefined);
      return parsed;
    }
  } catch {
    // Fall back to IndexedDB when offline
  }

  try {
    const cached = await get(CATALOG_CACHE_KEY);
    if (cached) {
      const parsed = gameCatalogSchema.parse(cached);
      memoryCatalogCache = parsed;
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }

  return [];
}

/**
 * Loads and validates a specific GameManifest by ID, caching in memory and IndexedDB.
 */
export async function loadGameManifest(gameId: string): Promise<GameManifest | null> {
  const mem = memoryManifestCache.get(gameId);
  if (mem) return mem;

  try {
    const response = await fetch(`/data/games/${gameId}.json`);
    if (response.ok) {
      const json = await response.json();
      const parsed = gameManifestSchema.parse(json) as GameManifest;
      memoryManifestCache.set(gameId, parsed);
      await set(`${MANIFEST_CACHE_PREFIX}${gameId}`, parsed).catch(() => undefined);
      return parsed;
    }
  } catch {
    // Fall back to IndexedDB when offline
  }

  try {
    const cached = await get(`${MANIFEST_CACHE_PREFIX}${gameId}`);
    if (cached) {
      const parsed = gameManifestSchema.parse(cached) as GameManifest;
      memoryManifestCache.set(gameId, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }

  return null;
}
