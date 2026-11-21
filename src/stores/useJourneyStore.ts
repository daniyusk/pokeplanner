import { create } from 'zustand';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  deleteJourneyPlan,
  loadAllJourneyPlans,
  saveJourneyPlan,
} from '@/data/storage/journeyStorage';
import { createEmptyJourneyPlan, seedJourneyPlanFromTeam } from '@/domain/journey';
import type {
  GameManifest,
  JourneyPlan,
  JourneyStepAction,
  JourneyStepNode,
  SpeciesSlug,
  Team,
} from '@/domain/types';
import { generateEntityId } from './idGenerator';

export interface AddJourneyStepInput {
  beforeCheckpointId: string;
  parentStepId: string | null;
  action: JourneyStepAction;
}

export interface JourneyStoreState {
  plansByGameId: Record<string, JourneyPlan>;
  isLoaded: boolean;

  loadAllPlans: () => Promise<void>;
  ensurePlan: (manifest: GameManifest, versionId?: string) => JourneyPlan;
  setStarter: (gameId: string, starterSlug: SpeciesSlug | null, starterLevel?: number) => void;
  setPlanVersion: (gameId: string, versionId: string) => void;
  addStep: (gameId: string, input: AddJourneyStepInput) => JourneyStepNode | null;
  updateStep: (gameId: string, stepId: string, action: JourneyStepAction) => void;
  removeStep: (gameId: string, stepId: string) => void;
  seedFromTeam: (manifest: GameManifest, team: Team, versionId?: string) => void;
  resetPlan: (manifest: GameManifest, versionId?: string) => void;
}

function collectDescendantIds(
  steps: readonly JourneyStepNode[],
  rootId: string,
  acc: Set<string>,
): void {
  acc.add(rootId);
  for (const step of steps) {
    if (step.parentStepId === rootId && !acc.has(step.id)) {
      collectDescendantIds(steps, step.id, acc);
    }
  }
}

let inFlightLoad: Promise<void> | null = null;

export const useJourneyStore = create<JourneyStoreState>((set, get) => ({
  plansByGameId: {},
  isLoaded: false,

  async loadAllPlans() {
    if (get().isLoaded) return;
    if (inFlightLoad) return inFlightLoad;

    inFlightLoad = loadAllJourneyPlans()
      .then((stored) => {
        set((state) => ({
          plansByGameId: { ...stored, ...state.plansByGameId },
          isLoaded: true,
        }));
      })
      .finally(() => {
        inFlightLoad = null;
      });

    return inFlightLoad;
  },

  ensurePlan(manifest, versionId) {
    const existing = get().plansByGameId[manifest.id];
    if (existing) {
      if (versionId && existing.versionId !== versionId) {
        const updated: JourneyPlan = { ...existing, versionId };
        set((state) => ({
          plansByGameId: { ...state.plansByGameId, [manifest.id]: updated },
        }));
        if (existing.starterSlug !== null || existing.steps.length > 0) {
          void saveJourneyPlan(updated);
        }
        return updated;
      }
      return existing;
    }
    const created = createEmptyJourneyPlan(manifest, versionId);
    set((state) => ({
      plansByGameId: { ...state.plansByGameId, [manifest.id]: created },
    }));
    return created;
  },

  setStarter(gameId, starterSlug, starterLevel) {
    const plan = get().plansByGameId[gameId];
    if (!plan) return;
    const updated: JourneyPlan = {
      ...plan,
      starterSlug,
      starterLevel: starterLevel ?? plan.starterLevel,
    };
    set((state) => ({
      plansByGameId: { ...state.plansByGameId, [gameId]: updated },
    }));
    void saveJourneyPlan(updated);
  },

  setPlanVersion(gameId, versionId) {
    const plan = get().plansByGameId[gameId];
    if (!plan) return;
    const updated: JourneyPlan = { ...plan, versionId };
    set((state) => ({
      plansByGameId: { ...state.plansByGameId, [gameId]: updated },
    }));
    void saveJourneyPlan(updated);
  },

  addStep(gameId, input) {
    const plan = get().plansByGameId[gameId];
    if (!plan) return null;

    const siblingCount = plan.steps.filter(
      (s) =>
        s.beforeCheckpointId === input.beforeCheckpointId && s.parentStepId === input.parentStepId,
    ).length;

    const newNode: JourneyStepNode = {
      id: generateEntityId('step'),
      beforeCheckpointId: input.beforeCheckpointId,
      parentStepId: input.parentStepId,
      order: siblingCount + 1,
      action: input.action,
    };

    const updated: JourneyPlan = {
      ...plan,
      steps: [...plan.steps, newNode],
    };

    set((state) => ({
      plansByGameId: { ...state.plansByGameId, [gameId]: updated },
    }));
    void saveJourneyPlan(updated);
    return newNode;
  },

  updateStep(gameId, stepId, action) {
    const plan = get().plansByGameId[gameId];
    if (!plan) return;

    const updated: JourneyPlan = {
      ...plan,
      steps: plan.steps.map((s) => (s.id === stepId ? { ...s, action } : s)),
    };

    set((state) => ({
      plansByGameId: { ...state.plansByGameId, [gameId]: updated },
    }));
    void saveJourneyPlan(updated);
  },

  removeStep(gameId, stepId) {
    const plan = get().plansByGameId[gameId];
    if (!plan) return;

    const toDelete = new Set<string>();
    collectDescendantIds(plan.steps, stepId, toDelete);

    const updated: JourneyPlan = {
      ...plan,
      steps: plan.steps.filter((s) => !toDelete.has(s.id)),
    };

    set((state) => ({
      plansByGameId: { ...state.plansByGameId, [gameId]: updated },
    }));
    void saveJourneyPlan(updated);
  },

  seedFromTeam(manifest, team, versionId) {
    const seeded = seedJourneyPlanFromTeam(team, manifest, pkmnDexGateway, versionId);
    set((state) => ({
      plansByGameId: { ...state.plansByGameId, [manifest.id]: seeded },
    }));
    void saveJourneyPlan(seeded);
  },

  resetPlan(manifest, versionId) {
    const fresh = createEmptyJourneyPlan(manifest, versionId);
    set((state) => ({
      plansByGameId: { ...state.plansByGameId, [manifest.id]: fresh },
    }));
    void deleteJourneyPlan(manifest.id);
  },
}));
