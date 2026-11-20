import {
  type AbilitySlug,
  ALL_POKEMON_TYPES,
  type DexGateway,
  type EffectivenessMultiplier,
  type GameContext,
  type GenerationNumber,
  type ItemSlug,
  type PokemonType,
} from '@/domain/types';

export interface DefensiveSubject {
  types: readonly PokemonType[];
  abilitySlug?: AbilitySlug;
  itemSlug?: ItemSlug;
  teraType?: PokemonType;
}

export interface DefensiveMultiplierResult {
  multiplier: EffectivenessMultiplier;
  modifierSource: 'type' | 'ability' | 'item';
  modifierName?: string;
}

const ABILITY_IMMUNITIES: Readonly<Record<string, readonly PokemonType[]>> = {
  levitate: ['Ground'],
  eartheater: ['Ground'],
  voltabsorb: ['Electric'],
  lightningrod: ['Electric'],
  motordrive: ['Electric'],
  waterabsorb: ['Water'],
  stormdrain: ['Water'],
  dryskin: ['Water'],
  flashfire: ['Fire'],
  wellbakedbody: ['Fire'],
  sapsipper: ['Grass'],
};

interface AbilityMultiplierRule {
  types: readonly PokemonType[];
  factor: number;
  onlyIfSuperEffective?: boolean;
}

const ABILITY_MULTIPLIERS: Readonly<Record<string, AbilityMultiplierRule>> = {
  thickfat: { types: ['Fire', 'Ice'], factor: 0.5 },
  heatproof: { types: ['Fire'], factor: 0.5 },
  purifyingsalt: { types: ['Ghost'], factor: 0.5 },
  dryskin: { types: ['Fire'], factor: 1.25 },
  fluffy: { types: ['Fire'], factor: 2 },
  filter: { types: ALL_POKEMON_TYPES, factor: 0.75, onlyIfSuperEffective: true },
  solidrock: { types: ALL_POKEMON_TYPES, factor: 0.75, onlyIfSuperEffective: true },
  prismarmor: { types: ALL_POKEMON_TYPES, factor: 0.75, onlyIfSuperEffective: true },
};

const ITEM_IMMUNITIES: Readonly<Record<string, readonly PokemonType[]>> = {
  airballoon: ['Ground'],
};

function normalizeSlug(value: string | undefined): string {
  return value ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

/**
 * Returns the standard Pokémon types available in the requested generation.
 */
export function getAvailableTypes(
  generation: GenerationNumber,
  dex: DexGateway,
): readonly PokemonType[] {
  return dex.getAvailableTypes(generation);
}

/**
 * Computes raw type effectiveness for an attacking type against defender types
 * using the type chart of the given generation.
 */
export function calculateTypeEffectiveness(
  attackType: PokemonType,
  defenderTypes: readonly PokemonType[],
  generation: GenerationNumber,
  dex: DexGateway,
): EffectivenessMultiplier {
  return dex.getTypeEffectiveness(attackType, defenderTypes, generation);
}

/**
 * Computes the effective defensive damage multiplier for a Pokémon slot,
 * factoring in Terastal type overrides, Ability interceptors, and Held Item interceptors
 * according to the active GameContext mechanics flags.
 */
export function calculateDefensiveMultiplier(
  attackType: PokemonType,
  defender: DefensiveSubject,
  context: GameContext,
  dex: DexGateway,
): DefensiveMultiplierResult {
  const effectiveTypes: readonly PokemonType[] =
    context.mechanics.gimmick === 'terastal' && defender.teraType
      ? [defender.teraType]
      : defender.types;

  const baseMultiplier = dex.getTypeEffectiveness(attackType, effectiveTypes, context.generation);

  const ability = context.mechanics.hasAbilities ? normalizeSlug(defender.abilitySlug) : '';
  const item = context.mechanics.hasHeldItems ? normalizeSlug(defender.itemSlug) : '';

  // Item immunities (e.g., Air Balloon vs. Ground) take precedence when held
  if (item) {
    const immuneTypes = ITEM_IMMUNITIES[item];
    if (immuneTypes?.includes(attackType)) {
      return {
        multiplier: 0,
        modifierSource: 'item',
        modifierName: item,
      };
    }
  }

  // Ability immunities (e.g., Levitate, Flash Fire, Water Absorb, Wonder Guard)
  if (ability) {
    const immuneTypes = ABILITY_IMMUNITIES[ability];
    if (immuneTypes?.includes(attackType)) {
      return {
        multiplier: 0,
        modifierSource: 'ability',
        modifierName: ability,
      };
    }

    if (ability === 'wonderguard' && baseMultiplier < 2) {
      return {
        multiplier: 0,
        modifierSource: 'ability',
        modifierName: ability,
      };
    }

    const multiplierRule = ABILITY_MULTIPLIERS[ability];
    if (
      multiplierRule?.types.includes(attackType) &&
      (!multiplierRule.onlyIfSuperEffective || baseMultiplier >= 2)
    ) {
      return {
        multiplier: baseMultiplier * multiplierRule.factor,
        modifierSource: 'ability',
        modifierName: ability,
      };
    }
  }

  return {
    multiplier: baseMultiplier,
    modifierSource: 'type',
  };
}
