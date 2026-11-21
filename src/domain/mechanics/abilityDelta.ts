import type { AbilitySlug, DexGateway, GameContext, PokemonType } from '@/domain/types';
import { calculateDefensiveMultiplier } from './typeEffectiveness';

export interface AbilityDefensiveDelta {
  baseMultiplier: number;
  abilityMultiplier: number;
  mitigates: boolean;
  grantsImmunity: boolean;
}

/**
 * Compares incoming damage multiplier without vs. with an ability under the active GameContext.
 */
export function evaluateAbilityDefensiveDelta(
  attackType: PokemonType,
  speciesTypes: readonly PokemonType[],
  abilitySlug: AbilitySlug,
  context: GameContext,
  dex: DexGateway,
): AbilityDefensiveDelta {
  const baseMultiplier = calculateDefensiveMultiplier(
    attackType,
    { types: speciesTypes },
    context,
    dex,
  ).multiplier;
  const abilityMultiplier = calculateDefensiveMultiplier(
    attackType,
    { types: speciesTypes, abilitySlug },
    context,
    dex,
  ).multiplier;

  const mitigates = abilityMultiplier < baseMultiplier;
  return {
    baseMultiplier,
    abilityMultiplier,
    mitigates,
    grantsImmunity: mitigates && abilityMultiplier === 0,
  };
}

/**
 * Returns true if the given ability reduces damage from at least one type in `attackTypes`.
 */
export function doesAbilityMitigateAnyType(
  attackTypes: readonly PokemonType[],
  speciesTypes: readonly PokemonType[],
  abilitySlug: AbilitySlug,
  context: GameContext,
  dex: DexGateway,
): boolean {
  return attackTypes.some(
    (attackType) =>
      evaluateAbilityDefensiveDelta(attackType, speciesTypes, abilitySlug, context, dex).mitigates,
  );
}
