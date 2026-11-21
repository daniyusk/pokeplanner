import type { PokemonType } from '@/domain/types';
import { TYPE_COLOR_VARS, TypeIcon } from './TypeIcon';

interface TypeBadgeProps {
  type: PokemonType;
  size?: 'sm' | 'md';
  compact?: boolean;
  className?: string;
}

/**
 * Colorblind-safe Pokémon type badge combining calibrated color with an SVG glyph and text label.
 */
export function TypeBadge({ type, size = 'md', compact = false, className = '' }: TypeBadgeProps) {
  const colorVar = TYPE_COLOR_VARS[type];
  const sizeClasses =
    size === 'sm' ? 'px-1.5 py-0.5 text-[11px] gap-1' : 'px-2 py-0.5 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold tracking-tight text-white select-none ${sizeClasses} ${className}`}
      style={{ backgroundColor: colorVar }}
    >
      <TypeIcon
        type={type}
        className={size === 'sm' ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'}
      />
      {!compact && <span>{type}</span>}
      {compact && <span className="sr-only">{type}</span>}
    </span>
  );
}
