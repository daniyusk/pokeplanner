import { useMemo, useState } from 'react';
import { buildPokemonSpriteUrls } from '@/data/config/spriteCdn';
import type { PokemonGender } from '@/domain/types';

interface PokemonSpriteProps {
  spriteId: string;
  dexNumber: number;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'custom';
  shiny?: boolean;
  gender?: PokemonGender | undefined;
  variant?: 'home' | 'dex';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
  custom: '',
} as const;

function SpriteLoader({
  spriteId,
  dexNumber,
  name,
  sizeClass,
  shiny,
  gender,
  variant,
  className,
}: {
  spriteId: string;
  dexNumber: number;
  name: string;
  sizeClass: string;
  shiny: boolean;
  gender: PokemonGender | undefined;
  variant: 'home' | 'dex';
  className: string;
}) {
  const urls = useMemo(
    () => buildPokemonSpriteUrls(spriteId, dexNumber, shiny, gender, variant),
    [spriteId, dexNumber, shiny, gender, variant],
  );
  const [attemptIndex, setAttemptIndex] = useState(0);

  const currentUrl = urls[attemptIndex];
  if (!currentUrl) {
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

  return (
    <img
      src={currentUrl}
      alt={name}
      decoding="async"
      draggable={false}
      onError={() => setAttemptIndex((prev) => prev + 1)}
      className={`object-contain select-none ${sizeClass} ${className}`}
    />
  );
}

/**
 * Renders a Pokémon sprite with multi-stage fallback (Showdown Home/Dex PNG -> PokéAPI Artwork -> Inline Pokéball SVG)
 * to support normal, shiny, and female appearances, alternate forms, and offline fallback without layout shift.
 */
export function PokemonSprite({
  spriteId,
  dexNumber,
  name,
  size = 'md',
  shiny = false,
  gender,
  variant = 'home',
  className = '',
}: PokemonSpriteProps) {
  return (
    <SpriteLoader
      key={`${spriteId}-${dexNumber}-${shiny ? 'shiny' : 'normal'}-${gender ?? 'N'}-${variant}`}
      spriteId={spriteId}
      dexNumber={dexNumber}
      name={name}
      sizeClass={SIZE_CLASSES[size]}
      shiny={shiny}
      gender={gender}
      variant={variant}
      className={className}
    />
  );
}
