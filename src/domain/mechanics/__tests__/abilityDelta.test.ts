import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { POKEMON_TYPE } from '@/domain/constants';
import {
  doesAbilityMitigateAnyType,
  evaluateAbilityDefensiveDelta,
} from '@/domain/mechanics/abilityDelta';
import { createFreeModeContext } from '@/domain/types';

describe('Ability Defensive Delta Seam', () => {
  it('detects Ground immunity granted by Levitate on Bronzong', () => {
    const gen5 = createFreeModeContext(5);
    const delta = evaluateAbilityDefensiveDelta(
      POKEMON_TYPE.Ground,
      [POKEMON_TYPE.Steel, POKEMON_TYPE.Psychic],
      'levitate',
      gen5,
      pkmnDexGateway,
    );

    expect(delta.baseMultiplier).toBe(2);
    expect(delta.abilityMultiplier).toBe(0);
    expect(delta.mitigates).toBe(true);
    expect(delta.grantsImmunity).toBe(true);
  });

  it('respects GameContext mechanics when abilities are disabled in Gen 2', () => {
    const gen2 = createFreeModeContext(2);
    const delta = evaluateAbilityDefensiveDelta(
      POKEMON_TYPE.Ground,
      [POKEMON_TYPE.Steel, POKEMON_TYPE.Psychic],
      'levitate',
      gen2,
      pkmnDexGateway,
    );

    expect(delta.abilityMultiplier).toBe(delta.baseMultiplier);
    expect(delta.mitigates).toBe(false);
    expect(delta.grantsImmunity).toBe(false);
  });

  it('checks whether an ability mitigates any type in a target list', () => {
    const gen9 = createFreeModeContext(9);
    expect(
      doesAbilityMitigateAnyType(
        [POKEMON_TYPE.Fire, POKEMON_TYPE.Water],
        [POKEMON_TYPE.Normal],
        'thickfat',
        gen9,
        pkmnDexGateway,
      ),
    ).toBe(true);

    expect(
      doesAbilityMitigateAnyType(
        [POKEMON_TYPE.Electric],
        [POKEMON_TYPE.Normal],
        'thickfat',
        gen9,
        pkmnDexGateway,
      ),
    ).toBe(false);
  });
});
