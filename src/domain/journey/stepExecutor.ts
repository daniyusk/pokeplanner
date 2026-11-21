import { MAX_MOVES_PER_MEMBER } from '@/domain/constants';
import { findFirstEmptySlotIndex, findMemberSlotIndex } from '@/domain/team';
import type {
  Checkpoint,
  DexGateway,
  GameManifest,
  JourneyCaptureAction,
  JourneyEvolveAction,
  JourneyGoalAction,
  JourneyReplaceAction,
  JourneyStepNode,
  JourneyTrainAction,
  Team,
  TeamMember,
} from '@/domain/types';
import { diagnoseManifestAvailability, type JourneyFilterOptions } from './availability';

export type JourneyBranchStatus = 'ok' | 'warning' | 'error';

export interface StepExecutionResult {
  status: JourneyBranchStatus;
  messages: string[];
}

function mergeStatus(current: JourneyBranchStatus, next: JourneyBranchStatus): JourneyBranchStatus {
  if (next === 'error' || (next === 'warning' && current === 'ok')) {
    return next;
  }
  return current;
}

function resolveIncomingMember(
  speciesSlug: string,
  level: number | undefined,
  checkpoint: Checkpoint,
  manifest: GameManifest,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  dex: DexGateway,
  options: JourneyFilterOptions,
):
  | { ok: true; member: TeamMember; result: StepExecutionResult }
  | { ok: false; result: StepExecutionResult } {
  const sp = dex.getSpecies(speciesSlug, manifest.generation);
  if (!sp) {
    return {
      ok: false,
      result: { status: 'error', messages: [`Unknown species "${speciesSlug}".`] },
    };
  }

  const avail = diagnoseManifestAvailability(
    speciesSlug,
    sp.name,
    checkpoint,
    manifest,
    checkpointMap,
    options,
  );
  const messages = [...avail.messages];
  let status: JourneyBranchStatus = avail.status === 'ok' ? 'ok' : 'warning';

  if (level !== undefined && level > checkpoint.levelCap) {
    status = mergeStatus(status, 'warning');
    messages.push(`Lv ${level} exceeds Lv ${checkpoint.levelCap} cap.`);
  }

  const defaultAbility = manifest.mechanics.hasAbilities ? sp.abilities[0] : undefined;
  return {
    ok: true,
    member: {
      speciesSlug: sp.slug,
      moveSlugs: [],
      ...(defaultAbility ? { abilitySlug: defaultAbility } : {}),
      ...(level !== undefined ? { level } : {}),
    },
    result: { status, messages },
  };
}

function applyCaptureStep(
  action: JourneyCaptureAction,
  workingTeam: Team,
  checkpoint: Checkpoint,
  manifest: GameManifest,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  dex: DexGateway,
  options: JourneyFilterOptions,
): StepExecutionResult {
  const emptyIdx = findFirstEmptySlotIndex(workingTeam);
  if (emptyIdx === -1) {
    return {
      status: 'error',
      messages: ['Team already has 6 Pokémon. Use Replace instead.'],
    };
  }

  const resolved = resolveIncomingMember(
    action.speciesSlug,
    action.level,
    checkpoint,
    manifest,
    checkpointMap,
    dex,
    options,
  );
  if (!resolved.ok) return resolved.result;

  workingTeam[emptyIdx] = resolved.member;
  return resolved.result;
}

function applyTrainStep(
  action: JourneyTrainAction,
  workingTeam: Team,
  checkpoint: Checkpoint,
  manifest: GameManifest,
  dex: DexGateway,
): StepExecutionResult {
  const slotIdx = findMemberSlotIndex(workingTeam, action.speciesSlug);
  if (slotIdx === -1) {
    const sp = dex.getSpecies(action.speciesSlug, manifest.generation);
    return {
      status: 'error',
      messages: [`${sp?.name ?? action.speciesSlug} is not on the active team yet.`],
    };
  }

  const current = workingTeam[slotIdx];
  if (current) {
    workingTeam[slotIdx] = { ...current, level: action.targetLevel };
  }

  if (action.targetLevel > checkpoint.levelCap) {
    return {
      status: 'warning',
      messages: [`Target Lv ${action.targetLevel} exceeds Lv ${checkpoint.levelCap} cap.`],
    };
  }
  return { status: 'ok', messages: [] };
}

