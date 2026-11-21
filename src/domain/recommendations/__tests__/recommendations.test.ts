import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { recommendBuildForMember, recommendPokemonForTeam } from '@/domain/recommendations';
import {
  createFreeModeContext,
  type DexGateway,
  type PokemonType,
  type SpeciesData,
  type Team,
} from '@/domain/types';

describe('Domain Recommendations Seam', () => {
  describe('recommendPokemonForTeam', () => {
    it('recommends teammates that patch critical shared weaknesses with structured reasons', () => {
      const gen5 = createFreeModeContext(5);
      const groundFightingWeakTeam: Team = [
        { speciesSlug: 'heatran', abilitySlug: 'flashfire', moveSlugs: [] },
        { speciesSlug: 'magnezone', abilitySlug: 'magnetpull', moveSlugs: [] },
        { speciesSlug: 'tyranitar', abilitySlug: 'sandstream', moveSlugs: [] },
        null,
        null,
        null,
      ];

      const recommendations = recommendPokemonForTeam(
        groundFightingWeakTeam,
        gen5,
        pkmnDexGateway,
        { limit: 8 },
      );

      expect(recommendations).toHaveLength(8);
      // Top picks should not duplicate existing species
      const recommendedSlugs = recommendations.map((r) => r.species.slug);
      expect(recommendedSlugs).not.toContain('heatran');
      expect(recommendedSlugs).not.toContain('magnezone');
      expect(recommendedSlugs).not.toContain('tyranitar');

      // Top recommendation should explicitly explain defensive synergy against Ground or Fighting
      const top = recommendations[0];
      expect(top).toBeDefined();
      expect(top?.reasons.length).toBeGreaterThan(0);
      expect(
        top?.reasons.some(
          (reason) =>
            reason.category === 'defense' &&
            (reason.types?.includes('Ground') || reason.types?.includes('Fighting')),
        ),
      ).toBe(true);
    });

    it('respects allowedSpeciesSlugs and excludeLegendaries filters', () => {
      const gen5 = createFreeModeContext(5);
      const team: Team = [
        { speciesSlug: 'serperior', moveSlugs: [] },
        null,
        null,
        null,
        null,
        null,
      ];

      const allowed = new Set(['jellicent', 'krookodile', 'darmanitan', 'terrakion']);
      const filtered = recommendPokemonForTeam(team, gen5, pkmnDexGateway, {
        allowedSpeciesSlugs: allowed,
        excludeLegendaries: true,
        limit: 10,
      });

      const slugs = filtered.map((r) => r.species.slug);
      expect(slugs).not.toContain('terrakion');
      expect(slugs.every((slug) => allowed.has(slug))).toBe(true);
    });
  });

  describe('recommendBuildForMember', () => {
    it('recommends Air Balloon and Flash Fire for Heatran when team is Ground-weak', () => {
      const gen5 = createFreeModeContext(5);
      const team: Team = [
        { speciesSlug: 'heatran', moveSlugs: [] },
        { speciesSlug: 'magnezone', moveSlugs: [] },
        { speciesSlug: 'tyranitar', moveSlugs: [] },
        null,
        null,
        null,
      ];

      const learnable = ['flamethrower', 'earthpower', 'flashcannon', 'stealthrock', 'fireblast'];
      const build = recommendBuildForMember(0, team, gen5, pkmnDexGateway, learnable);

      expect(build).toBeDefined();
      expect(build?.ability?.slug).toBe('flashfire');
      expect(build?.item?.slug).toBe('airballoon');
      expect(build?.item?.reason).toMatch(/Ground/i);
      expect(build?.nature?.id).toBe('Modest');
      expect(build?.moves.length).toBe(4);
    });

    it('recommends Eviolite for NFE bulky Pokémon in Gen 5+', () => {
      const gen5 = createFreeModeContext(5);
      const team: Team = [{ speciesSlug: 'porygon2', moveSlugs: [] }, null, null, null, null, null];

      const build = recommendBuildForMember(0, team, gen5, pkmnDexGateway, [
        'triattack',
        'icebeam',
        'thunderbolt',
        'recover',
      ]);

      expect(build?.item?.slug).toBe('eviolite');
    });

    it('respects the Gen 3 vs Gen 4 Physical/Special split when recommending moves for Alakazam', () => {
      const learnable = [
        'psychic',
        'firepunch',
        'thunderpunch',
        'icepunch',
        'shadowball',
        'focusblast',
        'calmmind',
        'recover',
      ];

      const gen3Team: Team = [
        { speciesSlug: 'alakazam', moveSlugs: [] },
        null,
        null,
        null,
        null,
        null,
      ];
      const gen3Build = recommendBuildForMember(
        0,
        gen3Team,
        createFreeModeContext(3),
        pkmnDexGateway,
        learnable,
      );
      const gen3MoveSlugs = gen3Build?.moves.map((m) => m.move.slug) ?? [];
      // In Gen 3, Fire Punch is Special (matches Alakazam's 135 SpA) while Shadow Ball is Physical!
      expect(gen3MoveSlugs).toContain('firepunch');
      expect(gen3MoveSlugs).not.toContain('shadowball');

      const gen4Build = recommendBuildForMember(
        0,
        gen3Team,
        createFreeModeContext(4),
        pkmnDexGateway,
        learnable,
      );
      const gen4MoveSlugs = gen4Build?.moves.map((m) => m.move.slug) ?? [];
      // In Gen 4+, Shadow Ball is Special and Fire Punch is Physical
      expect(gen4MoveSlugs).toContain('shadowball');
      expect(gen4MoveSlugs).not.toContain('firepunch');
    });

    it('omits abilities, items, and natures in Generation 1', () => {
      const gen1 = createFreeModeContext(1);
      const team: Team = [{ speciesSlug: 'alakazam', moveSlugs: [] }, null, null, null, null, null];

      const build = recommendBuildForMember(0, team, gen1, pkmnDexGateway, [
        'psychic',
        'thunderwave',
        'recover',
        'seismictoss',
      ]);

      expect(build?.ability).toBeUndefined();
      expect(build?.item).toBeUndefined();
      expect(build?.nature).toBeUndefined();
      expect(build?.moves.length).toBeGreaterThan(0);
    });

    it('lists both Fire and Ice in Thick Fat explanation and preserves Wonder Guard description', () => {
      const gen5 = createFreeModeContext(5);
      const snorlaxTeam: Team = [
        { speciesSlug: 'snorlax', moveSlugs: [] },
        null,
        null,
        null,
        null,
        null,
      ];
      const snorlaxBuild = recommendBuildForMember(0, snorlaxTeam, gen5, pkmnDexGateway, [
        'bodyslam',
      ]);
      expect(snorlaxBuild?.ability?.slug).toBe('thickfat');
      expect(snorlaxBuild?.ability?.reason).toContain('Fire');
      expect(snorlaxBuild?.ability?.reason).toContain('Ice');

      const shedinjaTeam: Team = [
        { speciesSlug: 'shedinja', moveSlugs: [] },
        null,
        null,
        null,
        null,
        null,
      ];
      const shedinjaBuild = recommendBuildForMember(0, shedinjaTeam, gen5, pkmnDexGateway, [
        'shadowsneak',
      ]);
      expect(shedinjaBuild?.ability?.slug).toBe('wonderguard');
      expect(shedinjaBuild?.ability?.reason).toMatch(/non-super-effective/i);
    });
  });

  describe('defensive scoring edge cases', () => {
    it('does not double-count critical weaknesses when picking best defensive ability and penalizes added exposure without coverage', () => {
      const types: PokemonType[] = ['Normal', 'Fire', 'Water', 'Grass', 'Ice', 'Ground'];
      const makeSpecies = (
        slug: string,
        spTypes: readonly [PokemonType] | readonly [PokemonType, PokemonType],
        abilities: readonly string[] = [],
      ): SpeciesData => ({
        slug,
        name: slug,
        dexNumber: 1,
        spriteId: slug,
        types: spTypes,
        baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 },
        abilities,
        availableGenders: ['M', 'F'],
        generationIntroduced: 5,
        baseSpeciesSlug: slug,
        otherFormeSlugs: [],
        isMega: false,
        isLegendary: false,
        isBattleOnly: false,
        nfe: false,
        evoSlugs: [],
      });

      const fireStarter = makeSpecies('firemon', ['Fire']);
      const exposedFire = makeSpecies('exposedfire', ['Fire']);
      const neutralMon = makeSpecies('neutralmon', ['Normal']);
      const grassMon = makeSpecies('grassmon', ['Grass']);
      const reverseAbilityMon = makeSpecies(
        'reverseabilitymon',
        ['Normal'],
        ['thickfat', 'levitate'],
      );

      const allSpecies: SpeciesData[] = [
        fireStarter,
        exposedFire,
        neutralMon,
        grassMon,
        reverseAbilityMon,
      ];
      const stubDex: DexGateway = {
        getAvailableTypes: () => types,
        getTypeEffectiveness: (atk, defs) => {
          let mult = 1;
          for (const d of defs) {
            if (atk === 'Ground' && d === 'Fire') mult *= 2;
            if (atk === 'Water' && d === 'Fire') mult *= 2;
            if (atk === 'Water' && d === 'Grass') mult *= 0.5;
            if (atk === 'Fire' && d === 'Grass') mult *= 2;
            if (atk === 'Ice' && d === 'Grass') mult *= 2;
          }
          return mult;
        },
        getSpecies: (slug) => allSpecies.find((s) => s.slug === slug),
        getMove: () => undefined,
        getAbility: (slug) => ({ slug, name: slug, shortDesc: '' }),
        getItem: () => undefined,
        getNature: () => undefined,
        listSpecies: () => allSpecies,
        listMoves: () => [],
        listItems: () => [],
        listNatures: () => [],
        getLearnableMoveSlugs: async () => [],
      };

      // Team of 3 Fire types: critical Ground and Water weaknesses (3 weak, 0 resist)
      const fireTeam: Team = [
        { speciesSlug: 'firemon', moveSlugs: [] },
        { speciesSlug: 'firemon', moveSlugs: [] },
        { speciesSlug: 'firemon', moveSlugs: [] },
        null,
        null,
        null,
      ];
      const recs = recommendPokemonForTeam(fireTeam, createFreeModeContext(5), stubDex);
      const neutralRec = recs.find((r) => r.species.slug === 'neutralmon');
      const exposedRec = recs.find((r) => r.species.slug === 'exposedfire');
      expect(neutralRec).toBeDefined();
      expect(exposedRec).toBeDefined();
      // ExposedFire takes 2x Ground (-11) + 2x Water (-11) + addedExposure (2 * -2 = -4) => -26 below neutral
      expect((neutralRec?.score ?? 0) - (exposedRec?.score ?? 0)).toBe(26);

      // Team with Ground critical (3 firemon, 0 resists) and Fire + Ice warnings (2 grassmon, 0 resists)
      const teamMixed: Team = [
        { speciesSlug: 'grassmon', moveSlugs: [] },
        { speciesSlug: 'grassmon', moveSlugs: [] },
        { speciesSlug: 'firemon', moveSlugs: [] },
        { speciesSlug: 'firemon', moveSlugs: [] },
        { speciesSlug: 'firemon', moveSlugs: [] },
        null,
      ];
      const mixedRecs = recommendPokemonForTeam(teamMixed, createFreeModeContext(5), stubDex);
      const revRec = mixedRecs.find((r) => r.species.slug === 'reverseabilitymon');
      // Thick Fat (Fire + Ice warning = 2) ties Levitate (Ground critical immunity = 2), so first wins when not double-counted
      expect(revRec?.recommendedAbilitySlug).toBe('thickfat');
    });
  });
});
