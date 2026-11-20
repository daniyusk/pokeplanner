import { useNavigate, useSearch } from '@tanstack/react-router';
import { AlertTriangle, BarChart2, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { getThemePreference, setThemePreference, type ThemeMode } from '@/data/storage/teamStorage';
import { decodeTeamFromSearchParams, encodeTeamToSearchParams } from '@/domain/sharing';
import type { TeamSlotIndex } from '@/domain/types';
import { SmartRecommendationsPanel } from '@/features/smart-recommendations/SmartRecommendationsPanel';
import { TeamAnalysisSection } from '@/features/team-analysis/TeamAnalysisSection';
import { SavedTeamsModal } from '@/features/team-sharing/SavedTeamsModal';
import { ShareShowdownModal } from '@/features/team-sharing/ShareShowdownModal';
import { useTeamStore } from '@/stores/useTeamStore';
import { BuildDrawer } from './BuildDrawer';
import { PokemonPickerModal } from './PokemonPickerModal';
import { TeamDock } from './TeamDock';
import { TopBar } from './TopBar';

export function PlannerWorkspace() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const context = useTeamStore((s) => s.context);
  const team = useTeamStore((s) => s.team);
  const teamName = useTeamStore((s) => s.teamName);
  const pickerSlotIndex = useTeamStore((s) => s.pickerSlotIndex);
  const editingSlotIndex = useTeamStore((s) => s.editingSlotIndex);
  const openPicker = useTeamStore((s) => s.openPicker);
  const openEditor = useTeamStore((s) => s.openEditor);
  const hydrateFromSharedState = useTeamStore((s) => s.hydrateFromSharedState);
  const loadSavedTeams = useTeamStore((s) => s.loadSavedTeams);

  const [theme, setTheme] = useState<ThemeMode>(() => getThemePreference());
  const [workspaceTab, setWorkspaceTab] = useState<'analysis' | 'recommendations'>('analysis');
  const [showdownOpen, setShowdownOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [urlBannerMessages, setUrlBannerMessages] = useState<string[]>([]);
  const hydratedRef = useRef(false);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    setThemePreference(theme);
  }, [theme]);

  // Initial URL hydration + IndexedDB load
  useEffect(() => {
    loadSavedTeams();

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (search.p !== undefined || search.s !== undefined || search.g !== undefined) {
      const result = decodeTeamFromSearchParams(search, pkmnDexGateway);
      if (result.ok) {
        hydrateFromSharedState(result.state);
        if (result.warnings.length > 0) {
          setUrlBannerMessages([...result.warnings]);
        }
      } else {
        setUrlBannerMessages([result.error]);
      }
    }
  }, [hydrateFromSharedState, loadSavedTeams, search]);

  // Keep browser URL synchronized with active team state
  const encodedParams = useMemo(
    () =>
      encodeTeamToSearchParams({
        version: 1,
        mode: context.mode,
        generation: context.generation,
        ...(teamName ? { teamName } : {}),
        team,
      }),
    [context.mode, context.generation, teamName, team],
  );

  useEffect(() => {
    if (!hydratedRef.current) return;
    navigate({
      to: '/',
      search: encodedParams as never,
      replace: true,
    });
  }, [encodedParams, navigate]);

  // Global keyboard shortcuts (Ctrl/Cmd+K and 1-6)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (pickerSlotIndex !== null || editingSlotIndex !== null || showdownOpen || savedOpen) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const firstEmpty = team.indexOf(null);
        const slotToOpen = Math.max(firstEmpty, 0) as TeamSlotIndex;
        openPicker(slotToOpen);
        return;
      }

      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const slotIndex = (Number(e.key) - 1) as TeamSlotIndex;
        if (team[slotIndex]) {
          openEditor(slotIndex);
        } else {
          openPicker(slotIndex);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingSlotIndex, openEditor, openPicker, pickerSlotIndex, savedOpen, showdownOpen, team]);

  const shareUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (encodedParams.g) qs.set('g', encodedParams.g);
    if (encodedParams.s) qs.set('s', encodedParams.s);
    if (encodedParams.p) qs.set('p', encodedParams.p);
    const queryStr = qs.toString();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return queryStr ? `${origin}/?${queryStr}` : `${origin}/`;
  }, [encodedParams]);

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      setShowdownOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)]">
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onCopyShareUrl={handleCopyShareUrl}
        copiedUrl={copiedUrl}
        onOpenShowdown={() => setShowdownOpen(true)}
        onOpenSaved={() => setSavedOpen(true)}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {urlBannerMessages.length > 0 && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <ul className="space-y-0.5">
                {urlBannerMessages.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setUrlBannerMessages([])}
              aria-label="Dismiss notice"
              className="rounded p-1 hover:bg-amber-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <TeamDock />

        {/* Workspace Section Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <button
            type="button"
            onClick={() => setWorkspaceTab('analysis')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              workspaceTab === 'analysis'
                ? 'bg-[var(--ink-primary)] text-[var(--surface-card)]'
                : 'border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Team Analysis</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab('recommendations')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              workspaceTab === 'recommendations'
                ? 'bg-[var(--ink-primary)] text-[var(--surface-card)]'
                : 'border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Smart Recommendations</span>
          </button>
        </div>

        {workspaceTab === 'analysis' ? <TeamAnalysisSection /> : <SmartRecommendationsPanel />}
      </main>

      <PokemonPickerModal />
      <BuildDrawer />

      <ShareShowdownModal open={showdownOpen} onOpenChange={setShowdownOpen} shareUrl={shareUrl} />
      <SavedTeamsModal open={savedOpen} onOpenChange={setSavedOpen} />
    </div>
  );
}
