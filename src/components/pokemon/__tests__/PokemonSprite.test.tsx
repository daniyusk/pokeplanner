import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PokemonSprite } from '../PokemonSprite';

describe('PokemonSprite sizing contract', () => {
  afterEach(() => {
    cleanup();
  });

  it('preserves standard size dimensions when utility className values are passed', () => {
    render(
      <PokemonSprite
        spriteId="pikachu"
        dexNumber={25}
        name="Pikachu"
        size="sm"
        className="opacity-55 shrink-0"
      />,
    );

    const img = screen.getByRole('img', { name: 'Pikachu' });
    expect(img).toHaveClass('h-10', 'w-10', 'opacity-55', 'shrink-0');
  });

  it('allows explicit custom sizing via size="custom"', () => {
    render(
      <PokemonSprite
        spriteId="pikachu"
        dexNumber={25}
        name="Pikachu"
        size="custom"
        className="h-12 w-12"
      />,
    );

    const img = screen.getByRole('img', { name: 'Pikachu' });
    expect(img).toHaveClass('h-12', 'w-12');
    expect(img).not.toHaveClass('h-10', 'h-20', 'h-24');
  });
});
