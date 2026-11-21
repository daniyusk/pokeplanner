import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  buildCampaignContext,
  cloneTeam,
  createEmptyTeam,
  findFirstEmptySlotIndex,
  findMemberSlotIndex,
  getScopeKey,
  mapTeamSlots,
  resolveGenderFormeTarget,
  resolveTeamEntries,
  sanitizeTeamForContext,
  swapTeamSlots,
  type TeamTuple,
  withTeamSlot,
} from '@/domain/team';
import { createFreeModeContext, type GameManifest, type Team } from '@/domain/types';

describe('Domain Team Helpers Seam', () => {
  it('maps team slots to a fixed 6-tuple without mutating input', () => {
    const team = withTeamSlot(createEmptyTeam(), 2, {
      speciesSlug: 'garchomp',
      moveSlugs: ['earthquake'],
    });
    const labels: TeamTuple<string> = mapTeamSlots(team, (slot, idx) =>
      slot ? `${idx}:${slot.speciesSlug}` : `${idx}:empty`,
    );

    expect(labels).toEqual(['0:empty', '1:empty', '2:garchomp', '3:empty', '4:empty', '5:empty']);
  });

  it('returns a new Team when updating or swapping slots immutably', () => {
    const initial = createEmptyTeam();
    const withPika = withTeamSlot(initial, 0, { speciesSlug: 'pikachu', moveSlugs: [] });
    const withGar = withTeamSlot(withPika, 4, { speciesSlug: 'garchomp', moveSlugs: [] });
    const swapped = swapTeamSlots(withGar, 0, 4);

    expect(initial[0]).toBeNull();
    expect(swapped[0]?.speciesSlug).toBe('garchomp');
    expect(swapped[4]?.speciesSlug).toBe('pikachu');
    expect(withGar[0]?.speciesSlug).toBe('pikachu');
    expect(swapTeamSlots(swapped, 2, 2)).toBe(swapped);
  });

  it('clones teams deeply and locates member and empty slot indices', () => {
    const original: Team = [
      { speciesSlug: 'pikachu', moveSlugs: ['thunderbolt'] },
      null,
      { speciesSlug: 'garchomp', moveSlugs: ['earthquake'] },
      null,
      null,
      null,
    ];
    const cloned = cloneTeam(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[0]?.moveSlugs).not.toBe(original[0]?.moveSlugs);

    expect(findMemberSlotIndex(original, 'garchomp')).toBe(2);
    expect(findMemberSlotIndex(original, 'charizard')).toBe(-1);
    expect(findFirstEmptySlotIndex(original)).toBe(1);

    const resolved = resolveTeamEntries(original, 5, pkmnDexGateway);
    expect(resolved.map((entry) => [entry.slotIndex, entry.species.slug])).toEqual([
      [0, 'pikachu'],
      [2, 'garchomp'],
    ]);
  });

  it('derives campaign contexts and scope keys consistently', () => {
    const freeCtx = createFreeModeContext(9);
    expect(getScopeKey(freeCtx)).toBe('free');

    const manifest: GameManifest = {
      id: 'platinum',
      name: 'Pokémon Platinum',
      shortName: 'Platinum',
      generation: 4,
      region: 'Sinnoh',
      versionGroup: 'platinum',
      versions: [{ id: 'platinum', name: 'Platinum' }],
      mechanics: {
        hasAbilities: true,
        hasHeldItems: true,
        hasNatures: true,
        physicalSpecialSplit: true,
        gimmick: null,
      },
      checkpoints: [],
      dex: {},
    };
    const campaignCtx = buildCampaignContext(manifest);
    expect(campaignCtx).toEqual({
      mode: 'campaign',
      gameId: 'platinum',
      versionId: 'platinum',
      generation: 4,
      mechanics: manifest.mechanics,
    });
    expect(getScopeKey(campaignCtx)).toBe('campaign:platinum');
  });

  it('sanitizes team slots when switching from Gen 9 to Gen 1 mechanics', () => {
    const gen1 = createFreeModeContext(1);
    const team: Team = [
      {
        speciesSlug: 'pikachu',
        abilitySlug: 'static',
        itemSlug: 'lightball',
        natureId: 'Timid',
        moveSlugs: ['thunderbolt', 'dracometeor'],
        teraType: 'Electric',
        gender: 'F',
        shiny: true,
      },
      { speciesSlug: 'garchomp', moveSlugs: ['earthquake'] },
      null,
      null,
      null,
      null,
    ];

    const sanitized = sanitizeTeamForContext(team, gen1, pkmnDexGateway);
    expect(sanitized[0]).toEqual({
      speciesSlug: 'pikachu',
      moveSlugs: ['thunderbolt'],
      gender: 'N',
      shiny: true,
    });
    expect(sanitized[1]).toBeNull();
  });

  it('resolves dimorphic gender forme targets such as Meowstic <-> Meowstic-F', () => {
    const meowstic = pkmnDexGateway.getSpecies('meowstic', 9);
    const pikachu = pkmnDexGateway.getSpecies('pikachu', 9);
    expect(meowstic).toBeDefined();
    expect(pikachu).toBeDefined();
    if (meowstic) {
      const female = resolveGenderFormeTarget(meowstic, 9, pkmnDexGateway);
      expect(female?.slug).toBe('meowsticf');
    }
    if (pikachu) {
      expect(resolveGenderFormeTarget(pikachu, 9, pkmnDexGateway)).toBeUndefined();
    }
  });
});
