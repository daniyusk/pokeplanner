import { get, set } from 'idb-keyval';
import { z } from 'zod';
import { STORAGE_KEYS } from '@/data/config/storageKeys';
import { levelSchema } from '@/domain/schemas';
import type { JourneyPlan } from '@/domain/types';

const journeyCaptureActionSchema = z.object({
  type: z.literal('capture'),
  speciesSlug: z.string().min(1),
  level: levelSchema.exactOptional(),
  location: z.string().exactOptional(),
  note: z.string().exactOptional(),
});

const journeyTrainActionSchema = z.object({
  type: z.literal('train'),
  speciesSlug: z.string().min(1),
  targetLevel: levelSchema,
  note: z.string().exactOptional(),
});

const journeyEvolveActionSchema = z.object({
  type: z.literal('evolve'),
  fromSpeciesSlug: z.string().min(1),
  toSpeciesSlug: z.string().min(1),
  targetLevel: levelSchema.exactOptional(),
  methodNote: z.string().exactOptional(),
});

const journeyReplaceActionSchema = z.object({
  type: z.literal('replace'),
  outSpeciesSlug: z.string().min(1),
  inSpeciesSlug: z.string().min(1),
  level: levelSchema.exactOptional(),
  location: z.string().exactOptional(),
  note: z.string().exactOptional(),
});

const journeyGoalActionSchema = z.object({
  type: z.literal('goal'),
  title: z.string().min(1),
  speciesSlug: z.string().min(1).exactOptional(),
  moveSlug: z.string().min(1).exactOptional(),
  itemSlug: z.string().min(1).exactOptional(),
  note: z.string().exactOptional(),
});

const journeyStepActionSchema = z.discriminatedUnion('type', [
  journeyCaptureActionSchema,
  journeyTrainActionSchema,
  journeyEvolveActionSchema,
  journeyReplaceActionSchema,
  journeyGoalActionSchema,
]);

const journeyStepNodeSchema = z.object({
  id: z.string().min(1),
  beforeCheckpointId: z.string().min(1),
  parentStepId: z.string().nullable(),
  order: z.number().int().min(1),
  action: journeyStepActionSchema,
});

const journeyPlanSchema = z.object({
  gameId: z.string().min(1),
  versionId: z.string().exactOptional(),
  starterSlug: z.string().nullable(),
  starterLevel: levelSchema,
  steps: z.array(journeyStepNodeSchema),
}) satisfies z.ZodType<JourneyPlan>;

const journeyPlansRecordSchema = z.record(z.string().min(1), journeyPlanSchema);

let storageQueue: Promise<unknown> = Promise.resolve();

function enqueueStorageOp<T>(op: () => Promise<T>): Promise<T> {
  const next = storageQueue.then(op, op);
  storageQueue = next.catch(() => undefined);
  return next;
}

async function readAllJourneyPlansRaw(): Promise<Record<string, JourneyPlan>> {
  try {
    const raw = await get(STORAGE_KEYS.journeyPlans);
    if (!raw) return {};
    const parsed = journeyPlansRecordSchema.safeParse(raw);
    if (!parsed.success) return {};
    return parsed.data;
  } catch {
    return {};
  }
}

/**
 * Loads all persisted JourneyPlans from IndexedDB, ordered after pending writes.
 */
export function loadAllJourneyPlans(): Promise<Record<string, JourneyPlan>> {
  return enqueueStorageOp(() => readAllJourneyPlansRaw());
}

/**
 * Persists a JourneyPlan keyed by gameId in IndexedDB using serialized writes.
 */
export function saveJourneyPlan(plan: JourneyPlan): Promise<void> {
  return enqueueStorageOp(async () => {
    try {
      const existing = await readAllJourneyPlansRaw();
      await set(STORAGE_KEYS.journeyPlans, {
        ...existing,
        [plan.gameId]: plan,
      });
    } catch {
      // Ignore storage failures in restricted contexts
    }
  });
}

/**
 * Deletes a persisted JourneyPlan for a given gameId using serialized writes.
 */
export function deleteJourneyPlan(gameId: string): Promise<void> {
  return enqueueStorageOp(async () => {
    try {
      const existing = await readAllJourneyPlansRaw();
      const { [gameId]: _, ...rest } = existing;
      await set(STORAGE_KEYS.journeyPlans, rest);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  });
}
