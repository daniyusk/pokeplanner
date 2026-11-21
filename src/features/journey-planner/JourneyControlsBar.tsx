import { ArrowRight, RotateCcw, Upload } from 'lucide-react';
import { VersionSelector } from '@/components/ui/VersionSelector';
import type { GameManifest } from '@/domain/types';

interface JourneyControlsBarProps {
  manifest: GameManifest;
  activeVersionId: string | undefined;
  onSelectVersion: (versionId: string) => void;
  excludeTradeEvolutions: boolean;
  onChangeExcludeTradeEvolutions: (checked: boolean) => void;
  canImportFromTeam: boolean;
  onImportFromTeam: () => void;
  hasFinalMembers: boolean;
  onSendToTeamPlanner: () => void;
  canReset: boolean;
  onResetPlan: () => void;
}

export function JourneyControlsBar({
  manifest,
  activeVersionId,
  onSelectVersion,
  excludeTradeEvolutions,
  onChangeExcludeTradeEvolutions,
  canImportFromTeam,
  onImportFromTeam,
  hasFinalMembers,
  onSendToTeamPlanner,
  canReset,
  onResetPlan,
}: JourneyControlsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <VersionSelector
          versions={manifest.versions}
          activeVersionId={activeVersionId}
          onSelectVersion={onSelectVersion}
          containerTone="card"
        />

        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--ink-secondary)]">
          <input
            type="checkbox"
            checked={excludeTradeEvolutions}
            onChange={(e) => onChangeExcludeTradeEvolutions(e.target.checked)}
            className="rounded accent-[var(--accent-primary)]"
          />
          <span>No Trade Evolutions</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canImportFromTeam && (
          <button
            type="button"
            onClick={onImportFromTeam}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--surface-card)] px-3 text-xs font-medium text-[var(--ink-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Import from Team Planner</span>
          </button>
        )}

        {hasFinalMembers && (
          <button
            type="button"
            onClick={onSendToTeamPlanner}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-primary-hover)]"
          >
            <span>Send to Team Planner</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        {canReset && (
          <button
            type="button"
            onClick={onResetPlan}
            aria-label="Reset journey tree"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--surface-card)] px-2.5 text-xs font-medium text-[var(--ink-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-red-500"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
