import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  decodeTeamFromSearchParams,
  encodeTeamToSearchParams,
  exportTeamToShowdown,
  importTeamFromShowdown,
  type ShareableTeamState,
} from '@/domain/sharing';
import { createFreeModeContext, type Team } from '@/domain/types';
import frozenFixtures from '../../../../tests/fixtures/shared-urls.json';

describe('Domain Sharing Seam', () => {
  describe('URL Codec & compact species', () => {
    it('encodes species-only Free Mode teams into readable compact query params and decodes back', () => {
      const state: ShareableTeamState = {
        mode: 'free',
        generation: 5,
        team: [
          { speciesSlug: 'serperior', moveSlugs: [] },
          null,
          { speciesSlug: 'lucario', moveSlugs: [] },
          null,
          { speciesSlug: 'volcarona', moveSlugs: [] },
          null,
        ],
      };

      const params = encodeTeamToSearchParams(state);
      expect(params.p).toBeUndefined();
      expect(params.g).toBe('5');
      expect(params.s).toBe('serperior,-,lucario,-,volcarona,-');

      const decoded = decodeTeamFromSearchParams(params, pkmnDexGateway);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.state).toEqual(state);
      }
    });

    it('round-trips full 6-slot builds with abilities, items, natures, moves, and tera types', () => {
      const state: ShareableTeamState = {
        mode: 'free',
        generation: 9,
        teamName: 'Paldea Core',
        team: [
          {
            speciesSlug: 'garchomp',
            abilitySlug: 'roughskin',
            itemSlug: 'rockyhelmet',
            natureId: 'Jolly',
            moveSlugs: ['earthquake', 'dragonclaw', 'swordsdance', 'stealthrock'],
            teraType: 'Steel',
            nickname: 'Chompy',
          },
          {
            speciesSlug: 'rotomwash',
            abilitySlug: 'levitate',
            itemSlug: 'leftovers',
            natureId: 'Bold',
            moveSlugs: ['hydropump', 'voltswitch', 'willowisp', 'painsplit'],
          },
          null,
          null,
          null,
          null,
        ],
      };

      const params = encodeTeamToSearchParams(state);
      expect(params.p).toBeTruthy();
      expect(params.p).not.toMatch(/^v\d+_/);
      expect(params.s).toBeUndefined();

      const decoded = decodeTeamFromSearchParams(params, pkmnDexGateway);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.state).toEqual(state);
      }
    });

    it('round-trips gender and shiny flags in compressed payloads', () => {
      const state: ShareableTeamState = {
        mode: 'free',
        generation: 9,
        team: [
          {
            speciesSlug: 'garchomp',
            abilitySlug: 'roughskin',
            moveSlugs: ['earthquake'],
            gender: 'F',
            shiny: true,
          },
          {
            speciesSlug: 'pikachu',
            moveSlugs: [],
            gender: 'M',
          },
          null,
          null,
          null,
          null,
        ],
      };

      const params = encodeTeamToSearchParams(state);
      expect(params.p).toBeTruthy();
      expect(params.p).not.toMatch(/^v\d+_/);

      const decoded = decodeTeamFromSearchParams(params, pkmnDexGateway);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.state).toEqual(state);
      }
    });

    it('returns a typed error for corrupted payloads or invalid generation params', () => {
      const badPayload = decodeTeamFromSearchParams({ p: 'not_valid_compressed' }, pkmnDexGateway);
      expect(badPayload.ok).toBe(false);

      const badGen = decodeTeamFromSearchParams(
        { g: '42', s: 'pikachu,-,-,-,-,-' },
        pkmnDexGateway,
      );
      expect(badGen.ok).toBe(false);
    });

    it('decodes frozen regression fixtures without breaking backward compatibility', () => {
      const compactDecoded = decodeTeamFromSearchParams(
        frozenFixtures.compactGen5.params,
        pkmnDexGateway,
      );
      expect(compactDecoded.ok).toBe(true);
      if (compactDecoded.ok) {
        expect(compactDecoded.state.generation).toBe(frozenFixtures.compactGen5.expectedGeneration);
        expect(compactDecoded.state.team.map((s) => s?.speciesSlug)).toEqual(
          frozenFixtures.compactGen5.expectedSpecies,
        );
      }

      const fullDecoded = decodeTeamFromSearchParams(
        frozenFixtures.gen5Builds.params,
        pkmnDexGateway,
      );
      expect(fullDecoded.ok).toBe(true);
      if (fullDecoded.ok) {
        expect(fullDecoded.state.teamName).toBe(frozenFixtures.gen5Builds.expectedTeamName);
        expect(fullDecoded.state.generation).toBe(frozenFixtures.gen5Builds.expectedGeneration);
        expect(fullDecoded.state.team[0]).toEqual(frozenFixtures.gen5Builds.expectedFirstSlot);
      }
    });
  });

  describe('Pokémon Showdown Import & Export', () => {
    it('exports a configured team to standard Showdown paste format', () => {
      const context = createFreeModeContext(9);
      const team: Team = [
        {
          speciesSlug: 'garchomp',
          abilitySlug: 'roughskin',
          itemSlug: 'rockyhelmet',
          natureId: 'Jolly',
          moveSlugs: ['earthquake', 'dragonclaw', 'swordsdance', 'firefang'],
          teraType: 'Steel',
          nickname: 'Chompy',
          gender: 'M',
          shiny: true,
        },
        null,
        null,
        null,
        null,
        null,
      ];

      const paste = exportTeamToShowdown(team, context, pkmnDexGateway);
      expect(paste).toContain('Chompy (Garchomp) (M) @ Rocky Helmet');
      expect(paste).toContain('Ability: Rough Skin');
      expect(paste).toContain('Shiny: Yes');
      expect(paste).toContain('Tera Type: Steel');
      expect(paste).toContain('Jolly Nature');
      expect(paste).toContain('- Earthquake');
      expect(paste).toContain('- Dragon Claw');
    });

    it('imports Showdown paste text including nicknames, genders, shiny, items, abilities, natures, and moves', () => {
      const paste = `
Chompy (Garchomp) (M) @ Rocky Helmet
Ability: Rough Skin
Level: 50
Shiny: Yes
Tera Type: Steel
EVs: 252 Atk / 4 Def / 252 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Swords Dance
- Fire Fang

Rotom-Wash @ Leftovers
Ability: Levitate
Bold Nature
- Hydro Pump
- Volt Switch
- Will-O-Wisp
- Pain Split
      `.trim();

      const context = createFreeModeContext(9);
      const result = importTeamFromShowdown(paste, context, pkmnDexGateway);

      expect(result.warnings).toHaveLength(0);
      expect(result.team[0]).toEqual({
        speciesSlug: 'garchomp',
        nickname: 'Chompy',
        gender: 'M',
        shiny: true,
        itemSlug: 'rockyhelmet',
        abilitySlug: 'roughskin',
        level: 50,
        teraType: 'Steel',
        natureId: 'Jolly',
        moveSlugs: ['earthquake', 'dragonclaw', 'swordsdance', 'firefang'],
      });
      expect(result.team[1]).toEqual({
        speciesSlug: 'rotomwash',
        itemSlug: 'leftovers',
        abilitySlug: 'levitate',
        natureId: 'Bold',
        moveSlugs: ['hydropump', 'voltswitch', 'willowisp', 'painsplit'],
      });
      expect(result.team[2]).toBeNull();
    });

    it('collects non-fatal warnings when a Showdown block references an unknown species or move', () => {
      const paste = `
Pikachu @ Light Ball
- Thunderbolt
- Nonexistent Move

FakeMon @ Leftovers
- Tackle
      `.trim();

      const context = createFreeModeContext(5);
      const result = importTeamFromShowdown(paste, context, pkmnDexGateway);
      expect(result.team[0]?.speciesSlug).toBe('pikachu');
      expect(result.team[0]?.moveSlugs).toEqual(['thunderbolt']);
      expect(result.team[1]).toBeNull();
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });
  });
});
