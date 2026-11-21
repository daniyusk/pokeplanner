import { Search } from 'lucide-react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TeamMemberChipSelector } from '@/components/pokemon/TeamMemberChipSelector';
import { LEVEL_BOUNDS } from '@/domain/constants';
import type { SpeciesData } from '@/domain/types';

interface CaptureReplaceFieldsProps {
  isReplace: boolean;
  activeTeamSpecies: readonly SpeciesData[];
  outSlug: string;
  onChangeOutSlug: (slug: string) => void;
  speciesQuery: string;
  onChangeSpeciesQuery: (query: string) => void;
  showAllGameSpecies: boolean;
  onChangeShowAllGameSpecies: (show: boolean) => void;
  candidateSpecies: readonly SpeciesData[];
  selectedSlug: string;
  onSelectSpecies: (slug: string) => void;
  levelInput: string;
  onChangeLevelInput: (value: string) => void;
  locationInput: string;
  onChangeLocationInput: (value: string) => void;
}

export function CaptureReplaceFields({
  isReplace,
  activeTeamSpecies,
  outSlug,
  onChangeOutSlug,
  speciesQuery,
  onChangeSpeciesQuery,
  showAllGameSpecies,
  onChangeShowAllGameSpecies,
  candidateSpecies,
  selectedSlug,
  onSelectSpecies,
  levelInput,
  onChangeLevelInput,
  locationInput,
  onChangeLocationInput,
}: CaptureReplaceFieldsProps) {
  return (
    <div className="space-y-3">
      {isReplace && (
        <TeamMemberChipSelector
          label="Replace"
          options={activeTeamSpecies}
          selectedSlug={outSlug}
          onSelect={onChangeOutSlug}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={speciesQuery}
            onChange={(e) => onChangeSpeciesQuery(e.target.value)}
            placeholder="Search Pokémon..."
            aria-label="Search Pokémon for step"
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] pr-3 pl-8 text-xs text-[var(--ink-primary)]"
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--ink-secondary)]">
          <input
            type="checkbox"
            checked={showAllGameSpecies}
            onChange={(e) => onChangeShowAllGameSpecies(e.target.checked)}
            className="rounded accent-[var(--accent-primary)]"
          />
          <span>All Game</span>
        </label>
      </div>

      <div className="grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto rounded-xl bg-[var(--surface-elevated)] p-2 sm:grid-cols-6">
        {candidateSpecies.map((sp) => (
          <button
            key={sp.slug}
            type="button"
            title={sp.name}
            aria-label={sp.name}
            onClick={() => onSelectSpecies(sp.slug)}
            className={`flex aspect-square items-center justify-center rounded-lg transition ${
              selectedSlug === sp.slug
                ? 'bg-[var(--surface-card)] ring-2 ring-[var(--accent-primary)]'
                : 'bg-[var(--surface-card)]/60 hover:bg-[var(--surface-card)]'
            }`}
          >
            <PokemonSprite
              spriteId={sp.spriteId}
              dexNumber={sp.dexNumber}
              name={sp.name}
              size="sm"
            />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor="step-level"
            className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]"
          >
            Level
          </label>
          <input
            id="step-level"
            type="number"
            min={LEVEL_BOUNDS.min}
            max={LEVEL_BOUNDS.max}
            value={levelInput}
            onChange={(e) => onChangeLevelInput(e.target.value)}
            placeholder="Optional"
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--ink-primary)] tabular-nums"
          />
        </div>
        <div>
          <label
            htmlFor="step-location"
            className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]"
          >
            Location
          </label>
          <input
            id="step-location"
            type="text"
            value={locationInput}
            onChange={(e) => onChangeLocationInput(e.target.value)}
            placeholder="Optional"
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--ink-primary)]"
          />
        </div>
      </div>
    </div>
  );
}
