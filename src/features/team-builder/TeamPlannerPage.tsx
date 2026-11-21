import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { AlertTriangle, BarChart2, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/app/useTheme';
import { formatGameTitle } from '@/components/ui/formatGameTitle';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { getAvailableSpeciesInGame } from '@/domain/journey';
import {
  decodeTeamFromSearchParams,
  encodeTeamToSearchParams,
  type TeamSearchParams,
} from '@/domain/sharing';
import { AppHeader } from '@/features/navigation/AppHeader';
import { SmartRecommendationsPanel } from '@/features/smart-recommendations/SmartRecommendationsPanel';
import { TeamAnalysisSection } from '@/features/team-analysis/TeamAnalysisSection';
import { SavedTeamsModal } from '@/features/team-sharing/SavedTeamsModal';
import { ShareShowdownModal } from '@/features/team-sharing/ShareShowdownModal';
import { gameManifestQueryOptions } from '@/hooks/gameQueries';
import { useTransientFlag } from '@/hooks/useTransientFlag';
import { useTeamStore } from '@/stores/useTeamStore';
import { BuildDrawer } from './BuildDrawer';
import { PokemonBrowser } from './PokemonBrowser';
import { TeamDock } from './TeamDock';

const SLOT_SKELETON_KEYS = ['sk0', 'sk1', 'sk2', 'sk3', 'sk4', 'sk5'] as const;

interface TeamPlannerPageProps {
  routeMode: 'free' | 'campaign';
}

export function TeamPlannerPage({ routeMode }: TeamPlannerPageProps) {
  const search = useSearch({ strict: false }) as TeamSearchParams;
  const params = useParams({ strict: false }) as { gameId?: string };
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const context = useTeamStore((s) => s.context);
  const activeManifest = useTeamStore((s) => s.activeManifest);
  const excludeTradeEvolutions = useTeamStore((s) => s.excludeTradeEvolutions);
  const onlyCatchableInGame = useTeamStore((s) => s.onlyCatchableInGame);
  const team = useTeamStore((s) => s.team);
  const teamName = useTeamStore((s) => s.teamName);
  const editingSlotIndex = useTeamStore((s) => s.editingSlotIndex);
  const selectFreeMode = useTeamStore((s) => s.selectFreeMode);
  const selectCampaignGame = useTeamStore((s) => s.selectCampaignGame);
  const resetTeam = useTeamStore((s) => s.resetTeam);
  const hydrateFromSharedState = useTeamStore((s) => s.hydrateFromSharedState);
  const loadSavedTeams = useTeamStore((s) => s.loadSavedTeams);

  const [activeToolPanel, setActiveToolPanel] = useState<'none' | 'analysis' | 'recommendations'>(
    'none',
  );
  const [showdownOpen, setShowdownOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [copiedUrl, triggerCopiedUrl] = useTransientFlag(1800);
  const [urlBannerMessages, setUrlBannerMessages] = useState<string[]>([]);
  const routeKey = routeMode === 'free' ? 'free' : `campaign:${params.gameId ?? ''}`;
  const [hydratedRouteKey, setHydratedRouteKey] = useState<string | null>(null);
  const [pendingManifestRouteKey, setPendingManifestRouteKey] = useState<string | null>(null);
  const latestSearchRef = useRef<TeamSearchParams>(search);
  latestSearchRef.current = search;
  const browserSearchRef = useRef<HTMLInputElement>(null);

  const targetGameId = routeMode === 'campaign' ? params.gameId : undefined;
  const {
    data: campaignManifest,
    isPending: isManifestPending,
    isError: isManifestError,
  } = useQuery({
    ...gameManifestQueryOptions(targetGameId ?? ''),
    enabled: Boolean(targetGameId),
  });

  const isContextAligned =
    context.mode === routeMode &&
    (routeMode === 'free' || (context.mode === 'campaign' && context.gameId === params.gameId));
  const isRouteReady = hydratedRouteKey === routeKey;

  // Load saved teams once on mount
  useEffect(() => {
    void loadSavedTeams();
  }, [loadSavedTeams]);

  // Sync route mode or shared URL state only when route identity changes
  useEffect(() => {
    let active = true;

    const init = async () => {
      const entrySearch = latestSearchRef.current;
      const hasSharedParams =
        entrySearch.p !== undefined || entrySearch.s !== undefined || entrySearch.g !== undefined;

      setUrlBannerMessages([]);
      setPendingManifestRouteKey(null);

      if (hasSharedParams) {
        const result = decodeTeamFromSearchParams(entrySearch, pkmnDexGateway);
        if (result.ok) {
          await hydrateFromSharedState(result.state);
          if (!active) return;

          if (
            result.state.mode === 'campaign' &&
            result.state.gameId &&
            (routeMode !== 'campaign' || params.gameId !== result.state.gameId)
          ) {
            void navigate({
              to: '/game/$gameId/team',
              params: { gameId: result.state.gameId },
              search: entrySearch,
              replace: true,
            });
            return;
          }
          if (result.state.mode === 'free' && routeMode !== 'free') {
            void navigate({
              to: '/free',
              search: entrySearch,
              replace: true,
            });
            return;
          }

          if (result.warnings.length > 0) {
            setUrlBannerMessages([...result.warnings]);
          }
          setHydratedRouteKey(routeKey);
          return;
        }
        if (active) {
          setUrlBannerMessages([result.error]);
        }
      }

      if (routeMode === 'free') {
        if (useTeamStore.getState().context.mode !== 'free') {
          selectFreeMode();
        }
        if (active) {
          setHydratedRouteKey(routeKey);
        }
        return;
      }

      if (!targetGameId) {
        void navigate({ to: '/', replace: true });
        return;
      }

      const currentState = useTeamStore.getState();
      if (
        currentState.activeManifest?.id === targetGameId &&
        currentState.context.mode === 'campaign'
      ) {
        if (active) {
          setHydratedRouteKey(routeKey);
        }
        return;
      }

      if (active) {
        setPendingManifestRouteKey(routeKey);
      }
    };

    void init();
    return () => {
      active = false;
    };
  }, [
    hydrateFromSharedState,
    navigate,
    params.gameId,
    routeKey,
    routeMode,
    selectFreeMode,
    targetGameId,
  ]);

  // Apply queried campaign manifest once TanStack Query settles for this route
  useEffect(() => {
    if (pendingManifestRouteKey !== routeKey) return;
    if (!isManifestPending && (isManifestError || campaignManifest === null)) {
      void navigate({ to: '/', replace: true });
      return;
    }
    if (campaignManifest) {
      selectCampaignGame(campaignManifest);
      setPendingManifestRouteKey(null);
      setHydratedRouteKey(routeKey);
    }
  }, [
    campaignManifest,
    isManifestError,
    isManifestPending,
    navigate,
    pendingManifestRouteKey,
    routeKey,
    selectCampaignGame,
  ]);

  const hasAnyMember = team.some((slot) => slot !== null);

  // Synchronize URL search params with active team
  const encodedParams = useMemo(() => {
    if (routeMode === 'campaign' && !hasAnyMember && !teamName) {
      return {};
    }
    return encodeTeamToSearchParams({
      mode: context.mode,
      generation: context.generation,
      ...(context.mode === 'campaign' ? { gameId: context.gameId } : {}),
      ...(context.mode === 'campaign' && context.versionId ? { versionId: context.versionId } : {}),
      ...(teamName ? { teamName } : {}),
      team,
    });
  }, [context, hasAnyMember, routeMode, team, teamName]);

  useEffect(() => {
    if (!isRouteReady || !isContextAligned) return;
    if (
      encodedParams.g === search.g &&
      encodedParams.s === search.s &&
      encodedParams.p === search.p
    ) {
      return;
    }
    if (routeMode === 'free') {
      void navigate({
        to: '/free',
        search: encodedParams,
        replace: true,
      });
    } else if (params.gameId) {
      void navigate({
        to: '/game/$gameId/team',
        params: { gameId: params.gameId },
        search: encodedParams,
        replace: true,
      });
    }
  }, [
    encodedParams,
    isContextAligned,
    isRouteReady,
    navigate,
    params.gameId,
    routeMode,
    search.g,
    search.p,
    search.s,
  ]);

  // Cmd/Ctrl+K focuses inline Pokémon search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (editingSlotIndex !== null || showdownOpen || savedOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        browserSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingSlotIndex, savedOpen, showdownOpen]);

  const allowedRecommendationSlugs = useMemo(() => {
    if (routeMode !== 'campaign' || !activeManifest || !onlyCatchableInGame) return undefined;
    return getAvailableSpeciesInGame(activeManifest, {
      excludeTradeEvolutions,
      ...(context.mode === 'campaign' && context.versionId ? { versionId: context.versionId } : {}),
    });
  }, [activeManifest, context, excludeTradeEvolutions, onlyCatchableInGame, routeMode]);

  const shareUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (encodedParams.g) qs.set('g', encodedParams.g);
    if (encodedParams.s) qs.set('s', encodedParams.s);
    if (encodedParams.p) qs.set('p', encodedParams.p);
    const queryStr = qs.toString();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname =
      routeMode === 'free' ? '/free' : `/game/${params.gameId ?? activeManifest?.id ?? ''}/team`;
    return queryStr ? `${origin}${pathname}?${queryStr}` : `${origin}${pathname}`;
  }, [activeManifest?.id, encodedParams, params.gameId, routeMode]);

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      triggerCopiedUrl();
    } catch {
      setShowdownOpen(true);
    }
  };

  const headerTitle =
    routeMode === 'free'
      ? 'Free Mode'
      : activeManifest
        ? formatGameTitle(activeManifest.name)
        : 'Loading…';

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)]">
      <AppHeader
        mode={routeMode}
        activeSection="team"
        {...(params.gameId ? { gameId: params.gameId } : {})}
        title={headerTitle}
        theme={theme}
        onToggleTheme={toggleTheme}
        onCopyShareUrl={handleCopyShareUrl}
        copiedUrl={copiedUrl}
        onOpenShowdown={() => setShowdownOpen(true)}
        onOpenSaved={() => setSavedOpen(true)}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {urlBannerMessages.length > 0 && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl bg-amber-500/12 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
          >
            <div className="flex items-start gap-2">
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

        {!isRouteReady ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SLOT_SKELETON_KEYS.map((sk) => (
              <div
                key={sk}
                className="mx-auto h-24 w-24 animate-pulse rounded-full bg-[var(--surface-elevated)]"
              />
            ))}
          </div>
        ) : (
          <>
            <TeamDock onFocusBrowser={() => browserSearchRef.current?.focus()} />

            {/* Compact Action Strip */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                aria-pressed={activeToolPanel === 'analysis'}
                onClick={() =>
                  setActiveToolPanel((prev) => (prev === 'analysis' ? 'none' : 'analysis'))
                }
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition ${
                  activeToolPanel === 'analysis'
                    ? 'bg-[var(--ink-primary)] text-[var(--surface-card)]'
                    : 'bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Team Analysis</span>
              </button>

              <button
                type="button"
                aria-pressed={activeToolPanel === 'recommendations'}
                onClick={() =>
                  setActiveToolPanel((prev) =>
                    prev === 'recommendations' ? 'none' : 'recommendations',
                  )
                }
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition ${
                  activeToolPanel === 'recommendations'
                    ? 'bg-[var(--ink-primary)] text-[var(--surface-card)]'
                    : 'bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Recommendations</span>
              </button>

              {hasAnyMember && (
                <button
                  type="button"
                  onClick={resetTeam}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--surface-card)] px-3 text-xs font-medium text-[var(--ink-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-red-500"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {activeToolPanel === 'analysis' && <TeamAnalysisSection />}
            {activeToolPanel === 'recommendations' && (
              <SmartRecommendationsPanel
                {...(allowedRecommendationSlugs
                  ? { allowedSpeciesSlugs: allowedRecommendationSlugs }
                  : {})}
              />
            )}

            <PokemonBrowser
              searchInputRef={browserSearchRef}
              {...(allowedRecommendationSlugs
                ? { allowedSpeciesSlugs: allowedRecommendationSlugs }
                : {})}
            />
          </>
        )}
      </main>

      <BuildDrawer />
      <ShareShowdownModal open={showdownOpen} onOpenChange={setShowdownOpen} shareUrl={shareUrl} />
      <SavedTeamsModal open={savedOpen} onOpenChange={setSavedOpen} />
    </div>
  );
}
