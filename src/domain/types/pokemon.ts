import {
  type ALL_GENERATIONS,
  type ALL_POKEMON_GENDERS,
  ALL_POKEMON_TYPES,
  type MOVE_CATEGORY,
  type STAT_KEYS,
} from '@/domain/constants/pokemon';

export { ALL_POKEMON_TYPES };

export type GenerationNumber = (typeof ALL_GENERATIONS)[number];

export type PokemonType = (typeof ALL_POKEMON_TYPES)[number];

export type MoveCategory = (typeof MOVE_CATEGORY)[keyof typeof MOVE_CATEGORY];

export type StatId = (typeof STAT_KEYS)[number];

export type StatsTable = Record<StatId, number>;

export type SpeciesSlug = string;
export type MoveSlug = string;
export type AbilitySlug = string;
export type ItemSlug = string;
export type NatureId = string;

export type PokemonGender = (typeof ALL_POKEMON_GENDERS)[number];

export type TeamSlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface TeamMember {
  speciesSlug: SpeciesSlug;
  abilitySlug?: AbilitySlug;
  itemSlug?: ItemSlug;
  natureId?: NatureId;
  moveSlugs: readonly MoveSlug[];
  teraType?: PokemonType;
  level?: number;
  nickname?: string;
  gender?: PokemonGender;
  shiny?: boolean;
}

export type TeamSlot = TeamMember | null;

export type Team = [TeamSlot, TeamSlot, TeamSlot, TeamSlot, TeamSlot, TeamSlot];

export type EffectivenessMultiplier = number;
