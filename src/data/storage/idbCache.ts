import { get, set } from 'idb-keyval';
import type { ZodType } from 'zod';

/**
 * Fetches JSON from `url`, validates it with `schema`, caches in IndexedDB under `cacheKey`,
 * and falls back to the IndexedDB cache when offline or when the fetch fails.
 */
export async function fetchWithIndexedDbFallback<T>(
  url: string,
  cacheKey: string,
  schema: ZodType<T>,
): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const json: unknown = await response.json();
      const parsed = schema.parse(json);
      await set(cacheKey, parsed).catch(() => undefined);
      return parsed;
    }
  } catch {
    // Fall back to IndexedDB when offline
  }

  try {
    const cached = await get(cacheKey);
    if (cached) {
      return schema.parse(cached);
    }
  } catch {
    // Ignore storage errors
  }

  return null;
}
