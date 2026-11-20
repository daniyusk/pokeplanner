import { AlertTriangle, BarChart3, CheckCircle2, ShieldAlert, Swords } from 'lucide-react';
import { useMemo, useState } from 'react';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { analyzeTeam } from '@/domain/analysis';
import { useTeamStore } from '@/stores/useTeamStore';
import { DefensiveMatrix } from './DefensiveMatrix';
import { OffensiveCoveragePanel } from './OffensiveCoveragePanel';
import { StatBalancePanel } from './StatBalancePanel';

type AnalysisTab = 'defense' | 'offense' | 'stats';

export function TeamAnalysisSection() {
  const team = useTeamStore((s) => s.team);
  const context = useTeamStore((s) => s.context);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('defense');

  const report = useMemo(() => analyzeTeam(team, context, pkmnDexGateway), [team, context]);

  if (report.memberCount === 0) {
    return (
      <section
        aria-labelledby="analysis-heading"
        className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)]/50 p-8 text-center"
      >
        <h2 id="analysis-heading" className="text-base font-bold text-[var(--ink-primary)]">
          Team Analysis
        </h2>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Add at least one Pokémon above to inspect type weaknesses, ability immunities, offensive
          coverage, and base stat balance.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="analysis-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="analysis-heading"
          className="text-lg font-bold tracking-tight text-[var(--ink-primary)]"
        >
          Team Analysis
        </h2>

        <div
          role="tablist"
          aria-label="Team analysis views"
          className="flex gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'defense'}
            onClick={() => setActiveTab('defense')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'defense'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-ink)]'
                : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Defensive Matrix</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'offense'}
            onClick={() => setActiveTab('offense')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'offense'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-ink)]'
                : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            <Swords className="h-3.5 w-3.5" />
            <span>Offensive Coverage</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stats'}
            onClick={() => setActiveTab('stats')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'stats'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-ink)]'
                : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Stats & Roles</span>
          </button>
        </div>
      </div>

      {/* Executive Insights Strip */}
      {report.insights.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {report.insights.map((insight) => {
            const toneClass =
              insight.severity === 'danger'
                ? 'border-red-500/40 bg-red-500/8 text-red-800 dark:text-red-300'
                : insight.severity === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/8 text-amber-900 dark:text-amber-300'
                  : 'border-emerald-500/35 bg-emerald-500/8 text-emerald-900 dark:text-emerald-300';

            return (
              <div
                key={insight.id}
                className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${toneClass}`}
              >
                {insight.severity === 'positive' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <div>
                  <p className="font-semibold">{insight.title}</p>
                  <p className="mt-0.5 opacity-85">{insight.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'defense' && (
        <DefensiveMatrix defense={report.defense} team={team} context={context} />
      )}
      {activeTab === 'offense' && <OffensiveCoveragePanel offense={report.offense} />}
      {activeTab === 'stats' && <StatBalancePanel stats={report.stats} />}
    </section>
  );
}
