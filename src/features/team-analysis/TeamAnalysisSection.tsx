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
        className="rounded-xl bg-[var(--surface-card)] p-8 text-center"
      >
        <h2 id="analysis-heading" className="text-sm font-semibold text-[var(--ink-primary)]">
          Team Analysis
        </h2>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Select at least one Pokémon to inspect weaknesses, immunities, coverage, and stats.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="analysis-heading"
      className="space-y-4 rounded-2xl bg-[var(--surface-card)] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="analysis-heading"
          className="text-base font-semibold tracking-tight text-[var(--ink-primary)]"
        >
          Team Analysis
        </h2>

        <div
          role="tablist"
          aria-label="Team analysis views"
          className="flex gap-1 rounded-lg bg-[var(--surface-elevated)] p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'defense'}
            onClick={() => setActiveTab('defense')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'defense'
                ? 'bg-[var(--surface-card)] text-[var(--ink-primary)]'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
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
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'offense'
                ? 'bg-[var(--surface-card)] text-[var(--ink-primary)]'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
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
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'stats'
                ? 'bg-[var(--surface-card)] text-[var(--ink-primary)]'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Stats & Roles</span>
          </button>
        </div>
      </div>

      {/* Executive Insights Strip */}
      {report.insights.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {report.insights.map((insight) => {
            const toneClass =
              insight.severity === 'danger'
                ? 'bg-red-500/10 text-red-800 dark:text-red-300'
                : insight.severity === 'warning'
                  ? 'bg-amber-500/10 text-amber-900 dark:text-amber-300'
                  : 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-300';

            return (
              <div
                key={insight.id}
                className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-xs ${toneClass}`}
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
