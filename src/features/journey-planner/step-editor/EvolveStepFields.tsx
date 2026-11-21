import { TeamMemberChipSelector } from '@/components/pokemon/TeamMemberChipSelector';
import { LEVEL_BOUNDS } from '@/domain/constants';
import type { SpeciesData } from '@/domain/types';

interface EvolveStepFieldsProps {
  evolvableTeamSpecies: readonly SpeciesData[];
  evoFromSlug: string;
  onSelectEvoFrom: (slug: string) => void;
  evoTargetOptions: readonly SpeciesData[];
  evoToSlug: string;
  onSelectEvoTo: (slug: string) => void;
  levelInput: string;
  onChangeLevelInput: (value: string) => void;
}

export function EvolveStepFields({
  evolvableTeamSpecies,
  evoFromSlug,
  onSelectEvoFrom,
  evoTargetOptions,
  evoToSlug,
  onSelectEvoTo,
  levelInput,
  onChangeLevelInput,
}: EvolveStepFieldsProps) {
  return (
    <div className="space-y-3">
      <TeamMemberChipSelector
        label="From"
        options={evolvableTeamSpecies}
        selectedSlug={evoFromSlug}
        onSelect={onSelectEvoFrom}
      />

      {evoTargetOptions.length > 0 && (
        <TeamMemberChipSelector
          label="Into"
          options={evoTargetOptions}
          selectedSlug={evoToSlug}
          onSelect={onSelectEvoTo}
          tone="contrast"
        />
      )}

      <div>
        <label
          htmlFor="evo-level"
          className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]"
        >
          Evolution Level (optional)
        </label>
        <input
          id="evo-level"
          type="number"
          min={LEVEL_BOUNDS.min}
          max={LEVEL_BOUNDS.max}
          value={levelInput}
          onChange={(e) => onChangeLevelInput(e.target.value)}
          placeholder="Optional"
          className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--ink-primary)] tabular-nums"
        />
      </div>
    </div>
  );
}
