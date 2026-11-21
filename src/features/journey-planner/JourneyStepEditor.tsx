import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { LEVEL_BOUNDS, TEAM_SIZE } from '@/domain/constants';
import { getAvailableSpeciesAtCheckpoint, getAvailableSpeciesInGame } from '@/domain/journey';
import { resolveTeamEntries } from '@/domain/team';
import type {
  Checkpoint,
  GameManifest,
  GenerationNumber,
  JourneyStepAction,
  JourneyStepType,
  SpeciesData,
  SpeciesSlug,
  Team,
} from '@/domain/types';
import { CaptureReplaceFields } from './step-editor/CaptureReplaceFields';
import { EvolveStepFields } from './step-editor/EvolveStepFields';
import { GoalStepFields } from './step-editor/GoalStepFields';
import { StepTypeSwitcher } from './step-editor/StepTypeSwitcher';
import { TrainStepFields } from './step-editor/TrainStepFields';

const STEP_SPECIES_LIMIT = 48;

export type StepEditorContext =
  | {
      mode: 'create';
      checkpoint: Checkpoint;
      parentStepId: string | null;
      preselectedSpeciesSlug?: SpeciesSlug;
      initialAction?: JourneyStepAction;
      teamAvailableAtPoint: Team;
    }
  | {
      mode: 'edit';
      checkpoint: Checkpoint;
      parentStepId: string | null;
      editStepId: string;
      initialAction: JourneyStepAction;
      teamAvailableAtPoint: Team;
    };

interface JourneyStepEditorProps {
  open: boolean;
  editorContext: StepEditorContext | null;
  manifest: GameManifest;
  versionId?: string;
  excludeTradeEvolutions: boolean;
  onClose: () => void;
  onSubmit: (action: JourneyStepAction) => void;
}

interface InitialEditorState {
  stepType: JourneyStepType;
  selectedSlug: string;
  levelInput: string;
  locationInput: string;
  trainSlug: string;
  targetLevelInput: string;
  evoFromSlug: string;
  evoToSlug: string;
  outSlug: string;
  goalTitle: string;
  goalSpeciesSlug: string;
}

function parseValidLevel(input: string): number | undefined {
  if (!input.trim()) return undefined;
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed < LEVEL_BOUNDS.min || parsed > LEVEL_BOUNDS.max) {
    return undefined;
  }
  return parsed;
}

function buildInitialEditorState(
  editorContext: StepEditorContext,
  generation: GenerationNumber,
): InitialEditorState {
  const members = resolveTeamEntries(
    editorContext.teamAvailableAtPoint,
    generation,
    pkmnDexGateway,
  ).map((entry) => entry.species);

  const preselected =
    editorContext.mode === 'create' ? editorContext.preselectedSpeciesSlug : undefined;
  const defaultMember = preselected ?? members[0]?.slug ?? '';
  const defaultEvoFrom = preselected ?? members.find((sp) => sp.evoSlugs.length > 0)?.slug ?? '';
  const defaultEvoTo = defaultEvoFrom
    ? (pkmnDexGateway.getSpecies(defaultEvoFrom, generation)?.evoSlugs[0] ?? '')
    : '';
  const defaultType: JourneyStepType = preselected
    ? 'evolve'
    : members.length < TEAM_SIZE
      ? 'capture'
      : 'train';

  const base: InitialEditorState = {
    stepType: defaultType,
    selectedSlug: '',
    levelInput: '',
    locationInput: '',
    trainSlug: defaultMember,
    targetLevelInput: String(editorContext.checkpoint.levelCap),
    evoFromSlug: defaultEvoFrom,
    evoToSlug: defaultEvoTo,
    outSlug: members[0]?.slug ?? '',
    goalTitle: '',
    goalSpeciesSlug: defaultMember,
  };

  const init = editorContext.initialAction;
  if (!init) return base;

  switch (init.type) {
    case 'capture':
      return {
        ...base,
        stepType: 'capture',
        selectedSlug: init.speciesSlug,
        levelInput: init.level !== undefined ? String(init.level) : '',
        locationInput: init.location ?? '',
      };
    case 'train':
      return {
        ...base,
        stepType: 'train',
        trainSlug: init.speciesSlug,
        targetLevelInput: String(init.targetLevel),
      };
    case 'evolve':
      return {
        ...base,
        stepType: 'evolve',
        evoFromSlug: init.fromSpeciesSlug,
        evoToSlug: init.toSpeciesSlug,
        levelInput: init.targetLevel !== undefined ? String(init.targetLevel) : '',
      };
    case 'replace':
      return {
        ...base,
        stepType: 'replace',
        outSlug: init.outSpeciesSlug,
        selectedSlug: init.inSpeciesSlug,
        levelInput: init.level !== undefined ? String(init.level) : '',
        locationInput: init.location ?? '',
      };
    case 'goal':
      return {
        ...base,
        stepType: 'goal',
        goalTitle: init.title,
        goalSpeciesSlug: init.speciesSlug ?? '',
      };
  }
}

