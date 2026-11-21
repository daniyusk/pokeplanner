import { BATTLE_GIMMICK, POKEMON_GENDER, TEAM_SLOT_INDICES } from '@/domain/constants';
import type {
  CampaignGameContext,
  DexGateway,
  GameContext,
  GameManifest,
  GameMechanicsFlags,
  GenerationNumber,
  SpeciesData,
  SpeciesSlug,
  Team,
  TeamMember,
  TeamSlot,
  TeamSlotIndex,
} from '@/domain/types';

export type TeamTuple<T> = [T, T, T, T, T, T];

export interface ResolvedTeamEntry {
  slotIndex: TeamSlotIndex;
  member: TeamMember;
  species: SpeciesData;
}

export function resolveTeamEntries(
  team: Team,
  generation: GenerationNumber,
  dex: DexGateway,
): ResolvedTeamEntry[] {
  const entries: ResolvedTeamEntry[] = [];
  for (const slotIndex of TEAM_SLOT_INDICES) {
    const member = team[slotIndex];
    if (!member) continue;
    const species = dex.getSpecies(member.speciesSlug, generation);
    if (!species) continue;
    entries.push({ slotIndex, member, species });
  }
  return entries;
}

export function getScopeKey(context: GameContext): string {
  return context.mode === 'campaign' ? `campaign:${context.gameId}` : 'free';
}

export function buildCampaignContext(
  manifest: GameManifest,
  versionId?: string,
): CampaignGameContext {
  const resolvedVersionId = versionId ?? manifest.versions[0]?.id;
  return {
    mode: 'campaign',
    gameId: manifest.id,
    ...(resolvedVersionId ? { versionId: resolvedVersionId } : {}),
    generation: manifest.generation,
    mechanics: manifest.mechanics,
  };
}

export function createEmptyTeam(): Team {
  return [null, null, null, null, null, null];
}

export function mapTeamSlots<T>(
  team: Team,
  mapper: (slot: TeamSlot, index: TeamSlotIndex) => T,
): TeamTuple<T> {
  return [
    mapper(team[0], 0),
    mapper(team[1], 1),
    mapper(team[2], 2),
    mapper(team[3], 3),
    mapper(team[4], 4),
    mapper(team[5], 5),
  ];
}

export function withTeamSlot(team: Team, slotIndex: TeamSlotIndex, slot: TeamSlot): Team {
  return mapTeamSlots(team, (existing, index) => (index === slotIndex ? slot : existing));
}

export function swapTeamSlots(team: Team, fromIndex: TeamSlotIndex, toIndex: TeamSlotIndex): Team {
  if (fromIndex === toIndex) return team;
  return mapTeamSlots(team, (existing, index) => {
    if (index === fromIndex) return team[toIndex];
    if (index === toIndex) return team[fromIndex];
    return existing;
  });
}

export function cloneTeam(team: Team): Team {
  return mapTeamSlots(team, (slot) => (slot ? { ...slot, moveSlugs: [...slot.moveSlugs] } : null));
}

export function findMemberSlotIndex(team: Team, speciesSlug: SpeciesSlug): TeamSlotIndex | -1 {
  for (const slotIndex of TEAM_SLOT_INDICES) {
    if (team[slotIndex]?.speciesSlug === speciesSlug) {
      return slotIndex;
    }
  }
  return -1;
}

export function findFirstEmptySlotIndex(team: Team): TeamSlotIndex | -1 {
  for (const slotIndex of TEAM_SLOT_INDICES) {
    if (team[slotIndex] === null) {
      return slotIndex;
    }
  }
  return -1;
}

export interface SanitizeTeamMemberOptions {
  mechanics?: GameMechanicsFlags;
  defaultAbilityToFirst?: boolean;
  fillSingleGender?: boolean;
  warnings?: string[];
}

/**
 * Validates and normalizes a single TeamMember against Dex data for the active generation
 * and optional GameMechanicsFlags, returning null when the species does not exist.
 */
