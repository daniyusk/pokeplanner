import { get, set } from 'idb-keyval';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fetchWithIndexedDbFallback } from '@/data/storage/idbCache';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(async () => undefined),
}));

const sampleSchema = z.object({ id: z.string(), value: z.number() });

describe('fetchWithIndexedDbFallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches, validates, and caches payload in IndexedDB when online', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'platinum', value: 4 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWithIndexedDbFallback('/data/test.json', 'cache:test', sampleSchema);
    expect(result).toEqual({ id: 'platinum', value: 4 });
    expect(set).toHaveBeenCalledWith('cache:test', { id: 'platinum', value: 4 });
  });

  it('falls back to validated IndexedDB cache when fetch fails offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Network offline');
      }),
    );
    vi.mocked(get).mockResolvedValueOnce({ id: 'emerald', value: 3 });

    const result = await fetchWithIndexedDbFallback('/data/test.json', 'cache:test', sampleSchema);
    expect(result).toEqual({ id: 'emerald', value: 3 });
  });

  it('returns null when both fetch and IndexedDB cache fail or have invalid data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false })),
    );
    vi.mocked(get).mockResolvedValueOnce({ invalid: true });

    const result = await fetchWithIndexedDbFallback('/data/test.json', 'cache:test', sampleSchema);
    expect(result).toBeNull();
  });
});
