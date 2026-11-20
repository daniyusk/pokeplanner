import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  calculateDefensiveMultiplier,
  calculateTypeEffectiveness,
  getAvailableTypes,
  getEffectiveMoveCategory,
} from '@/domain/mechanics';
import { type CampaignGameContext, createFreeModeContext } from '@/domain/types';

describe('Domain Mechanics Seam', () => {
  describe('getAvailableTypes', () => {
    it('returns 15 types in Generation 1 (excluding Dark, Steel, and Fairy)', () => {
      const types = getAvailableTypes(1, pkmnDexGateway);
      expect(types).toHaveLength(15);
      expect(types).not.toContain('Dark');
      expect(types).not.toContain('Steel');
      expect(types).not.toContain('Fairy');
    });

    it('returns 17 types in Generations 2 through 5 (including Dark and Steel, excluding Fairy)', () => {
      for (const gen of [2, 3, 4, 5] as const) {
        const types = getAvailableTypes(gen, pkmnDexGateway);
        expect(types).toHaveLength(17);
        expect(types).toContain('Dark');
        expect(types).toContain('Steel');
        expect(types).not.toContain('Fairy');
      }
    });

    it('returns 18 standard types in Generations 6 through 9 (excluding ??? and Stellar)', () => {
      for (const gen of [6, 7, 8, 9] as const) {
        const types = getAvailableTypes(gen, pkmnDexGateway);
        expect(types).toHaveLength(18);
        expect(types).toContain('Fairy');
      }
    });
  });

  describe('calculateTypeEffectiveness', () => {
    it('applies Generation 1 chart quirks (Ghost vs Psychic is 0x, Ice vs Fire is 1x, Bug <-> Poison is 2x)', () => {
      expect(calculateTypeEffectiveness('Ghost', ['Psychic'], 1, pkmnDexGateway)).toBe(0);
      expect(calculateTypeEffectiveness('Ice', ['Fire'], 1, pkmnDexGateway)).toBe(1);
      expect(calculateTypeEffectiveness('Bug', ['Poison'], 1, pkmnDexGateway)).toBe(2);
      expect(calculateTypeEffectiveness('Poison', ['Bug'], 1, pkmnDexGateway)).toBe(2);
    });

    it('applies Generation 2-5 Steel resistances to Ghost and Dark', () => {
      expect(calculateTypeEffectiveness('Ghost', ['Psychic'], 5, pkmnDexGateway)).toBe(2);
      expect(calculateTypeEffectiveness('Ghost', ['Steel'], 5, pkmnDexGateway)).toBe(0.5);
      expect(calculateTypeEffectiveness('Dark', ['Steel'], 5, pkmnDexGateway)).toBe(0.5);
      expect(calculateTypeEffectiveness('Ice', ['Fire'], 5, pkmnDexGateway)).toBe(0.5);
    });

    it('applies Generation 6+ Steel neutrality to Ghost/Dark and Fairy immunity to Dragon', () => {
      expect(calculateTypeEffectiveness('Ghost', ['Steel'], 6, pkmnDexGateway)).toBe(1);
      expect(calculateTypeEffectiveness('Dark', ['Steel'], 6, pkmnDexGateway)).toBe(1);
      expect(calculateTypeEffectiveness('Dragon', ['Fairy'], 6, pkmnDexGateway)).toBe(0);
    });

    it('computes dual-type quad weaknesses, double resistances, and immunities', () => {
      expect(calculateTypeEffectiveness('Grass', ['Water', 'Ground'], 5, pkmnDexGateway)).toBe(4);
      expect(calculateTypeEffectiveness('Electric', ['Water', 'Ground'], 5, pkmnDexGateway)).toBe(
        0,
      );
      expect(calculateTypeEffectiveness('Fire', ['Water', 'Dragon'], 5, pkmnDexGateway)).toBe(0.25);
    });
  });

  describe('calculateDefensiveMultiplier', () => {
    it('applies Levitate Ground immunity and Heatproof Fire halving for Bronzong in Gen 5', () => {
      const gen5 = createFreeModeContext(5);
      const levitateGround = calculateDefensiveMultiplier(
        'Ground',
        { types: ['Steel', 'Psychic'], abilitySlug: 'levitate' },
        gen5,
        pkmnDexGateway,
      );
      expect(levitateGround.multiplier).toBe(0);
      expect(levitateGround.modifierSource).toBe('ability');
      expect(levitateGround.modifierName).toBe('levitate');

      const heatproofFire = calculateDefensiveMultiplier(
        'Fire',
        { types: ['Steel', 'Psychic'], abilitySlug: 'heatproof' },
        gen5,
        pkmnDexGateway,
      );
      expect(heatproofFire.multiplier).toBe(1);
      expect(heatproofFire.modifierSource).toBe('ability');
      expect(heatproofFire.modifierName).toBe('heatproof');
    });

    it('applies Wonder Guard to block everything except super-effective hits', () => {
      const gen5 = createFreeModeContext(5);
      const waterHit = calculateDefensiveMultiplier(
        'Water',
        { types: ['Bug', 'Ghost'], abilitySlug: 'wonderguard' },
        gen5,
        pkmnDexGateway,
      );
      expect(waterHit.multiplier).toBe(0);

      const fireHit = calculateDefensiveMultiplier(
        'Fire',
        { types: ['Bug', 'Ghost'], abilitySlug: 'wonderguard' },
        gen5,
        pkmnDexGateway,
      );
      expect(fireHit.multiplier).toBe(2);
    });

    it('applies Thick Fat, Dry Skin, Filter, and Air Balloon interceptors accurately', () => {
      const gen6 = createFreeModeContext(6);
      expect(
        calculateDefensiveMultiplier(
          'Fire',
          { types: ['Water', 'Fairy'], abilitySlug: 'thickfat' },
          gen6,
          pkmnDexGateway,
        ).multiplier,
      ).toBe(0.25);

      expect(
        calculateDefensiveMultiplier(
          'Fire',
          { types: ['Poison', 'Fighting'], abilitySlug: 'dryskin' },
          gen6,
          pkmnDexGateway,
        ).multiplier,
      ).toBe(1.25);

      expect(
        calculateDefensiveMultiplier(
          'Water',
          { types: ['Poison', 'Fighting'], abilitySlug: 'dryskin' },
          gen6,
          pkmnDexGateway,
        ).multiplier,
      ).toBe(0);

      expect(
        calculateDefensiveMultiplier(
          'Water',
          { types: ['Ground', 'Rock'], abilitySlug: 'solidrock' },
          gen6,
          pkmnDexGateway,
        ).multiplier,
      ).toBe(3);

      const balloonGround = calculateDefensiveMultiplier(
        'Ground',
        { types: ['Fire', 'Steel'], abilitySlug: 'flashfire', itemSlug: 'airballoon' },
        gen6,
        pkmnDexGateway,
      );
      expect(balloonGround.multiplier).toBe(0);
      expect(balloonGround.modifierSource).toBe('item');
    });

    it('ignores abilities and held items when disabled in GameContext flags', () => {
      const letsGoLike: CampaignGameContext = {
        mode: 'campaign',
        gameId: 'lets-go',
        generation: 7,
        mechanics: {
          hasAbilities: false,
          hasHeldItems: false,
          hasNatures: true,
          physicalSpecialSplit: true,
          gimmick: 'mega',
        },
      };

      const groundHit = calculateDefensiveMultiplier(
        'Ground',
        { types: ['Ghost', 'Poison'], abilitySlug: 'levitate', itemSlug: 'airballoon' },
        letsGoLike,
        pkmnDexGateway,
      );
      expect(groundHit.multiplier).toBe(2);
      expect(groundHit.modifierSource).toBe('type');
    });

    it('uses Tera Type defensively in Gen 9 when Terastal gimmick is active', () => {
      const gen9 = createFreeModeContext(9);
      const teraElectricBalloon = calculateDefensiveMultiplier(
        'Ground',
        {
          types: ['Bug', 'Ghost'],
          abilitySlug: 'wonderguard',
          itemSlug: 'airballoon',
          teraType: 'Electric',
        },
        gen9,
        pkmnDexGateway,
      );
      expect(teraElectricBalloon.multiplier).toBe(0);

      const teraElectricWater = calculateDefensiveMultiplier(
        'Water',
        {
          types: ['Bug', 'Ghost'],
          abilitySlug: 'wonderguard',
          teraType: 'Electric',
        },
        gen9,
        pkmnDexGateway,
      );
      expect(teraElectricWater.multiplier).toBe(0);
    });
  });

  describe('getEffectiveMoveCategory', () => {
    it('determines Physical/Special from move type in Generations 1-3', () => {
      const gen3 = createFreeModeContext(3);
      expect(getEffectiveMoveCategory('shadowball', gen3, pkmnDexGateway)).toBe('Physical');
      expect(getEffectiveMoveCategory('firepunch', gen3, pkmnDexGateway)).toBe('Special');
      expect(getEffectiveMoveCategory('crunch', gen3, pkmnDexGateway)).toBe('Special');
      expect(getEffectiveMoveCategory('willowisp', gen3, pkmnDexGateway)).toBe('Status');
    });

    it('uses per-move category from Generation 4 onward', () => {
      const gen4 = createFreeModeContext(4);
      expect(getEffectiveMoveCategory('shadowball', gen4, pkmnDexGateway)).toBe('Special');
      expect(getEffectiveMoveCategory('firepunch', gen4, pkmnDexGateway)).toBe('Physical');
      expect(getEffectiveMoveCategory('crunch', gen4, pkmnDexGateway)).toBe('Physical');
      expect(getEffectiveMoveCategory('willowisp', gen4, pkmnDexGateway)).toBe('Status');
    });
  });

  describe('Generation-accurate species data via pkmnDexGateway', () => {
    it('reflects historical species typing and ability changes across generations', () => {
      const clefairyGen5 = pkmnDexGateway.getSpecies('clefairy', 5);
      const clefairyGen6 = pkmnDexGateway.getSpecies('clefairy', 6);
      expect(clefairyGen5?.types).toEqual(['Normal']);
      expect(clefairyGen6?.types).toEqual(['Fairy']);

      const gengarGen5 = pkmnDexGateway.getSpecies('gengar', 5);
      const gengarGen7 = pkmnDexGateway.getSpecies('gengar', 7);
      expect(gengarGen5?.abilities).toContain('levitate');
      expect(gengarGen7?.abilities).toContain('cursedbody');
      expect(gengarGen7?.abilities).not.toContain('levitate');
    });
  });
});
