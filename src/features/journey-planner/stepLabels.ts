import type { JourneyStepType } from '@/domain/types';

export const JOURNEY_STEP_LABELS: Record<JourneyStepType, string> = {
  capture: 'Capture',
  train: 'Train',
  evolve: 'Evolve',
  replace: 'Replace',
  goal: 'Goal',
};

export const JOURNEY_STEP_ORDER: readonly JourneyStepType[] = [
  'capture',
  'train',
  'evolve',
  'replace',
  'goal',
];
