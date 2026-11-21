import { ABILITY_SLUG, BATTLE_GIMMICK, ITEM_SLUG, POKEMON_TYPE } from '@/domain/constants';
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
  [ABILITY_SLUG.Levitate]: [POKEMON_TYPE.Ground],
  [ABILITY_SLUG.EarthEater]: [POKEMON_TYPE.Ground],
  [ABILITY_SLUG.VoltAbsorb]: [POKEMON_TYPE.Electric],
  [ABILITY_SLUG.LightningRod]: [POKEMON_TYPE.Electric],
  [ABILITY_SLUG.MotorDrive]: [POKEMON_TYPE.Electric],
  [ABILITY_SLUG.WaterAbsorb]: [POKEMON_TYPE.Water],
  [ABILITY_SLUG.StormDrain]: [POKEMON_TYPE.Water],
  [ABILITY_SLUG.DrySkin]: [POKEMON_TYPE.Water],
  [ABILITY_SLUG.FlashFire]: [POKEMON_TYPE.Fire],
  [ABILITY_SLUG.WellBakedBody]: [POKEMON_TYPE.Fire],
  [ABILITY_SLUG.SapSipper]: [POKEMON_TYPE.Grass],
};

interface AbilityMultiplierRule {
  types: readonly PokemonType[];
  factor: number;
  onlyIfSuperEffective?: boolean;
}

const ABILITY_MULTIPLIERS: Readonly<Record<string, AbilityMultiplierRule>> = {
  [ABILITY_SLUG.ThickFat]: { types: [POKEMON_TYPE.Fire, POKEMON_TYPE.Ice], factor: 0.5 },
  [ABILITY_SLUG.Heatproof]: { types: [POKEMON_TYPE.Fire], factor: 0.5 },
  [ABILITY_SLUG.PurifyingSalt]: { types: [POKEMON_TYPE.Ghost], factor: 0.5 },
  [ABILITY_SLUG.DrySkin]: { types: [POKEMON_TYPE.Fire], factor: 1.25 },
  [ABILITY_SLUG.Fluffy]: { types: [POKEMON_TYPE.Fire], factor: 2 },
  [ABILITY_SLUG.Filter]: {
    types: ALL_POKEMON_TYPES,
    factor: 0.75,
    onlyIfSuperEffective: true,
  },
  [ABILITY_SLUG.SolidRock]: {
    types: ALL_POKEMON_TYPES,
    factor: 0.75,
    onlyIfSuperEffective: true,
  },
  [ABILITY_SLUG.PrismArmor]: {
    types: ALL_POKEMON_TYPES,
    factor: 0.75,
    onlyIfSuperEffective: true,
  },
};

const ITEM_IMMUNITIES: Readonly<Record<string, readonly PokemonType[]>> = {
  [ITEM_SLUG.AirBalloon]: [POKEMON_TYPE.Ground],
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
    context.mechanics.gimmick === BATTLE_GIMMICK.Terastal && defender.teraType
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

    if (ability === ABILITY_SLUG.WonderGuard && baseMultiplier < 2) {
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
