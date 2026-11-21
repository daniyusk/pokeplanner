import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listSavedTeams, type SavedTeamRecord, saveTeamRecord } from '@/data/storage/teamStorage';

const mockDb = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mockDb.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    mockDb.set(key, value);
  }),
}));

describe('teamStorage schema validation', () => {
  beforeEach(() => {
    mockDb.clear();
  });

  it('persists and loads valid SavedTeamRecord entries without optional undefined noise', async () => {
    const record: SavedTeamRecord = {
      id: 'team-1',
      name: 'Sinnoh Squad',
      updatedAt: '2026-01-01T00:00:00.000Z',
      mode: 'campaign',
      generation: 4,
      gameId: 'platinum',
      team: [
        { speciesSlug: 'infernape', moveSlugs: ['closecombat', 'flareblitz'] },
        null,
        null,
        null,
        null,
        null,
      ],
    };

    await saveTeamRecord(record);
    const loaded = await listSavedTeams();
    expect(loaded).toEqual([record]);
  });

  it('returns empty array when persisted team records violate exactOptional contract', async () => {
    mockDb.set('pokeplanner:saved_teams', [
      {
        id: 'team-bad',
        name: 'Broken Team',
        updatedAt: '2026-01-01T00:00:00.000Z',
        mode: 'free',
        generation: 9,
        gameId: undefined,
        team: [null, null, null, null, null, null],
      },
    ]);

    const loaded = await listSavedTeams();
    expect(loaded).toEqual([]);
  });
});
