import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/app/useTheme';
import { formatGameTitle } from '@/components/ui/formatGameTitle';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { LEVEL_BOUNDS } from '@/domain/constants';
import {
  buildVirtualFinalCheckpoint,
  type EvaluatedJourneyBranchNode,
  evaluateJourneyTree,
  FINAL_SEGMENT_CHECKPOINT_ID,
} from '@/domain/journey';
import { buildCampaignContext } from '@/domain/team';
import type { CampaignGameContext, JourneyStepAction, JourneyStepNode } from '@/domain/types';
import { AppHeader } from '@/features/navigation/AppHeader';
import { gameManifestQueryOptions } from '@/hooks/gameQueries';
import { useJourneyStore } from '@/stores/useJourneyStore';
import { useTeamStore } from '@/stores/useTeamStore';
import { FinalTeamSection } from './FinalTeamSection';
import { JourneyControlsBar } from './JourneyControlsBar';
import { JourneyMilestoneNode } from './JourneyMilestoneNode';
import { JourneySegmentBranches } from './JourneySegmentBranches';
import { JourneyStarterNode } from './JourneyStarterNode';
import { JourneyStepEditor, type StepEditorContext } from './JourneyStepEditor';

function extractTargetSlug(action: JourneyStepAction): string | undefined {
  switch (action.type) {
    case 'capture':
    case 'train':
      return action.speciesSlug;
    case 'evolve':
      return action.toSpeciesSlug;
    case 'replace':
      return action.inSpeciesSlug;
    case 'goal':
      return undefined;
  }
}

