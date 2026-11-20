export type GenerationNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const ALL_POKEMON_TYPES = [
  'Normal',
  'Fire',
  'Water',
  'Electric',
  'Grass',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
] as const;

export type PokemonType = (typeof ALL_POKEMON_TYPES)[number];

export type MoveCategory = 'Physical' | 'Special' | 'Status';

export type StatId = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export type StatsTable = Record<StatId, number>;

export type SpeciesSlug = string;
export type MoveSlug = string;
export type AbilitySlug = string;
export type ItemSlug = string;
export type NatureId = string;

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
}

export type TeamSlot = TeamMember | null;

export type Team = [TeamSlot, TeamSlot, TeamSlot, TeamSlot, TeamSlot, TeamSlot];

export type EffectivenessMultiplier = number;