export function sanitizeTeamMember(
  slot: TeamSlot,
  generation: GenerationNumber,
  dex: DexGateway,
  options: SanitizeTeamMemberOptions = {},
): TeamSlot {
  if (!slot) return null;

  const { mechanics, defaultAbilityToFirst = false, fillSingleGender = false, warnings } = options;
  const species = dex.getSpecies(slot.speciesSlug, generation);
  if (!species) {
    warnings?.push(`Unknown species "${slot.speciesSlug}" in generation ${generation}.`);
    return null;
  }

  const validMoves = slot.moveSlugs.filter((moveSlug) =>
    Boolean(dex.getMove(moveSlug, generation)),
  );
  if (warnings && validMoves.length !== slot.moveSlugs.length) {
    warnings.push(`Some moves for "${species.name}" are invalid in generation ${generation}.`);
  }

  const abilitiesEnabled = mechanics ? mechanics.hasAbilities : true;
  const itemsEnabled = mechanics ? mechanics.hasHeldItems : true;
  const naturesEnabled = mechanics ? mechanics.hasNatures : true;
  const teraEnabled = mechanics ? mechanics.gimmick === BATTLE_GIMMICK.Terastal : true;

  const resolvedAbility = abilitiesEnabled
    ? ((slot.abilitySlug ? dex.getAbility(slot.abilitySlug, generation)?.slug : undefined) ??
      (defaultAbilityToFirst ? species.abilities[0] : undefined))
    : undefined;

  const resolvedItem =
    itemsEnabled && slot.itemSlug ? dex.getItem(slot.itemSlug, generation)?.slug : undefined;

  const resolvedNature =
    naturesEnabled && slot.natureId ? dex.getNature(slot.natureId, generation)?.id : undefined;

  const resolvedTera = teraEnabled ? slot.teraType : undefined;

  const resolvedGender =
    slot.gender && (!fillSingleGender || species.availableGenders.includes(slot.gender))
      ? slot.gender
      : fillSingleGender && species.availableGenders.length === 1
        ? species.availableGenders[0]
        : undefined;

  const member: TeamMember = {
    speciesSlug: species.slug,
    moveSlugs: validMoves,
    ...(resolvedAbility ? { abilitySlug: resolvedAbility } : {}),
    ...(resolvedItem ? { itemSlug: resolvedItem } : {}),
    ...(resolvedNature ? { natureId: resolvedNature } : {}),
    ...(resolvedTera ? { teraType: resolvedTera } : {}),
    ...(slot.level !== undefined ? { level: slot.level } : {}),
    ...(slot.nickname ? { nickname: slot.nickname } : {}),
    ...(resolvedGender ? { gender: resolvedGender } : {}),
    ...(slot.shiny ? { shiny: true } : {}),
  };

  return member;
}

/**
 * Sanitizes all 6 slots of a team against the active GameContext rules.
 */
export function sanitizeTeamForContext(team: Team, context: GameContext, dex: DexGateway): Team {
  const options: SanitizeTeamMemberOptions = {
    mechanics: context.mechanics,
    defaultAbilityToFirst: true,
    fillSingleGender: true,
  };
  return mapTeamSlots(team, (slot) => sanitizeTeamMember(slot, context.generation, dex, options));
}

/**
 * Resolves the alternate gender-dimorphic forme (e.g. Meowstic <-> Meowstic-F)
 * when a species is gender-locked in Gen 2+.
 */
export function resolveGenderFormeTarget(
  species: SpeciesData,
  generation: GenerationNumber,
  dex: DexGateway,
): SpeciesData | undefined {
  if (species.availableGenders.length !== 1 || generation < 2) {
    return undefined;
  }

  const targetSuffix = species.availableGenders[0] === POKEMON_GENDER.Male ? 'f' : '';
  const candidateSlug = targetSuffix
    ? `${species.baseSpeciesSlug}${targetSuffix}`
    : species.baseSpeciesSlug;

  if (candidateSlug === species.slug) {
    return undefined;
  }

  const altForme = dex.getSpecies(candidateSlug, generation);
  return altForme && altForme.availableGenders.length === 1 ? altForme : undefined;
}