export function JourneyPlannerPage() {
  const params = useParams({ strict: false }) as { gameId?: string };
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const team = useTeamStore((s) => s.team);
  const teamContext = useTeamStore((s) => s.context);
  const hydrateTeam = useTeamStore((s) => s.hydrateTeam);
  const selectCampaignGame = useTeamStore((s) => s.selectCampaignGame);

  const plansByGameId = useJourneyStore((s) => s.plansByGameId);
  const isPlansLoaded = useJourneyStore((s) => s.isLoaded);
  const loadAllPlans = useJourneyStore((s) => s.loadAllPlans);
  const ensurePlan = useJourneyStore((s) => s.ensurePlan);
  const setStarter = useJourneyStore((s) => s.setStarter);
  const setPlanVersion = useJourneyStore((s) => s.setPlanVersion);
  const addStep = useJourneyStore((s) => s.addStep);
  const updateStep = useJourneyStore((s) => s.updateStep);
  const removeStep = useJourneyStore((s) => s.removeStep);
  const seedFromTeam = useJourneyStore((s) => s.seedFromTeam);
  const resetPlan = useJourneyStore((s) => s.resetPlan);

  const [excludeTradeEvolutions, setExcludeTradeEvolutions] = useState(true);
  const [editorContext, setEditorContext] = useState<StepEditorContext | null>(null);

  const gameId = params.gameId;
  const {
    data: manifestData,
    isPending: isManifestPending,
    isError: isManifestError,
  } = useQuery({
    ...gameManifestQueryOptions(gameId ?? ''),
    enabled: Boolean(gameId),
  });
  const manifest = manifestData ?? null;
  const loading = !isPlansLoaded || isManifestPending || !manifest;

  useEffect(() => {
    void loadAllPlans();
  }, [loadAllPlans]);

  useEffect(() => {
    if (!gameId) {
      void navigate({ to: '/', replace: true });
      return;
    }
    if (!isManifestPending && (isManifestError || manifest === null)) {
      void navigate({ to: '/', replace: true });
      return;
    }
    if (isPlansLoaded && manifest) {
      ensurePlan(manifest);
    }
  }, [ensurePlan, gameId, isManifestError, isManifestPending, isPlansLoaded, manifest, navigate]);

  const plan = manifest ? plansByGameId[manifest.id] : undefined;
  const activeVersionId = plan?.versionId ?? manifest?.versions[0]?.id;

  const campaignContext: CampaignGameContext | null = useMemo(
    () => (manifest ? buildCampaignContext(manifest, activeVersionId) : null),
    [activeVersionId, manifest],
  );

  const evaluated = useMemo(() => {
    if (!manifest || !plan || !campaignContext) return null;
    return evaluateJourneyTree(plan, manifest, campaignContext, pkmnDexGateway, {
      excludeTradeEvolutions,
      ...(activeVersionId ? { versionId: activeVersionId } : {}),
    });
  }, [activeVersionId, campaignContext, excludeTradeEvolutions, manifest, plan]);

  const canImportFromTeam =
    teamContext.mode === 'campaign' &&
    teamContext.gameId === manifest?.id &&
    team.some((slot) => slot !== null);

  const hasFinalMembers = evaluated ? evaluated.finalTeam.some((m) => m !== null) : false;

  const resolveSegmentCheckpoint = (checkpointId: string) => {
    if (!manifest || !evaluated) return null;
    if (checkpointId === FINAL_SEGMENT_CHECKPOINT_ID) {
      return buildVirtualFinalCheckpoint(manifest);
    }
    return evaluated.milestones.find((m) => m.checkpoint.id === checkpointId)?.checkpoint ?? null;
  };

  const handleOpenAddRootStep = (checkpointId: string) => {
    if (!evaluated || !manifest) return;
    if (checkpointId === FINAL_SEGMENT_CHECKPOINT_ID) {
      setEditorContext({
        mode: 'create',
        checkpoint: buildVirtualFinalCheckpoint(manifest),
        parentStepId: null,
        teamAvailableAtPoint: evaluated.finalTeam,
      });
      return;
    }
    const milestone = evaluated.milestones.find((m) => m.checkpoint.id === checkpointId);
    if (!milestone) return;
    setEditorContext({
      mode: 'create',
      checkpoint: milestone.checkpoint,
      parentStepId: null,
      teamAvailableAtPoint: milestone.teamBeforeSegment,
    });
  };

  const handleOpenAddChildStep = (
    parentNode: JourneyStepNode,
    branchNode: EvaluatedJourneyBranchNode,
  ) => {
    const checkpoint = resolveSegmentCheckpoint(parentNode.beforeCheckpointId);
    if (!checkpoint) return;
    const targetSlug = extractTargetSlug(parentNode.action);

    setEditorContext({
      mode: 'create',
      checkpoint,
      parentStepId: parentNode.id,
      ...(targetSlug ? { preselectedSpeciesSlug: targetSlug } : {}),
      teamAvailableAtPoint: branchNode.teamAfterStep,
    });
  };

  const handleOpenEditStep = (branchNode: EvaluatedJourneyBranchNode) => {
    const checkpoint = resolveSegmentCheckpoint(branchNode.node.beforeCheckpointId);
    if (!checkpoint) return;
    setEditorContext({
      mode: 'edit',
      checkpoint,
      parentStepId: branchNode.node.parentStepId,
      editStepId: branchNode.node.id,
      initialAction: branchNode.node.action,
      teamAvailableAtPoint: branchNode.teamBeforeStep,
    });
  };

  const handleEditFinalMember = (speciesSlug: string) => {
    if (!manifest || !evaluated) return;
    setEditorContext({
      mode: 'create',
      checkpoint: buildVirtualFinalCheckpoint(manifest),
      parentStepId: null,
      preselectedSpeciesSlug: speciesSlug,
      teamAvailableAtPoint: evaluated.finalTeam,
    });
  };

  const handleRemoveOrReplaceFinalMember = (speciesSlug: string) => {
    if (!manifest || !plan || !evaluated) return;
    const postStep = [...plan.steps]
      .reverse()
      .find(
        (s) =>
          s.beforeCheckpointId === FINAL_SEGMENT_CHECKPOINT_ID &&
          ((s.action.type === 'capture' && s.action.speciesSlug === speciesSlug) ||
            (s.action.type === 'replace' && s.action.inSpeciesSlug === speciesSlug)),
      );
    if (postStep) {
      removeStep(manifest.id, postStep.id);
      return;
    }
    setEditorContext({
      mode: 'create',
      checkpoint: buildVirtualFinalCheckpoint(manifest),
      parentStepId: null,
      initialAction: {
        type: 'replace',
        outSpeciesSlug: speciesSlug,
        inSpeciesSlug: '',
      },
      teamAvailableAtPoint: evaluated.finalTeam,
    });
  };

  const handleSubmitStep = (action: JourneyStepAction) => {
    if (!manifest || !editorContext) return;
    if (editorContext.mode === 'edit' && editorContext.editStepId) {
      updateStep(manifest.id, editorContext.editStepId, action);
    } else {
      addStep(manifest.id, {
        beforeCheckpointId: editorContext.checkpoint.id,
        parentStepId: editorContext.parentStepId,
        action,
      });
    }
    setEditorContext(null);
  };

  const handleSendToTeamPlanner = () => {
    if (!manifest || !evaluated) return;
    selectCampaignGame(manifest, activeVersionId);
    hydrateTeam(evaluated.finalTeam);
    void navigate({ to: '/game/$gameId/team', params: { gameId: manifest.id } });
  };

  const title = manifest ? formatGameTitle(manifest.name) : 'Loading…';

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)]">
      <AppHeader
        mode="campaign"
        activeSection="journey"
        {...(params.gameId ? { gameId: params.gameId } : {})}
        title={title}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {loading || !manifest || !plan || !evaluated ? (
          <div className="mx-auto h-40 max-w-xl animate-pulse rounded-2xl bg-[var(--surface-card)]" />
        ) : (
          <>
            <JourneyControlsBar
              manifest={manifest}
              activeVersionId={activeVersionId}
              onSelectVersion={(versionId) => setPlanVersion(manifest.id, versionId)}
              excludeTradeEvolutions={excludeTradeEvolutions}
              onChangeExcludeTradeEvolutions={setExcludeTradeEvolutions}
              canImportFromTeam={canImportFromTeam}
              onImportFromTeam={() => seedFromTeam(manifest, team, activeVersionId)}
              hasFinalMembers={hasFinalMembers}
              onSendToTeamPlanner={handleSendToTeamPlanner}
              canReset={plan.starterSlug !== null || plan.steps.length > 0}
              onResetPlan={() => resetPlan(manifest, activeVersionId)}
            />

            {/* Progression Tree Canvas */}
            <div className="flex flex-col items-center pb-12">
              <JourneyStarterNode
                manifest={manifest}
                {...(activeVersionId ? { versionId: activeVersionId } : {})}
                starterSlug={plan.starterSlug}
                starterLevel={plan.starterLevel}
                onSelectStarter={(slug) =>
                  setStarter(manifest.id, slug, LEVEL_BOUNDS.defaultStarter)
                }
              />

              {plan.starterSlug && (
                <>
                  {evaluated.milestones.map((milestone) => (
                    <div key={milestone.checkpoint.id} className="w-full">
                      <JourneySegmentBranches
                        checkpointId={milestone.checkpoint.id}
                        branches={milestone.rootBranches}
                        generation={manifest.generation}
                        onAddRootStep={handleOpenAddRootStep}
                        onAddChildStep={handleOpenAddChildStep}
                        onEditStep={handleOpenEditStep}
                        onRemoveStep={(stepId) => removeStep(manifest.id, stepId)}
                      />

                      <JourneyMilestoneNode
                        milestone={milestone}
                        generation={manifest.generation}
                      />
                    </div>
                  ))}

                  {/* Post-Elite Four / Pre-Final Steps */}
                  <JourneySegmentBranches
                    checkpointId={FINAL_SEGMENT_CHECKPOINT_ID}
                    branches={evaluated.postBranches}
                    generation={manifest.generation}
                    onAddRootStep={handleOpenAddRootStep}
                    onAddChildStep={handleOpenAddChildStep}
                    onEditStep={handleOpenEditStep}
                    onRemoveStep={(stepId) => removeStep(manifest.id, stepId)}
                  />

                  <FinalTeamSection
                    finalTeam={evaluated.finalTeam}
                    generation={manifest.generation}
                    onAddFinalMember={() => handleOpenAddRootStep(FINAL_SEGMENT_CHECKPOINT_ID)}
                    onEditFinalMember={handleEditFinalMember}
                    onRemoveOrReplaceFinalMember={handleRemoveOrReplaceFinalMember}
                  />
                </>
              )}
            </div>
          </>
        )}
      </main>

      {manifest && (
        <JourneyStepEditor
          open={editorContext !== null}
          editorContext={editorContext}
          manifest={manifest}
          {...(activeVersionId ? { versionId: activeVersionId } : {})}
          excludeTradeEvolutions={excludeTradeEvolutions}
          onClose={() => setEditorContext(null)}
          onSubmit={handleSubmitStep}
        />
      )}
    </div>
  );
}
