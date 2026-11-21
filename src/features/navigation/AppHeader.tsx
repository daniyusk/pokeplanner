import { Link } from '@tanstack/react-router';
import {
  Bookmark,
  Check,
  ChevronLeft,
  Compass,
  Share2,
  Upload,
  Users,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import type { ThemeMode } from '@/data/storage/teamStorage';
import { useTeamStore } from '@/stores/useTeamStore';

interface AppHeaderProps {
  mode: 'free' | 'campaign';
  activeSection: 'team' | 'journey';
  gameId?: string;
  title: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onCopyShareUrl?: () => void;
  copiedUrl?: boolean;
  onOpenShowdown?: () => void;
  onOpenSaved?: () => void;
}

export function AppHeader({
  mode,
  activeSection,
  gameId,
  title,
  theme,
  onToggleTheme,
  onCopyShareUrl,
  copiedUrl = false,
  onOpenShowdown,
  onOpenSaved,
}: AppHeaderProps) {
  const savedCount = useTeamStore((s) => s.savedTeams.length);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:h-14 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
        {/* Left: Games link + Mode/Game Title */}
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/"
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--ink-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Games</span>
          </Link>

          <span className="h-4 w-px shrink-0 bg-[var(--border-subtle)]" aria-hidden="true" />

          <h1 className="truncate text-sm font-semibold tracking-tight text-[var(--ink-primary)] sm:text-base">
            {title}
          </h1>

          {isOffline && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300"
              title="Offline mode"
            >
              <WifiOff className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
        </div>

        {/* Center: Independent Team Planner vs Journey Planner Switcher (Campaign games only) */}
        {mode === 'campaign' && gameId && (
          <nav
            aria-label="Planner mode"
            className="order-3 flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--surface-elevated)] p-0.5 sm:order-none sm:w-auto"
          >
            <Link
              to="/game/$gameId/team"
              params={{ gameId }}
              className={`inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition sm:flex-none ${
                activeSection === 'team'
                  ? 'bg-[var(--surface-card)] text-[var(--ink-primary)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Team Planner</span>
            </Link>
            <Link
              to="/game/$gameId/journey"
              params={{ gameId }}
              className={`inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition sm:flex-none ${
                activeSection === 'journey'
                  ? 'bg-[var(--surface-card)] text-[var(--ink-primary)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Journey Planner</span>
            </Link>
          </nav>
        )}

        {/* Right: Compact utility icon actions */}
        <div className="flex items-center gap-1">
          {activeSection === 'team' && onCopyShareUrl && (
            <button
              type="button"
              onClick={onCopyShareUrl}
              aria-label={copiedUrl ? 'Link copied' : 'Copy share link'}
              title={copiedUrl ? 'Link copied' : 'Copy share link'}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                copiedUrl
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]'
              }`}
            >
              {copiedUrl ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            </button>
          )}

          {activeSection === 'team' && onOpenShowdown && (
            <button
              type="button"
              onClick={onOpenShowdown}
              aria-label="Import or export Showdown paste"
              title="Showdown import / export"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
            >
              <Upload className="h-4 w-4" />
            </button>
          )}

          {activeSection === 'team' && onOpenSaved && (
            <button
              type="button"
              onClick={onOpenSaved}
              aria-label="Saved teams"
              title={savedCount > 0 ? `Saved teams (${savedCount})` : 'Saved teams'}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
            >
              <Bookmark className="h-4 w-4" />
              {savedCount > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
              )}
            </button>
          )}

          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
