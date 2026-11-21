import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/app/useTheme';
import { formatGameTitle } from '@/components/ui/formatGameTitle';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { gameCatalogQueryOptions, gameManifestQueryOptions } from '@/hooks/gameQueries';
import { useTeamStore } from '@/stores/useTeamStore';

const GAME_SWATCHES: Record<string, readonly string[]> = {
  'red-blue-yellow': ['#dc2626', '#2563eb', '#eab308'],
  'gold-silver-crystal': ['#d97706', '#94a3b8', '#06b6d4'],
  emerald: ['#16a34a'],
  'firered-leafgreen': ['#ea580c', '#22c55e'],
  platinum: ['#64748b', '#ef4444'],
  'heartgold-soulsilver': ['#eab308', '#94a3b8'],
  'black-white': ['#1e293b', '#e2e8f0'],
  'black-2-white-2': ['#0f172a', '#cbd5e1'],
};

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const;

export function GameSelectorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const selectFreeMode = useTeamStore((s) => s.selectFreeMode);
  const selectCampaignGame = useTeamStore((s) => s.selectCampaignGame);

  const { data: catalog = [], isPending: loading } = useQuery(gameCatalogQueryOptions());
  const [openingId, setOpeningId] = useState<string | null>(null);

  const handleSelectFreeMode = () => {
    selectFreeMode();
    void navigate({ to: '/free' });
  };

  const handleSelectGame = async (gameId: string) => {
    setOpeningId(gameId);
    try {
      const manifest = await queryClient.fetchQuery(gameManifestQueryOptions(gameId));
      if (manifest) {
        selectCampaignGame(manifest);
        void navigate({ to: '/game/$gameId/team', params: { gameId } });
      }
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)]">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="w-8" aria-hidden="true" />
        <h1 className="text-lg font-bold tracking-tight text-[var(--ink-primary)] sm:text-xl">
          Pokémon Team Planner
        </h1>
        <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pt-4 pb-16 sm:px-6">
        {/* Independent Free Mode Option */}
        <section aria-label="Free Mode">
          <button
            type="button"
            onClick={handleSelectFreeMode}
            className="group flex w-full items-center justify-between rounded-2xl bg-[var(--surface-card)] px-6 py-5 text-left transition hover:bg-[var(--surface-elevated)]"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <span className="block text-base font-semibold text-[var(--ink-primary)]">
                  Free Mode
                </span>
                <span className="block text-xs text-[var(--ink-muted)]">
                  All Pokémon · No game restrictions
                </span>
              </div>
            </div>
            <span className="text-xs font-medium text-[var(--ink-secondary)] transition group-hover:text-[var(--ink-primary)]">
              Open →
            </span>
          </button>
        </section>

        {/* Games Grid */}
        <section aria-labelledby="games-heading" className="space-y-4">
          <h2
            id="games-heading"
            className="text-sm font-semibold tracking-tight text-[var(--ink-secondary)]"
          >
            Games
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SKELETON_KEYS.map((sk) => (
                <div key={sk} className="h-28 animate-pulse rounded-2xl bg-[var(--surface-card)]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {catalog.map((game) => {
                const swatches = GAME_SWATCHES[game.id] ?? ['var(--accent-primary)'];
                const isBusy = openingId === game.id;

                return (
                  <button
                    key={game.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleSelectGame(game.id)}
                    className="group flex min-h-[7rem] flex-col justify-between rounded-2xl bg-[var(--surface-card)] p-5 text-left transition hover:bg-[var(--surface-elevated)] disabled:opacity-60"
                  >
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      {swatches.map((hex) => (
                        <span
                          key={hex}
                          className="h-2 w-5 rounded-full"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>

                    <div className="mt-4">
                      <span className="block text-sm font-semibold text-[var(--ink-primary)]">
                        {formatGameTitle(game.name)}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                        {isBusy ? 'Loading…' : game.region}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
