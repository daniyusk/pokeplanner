import { cloneTeam, createEmptyTeam } from '@/domain/team';
import type {
  CampaignGameContext,
  Checkpoint,
  DexGateway,
  GameManifest,
  JourneyPlan,
  JourneyStepNode,
  SpeciesData,
  Team,
} from '@/domain/types';
import {
  buildCheckpointOrderMap,
  buildVirtualFinalCheckpoint,
  FINAL_SEGMENT_CHECKPOINT_ID,
  type JourneyFilterOptions,
} from './availability';
import { type CheckpointEvaluation, evaluateJourneyCheckpoint } from './evaluator';
import {
  createEmptyJourneyPlan,
  getStarterOptionsForGame,
  seedJourneyPlanFromTeam,
} from './starterAndSeeding';
import { applyStepAction, type JourneyBranchStatus } from './stepExecutor';

export {
  createEmptyJourneyPlan,
  getStarterOptionsForGame,
  type JourneyBranchStatus,
  seedJourneyPlanFromTeam,
};

export interface EvaluatedJourneyBranchNode {
  node: JourneyStepNode;
  children: readonly EvaluatedJourneyBranchNode[];
  status: JourneyBranchStatus;
  messages: readonly string[];
  teamBeforeStep: Team;
  teamAfterStep: Team;
}

export interface JourneyMilestoneEvaluation {
  checkpoint: Checkpoint;
  rootBranches: readonly EvaluatedJourneyBranchNode[];
  teamBeforeSegment: Team;
  teamAtMilestone: Team;
  checkpointEvaluation: CheckpointEvaluation;
  issueCount: number;
}

export interface EvaluatedJourneyTree {
  plan: JourneyPlan;
  starterSpecies?: SpeciesData;
  milestones: readonly JourneyMilestoneEvaluation[];
  postBranches: readonly EvaluatedJourneyBranchNode[];
  finalTeam: Team;
  totalSteps: number;
  totalIssues: number;
}

function buildBranchTree(
  segmentSteps: readonly JourneyStepNode[],
  parentStepId: string | null,
  workingTeam: Team,
  checkpoint: Checkpoint,
  manifest: GameManifest,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  dex: DexGateway,
  options: JourneyFilterOptions,
): EvaluatedJourneyBranchNode[] {
  const siblings = segmentSteps
    .filter((s) => s.parentStepId === parentStepId)
    .sort((a, b) => a.order - b.order);

  const results: EvaluatedJourneyBranchNode[] = [];

  for (const node of siblings) {
    const teamBeforeStep = cloneTeam(workingTeam);
    const { status, messages } = applyStepAction(
      node,
      workingTeam,
      checkpoint,
      manifest,
      checkpointMap,
      dex,
      options,
    );
    const teamAfterStep = cloneTeam(workingTeam);
    const children = buildBranchTree(
      segmentSteps,
      node.id,
      workingTeam,
      checkpoint,
      manifest,
      checkpointMap,
      dex,
      options,
    );

    results.push({
      node,
      children,
      status,
      messages,
      teamBeforeStep,
      teamAfterStep,
    });
  }

  return results;
}

function countBranchIssues(branches: readonly EvaluatedJourneyBranchNode[]): number {
  let count = 0;
  for (const b of branches) {
    if (b.status !== 'ok') count += 1;
    count += countBranchIssues(b.children);
  }
  return count;
}

function countBranchSteps(branches: readonly EvaluatedJourneyBranchNode[]): number {
  let count = 0;
  for (const b of branches) {
    count += 1 + countBranchSteps(b.children);
  }
  return count;
}

/**
 * Evaluates a JourneyPlan progression tree from the starter root across every
 * campaign milestone, computing the active team and diagnostics at each step and checkpoint.
 */
export function evaluateJourneyTree(
  plan: JourneyPlan,
  manifest: GameManifest,
  context: CampaignGameContext,
  dex: DexGateway,
  options: JourneyFilterOptions = {},
): EvaluatedJourneyTree {
  const checkpointMap = buildCheckpointOrderMap(manifest);
  const sortedCheckpoints = [...manifest.checkpoints].sort((a, b) => a.order - b.order);

  const workingTeam: Team = createEmptyTeam();
  let starterSpecies: SpeciesData | undefined;

  if (plan.starterSlug) {
    const sp = dex.getSpecies(plan.starterSlug, manifest.generation);
    if (sp) {
      starterSpecies = sp;
      const defaultAbility = manifest.mechanics.hasAbilities ? sp.abilities[0] : undefined;
      workingTeam[0] = {
        speciesSlug: sp.slug,
        moveSlugs: [],
        level: plan.starterLevel,
        ...(defaultAbility ? { abilitySlug: defaultAbility } : {}),
      };
    }
  }

  const milestones: JourneyMilestoneEvaluation[] = [];
  let totalSteps = 0;
  let totalIssues = 0;

  for (const checkpoint of sortedCheckpoints) {
    const teamBeforeSegment = cloneTeam(workingTeam);
    const segmentSteps = plan.steps.filter((s) => s.beforeCheckpointId === checkpoint.id);

    const rootBranches = buildBranchTree(
      segmentSteps,
      null,
      workingTeam,
      checkpoint,
      manifest,
      checkpointMap,
      dex,
      options,
    );

    const teamAtMilestone = cloneTeam(workingTeam);
    const checkpointEvaluation = evaluateJourneyCheckpoint(
      teamAtMilestone,
      checkpoint.id,
      manifest,
      context,
      dex,
      options,
      checkpointMap,
    );

    const stepIssues = countBranchIssues(rootBranches);
    const slotIssues = checkpointEvaluation.slots.filter(
      (s) => s !== null && s.status !== 'ready',
    ).length;
    const issueCount = stepIssues + slotIssues;

    totalSteps += countBranchSteps(rootBranches);
    totalIssues += issueCount;

    milestones.push({
      checkpoint,
      rootBranches,
      teamBeforeSegment,
      teamAtMilestone,
      checkpointEvaluation,
      issueCount,
    });
  }

  const virtualFinalCheckpoint = buildVirtualFinalCheckpoint(manifest);
  const postSteps = plan.steps.filter((s) => s.beforeCheckpointId === FINAL_SEGMENT_CHECKPOINT_ID);
  const postBranches = buildBranchTree(
    postSteps,
    null,
    workingTeam,
    virtualFinalCheckpoint,
    manifest,
    checkpointMap,
    dex,
    options,
  );
  totalSteps += countBranchSteps(postBranches);
  totalIssues += countBranchIssues(postBranches);

  return {
    plan,
    ...(starterSpecies ? { starterSpecies } : {}),
    milestones,
    postBranches,
    finalTeam: cloneTeam(workingTeam),
    totalSteps,
    totalIssues,
  };
}
