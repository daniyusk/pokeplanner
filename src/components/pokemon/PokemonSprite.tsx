import { useState } from 'react';

interface PokemonSpriteProps {
  spriteId: string;
  dexNumber: number;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-10 w-10',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
} as const;

function SpriteLoader({
  spriteId,
  dexNumber,
  name,
  sizeClass,
  className,
}: {
  spriteId: string;
  dexNumber: number;
  name: string;
  sizeClass: string;
  className: string;
}) {
  const [stage, setStage] = useState<'showdown' | 'pokeapi' | 'fallback'>('showdown');

  if (stage === 'fallback') {
    return (
      <div
        role="img"
        aria-label={name}
        className={`flex items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--ink-muted)] ${sizeClass} ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3/5 w-3/5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h6m6 0h6" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      </div>
    );
  }

  const src =
    stage === 'showdown'
      ? `https://play.pokemonshowdown.com/sprites/dex/${spriteId}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexNumber}.png`;

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => {
        setStage((prev) => (prev === 'showdown' ? 'pokeapi' : 'fallback'));
      }}
      className={`object-contain select-none ${sizeClass} ${className}`}
    />
  );
}

/**
 * Renders a Pokémon sprite with multi-stage fallback (Showdown Dex PNG -> PokéAPI Artwork -> Inline Pokéball SVG)
 * to support alternate forms and offline fallback without layout shift.
 */
export function PokemonSprite({
  spriteId,
  dexNumber,
  name,
  size = 'md',
  className = '',
}: PokemonSpriteProps) {
  return (
    <SpriteLoader
      key={`${spriteId}-${dexNumber}`}
      spriteId={spriteId}
      dexNumber={dexNumber}
      name={name}
      sizeClass={SIZE_CLASSES[size]}
      className={className}
    />
  );
}
