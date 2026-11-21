import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  buildCampaignContext,
  createEmptyTeam,
  getScopeKey,
  sanitizeTeamForContext,
} from '@/domain/team';
import {
  createFreeModeContext,
  type GameContext,
  type GameManifest,
  type GenerationNumber,
  type Team,
  type TeamMember,
  type TeamSlot,
} from '@/domain/types';

export interface ScopedTeamSnapshot {
  team: Team;
  teamName: string;
}

export { buildCampaignContext, getScopeKey };

export function buildMemberFromSpecies(
  speciesSlug: string,
  context: GameContext,
  existing: TeamSlot,
): TeamMember | null {
  const species = pkmnDexGateway.getSpecies(speciesSlug, context.generation);
  if (!species) return null;

  const isSameBaseSpecies = existing
    ? pkmnDexGateway.getSpecies(existing.speciesSlug, context.generation)?.baseSpeciesSlug ===
      species.baseSpeciesSlug
    : false;

  const defaultAbility = context.mechanics.hasAbilities ? species.abilities[0] : undefined;
  const preservedGender =
    isSameBaseSpecies && existing?.gender && species.availableGenders.includes(existing.gender)
      ? existing.gender
      : species.availableGenders.length === 1
        ? species.availableGenders[0]
        : undefined;

  return {
    speciesSlug: species.slug,
    moveSlugs: isSameBaseSpecies && existing ? existing.moveSlugs : [],
    ...(defaultAbility ? { abilitySlug: defaultAbility } : {}),
    ...(isSameBaseSpecies && existing?.itemSlug ? { itemSlug: existing.itemSlug } : {}),
    ...(isSameBaseSpecies && existing?.natureId ? { natureId: existing.natureId } : {}),
    ...(isSameBaseSpecies && existing?.teraType ? { teraType: existing.teraType } : {}),
    ...(isSameBaseSpecies && existing?.nickname ? { nickname: existing.nickname } : {}),
    ...(preservedGender ? { gender: preservedGender } : {}),
    ...(isSameBaseSpecies && existing?.shiny ? { shiny: true } : {}),
  };
}

export function buildCampaignLoadState(
  manifest: GameManifest,
  rawTeam: Team,
  teamName: string,
  versionId?: string,
) {
  const context = buildCampaignContext(manifest, versionId);
  const sanitized = sanitizeTeamForContext(rawTeam, context, pkmnDexGateway);
  return {
    context,
    activeManifest: manifest,
    teamName,
    team: sanitized,
    editingSlotIndex: null,
  };
}

export function buildFreeLoadState(generation: GenerationNumber, rawTeam: Team, teamName: string) {
  const context = createFreeModeContext(generation);
  return {
    context,
    activeManifest: null,
    teamName,
    team: sanitizeTeamForContext(rawTeam, context, pkmnDexGateway),
    editingSlotIndex: null,
  };
}

export function resolveScopedSnapshot(
  currentContext: GameContext,
  currentTeam: Team,
  currentTeamName: string,
  teamsByScope: Record<string, ScopedTeamSnapshot>,
  nextContext: GameContext,
): {
  updatedScopes: Record<string, ScopedTeamSnapshot>;
  restored: ScopedTeamSnapshot;
} {
  const prevKey = getScopeKey(currentContext);
  const nextKey = getScopeKey(nextContext);
  const updatedScopes = {
    ...teamsByScope,
    [prevKey]: { team: currentTeam, teamName: currentTeamName },
  };
  const restored =
    prevKey === nextKey
      ? { team: currentTeam, teamName: currentTeamName }
      : (updatedScopes[nextKey] ?? { team: createEmptyTeam(), teamName: '' });

  return { updatedScopes, restored };
}
