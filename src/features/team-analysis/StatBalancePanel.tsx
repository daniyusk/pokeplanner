import type { TeamStatProfile } from '@/domain/analysis';
import { StatRadarChart } from './StatRadarChart';
import { MAX_BASE_STAT_SCALE, STAT_BAR_ROWS } from './statDisplayConfig';

interface StatBalancePanelProps {
  stats: TeamStatProfile;
}

export function StatBalancePanel({ stats }: StatBalancePanelProps) {
  const totalMoves = stats.moveSplit.physical + stats.moveSplit.special + stats.moveSplit.status;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Radar Chart */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 lg:col-span-5">
        <StatRadarChart averages={stats.averages} peaks={stats.peaks} />
        <p className="mt-3 text-xs font-semibold tabular-nums text-[var(--ink-secondary)]">
          Average BST: <span className="text-[var(--ink-primary)]">{stats.averages.bst}</span>
        </p>
      </div>

      {/* Right: Stat Bars & Split */}
      <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 lg:col-span-7">
        <div className="space-y-2.5">
          {STAT_BAR_ROWS.map((row) => {
            const avg = stats.averages[row.key];
            const peak = stats.peaks[row.key];
            const avgPct = Math.min((avg / MAX_BASE_STAT_SCALE) * 100, 100);
            const peakPct = Math.min((peak / MAX_BASE_STAT_SCALE) * 100, 100);

            return (
              <div key={row.key} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3">
                <span className="text-xs font-semibold text-[var(--ink-secondary)]">
                  {row.label}
                </span>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--ink-muted)]/30"
                    style={{ width: `${peakPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-primary)]"
                    style={{ width: `${avgPct}%` }}
                  />
                </div>
                <span className="text-right text-xs tabular-nums text-[var(--ink-secondary)]">
                  <strong className="text-[var(--ink-primary)]">{avg}</strong> avg · {peak}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-[var(--ink-secondary)]">
              Attacker Stat Orientation
            </p>
            <p className="mt-1 text-xs tabular-nums text-[var(--ink-muted)]">
              {stats.biasSplit.physicalAttackers} Physical · {stats.biasSplit.specialAttackers}{' '}
              Special · {stats.biasSplit.mixedAttackers} Mixed
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--ink-secondary)]">
              Configured Move Split
            </p>
            <p className="mt-1 text-xs tabular-nums text-[var(--ink-muted)]">
              {totalMoves > 0
                ? `${stats.moveSplit.physical} Physical · ${stats.moveSplit.special} Special · ${stats.moveSplit.status} Status`
                : 'No moves selected yet'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
