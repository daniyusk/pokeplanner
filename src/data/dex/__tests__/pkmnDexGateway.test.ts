import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';

describe('pkmnDexGateway Seam', () => {
  it('scopes species availability to the selected generation', () => {
    const gen5Species = pkmnDexGateway.listSpecies(5);
    const gen9Species = pkmnDexGateway.listSpecies(9);

    expect(gen5Species.some((s) => s.slug === 'volcarona')).toBe(true);
    expect(gen5Species.some((s) => s.slug === 'greninja')).toBe(false);
    expect(gen9Species.some((s) => s.slug === 'greninja')).toBe(true);
  });

  it('provides generation-scoped moves, abilities, items, and natures', () => {
    const eq = pkmnDexGateway.getMove('earthquake', 5);
    expect(eq?.basePower).toBe(100);
    expect(eq?.type).toBe('Ground');

    const levitate = pkmnDexGateway.getAbility('levitate', 5);
    expect(levitate?.name).toBe('Levitate');

    const leftovers = pkmnDexGateway.getItem('leftovers', 5);
    expect(leftovers?.name).toBe('Leftovers');

    const adamantGen5 = pkmnDexGateway.getNature('Adamant', 5);
    expect(adamantGen5?.plus).toBe('atk');
    expect(adamantGen5?.minus).toBe('spa');

    const adamantGen2 = pkmnDexGateway.getNature('Adamant', 2);
    expect(adamantGen2).toBeUndefined();
  });

  it('lists moves sorted alphabetically for picker consumption', () => {
    const gen5Moves = pkmnDexGateway.listMoves(5);
    expect(gen5Moves.length).toBeGreaterThan(400);
    expect(gen5Moves.some((m) => m.slug === 'scald')).toBe(true);
    expect(gen5Moves.some((m) => m.slug === 'moonblast')).toBe(false);
  });

  it('lists items, natures, alternate forms, and learnable moves accurately', async () => {
    expect(pkmnDexGateway.listItems(1)).toHaveLength(0);
    expect(pkmnDexGateway.listItems(5).some((i) => i.slug === 'leftovers')).toBe(true);

    expect(pkmnDexGateway.listNatures(2)).toHaveLength(0);
    expect(pkmnDexGateway.listNatures(5)).toHaveLength(25);

    const rotom = pkmnDexGateway.getSpecies('rotom', 5);
    expect(rotom?.otherFormeSlugs).toContain('rotomwash');

    const garchompMoves = await pkmnDexGateway.getLearnableMoveSlugs('garchomp', 5);
    expect(garchompMoves).toContain('earthquake');
    expect(garchompMoves).toContain('dragonclaw');
  });

  it('provides unrestricted National Dex species, moves, and items in Gen 9 Free Mode', async () => {
    const gen9Species = pkmnDexGateway.listSpecies(9);
    expect(gen9Species.some((s) => s.slug === 'nidoking')).toBe(true);
    expect(gen9Species.some((s) => s.slug === 'starmie')).toBe(true);
    expect(gen9Species.some((s) => s.slug === 'togekiss')).toBe(true);
    expect(gen9Species.some((s) => s.slug === 'charizardmegax')).toBe(true);

    const nidokingMoves = await pkmnDexGateway.getLearnableMoveSlugs('nidoking', 9);
    expect(nidokingMoves).toContain('earthpower');
    expect(nidokingMoves).toContain('sludgewave');
  });

  it('derives availableGenders, generationIntroduced, and evolution metadata accurately', () => {
    expect(pkmnDexGateway.getSpecies('pikachu', 9)?.availableGenders).toEqual(['M', 'F']);
    expect(pkmnDexGateway.getSpecies('nidoking', 9)?.availableGenders).toEqual(['M']);
    expect(pkmnDexGateway.getSpecies('blissey', 9)?.availableGenders).toEqual(['F']);
    expect(pkmnDexGateway.getSpecies('magnemite', 9)?.availableGenders).toEqual(['N']);
    expect(pkmnDexGateway.getSpecies('pikachu', 1)?.availableGenders).toEqual(['N']);

    expect(pkmnDexGateway.getSpecies('charizard', 9)?.generationIntroduced).toBe(1);
    expect(pkmnDexGateway.getSpecies('charizard', 9)?.evoLevel).toBe(36);
    expect(pkmnDexGateway.getSpecies('raichualola', 9)?.generationIntroduced).toBe(7);
  });

  it('excludes Gigantamax and Eternamax boss forms from listSpecies in Gen 8 and Gen 9', () => {
    const gen8Slugs = new Set(pkmnDexGateway.listSpecies(8).map((s) => s.slug));
    const gen9Slugs = new Set(pkmnDexGateway.listSpecies(9).map((s) => s.slug));

    expect(gen8Slugs.has('charizardgmax')).toBe(false);
    expect(gen8Slugs.has('toxtricitylowkeygmax')).toBe(false);
    expect(gen9Slugs.has('charizardgmax')).toBe(false);
    expect(gen9Slugs.has('eternatuseternamax')).toBe(false);
    expect(gen9Slugs.has('urshifurapidstrikegmax')).toBe(false);
  });

  it('caches repeated point lookups and learnable move lists per generation', async () => {
    expect(pkmnDexGateway.getSpecies('garchomp', 5)).toBe(pkmnDexGateway.getSpecies('Garchomp', 5));
    expect(pkmnDexGateway.getMove('earthquake', 5)).toBe(pkmnDexGateway.getMove('Earthquake', 5));
    expect(pkmnDexGateway.getAbility('levitate', 5)).toBe(pkmnDexGateway.getAbility('Levitate', 5));
    expect(pkmnDexGateway.getItem('leftovers', 5)).toBe(pkmnDexGateway.getItem('Leftovers', 5));
    expect(pkmnDexGateway.getNature('Adamant', 5)).toBe(pkmnDexGateway.getNature('adamant', 5));

    const firstLearnset = await pkmnDexGateway.getLearnableMoveSlugs('garchomp', 5);
    const secondLearnset = await pkmnDexGateway.getLearnableMoveSlugs('garchomp', 5);
    expect(secondLearnset).toBe(firstLearnset);
  });
});
