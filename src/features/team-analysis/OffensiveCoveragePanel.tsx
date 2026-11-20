import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import type { OffensiveCoverage } from '@/domain/analysis';

interface OffensiveCoveragePanelProps {
  offense: OffensiveCoverage;
}

export function OffensiveCoveragePanel({ offense }: OffensiveCoveragePanelProps) {
  const [mode, setMode] = useState<'moveset' | 'stab'>(() =>
    offense.hasDamagingMoves ? 'moveset' : 'stab',
  );

  const effectiveMode = mode === 'moveset' && !offense.hasDamagingMoves ? 'stab' : mode;
  const coveredCount =
    effectiveMode === 'moveset' ? offense.movesetCoveredCount : offense.stabCoveredCount;
  const blindSpots =
    effectiveMode === 'moveset' ? offense.movesetBlindSpots : offense.stabBlindSpots;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--ink-primary)]">
            Super-Effective Coverage:{' '}
            <span className="tabular-nums text-[var(--accent-primary)]">
              {coveredCount}/{offense.totalTypes} Types
            </span>
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            {offense.hasDamagingMoves
              ? 'Compare configured moveset coverage against intrinsic STAB typing.'
              : 'Configure damaging moves in the Build Drawer to unlock Moveset coverage; showing STAB typing now.'}
          </p>
        </div>

        <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1">
          <button
            type="button"
            disabled={!offense.hasDamagingMoves}
            onClick={() => setMode('moveset')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              effectiveMode === 'moveset'
                ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] shadow-xs'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] disabled:opacity-40'
            }`}
          >
            Moveset Mode
          </button>
          <button
            type="button"
            onClick={() => setMode('stab')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              effectiveMode === 'stab'
                ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] shadow-xs'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            STAB Mode
          </button>
        </div>
      </div>

      {blindSpots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-amber-800 dark:text-amber-300">
            Uncovered Blind Spots:
          </span>
          {blindSpots.map((t) => (
            <TypeBadge key={t} type={t} size="sm" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {offense.entries.map((entry) => {
          const contributors =
            effectiveMode === 'moveset' ? entry.movesetContributors : entry.stabContributors;
          const covered = contributors.length > 0;

          return (
            <div
              key={entry.targetType}
              className={`flex flex-col justify-between gap-2 rounded-xl border p-3 ${
                covered
                  ? 'border-[var(--border-subtle)] bg-[var(--surface-card)]'
                  : 'border-amber-500/40 bg-amber-500/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <TypeBadge type={entry.targetType} size="sm" />
                {covered ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {contributors.length} hit{contributors.length === 1 ? '' : 's'}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Uncovered</span>
                  </span>
                )}
              </div>

              {covered ? (
                <div className="flex flex-wrap gap-1">
                  {contributors.slice(0, 4).map((c) => (
                    <span
                      key={`${c.slotIndex}-${c.moveName ?? c.attackType}`}
                      className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[11px] text-[var(--ink-secondary)]"
                    >
                      {c.speciesName}
                      {c.moveName ? ` · ${c.moveName}` : ` (${c.attackType})`}
                    </span>
                  ))}
                  {contributors.length > 4 && (
                    <span className="px-1 text-[11px] text-[var(--ink-muted)]">
                      +{contributors.length - 4} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--ink-muted)]">
                  No super-effective {effectiveMode === 'moveset' ? 'moves' : 'STAB types'} on team
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
