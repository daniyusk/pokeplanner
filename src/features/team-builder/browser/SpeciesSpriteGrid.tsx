import type { RefObject } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import type { SpeciesData } from '@/domain/types';

interface SpeciesSpriteGridProps {
  visibleSpecies: readonly SpeciesData[];
  totalFilteredCount: number;
  selectedSlugs: ReadonlySet<string>;
  isTeamFull: boolean;
  onSelectSpecies: (slug: string) => void;
  onLoadMore: () => void;
  sentinelRef: RefObject<HTMLDivElement | null>;
}

export function SpeciesSpriteGrid({
  visibleSpecies,
  totalFilteredCount,
  selectedSlugs,
  isTeamFull,
  onSelectSpecies,
  onLoadMore,
  sentinelRef,
}: SpeciesSpriteGridProps) {
  if (visibleSpecies.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface-card)] py-10 text-center text-xs text-[var(--ink-muted)]">
        No Pokémon match the current filters.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
        {visibleSpecies.map((species) => {
          const isInTeam = selectedSlugs.has(species.slug);

          return (
            <button
              key={species.slug}
              type="button"
              aria-label={species.name}
              title={species.name}
              aria-pressed={isInTeam}
              disabled={isTeamFull}
              onClick={() => onSelectSpecies(species.slug)}
              className={`flex aspect-square items-center justify-center rounded-xl transition ${
                isInTeam
                  ? 'bg-[var(--surface-elevated)] ring-2 ring-[var(--accent-primary)]'
                  : isTeamFull
                    ? 'cursor-default bg-[var(--surface-card)] opacity-40'
                    : 'bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)]'
              }`}
            >
              <PokemonSprite
                spriteId={species.spriteId}
                dexNumber={species.dexNumber}
                name={species.name}
                size="custom"
                variant="dex"
                className="h-14 w-14"
              />
            </button>
          );
        })}
      </div>

      {totalFilteredCount > visibleSpecies.length && (
        <div ref={sentinelRef} className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-lg bg-[var(--surface-card)] px-4 py-2 text-xs font-medium text-[var(--ink-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
          >
            Show more ({totalFilteredCount - visibleSpecies.length})
          </button>
        </div>
      )}
    </>
  );
}
