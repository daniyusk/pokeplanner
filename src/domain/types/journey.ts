import type { ItemSlug, MoveSlug, SpeciesSlug } from './pokemon';

export type JourneyStepType = 'capture' | 'train' | 'evolve' | 'replace' | 'goal';

export interface JourneyCaptureAction {
  type: 'capture';
  speciesSlug: SpeciesSlug;
  level?: number;
  location?: string;
  note?: string;
}

export interface JourneyTrainAction {
  type: 'train';
  speciesSlug: SpeciesSlug;
  targetLevel: number;
  note?: string;
}

export interface JourneyEvolveAction {
  type: 'evolve';
  fromSpeciesSlug: SpeciesSlug;
  toSpeciesSlug: SpeciesSlug;
  targetLevel?: number;
  methodNote?: string;
}

export interface JourneyReplaceAction {
  type: 'replace';
  outSpeciesSlug: SpeciesSlug;
  inSpeciesSlug: SpeciesSlug;
  level?: number;
  location?: string;
  note?: string;
}

export interface JourneyGoalAction {
  type: 'goal';
  title: string;
  speciesSlug?: SpeciesSlug;
  moveSlug?: MoveSlug;
  itemSlug?: ItemSlug;
  note?: string;
}

export type JourneyStepAction =
  | JourneyCaptureAction
  | JourneyTrainAction
  | JourneyEvolveAction
  | JourneyReplaceAction
  | JourneyGoalAction;

export interface JourneyStepNode {
  id: string;
  beforeCheckpointId: string;
  parentStepId: string | null;
  order: number;
  action: JourneyStepAction;
}

export interface JourneyPlan {
  gameId: string;
  versionId?: string;
  starterSlug: SpeciesSlug | null;
  starterLevel: number;
  steps: readonly JourneyStepNode[];
}
