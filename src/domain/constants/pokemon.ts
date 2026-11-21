export const POKEMON_TYPE = {
  Normal: 'Normal',
  Fire: 'Fire',
  Water: 'Water',
  Electric: 'Electric',
  Grass: 'Grass',
  Ice: 'Ice',
  Fighting: 'Fighting',
  Poison: 'Poison',
  Ground: 'Ground',
  Flying: 'Flying',
  Psychic: 'Psychic',
  Bug: 'Bug',
  Rock: 'Rock',
  Ghost: 'Ghost',
  Dragon: 'Dragon',
  Dark: 'Dark',
  Steel: 'Steel',
  Fairy: 'Fairy',
} as const;

export const ALL_POKEMON_TYPES = [
  POKEMON_TYPE.Normal,
  POKEMON_TYPE.Fire,
  POKEMON_TYPE.Water,
  POKEMON_TYPE.Electric,
  POKEMON_TYPE.Grass,
  POKEMON_TYPE.Ice,
  POKEMON_TYPE.Fighting,
  POKEMON_TYPE.Poison,
  POKEMON_TYPE.Ground,
  POKEMON_TYPE.Flying,
  POKEMON_TYPE.Psychic,
  POKEMON_TYPE.Bug,
  POKEMON_TYPE.Rock,
  POKEMON_TYPE.Ghost,
  POKEMON_TYPE.Dragon,
  POKEMON_TYPE.Dark,
  POKEMON_TYPE.Steel,
  POKEMON_TYPE.Fairy,
] as const;

export const ALL_GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const TEAM_SIZE = 6;
export const TEAM_SLOT_INDICES = [0, 1, 2, 3, 4, 5] as const;
export const MAX_MOVES_PER_MEMBER = 4;

export const LEVEL_BOUNDS = {
  min: 1,
  max: 100,
  defaultStarter: 5,
} as const;

export const TEXT_LIMITS = {
  nicknameMaxLength: 32,
  teamNameMaxLength: 60,
} as const;

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
export const MAX_BASE_STAT_SCALE = 150;
export const MAX_EVOLUTION_CHAIN_DEPTH = 4;

export const MOVE_CATEGORY = {
  Physical: 'Physical',
  Special: 'Special',
  Status: 'Status',
} as const;

export const POKEMON_GENDER = {
  Male: 'M',
  Female: 'F',
  Neutral: 'N',
} as const;

export const ALL_POKEMON_GENDERS = [
  POKEMON_GENDER.Male,
  POKEMON_GENDER.Female,
  POKEMON_GENDER.Neutral,
] as const;

export const BATTLE_GIMMICK = {
  Mega: 'mega',
  ZMove: 'z-move',
  Dynamax: 'dynamax',
  Terastal: 'terastal',
  Alpha: 'alpha',
} as const;

export const ALL_BATTLE_GIMMICKS = [
  BATTLE_GIMMICK.Mega,
  BATTLE_GIMMICK.ZMove,
  BATTLE_GIMMICK.Dynamax,
  BATTLE_GIMMICK.Terastal,
  BATTLE_GIMMICK.Alpha,
] as const;

export const CHECKPOINT_CATEGORIES = [
  'gym',
  'rival',
  'elite-four',
  'champion',
  'post-game',
] as const;

export const ENCOUNTER_METHODS = [
  'starter',
  'grass',
  'cave',
  'surf',
  'fish',
  'gift',
  'static',
  'fossil',
  'trade',
  'evolve',
  'headbutt',
  'honey-tree',
  'swarm',
] as const;

export const DEX_AVAILABILITY_TYPES = [
  'starter',
  'wild',
  'gift',
  'static',
  'fossil',
  'trade-only',
  'evolution',
  'post-game',
] as const;
