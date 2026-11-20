import { Bookmark, Check, Moon, RotateCcw, Share2, Sun, Upload } from 'lucide-react';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import type { ThemeMode } from '@/data/storage/teamStorage';
import { getAvailableTypes } from '@/domain/mechanics';
import type { GenerationNumber } from '@/domain/types';
import { useTeamStore } from '@/stores/useTeamStore';

const GENERATIONS: readonly { gen: GenerationNumber; label: string }[] = [
  { gen: 1, label: 'Gen 1 — RBY' },
  { gen: 2, label: 'Gen 2 — GSC' },
  { gen: 3, label: 'Gen 3 — RSE / FRLG' },
  { gen: 4, label: 'Gen 4 — DPPt / HGSS' },
  { gen: 5, label: 'Gen 5 — BW / B2W2' },
  { gen: 6, label: 'Gen 6 — XY / ORAS' },
  { gen: 7, label: 'Gen 7 — SM / USUM' },
  { gen: 8, label: 'Gen 8 — SwSh / BDSP' },
  { gen: 9, label: 'Gen 9 — SV' },
];

interface TopBarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onCopyShareUrl: () => void;
  copiedUrl: boolean;
  onOpenShowdown: () => void;
  onOpenSaved: () => void;
}

export function TopBar({
  theme,
  onToggleTheme,
  onCopyShareUrl,
  copiedUrl,
  onOpenShowdown,
  onOpenSaved,
}: TopBarProps) {
  const context = useTeamStore((s) => s.context);
  const team = useTeamStore((s) => s.team);
  const savedCount = useTeamStore((s) => s.savedTeams.length);
  const setGeneration = useTeamStore((s) => s.setGeneration);
  const resetTeam = useTeamStore((s) => s.resetTeam);

  const hasAnyMember = team.some((slot) => slot !== null);
  const typeCount = getAvailableTypes(context.generation, pkmnDexGateway).length;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-[var(--accent-ink)] shadow-xs"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h6.2m5.6 0H21" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[var(--ink-primary)] sm:text-lg">
              Pokémon Team Planner
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--ink-muted)]">
              <span className="tabular-nums">{typeCount} Types</span>
              <span aria-hidden="true">·</span>
              <span>{context.mechanics.hasAbilities ? 'Abilities' : 'No Abilities'}</span>
              <span aria-hidden="true">·</span>
              <span>{context.mechanics.hasHeldItems ? 'Items' : 'No Items'}</span>
              <span aria-hidden="true">·</span>
              <span>
                {context.mechanics.physicalSpecialSplit ? 'Move Split' : 'Type-Based Split'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="generation-select">
            Generation Ruleset
          </label>
          <select
            id="generation-select"
            value={context.generation}
            onChange={(e) => setGeneration(Number(e.target.value) as GenerationNumber)}
            className="h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs font-medium text-[var(--ink-primary)] transition hover:border-[var(--border-strong)]"
          >
            {GENERATIONS.map((item) => (
              <option key={item.gen} value={item.gen}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onCopyShareUrl}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-primary-hover)]"
          >
            {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            <span>{copiedUrl ? 'Copied' : 'Share Link'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenShowdown}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs font-medium text-[var(--ink-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Showdown</span>
          </button>

          <button
            type="button"
            onClick={onOpenSaved}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs font-medium text-[var(--ink-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Saved</span>
            {savedCount > 0 && (
              <span className="rounded-full bg-[var(--surface-muted)] px-1.5 py-0.25 text-[11px] font-semibold tabular-nums text-[var(--ink-secondary)]">
                {savedCount}
              </span>
            )}
          </button>

          {hasAnyMember && (
            <button
              type="button"
              onClick={resetTeam}
              aria-label="Clear team"
              title="Clear all 6 slots"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 text-xs font-medium text-[var(--ink-secondary)] transition hover:border-red-500/50 hover:text-red-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
