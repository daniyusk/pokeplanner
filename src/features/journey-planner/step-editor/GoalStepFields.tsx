import { TeamMemberChipSelector } from '@/components/pokemon/TeamMemberChipSelector';
import type { SpeciesData } from '@/domain/types';

interface GoalStepFieldsProps {
  goalTitle: string;
  onChangeGoalTitle: (title: string) => void;
  activeTeamSpecies: readonly SpeciesData[];
  goalSpeciesSlug: string;
  onSelectGoalSpeciesSlug: (slug: string) => void;
}

export function GoalStepFields({
  goalTitle,
  onChangeGoalTitle,
  activeTeamSpecies,
  goalSpeciesSlug,
  onSelectGoalSpeciesSlug,
}: GoalStepFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="goal-title"
          className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]"
        >
          Milestone Objective
        </label>
        <input
          id="goal-title"
          type="text"
          value={goalTitle}
          onChange={(e) => onChangeGoalTitle(e.target.value)}
          placeholder="e.g., Teach Ice Beam, Pick up Exp. Share"
          className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--ink-primary)]"
        />
      </div>

      {activeTeamSpecies.length > 0 && (
        <TeamMemberChipSelector
          label="Teammate (optional)"
          options={activeTeamSpecies}
          selectedSlug={goalSpeciesSlug}
          onSelect={onSelectGoalSpeciesSlug}
          toggleable
          tone="contrast"
        />
      )}
    </div>
  );
}
