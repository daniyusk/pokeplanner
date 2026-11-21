import {
  CAMPAIGN_RULE_IDS,
  LEVEL_BOUNDS,
  SPECIES_SLUG,
  TEAM_SLOT_INDICES,
} from '@/domain/constants';
import type {
  DexGateway,
  GameManifest,
  JourneyPlan,
  JourneyStepNode,
  SpeciesData,
  SpeciesSlug,
  Team,
} from '@/domain/types';
import { getEvolutionChain, isExclusiveToOtherVersion } from './availability';

/**
 * Returns the selectable starter Pokémon slugs for a game manifest and optional version.
 */
export function getStarterOptionsForGame(
  manifest: GameManifest,
  versionId?: string,
): readonly SpeciesSlug[] {
  const starters: SpeciesSlug[] = [];

  for (const [slug, entry] of Object.entries(manifest.dex)) {
    if (entry.availability !== 'starter') continue;
    if (isExclusiveToOtherVersion(entry, versionId)) {
      continue;
    }
    starters.push(slug);
  }

  if (
    manifest.id === CAMPAIGN_RULE_IDS.RedBlueYellowGameId &&
    versionId === CAMPAIGN_RULE_IDS.YellowVersionId &&
    manifest.dex[SPECIES_SLUG.Pikachu]
  ) {
    return [SPECIES_SLUG.Pikachu, ...starters.filter((slug) => slug !== SPECIES_SLUG.Pikachu)];
  }

  return starters;
}

/**
 * Creates a clean JourneyPlan rooted at starter selection (unpicked by default).
 */
export function createEmptyJourneyPlan(manifest: GameManifest, versionId?: string): JourneyPlan {
  const resolvedVersion = versionId ?? manifest.versions[0]?.id;
  return {
    gameId: manifest.id,
    ...(resolvedVersion ? { versionId: resolvedVersion } : {}),
    starterSlug: null,
    starterLevel: LEVEL_BOUNDS.defaultStarter,
    steps: [],
  };
}

/**
 * Seeds a JourneyPlan progression tree from a planned final team.
 */
export function seedJourneyPlanFromTeam(
  finalTeam: Team,
  manifest: GameManifest,
  dex: DexGateway,
  versionId?: string,
): JourneyPlan {
  const starterOptions = new Set(getStarterOptionsForGame(manifest, versionId));
  const sortedCheckpoints = [...manifest.checkpoints].sort((a, b) => a.order - b.order);
  const firstCp = sortedCheckpoints[0];
  if (!firstCp) {
    return createEmptyJourneyPlan(manifest, versionId);
  }

  const resolvedVersion = versionId ?? manifest.versions[0]?.id;
  const steps: JourneyStepNode[] = [];
  let starterSlug: SpeciesSlug | null = null;
  let starterChainSlugs: string[] = [];
  let stepSeq = 1;
  const nextId = () => `seed-step-${stepSeq++}`;

  // Identify starter from any member whose evolution line starts in starterOptions
  let starterMemberSlot = -1;
  for (const slotIndex of TEAM_SLOT_INDICES) {
    const member = finalTeam[slotIndex];
    if (!member) continue;
    const sp = dex.getSpecies(member.speciesSlug, manifest.generation);
    if (!sp) continue;
    const chain = getEvolutionChain(sp, manifest.generation, dex);
    const root = chain[0];
    if (root && starterOptions.has(root.slug)) {
      starterSlug = root.slug;
      starterChainSlugs = chain.map((s) => s.slug);
      starterMemberSlot = slotIndex;
      break;
    }
  }

  const addEvolutionChain = (
    chain: readonly SpeciesData[],
    startCheckpointOrder: number,
    initialParentStepId: string | null,
  ) => {
    let parentId = initialParentStepId;
    let currentOrder = startCheckpointOrder;
    for (let idx = 1; idx < chain.length; idx++) {
      const prev = chain[idx - 1];
      const next = chain[idx];
      if (!prev || !next) continue;
      const entry = manifest.dex[next.slug];
      const minEvoLv = entry?.evolutionNotes?.minEvolutionLevel ?? next.evoLevel;

      const targetCp =
        sortedCheckpoints.find((cp) => {
          if (cp.order < currentOrder) return false;
          if (minEvoLv !== undefined && minEvoLv > cp.levelCap) return false;
          return true;
        }) ??
        sortedCheckpoints[sortedCheckpoints.length - 1] ??
        firstCp;

      const sameSegmentAsParent = targetCp.order === currentOrder && parentId !== null;
      const resolvedParentId = sameSegmentAsParent ? parentId : null;
      currentOrder = targetCp.order;

      const id = nextId();
      steps.push({
        id,
        beforeCheckpointId: targetCp.id,
        parentStepId: resolvedParentId,
        order:
          steps.filter(
            (s) => s.beforeCheckpointId === targetCp.id && s.parentStepId === resolvedParentId,
          ).length + 1,
        action: {
          type: 'evolve',
          fromSpeciesSlug: prev.slug,
          toSpeciesSlug: next.slug,
          ...(minEvoLv !== undefined ? { targetLevel: minEvoLv } : {}),
        },
      });
      parentId = id;
    }
  };

  if (starterSlug && starterChainSlugs.length > 1) {
    const starterChain = starterChainSlugs
      .map((slug) => dex.getSpecies(slug, manifest.generation))
      .filter((sp): sp is SpeciesData => Boolean(sp));
    addEvolutionChain(starterChain, firstCp.order, null);
  }

  for (const slotIndex of TEAM_SLOT_INDICES) {
    if (slotIndex === starterMemberSlot) continue;
    const member = finalTeam[slotIndex];
    if (!member) continue;
    const finalSpecies = dex.getSpecies(member.speciesSlug, manifest.generation);
    if (!finalSpecies) continue;

    const chain = getEvolutionChain(finalSpecies, manifest.generation, dex);
    const baseStage = chain.find((st) => Boolean(manifest.dex[st.slug])) ?? finalSpecies;
    const baseEntry = manifest.dex[baseStage.slug];
    const unlockCp =
      (baseEntry
        ? sortedCheckpoints.find((cp) => cp.id === baseEntry.earliestCheckpointId)
        : undefined) ?? firstCp;

    const captureId = nextId();
    const firstLoc = baseEntry?.locations[0];
    steps.push({
      id: captureId,
      beforeCheckpointId: unlockCp.id,
      parentStepId: null,
      order:
        steps.filter((s) => s.beforeCheckpointId === unlockCp.id && s.parentStepId === null)
          .length + 1,
      action: {
        type: 'capture',
        speciesSlug: baseStage.slug,
        ...(firstLoc?.minLevel !== undefined ? { level: firstLoc.minLevel } : {}),
        ...(firstLoc?.areaName ? { location: firstLoc.areaName } : {}),
      },
    });

    const baseIndex = chain.findIndex((st) => st.slug === baseStage.slug);
    const remainingChain = baseIndex >= 0 ? chain.slice(baseIndex) : [baseStage];
    if (remainingChain.length > 1) {
      addEvolutionChain(remainingChain, unlockCp.order, captureId);
    }
  }

  return {
    gameId: manifest.id,
    ...(resolvedVersion ? { versionId: resolvedVersion } : {}),
    starterSlug,
    starterLevel: LEVEL_BOUNDS.defaultStarter,
    steps,
  };
}
