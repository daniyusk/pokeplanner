import { afterEach, describe, expect, it, vi } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  analyzeTeam,
  analyzeTeamDefense,
  analyzeTeamOffense,
  analyzeTeamStats,
} from '@/domain/analysis';
import { createEmptyTeam } from '@/domain/team';
import { createFreeModeContext, type Team } from '@/domain/types';

describe('Domain Analysis Seam', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeTeamDefense', () => {
    it('flags shared unresisted weaknesses as critical and updates when an immunity is added', () => {
      const gen5 = createFreeModeContext(5);
      const groundWeakTeam: Team = [
        { speciesSlug: 'heatran', abilitySlug: 'flashfire', moveSlugs: [] },
        { speciesSlug: 'magnezone', abilitySlug: 'magnetpull', moveSlugs: [] },
        { speciesSlug: 'tyranitar', abilitySlug: 'sandstream', moveSlugs: [] },
        null,
        null,
        null,
      ];

      const before = analyzeTeamDefense(groundWeakTeam, gen5, pkmnDexGateway);
      const groundRowBefore = before.rows.find((r) => r.attackType === 'Ground');

      expect(before.rows).toHaveLength(17);
      expect(groundRowBefore?.weakCount).toBe(3);
      expect(groundRowBefore?.quadWeakCount).toBe(2);
      expect(groundRowBefore?.immuneCount).toBe(0);
      expect(groundRowBefore?.severity).toBe('critical');
      expect(before.criticalWeaknesses).toContain('Ground');

      // Equip Air Balloon on Heatran and add Rotom-Wash with Levitate
      const patchedTeam: Team = [
        {
          speciesSlug: 'heatran',
          abilitySlug: 'flashfire',
          itemSlug: 'airballoon',
          moveSlugs: [],
        },
        groundWeakTeam[1],
        groundWeakTeam[2],
        { speciesSlug: 'rotomwash', abilitySlug: 'levitate', moveSlugs: [] },
        null,
        null,
      ];

      const after = analyzeTeamDefense(patchedTeam, gen5, pkmnDexGateway);
      const groundRowAfter = after.rows.find((r) => r.attackType === 'Ground');

      expect(groundRowAfter?.weakCount).toBe(2);
      expect(groundRowAfter?.immuneCount).toBe(2);
      expect(groundRowAfter?.severity).not.toBe('critical');
    });

    it('uses Generation 1 type rules when analyzing a Gen 1 team', () => {
      const gen1 = createFreeModeContext(1);
      const team: Team = [
        { speciesSlug: 'alakazam', moveSlugs: [] },
        { speciesSlug: 'starmie', moveSlugs: [] },
        null,
        null,
        null,
        null,
      ];

      const defense = analyzeTeamDefense(team, gen1, pkmnDexGateway);
      expect(defense.rows).toHaveLength(15);
      const ghostRow = defense.rows.find((r) => r.attackType === 'Ghost');
      expect(ghostRow?.immuneCount).toBe(2);
    });

    it('counts fractional 1.25x (Dry Skin) and 1.5x (Filter/Solid Rock) weaknesses as weak', () => {
      const gen5 = createFreeModeContext(5);
      const team: Team = [
        { speciesSlug: 'toxicroak', abilitySlug: 'dryskin', moveSlugs: [] },
        { speciesSlug: 'rhyperior', abilitySlug: 'solidrock', moveSlugs: [] },
        null,
        null,
        null,
        null,
      ];

      const profile = analyzeTeamDefense(team, gen5, pkmnDexGateway);
      const fireRow = profile.rows.find((r) => r.attackType === 'Fire');
      const iceRow = profile.rows.find((r) => r.attackType === 'Ice');

      // Dry Skin makes Toxicroak 1.25x weak to Fire while Rhyperior resists Fire 0.5x
      expect(fireRow?.slots[0]?.multiplier).toBe(1.25);
      expect(fireRow?.weakCount).toBe(1);
      // Solid Rock makes Rhyperior 1.5x weak to Ice
      expect(iceRow?.slots[1]?.multiplier).toBe(1.5);
      expect(iceRow?.weakCount).toBe(1);
    });
  });

  describe('analyzeTeamOffense', () => {
    it('distinguishes STAB coverage from actual moveset coverage', () => {
      const gen5 = createFreeModeContext(5);
      const team: Team = [
        { speciesSlug: 'charizard', moveSlugs: ['flamethrower', 'airslash'] },
        { speciesSlug: 'venusaur', moveSlugs: ['gigadrain', 'sludgebomb'] },
        { speciesSlug: 'blastoise', moveSlugs: ['surf', 'icebeam'] },
        null,
        null,
        null,
      ];

      const offense = analyzeTeamOffense(team, gen5, pkmnDexGateway);

      // Neither Fire, Flying, Grass, Poison, nor Water STAB hits Dragon 2x
      expect(offense.stabBlindSpots).toContain('Dragon');
      // Ice Beam on Blastoise covers Dragon in Moveset mode
      expect(offense.movesetBlindSpots).not.toContain('Dragon');
      // Still no super-effective hit against Electric
      expect(offense.movesetBlindSpots).toContain('Electric');
    });

    it('resolves each configured move only once instead of repeating dex.getMove per target type', () => {
      const getMoveSpy = vi.spyOn(pkmnDexGateway, 'getMove');
      const team: Team = [
        { speciesSlug: 'pikachu', moveSlugs: ['thunderbolt', 'surf'] },
        null,
        null,
        null,
        null,
        null,
      ];

      const offense = analyzeTeamOffense(team, createFreeModeContext(9), pkmnDexGateway);
      expect(offense.hasDamagingMoves).toBe(true);
      expect(getMoveSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('analyzeTeamStats', () => {
    it('tracks Physical vs Special move split accurately across Gen 3 and Gen 4+', () => {
      const team: Team = [
        {
          speciesSlug: 'snorlax',
          moveSlugs: ['bodyslam', 'shadowball', 'earthquake', 'rockslide'],
        },
        null,
        null,
        null,
        null,
        null,
      ];

      const gen3Stats = analyzeTeamStats(team, createFreeModeContext(3), pkmnDexGateway);
      expect(gen3Stats.moveSplit.physical).toBe(4);
      expect(gen3Stats.moveSplit.special).toBe(0);

      const gen4Stats = analyzeTeamStats(team, createFreeModeContext(4), pkmnDexGateway);
      expect(gen4Stats.moveSplit.physical).toBe(3);
      expect(gen4Stats.moveSplit.special).toBe(1);
    });
  });

  describe('analyzeTeam', () => {
    it('returns an empty report with no insights when all 6 slots are empty', () => {
      const report = analyzeTeam(createEmptyTeam(), createFreeModeContext(9), pkmnDexGateway);
      expect(report.memberCount).toBe(0);
      expect(report.insights).toHaveLength(0);
    });

    it('emits actionable offense skew and speed insights for slow all-physical teams', () => {
      const gen5 = createFreeModeContext(5);
      const slowPhysicalTeam: Team = [
        { speciesSlug: 'conkeldurr', moveSlugs: ['drainpunch', 'machpunch'] },
        { speciesSlug: 'gigalith', moveSlugs: ['stoneedge', 'earthquake'] },
        { speciesSlug: 'escavalier', moveSlugs: ['megahorn', 'ironhead'] },
        { speciesSlug: 'golurk', moveSlugs: ['earthquake', 'shadowpunch'] },
        null,
        null,
      ];

      const report = analyzeTeam(slowPhysicalTeam, gen5, pkmnDexGateway);
      expect(report.memberCount).toBe(4);
      expect(
        report.insights.some((i) => i.category === 'stats' && i.title.includes('Physical')),
      ).toBe(true);
      expect(report.insights.some((i) => i.category === 'stats' && i.title.includes('Speed'))).toBe(
        true,
      );
    });
  });
});
