import { TeamMemberChipSelector } from '@/components/pokemon/TeamMemberChipSelector';
import { LEVEL_BOUNDS } from '@/domain/constants';
import type { SpeciesData } from '@/domain/types';

interface TrainStepFieldsProps {
  activeTeamSpecies: readonly SpeciesData[];
  trainSlug: string;
  onSelectTrainSlug: (slug: string) => void;
  targetLevelInput: string;
  onChangeTargetLevelInput: (value: string) => void;
  checkpointLevelCap: number;
}

export function TrainStepFields({
  activeTeamSpecies,
  trainSlug,
  onSelectTrainSlug,
  targetLevelInput,
  onChangeTargetLevelInput,
  checkpointLevelCap,
}: TrainStepFieldsProps) {
  return (
    <div className="space-y-3">
      <TeamMemberChipSelector
        label="Pokémon"
        options={activeTeamSpecies}
        selectedSlug={trainSlug}
        onSelect={onSelectTrainSlug}
      />

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor="train-target-level"
            className="text-xs font-medium text-[var(--ink-secondary)]"
          >
            Target Level
          </label>
          <button
            type="button"
            onClick={() => onChangeTargetLevelInput(String(checkpointLevelCap))}
            className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline"
          >
            Cap Lv {checkpointLevelCap}
          </button>
        </div>
        <input
          id="train-target-level"
          type="number"
          min={LEVEL_BOUNDS.min}
          max={LEVEL_BOUNDS.max}
          value={targetLevelInput}
          onChange={(e) => onChangeTargetLevelInput(e.target.value)}
          className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--ink-primary)] tabular-nums"
        />
      </div>
    </div>
  );
}
