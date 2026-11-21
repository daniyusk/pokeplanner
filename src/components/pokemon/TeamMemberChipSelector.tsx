import type { SpeciesData } from '@/domain/types';
import { PokemonSprite } from './PokemonSprite';

interface TeamMemberChipSelectorProps {
  options: readonly SpeciesData[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  toggleable?: boolean;
  tone?: 'accent' | 'contrast';
  label?: string;
}

export function TeamMemberChipSelector({
  options,
  selectedSlug,
  onSelect,
  toggleable = false,
  tone = 'accent',
  label,
}: TeamMemberChipSelectorProps) {
  const activeClasses =
    tone === 'contrast'
      ? 'bg-[var(--ink-primary)] text-[var(--surface-card)]'
      : 'bg-[var(--accent-primary)] text-[var(--accent-ink)]';

  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-medium text-[var(--ink-secondary)]">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((species) => {
          const isSelected = selectedSlug === species.slug;
          return (
            <button
              key={species.slug}
              type="button"
              onClick={() => onSelect(toggleable && isSelected ? '' : species.slug)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                isSelected
                  ? activeClasses
                  : 'bg-[var(--surface-elevated)] text-[var(--ink-primary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              <PokemonSprite
                spriteId={species.spriteId}
                dexNumber={species.dexNumber}
                name={species.name}
                size="custom"
                className="h-6 w-6"
              />
              <span>{species.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
