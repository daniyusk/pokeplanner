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
});