export function JourneyStepEditor({ open, editorContext, ...rest }: JourneyStepEditorProps) {
  if (!open || !editorContext) return null;

  const editorKey =
    editorContext.mode === 'edit'
      ? `edit:${editorContext.editStepId}`
      : `create:${editorContext.checkpoint.id}:${editorContext.parentStepId ?? 'root'}:${editorContext.preselectedSpeciesSlug ?? ''}:${editorContext.initialAction?.type ?? ''}`;

  return <JourneyStepEditorContent key={editorKey} editorContext={editorContext} {...rest} />;
}

interface JourneyStepEditorContentProps {
  editorContext: StepEditorContext;
  manifest: GameManifest;
  versionId?: string;
  excludeTradeEvolutions: boolean;
  onClose: () => void;
  onSubmit: (action: JourneyStepAction) => void;
}

function JourneyStepEditorContent({
  editorContext,
  manifest,
  versionId,
  excludeTradeEvolutions,
  onClose,
  onSubmit,
}: JourneyStepEditorContentProps) {
  const initial = useMemo(
    () => buildInitialEditorState(editorContext, manifest.generation),
    [editorContext, manifest.generation],
  );

  const [stepType, setStepType] = useState<JourneyStepType>(initial.stepType);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [showAllGameSpecies, setShowAllGameSpecies] = useState(false);

  const [selectedSlug, setSelectedSlug] = useState<string>(initial.selectedSlug);
  const [levelInput, setLevelInput] = useState<string>(initial.levelInput);
  const [locationInput, setLocationInput] = useState<string>(initial.locationInput);

  const [trainSlug, setTrainSlug] = useState<string>(initial.trainSlug);
  const [targetLevelInput, setTargetLevelInput] = useState<string>(initial.targetLevelInput);

  const [evoFromSlug, setEvoFromSlug] = useState<string>(initial.evoFromSlug);
  const [evoToSlug, setEvoToSlug] = useState<string>(initial.evoToSlug);
  const [outSlug, setOutSlug] = useState<string>(initial.outSlug);
  const [goalTitle, setGoalTitle] = useState<string>(initial.goalTitle);
  const [goalSpeciesSlug, setGoalSpeciesSlug] = useState<string>(initial.goalSpeciesSlug);

  const activeTeamSpecies = useMemo(
    () =>
      resolveTeamEntries(
        editorContext.teamAvailableAtPoint,
        manifest.generation,
        pkmnDexGateway,
      ).map((entry) => entry.species),
    [editorContext, manifest.generation],
  );

  const evolvableTeamSpecies = useMemo(
    () => activeTeamSpecies.filter((sp) => sp.evoSlugs.length > 0),
    [activeTeamSpecies],
  );

  const effectiveEvoFromSlug = useMemo(() => {
    if (evoFromSlug && activeTeamSpecies.some((sp) => sp.slug === evoFromSlug)) {
      return evoFromSlug;
    }
    return evolvableTeamSpecies[0]?.slug ?? '';
  }, [activeTeamSpecies, evoFromSlug, evolvableTeamSpecies]);

  const evoTargetOptions = useMemo(() => {
    if (!effectiveEvoFromSlug) return [];
    const sp = pkmnDexGateway.getSpecies(effectiveEvoFromSlug, manifest.generation);
    if (!sp) return [];
    return sp.evoSlugs
      .map((slug) => pkmnDexGateway.getSpecies(slug, manifest.generation))
      .filter((evo): evo is SpeciesData => Boolean(evo));
  }, [effectiveEvoFromSlug, manifest.generation]);

  const effectiveEvoToSlug = useMemo(() => {
    if (evoToSlug && evoTargetOptions.some((o) => o.slug === evoToSlug)) return evoToSlug;
    return evoTargetOptions[0]?.slug ?? '';
  }, [evoTargetOptions, evoToSlug]);

  const candidateSpecies = useMemo(() => {
    const allowed = showAllGameSpecies
      ? getAvailableSpeciesInGame(manifest, {
          excludeTradeEvolutions,
          ...(versionId ? { versionId } : {}),
        })
      : getAvailableSpeciesAtCheckpoint(manifest, editorContext.checkpoint.id, {
          excludeTradeEvolutions,
          ...(versionId ? { versionId } : {}),
        });

    const q = speciesQuery.trim().toLowerCase();
    return pkmnDexGateway
      .listSpecies(manifest.generation)
      .filter((sp) => allowed.has(sp.slug))
      .filter((sp) => !q || sp.name.toLowerCase().includes(q))
      .slice(0, STEP_SPECIES_LIMIT);
  }, [
    editorContext,
    excludeTradeEvolutions,
    manifest,
    showAllGameSpecies,
    speciesQuery,
    versionId,
  ]);

  const handleSelectCaptureSpecies = (slug: string) => {
    setSelectedSlug(slug);
    const firstLoc = manifest.dex[slug]?.locations[0];
    if (firstLoc?.areaName) setLocationInput(firstLoc.areaName);
    if (firstLoc?.minLevel !== undefined) setLevelInput(String(firstLoc.minLevel));
  };

  const handleSelectEvoFrom = (slug: string) => {
    setEvoFromSlug(slug);
    const sp = pkmnDexGateway.getSpecies(slug, manifest.generation);
    const firstTarget = sp?.evoSlugs[0] ?? '';
    handleSelectEvoTo(firstTarget);
  };

  const handleSelectEvoTo = (slug: string) => {
    setEvoToSlug(slug);
    if (!slug) {
      setLevelInput('');
      return;
    }
    const targetSp = pkmnDexGateway.getSpecies(slug, manifest.generation);
    const minLv = manifest.dex[slug]?.evolutionNotes?.minEvolutionLevel ?? targetSp?.evoLevel;
    setLevelInput(minLv !== undefined ? String(minLv) : '');
  };

  const parsedTrainLevel = parseValidLevel(targetLevelInput);

  const canSubmit = (() => {
    if (stepType === 'capture') return Boolean(selectedSlug);
    if (stepType === 'train') {
      return Boolean(trainSlug) && parsedTrainLevel !== undefined;
    }
    if (stepType === 'evolve') return Boolean(effectiveEvoFromSlug && effectiveEvoToSlug);
    if (stepType === 'replace') return Boolean(outSlug && selectedSlug);
    return goalTitle.trim().length > 0;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const validLevel = parseValidLevel(levelInput);

    if (stepType === 'capture') {
      onSubmit({
        type: 'capture',
        speciesSlug: selectedSlug,
        ...(validLevel !== undefined ? { level: validLevel } : {}),
        ...(locationInput.trim() ? { location: locationInput.trim() } : {}),
      });
      return;
    }

    if (stepType === 'train') {
      if (parsedTrainLevel === undefined) return;
      onSubmit({
        type: 'train',
        speciesSlug: trainSlug,
        targetLevel: parsedTrainLevel,
      });
      return;
    }

    if (stepType === 'evolve') {
      onSubmit({
        type: 'evolve',
        fromSpeciesSlug: effectiveEvoFromSlug,
        toSpeciesSlug: effectiveEvoToSlug,
        ...(validLevel !== undefined ? { targetLevel: validLevel } : {}),
      });
      return;
    }

    if (stepType === 'replace') {
      onSubmit({
        type: 'replace',
        outSpeciesSlug: outSlug,
        inSpeciesSlug: selectedSlug,
        ...(validLevel !== undefined ? { level: validLevel } : {}),
        ...(locationInput.trim() ? { location: locationInput.trim() } : {}),
      });
      return;
    }

    onSubmit({
      type: 'goal',
      title: goalTitle.trim(),
      ...(goalSpeciesSlug ? { speciesSlug: goalSpeciesSlug } : {}),
    });
  };

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-[8%] left-1/2 z-50 flex max-h-[84vh] w-[94vw] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-[var(--shadow-overlay)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5">
            <div>
              <Dialog.Title className="text-sm font-semibold text-[var(--ink-primary)]">
                {editorContext.mode === 'edit' ? 'Edit Step' : 'Add Step'}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--ink-muted)]">
                Before {editorContext.checkpoint.name} (Cap Lv {editorContext.checkpoint.levelCap})
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close step editor"
              className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
            <StepTypeSwitcher stepType={stepType} onChange={setStepType} />

            {(stepType === 'capture' || stepType === 'replace') && (
              <CaptureReplaceFields
                isReplace={stepType === 'replace'}
                activeTeamSpecies={activeTeamSpecies}
                outSlug={outSlug}
                onChangeOutSlug={setOutSlug}
                speciesQuery={speciesQuery}
                onChangeSpeciesQuery={setSpeciesQuery}
                showAllGameSpecies={showAllGameSpecies}
                onChangeShowAllGameSpecies={setShowAllGameSpecies}
                candidateSpecies={candidateSpecies}
                selectedSlug={selectedSlug}
                onSelectSpecies={handleSelectCaptureSpecies}
                levelInput={levelInput}
                onChangeLevelInput={setLevelInput}
                locationInput={locationInput}
                onChangeLocationInput={setLocationInput}
              />
            )}

            {stepType === 'train' && (
              <TrainStepFields
                activeTeamSpecies={activeTeamSpecies}
                trainSlug={trainSlug}
                onSelectTrainSlug={setTrainSlug}
                targetLevelInput={targetLevelInput}
                onChangeTargetLevelInput={setTargetLevelInput}
                checkpointLevelCap={editorContext.checkpoint.levelCap}
              />
            )}

            {stepType === 'evolve' && (
              <EvolveStepFields
                evolvableTeamSpecies={evolvableTeamSpecies}
                evoFromSlug={effectiveEvoFromSlug}
                onSelectEvoFrom={handleSelectEvoFrom}
                evoTargetOptions={evoTargetOptions}
                evoToSlug={effectiveEvoToSlug}
                onSelectEvoTo={handleSelectEvoTo}
                levelInput={levelInput}
                onChangeLevelInput={setLevelInput}
              />
            )}

            {stepType === 'goal' && (
              <GoalStepFields
                goalTitle={goalTitle}
                onChangeGoalTitle={setGoalTitle}
                activeTeamSpecies={activeTeamSpecies}
                goalSpeciesSlug={goalSpeciesSlug}
                onSelectGoalSpeciesSlug={setGoalSpeciesSlug}
              />
            )}

            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg bg-[var(--surface-elevated)] px-4 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--surface-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-9 rounded-lg bg-[var(--accent-primary)] px-4 text-xs font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-primary-hover)] disabled:opacity-45"
              >
                {editorContext.mode === 'edit' ? 'Save' : 'Add'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
