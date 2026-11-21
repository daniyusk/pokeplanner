import fs from 'node:fs';
import path from 'node:path';
import { get, set } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/data/config/storageKeys';
import { gameManifestSchema } from '@/data/games/gameManifestSchema';
import type { GameManifest, JourneyPlan, Team } from '@/domain/types';
import { useJourneyStore } from '@/stores/useJourneyStore';

const { idbStore } = vi.hoisted(() => ({
  idbStore: new Map<string, unknown>(),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbStore.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    idbStore.set(key, value);
  }),
}));

const platinumRaw = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, '../../../public/data/games/platinum.json'),
    'utf-8',
  ),
);
const PLATINUM_MANIFEST = gameManifestSchema.parse(platinumRaw);

describe('useJourneyStore Seam', () => {
  beforeEach(() => {
    idbStore.clear();
    vi.clearAllMocks();
    useJourneyStore.setState({ plansByGameId: {}, isLoaded: false });
  });

  it('ensures a game plan, picks a starter, adds branching steps, and deletes subtrees cleanly', () => {
    const store = useJourneyStore.getState();
    const initial = store.ensurePlan(PLATINUM_MANIFEST);
    expect(initial.starterSlug).toBeNull();
    expect(initial.steps).toHaveLength(0);

    store.setStarter(PLATINUM_MANIFEST.id, 'chimchar', 5);
    expect(useJourneyStore.getState().plansByGameId[PLATINUM_MANIFEST.id]?.starterSlug).toBe(
      'chimchar',
    );

    const parent = store.addStep(PLATINUM_MANIFEST.id, {
      beforeCheckpointId: 'gym-1-roark',
      parentStepId: null,
      action: { type: 'train', speciesSlug: 'chimchar', targetLevel: 14 },
    });
    expect(parent).not.toBeNull();

    const child = store.addStep(PLATINUM_MANIFEST.id, {
      beforeCheckpointId: 'gym-1-roark',
      parentStepId: parent?.id ?? null,
      action: {
        type: 'evolve',
        fromSpeciesSlug: 'chimchar',
        toSpeciesSlug: 'monferno',
        targetLevel: 14,
      },
    });
    expect(child?.parentStepId).toBe(parent?.id);
    expect(useJourneyStore.getState().plansByGameId[PLATINUM_MANIFEST.id]?.steps).toHaveLength(2);

    // Removing the parent removes both parent and child descendant
    if (parent) {
      store.removeStep(PLATINUM_MANIFEST.id, parent.id);
    }
    expect(useJourneyStore.getState().plansByGameId[PLATINUM_MANIFEST.id]?.steps).toHaveLength(0);
  });

  it('seeds a journey plan from an existing team and resets cleanly', () => {
    const store = useJourneyStore.getState();
    const team: Team = [
      { speciesSlug: 'infernape', moveSlugs: [] },
      { speciesSlug: 'garchomp', moveSlugs: [] },
      null,
      null,
      null,
      null,
    ];

    store.seedFromTeam(PLATINUM_MANIFEST, team);
    const plan = useJourneyStore.getState().plansByGameId[PLATINUM_MANIFEST.id];
    expect(plan?.starterSlug).toBe('chimchar');
    expect((plan?.steps.length ?? 0) > 0).toBe(true);

    store.resetPlan(PLATINUM_MANIFEST);
    const reset = useJourneyStore.getState().plansByGameId[PLATINUM_MANIFEST.id];
    expect(reset?.starterSlug).toBeNull();
    expect(reset?.steps).toHaveLength(0);
  });

  it('does not persist an empty default plan on ensurePlan and deduplicates concurrent loadAllPlans calls', async () => {
    const savedPlan: JourneyPlan = {
      gameId: PLATINUM_MANIFEST.id,
      versionId: 'platinum',
      starterSlug: 'piplup',
      starterLevel: 5,
      steps: [],
    };
    idbStore.set(STORAGE_KEYS.journeyPlans, { [PLATINUM_MANIFEST.id]: savedPlan });

    const store = useJourneyStore.getState();
    await Promise.all([store.loadAllPlans(), store.loadAllPlans()]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(useJourneyStore.getState().plansByGameId[PLATINUM_MANIFEST.id]?.starterSlug).toBe(
      'piplup',
    );

    // ensurePlan on a game with no saved plan creates an in-memory default without writing to IDB
    vi.clearAllMocks();
    const emeraldManifest: GameManifest = {
      ...PLATINUM_MANIFEST,
      id: 'emerald',
      name: 'Pokémon Emerald',
      shortName: 'Emerald',
      versions: [{ id: 'emerald', name: 'Emerald' }],
    };
    const ensured = store.ensurePlan(emeraldManifest);
    expect(ensured.starterSlug).toBeNull();
    expect(set).not.toHaveBeenCalled();
  });
});
