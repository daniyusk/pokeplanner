import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteJourneyPlan,
  loadAllJourneyPlans,
  saveJourneyPlan,
} from '@/data/storage/journeyStorage';
import type { JourneyPlan } from '@/domain/types';

const mockDb = new Map<string, unknown>();
let readDelayMs = 0;

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => {
    const snapshot = mockDb.get(key);
    if (readDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, readDelayMs));
    }
    return snapshot;
  }),
  set: vi.fn(async (key: string, value: unknown) => {
    if (readDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, readDelayMs));
    }
    mockDb.set(key, value);
  }),
}));

const PLATINUM_PLAN: JourneyPlan = {
  gameId: 'platinum',
  versionId: 'platinum',
  starterSlug: 'chimchar',
  starterLevel: 5,
  steps: [
    {
      id: 'step-1',
      beforeCheckpointId: 'gym-1-roark',
      parentStepId: null,
      order: 1,
      action: { type: 'train', speciesSlug: 'chimchar', targetLevel: 14 },
    },
  ],
};

const EMERALD_PLAN: JourneyPlan = {
  gameId: 'emerald',
  versionId: 'emerald',
  starterSlug: 'mudkip',
  starterLevel: 5,
  steps: [],
};

describe('journeyStorage persistence serialization', () => {
  beforeEach(() => {
    mockDb.clear();
    readDelayMs = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('preserves both plans when saveJourneyPlan is called concurrently for different games', async () => {
    readDelayMs = 15;

    await Promise.all([saveJourneyPlan(PLATINUM_PLAN), saveJourneyPlan(EMERALD_PLAN)]);

    readDelayMs = 0;
    const all = await loadAllJourneyPlans();
    expect(all.platinum).toEqual(PLATINUM_PLAN);
    expect(all.emerald).toEqual(EMERALD_PLAN);
  });

  it('applies concurrent save and delete operations in FIFO order without stale overwrites', async () => {
    await saveJourneyPlan(PLATINUM_PLAN);
    readDelayMs = 15;

    const updatedPlatinum: JourneyPlan = {
      ...PLATINUM_PLAN,
      starterSlug: 'piplup',
    };

    await Promise.all([
      saveJourneyPlan(EMERALD_PLAN),
      saveJourneyPlan(updatedPlatinum),
      deleteJourneyPlan(EMERALD_PLAN.gameId),
    ]);

    readDelayMs = 0;
    const all = await loadAllJourneyPlans();
    expect(all.platinum?.starterSlug).toBe('piplup');
    expect(all.emerald).toBeUndefined();
  });

  it('rejects malformed or explicit-undefined persisted plans cleanly', async () => {
    mockDb.set('pokeplanner:journey_plans', {
      platinum: {
        ...PLATINUM_PLAN,
        versionId: undefined,
      },
    });
    const plans = await loadAllJourneyPlans();
    expect(plans).toEqual({});
  });
});
