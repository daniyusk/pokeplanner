import type { PokemonType } from '@/domain/types';

export const TYPE_COLOR_VARS: Record<PokemonType, string> = {
  Normal: 'var(--type-normal)',
  Fire: 'var(--type-fire)',
  Water: 'var(--type-water)',
  Electric: 'var(--type-electric)',
  Grass: 'var(--type-grass)',
  Ice: 'var(--type-ice)',
  Fighting: 'var(--type-fighting)',
  Poison: 'var(--type-poison)',
  Ground: 'var(--type-ground)',
  Flying: 'var(--type-flying)',
  Psychic: 'var(--type-psychic)',
  Bug: 'var(--type-bug)',
  Rock: 'var(--type-rock)',
  Ghost: 'var(--type-ghost)',
  Dragon: 'var(--type-dragon)',
  Dark: 'var(--type-dark)',
  Steel: 'var(--type-steel)',
  Fairy: 'var(--type-fairy)',
};

const TYPE_ICON_PATHS: Record<PokemonType, string> = {
  Normal: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z',
  Fire: 'M12.8 3c.4 2.5-1.2 4.1-2.5 5.4-1.5 1.5-2.8 2.9-2.8 5.2A4.5 4.5 0 0 0 12 18a4.5 4.5 0 0 0 4.5-4.5c0-2.8-1.8-5.1-3.7-6.8-.2 1.3-.9 2.3-1.8 2.8.8-1.7 1.9-3.5 1.8-6.5Z',
  Water:
    'M12 3.2S6.5 9.8 6.5 13.8a5.5 5.5 0 1 0 11 0C17.5 9.8 12 3.2 12 3.2Zm-2.2 11a2.6 2.6 0 0 0 2.5 2.4',
  Electric: 'M13.4 2.5 6 13h5.2l-1 8.5L18 11h-5.2l.6-8.5Z',
  Grass:
    'M18.5 4.5C11 4.5 5.5 9.2 5.5 15.8c0 1.4.4 2.6 1 3.7 1.1.6 2.3 1 3.7 1 6.6 0 11.3-5.5 11.3-13 0-1-.1-2-.3-3h-2.7ZM8.5 17.5c1.8-2.6 4.4-5 8.2-6.8',
  Ice: 'M12 2.5v19M4.2 7l15.6 10M19.8 7 4.2 17M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5',
  Fighting:
    'M7 10.5V7.5a2 2 0 0 1 4 0v2h2V6.5a2 2 0 0 1 4 0v5.5a5 5 0 0 1-5 5H9.5A3.5 3.5 0 0 1 6 13.5v-3a1.5 1.5 0 0 1 1 0Z',
  Poison:
    'M12 4a6.5 6.5 0 0 0-6.5 6.5c0 2.4 1.3 4.5 3.2 5.6V19h6.6v-2.9a6.5 6.5 0 0 0-3.3-12.1Zm-2.3 7.2a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm4.6 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z',
  Ground: 'M3.5 17.5 9 8.5l4.2 6.2 2.6-3.7 4.7 6.5H3.5Z',
  Flying:
    'M4 15.5c4.5 0 8.5-2.8 11.5-8.5 2.2 1 3.8 2.8 4.5 5-3.4.3-6 2-7.5 4.5 1.8.4 3.5.3 5-.2-2 2.5-5.3 3.7-9 3.7-1.9 0-3.4-.4-4.5-1.2v-3.3Z',
  Psychic:
    'M2.8 12s3.5-5.5 9.2-5.5S21.2 12 21.2 12s-3.5 5.5-9.2 5.5S2.8 12 2.8 12Zm9.2-2.6a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z',
  Bug: 'M8.5 7.5 6.5 4.5M15.5 7.5l2-3M7 12h10M12 8.5v10.5M8 9.5a4 4 0 0 1 8 0v4.5a4 4 0 0 1-8 0V9.5Z',
  Rock: 'M12 3.2 19.2 7.5v9L12 20.8 4.8 16.5v-9L12 3.2Z',
  Ghost:
    'M6 19.5v-8a6 6 0 1 1 12 0v8l-2-1.8-2 1.8-2-1.8-2 1.8-2-1.8-2 1.8Zm4-8a1 1 0 1 0 0 .1V11.5Zm4 0a1 1 0 1 0 0 .1V11.5Z',
  Dragon:
    'M6 17.5C6 11 10.2 5.5 16.5 4.5c-1.8 2.6-2 5.3-.5 7.5 2 0 3.2 1.5 3 3.5-.3 2.5-2.6 4.5-6.5 4.5-2.8 0-5-.8-6.5-2.5Z',
  Dark: 'M14.8 4.2a8 8 0 1 0 5 13.7 6.8 6.8 0 0 1-5-13.7Z',
  Steel: 'M12 4.5 18.5 8v8L12 19.5 5.5 16V8L12 4.5Zm0 4.3a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z',
  Fairy: 'm12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z',
};

interface TypeIconProps {
  type: PokemonType;
  className?: string;
}

export function TypeIcon({ type, className = 'h-3.5 w-3.5' }: TypeIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={TYPE_ICON_PATHS[type]} />
    </svg>
  );
}
