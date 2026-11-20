import { Bookmark, Check, Moon, RotateCcw, Share2, Sun, Upload, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { loadGameCatalog, loadGameManifest } from '@/data/games/gameLoader';
import type { ThemeMode } from '@/data/storage/teamStorage';
import { getAvailableTypes } from '@/domain/mechanics';
import type { GameCatalogEntry, GenerationNumber } from '@/domain/types';
import { useTeamStore } from '@/stores/useTeamStore';

const GENERATIONS: readonly { gen: GenerationNumber; label: string }[] = [
  { gen: 1, label: 'Free Mode — Gen 1 (RBY)' },
  { gen: 2, label: 'Free Mode — Gen 2 (GSC)' },
  { gen: 3, label: 'Free Mode — Gen 3 (RSE / FRLG)' },
  { gen: 4, label: 'Free Mode — Gen 4 (DPPt / HGSS)' },
  { gen: 5, label: 'Free Mode — Gen 5 (BW / B2W2)' },
  { gen: 6, label: 'Free Mode — Gen 6 (XY / ORAS)' },
  { gen: 7, label: 'Free Mode — Gen 7 (SM / USUM)' },
  { gen: 8, label: 'Free Mode — Gen 8 (SwSh / BDSP)' },
  { gen: 9, label: 'Free Mode — Gen 9 (SV)' },
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
  const activeManifest = useTeamStore((s) => s.activeManifest);
  const excludeTradeEvolutions = useTeamStore((s) => s.excludeTradeEvolutions);
  const onlyCatchableInGame = useTeamStore((s) => s.onlyCatchableInGame);
  const team = useTeamStore((s) => s.team);
  const savedCount = useTeamStore((s) => s.savedTeams.length);
  const setGeneration = useTeamStore((s) => s.setGeneration);
  const selectCampaignGame = useTeamStore((s) => s.selectCampaignGame);
  const setVersionId = useTeamStore((s) => s.setVersionId);
  const setExcludeTradeEvolutions = useTeamStore((s) => s.setExcludeTradeEvolutions);
  const setOnlyCatchableInGame = useTeamStore((s) => s.setOnlyCatchableInGame);
  const resetTeam = useTeamStore((s) => s.resetTeam);

  const [catalog, setCatalog] = useState<readonly GameCatalogEntry[]>([]);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    loadGameCatalog().then(setCatalog);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const hasAnyMember = team.some((slot) => slot !== null);
  const typeCount = getAvailableTypes(context.generation, pkmnDexGateway).length;

  const selectedModeValue =
    context.mode === 'campaign' ? `game:${context.gameId}` : `free:${context.generation}`;

  const handleModeChange = async (value: string) => {
    if (value.startsWith('free:')) {
      const gen = Number(value.slice('free:'.length)) as GenerationNumber;
      setGeneration(gen);
      return;
    }
    if (value.startsWith('game:')) {
      const gameId = value.slice('game:'.length);
      const manifest = await loadGameManifest(gameId);
      if (manifest) {
        selectCampaignGame(manifest);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-[var(--ink-primary)] sm:text-lg">
                  Pokémon Team Planner
                </h1>
                {isOffline && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    <WifiOff className="h-3 w-3" aria-hidden="true" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
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
              Game or Ruleset
            </label>
            <select
              id="generation-select"
              value={selectedModeValue}
              onChange={(e) => void handleModeChange(e.target.value)}
              className="h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs font-medium text-[var(--ink-primary)] transition hover:border-[var(--border-strong)]"
            >
              <optgroup label="Campaign Playthroughs (Gen 1–5)">
                {catalog.map((game) => (
                  <option key={game.id} value={`game:${game.id}`}>
                    {game.name} (Gen {game.generation})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Free Mode (All Pokémon)">
                {GENERATIONS.map((item) => (
                  <option key={item.gen} value={`free:${item.gen}`}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
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

        {/* Campaign Filter Strip */}
        {activeManifest && context.mode === 'campaign' && (
          <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-2.5 text-xs">
            <span className="font-semibold text-[var(--ink-secondary)]">
              {activeManifest.region} Campaign Rules:
            </span>

            {activeManifest.versions.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="version-select" className="text-[var(--ink-muted)]">
                  Version:
                </label>
                <select
                  id="version-select"
                  value={context.versionId ?? activeManifest.versions[0]?.id}
                  onChange={(e) => setVersionId(e.target.value)}
                  className="h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 text-xs font-medium text-[var(--ink-primary)]"
                >
                  {activeManifest.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={onlyCatchableInGame}
                onChange={(e) => setOnlyCatchableInGame(e.target.checked)}
                className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
              />
              <span>Regional / Catchable Only</span>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={excludeTradeEvolutions}
                onChange={(e) => setExcludeTradeEvolutions(e.target.checked)}
                className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
              />
              <span>Exclude Trade Evolutions</span>
            </label>
          </div>
        )}
      </div>
    </header>
  );
}
