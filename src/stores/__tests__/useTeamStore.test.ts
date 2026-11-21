import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTeamStore } from '@/stores/useTeamStore';

vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
});

describe('useTeamStore Seam', () => {
  beforeEach(() => {
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().setGeneration(9);
  });

  it('adds, configures, swaps, and removes Pokémon slots cleanly', () => {
    const store = useTeamStore.getState();
    store.setSlotSpecies(0, 'garchomp');
    store.setSlotSpecies(1, 'rotomwash');

    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('garchomp');
    expect(useTeamStore.getState().team[0]?.abilitySlug).toBe('sandveil');

    store.updateSlotMember(0, {
      abilitySlug: 'roughskin',
      itemSlug: 'rockyhelmet',
      moveSlugs: ['earthquake', 'dragonclaw'],
    });

    expect(useTeamStore.getState().team[0]?.abilitySlug).toBe('roughskin');
    expect(useTeamStore.getState().team[0]?.moveSlugs).toEqual(['earthquake', 'dragonclaw']);

    store.swapSlots(0, 1);
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('rotomwash');
    expect(useTeamStore.getState().team[1]?.speciesSlug).toBe('garchomp');

    store.clearSlot(0);
    expect(useTeamStore.getState().team[0]).toBeNull();
  });

  it('sanitizes unsupported mechanics and species when switching down to older generations', () => {
    const store = useTeamStore.getState();
    store.setSlotSpecies(0, 'greninja');
    store.setSlotSpecies(1, 'pikachu');
    store.updateSlotMember(1, {
      abilitySlug: 'lightningrod',
      itemSlug: 'lightball',
      natureId: 'Timid',
      teraType: 'Water',
      moveSlugs: ['thunderbolt', 'voltswitch'],
    });

    // Switch to Gen 2: Greninja didn't exist, Abilities/Natures/Tera didn't exist, Volt Switch didn't exist
    store.setGeneration(2);

    const gen2Team = useTeamStore.getState().team;
    expect(gen2Team[0]).toBeNull();
    expect(gen2Team[1]).toEqual({
      speciesSlug: 'pikachu',
      itemSlug: 'lightball',
      moveSlugs: ['thunderbolt'],
    });
  });

  it('saves, lists, loads, and deletes teams in IndexedDB storage', async () => {
    const store = useTeamStore.getState();
    store.setGeneration(5);
    store.setSlotSpecies(0, 'serperior');
    const saved = await store.saveCurrentTeam('Unova Run');

    await store.loadSavedTeams();
    expect(useTeamStore.getState().savedTeams.some((t) => t.id === saved.id)).toBe(true);

    store.resetTeam();
    expect(useTeamStore.getState().team[0]).toBeNull();

    store.loadSavedTeam(saved.id);
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('serperior');
    expect(useTeamStore.getState().context.generation).toBe(5);

    await store.deleteSavedTeam(saved.id);
    expect(useTeamStore.getState().savedTeams.some((t) => t.id === saved.id)).toBe(false);
  });

  it('toggles gender (including dimorphic formes and genderless guards) and shiny flags', () => {
    const store = useTeamStore.getState();
    store.selectFreeMode();
    const ctx = useTeamStore.getState().context;
    expect(ctx.mode).toBe('free');
    if (ctx.mode === 'free') {
      expect(ctx.unrestricted).toBe(true);
    }

    store.addSpeciesToTeam('pikachu');
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('pikachu');

    store.addSpeciesToTeam('magnemite');
    store.addSpeciesToTeam('meowstic');
    expect(useTeamStore.getState().team[1]?.speciesSlug).toBe('magnemite');
    expect(useTeamStore.getState().team[2]?.speciesSlug).toBe('meowstic');

    // Toggle shiny
    store.toggleSlotShiny(0);
    expect(useTeamStore.getState().team[0]?.shiny).toBe(true);
    store.toggleSlotShiny(0);
    expect(useTeamStore.getState().team[0]?.shiny).toBeUndefined();

    // Toggle gender on Pikachu (M <-> F)
    store.toggleSlotGender(0);
    expect(useTeamStore.getState().team[0]?.gender).toBe('F');
    store.toggleSlotGender(0);
    expect(useTeamStore.getState().team[0]?.gender).toBe('M');

    // Genderless Magnemite stays unchanged
    store.toggleSlotGender(1);
    expect(useTeamStore.getState().team[1]?.gender).toBe('N');

    // Dimorphic Meowstic swaps between Male and Female formes
    store.toggleSlotGender(2);
    expect(useTeamStore.getState().team[2]?.speciesSlug).toBe('meowsticf');
    expect(useTeamStore.getState().team[2]?.gender).toBe('F');
    store.toggleSlotGender(2);
    expect(useTeamStore.getState().team[2]?.speciesSlug).toBe('meowstic');
    expect(useTeamStore.getState().team[2]?.gender).toBe('M');

    // Clearing slot 0 removes Pikachu cleanly
    store.clearSlot(0);
    expect(useTeamStore.getState().team[0]).toBeNull();
  });

  it('allows adding duplicate Pokémon via addSpeciesToTeam and isolates teams per game', () => {
    const store = useTeamStore.getState();
    store.selectFreeMode();
    store.addSpeciesToTeam('pikachu');
    store.addSpeciesToTeam('pikachu');
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('pikachu');
    expect(useTeamStore.getState().team[1]?.speciesSlug).toBe('pikachu');

    const fireRedManifest = {
      id: 'firered-leafgreen',
      name: 'Pokémon FireRed & LeafGreen',
      shortName: 'FRLG',
      generation: 3 as const,
      region: 'Kanto',
      versionGroup: 'firered-leafgreen',
      versions: [{ id: 'firered', name: 'FireRed' }],
      mechanics: {
        hasAbilities: true,
        hasHeldItems: true,
        hasNatures: true,
        physicalSpecialSplit: false,
        gimmick: null,
      },
      checkpoints: [],
      dex: {},
    };

    const blackWhiteManifest = {
      ...fireRedManifest,
      id: 'black-white',
      name: 'Pokémon Black & White',
      shortName: 'BW',
      generation: 5 as const,
      region: 'Unova',
      versionGroup: 'black-white',
      versions: [{ id: 'black', name: 'Black' }],
      mechanics: {
        hasAbilities: true,
        hasHeldItems: true,
        hasNatures: true,
        physicalSpecialSplit: true,
        gimmick: null,
      },
    };

    store.selectCampaignGame(fireRedManifest);
    expect(useTeamStore.getState().team.every((s) => s === null)).toBe(true);
    store.addSpeciesToTeam('charizard');
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('charizard');

    // Switching to Black & White should start with an empty team, not FireRed's Charizard
    store.selectCampaignGame(blackWhiteManifest);
    expect(useTeamStore.getState().team.every((s) => s === null)).toBe(true);
    store.addSpeciesToTeam('serperior');

    // Returning to FireRed restores FireRed's Charizard
    store.selectCampaignGame(fireRedManifest);
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('charizard');
  });
});