function applyEvolveStep(
  action: JourneyEvolveAction,
  workingTeam: Team,
  checkpoint: Checkpoint,
  manifest: GameManifest,
  dex: DexGateway,
  options: JourneyFilterOptions,
): StepExecutionResult {
  const slotIdx = findMemberSlotIndex(workingTeam, action.fromSpeciesSlug);
  if (slotIdx === -1) {
    const sp = dex.getSpecies(action.fromSpeciesSlug, manifest.generation);
    return {
      status: 'error',
      messages: [`${sp?.name ?? action.fromSpeciesSlug} is not on the active team yet.`],
    };
  }

  const targetSp = dex.getSpecies(action.toSpeciesSlug, manifest.generation);
  if (!targetSp) {
    return { status: 'error', messages: [`Unknown evolution "${action.toSpeciesSlug}".`] };
  }

  const messages: string[] = [];
  let status: JourneyBranchStatus = 'ok';

  const current = workingTeam[slotIdx];
  if (current) {
    const nextLevel = action.targetLevel ?? current.level;
    const nextAbility =
      manifest.mechanics.hasAbilities && targetSp.abilities[0]
        ? targetSp.abilities[0]
        : current.abilitySlug;
    workingTeam[slotIdx] = {
      ...current,
      speciesSlug: targetSp.slug,
      ...(nextAbility ? { abilitySlug: nextAbility } : {}),
      ...(nextLevel !== undefined ? { level: nextLevel } : {}),
    };

    const entry = manifest.dex[targetSp.slug];
    if (options.excludeTradeEvolutions && entry?.evolutionNotes?.requiresTrade) {
      status = mergeStatus(status, 'warning');
      messages.push(`${targetSp.name} requires a trade evolution.`);
    }
    const minEvoLv = entry?.evolutionNotes?.minEvolutionLevel ?? targetSp.evoLevel;
    if (
      (action.targetLevel !== undefined && action.targetLevel > checkpoint.levelCap) ||
      (minEvoLv !== undefined && minEvoLv > checkpoint.levelCap)
    ) {
      status = mergeStatus(status, 'warning');
      messages.push(
        `Evolves at Lv ${action.targetLevel ?? minEvoLv} (cap Lv ${checkpoint.levelCap}).`,
      );
    }
  }
  return { status, messages };
}

function applyReplaceStep(
  action: JourneyReplaceAction,
  workingTeam: Team,
  checkpoint: Checkpoint,
  manifest: GameManifest,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  dex: DexGateway,
  options: JourneyFilterOptions,
): StepExecutionResult {
  const outIdx = findMemberSlotIndex(workingTeam, action.outSpeciesSlug);
  if (outIdx === -1) {
    const sp = dex.getSpecies(action.outSpeciesSlug, manifest.generation);
    return {
      status: 'error',
      messages: [`${sp?.name ?? action.outSpeciesSlug} is not currently on the team.`],
    };
  }

  const resolved = resolveIncomingMember(
    action.inSpeciesSlug,
    action.level,
    checkpoint,
    manifest,
    checkpointMap,
    dex,
    options,
  );
  if (!resolved.ok) return resolved.result;

  workingTeam[outIdx] = resolved.member;
  return resolved.result;
}

function applyGoalStep(
  action: JourneyGoalAction,
  workingTeam: Team,
  manifest: GameManifest,
  dex: DexGateway,
): StepExecutionResult {
  if (!action.speciesSlug) {
    return { status: 'ok', messages: [] };
  }

  const slotIdx = findMemberSlotIndex(workingTeam, action.speciesSlug);
  if (slotIdx === -1) {
    const sp = dex.getSpecies(action.speciesSlug, manifest.generation);
    return {
      status: 'warning',
      messages: [`${sp?.name ?? action.speciesSlug} is not on the active team yet.`],
    };
  }

  const current = workingTeam[slotIdx];
  if (current) {
    const nextMoves =
      action.moveSlug && !current.moveSlugs.includes(action.moveSlug)
        ? [...current.moveSlugs, action.moveSlug].slice(-MAX_MOVES_PER_MEMBER)
        : current.moveSlugs;
    const nextItem = action.itemSlug ?? current.itemSlug;
    workingTeam[slotIdx] = {
      ...current,
      moveSlugs: nextMoves,
      ...(nextItem ? { itemSlug: nextItem } : {}),
    };
  }

  return { status: 'ok', messages: [] };
}

export function applyStepAction(
  step: JourneyStepNode,
  workingTeam: Team,
  checkpoint: Checkpoint,
  manifest: GameManifest,
  checkpointMap: ReadonlyMap<string, Checkpoint>,
  dex: DexGateway,
  options: JourneyFilterOptions,
): StepExecutionResult {
  switch (step.action.type) {
    case 'capture':
      return applyCaptureStep(
        step.action,
        workingTeam,
        checkpoint,
        manifest,
        checkpointMap,
        dex,
        options,
      );
    case 'train':
      return applyTrainStep(step.action, workingTeam, checkpoint, manifest, dex);
    case 'evolve':
      return applyEvolveStep(step.action, workingTeam, checkpoint, manifest, dex, options);
    case 'replace':
      return applyReplaceStep(
        step.action,
        workingTeam,
        checkpoint,
        manifest,
        checkpointMap,
        dex,
        options,
      );
    case 'goal':
      return applyGoalStep(step.action, workingTeam, manifest, dex);
  }
}
