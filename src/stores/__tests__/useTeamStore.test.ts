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
});
