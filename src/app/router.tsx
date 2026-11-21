import {
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  Link,
  Outlet,
  type RouterHistory,
  redirect,
} from '@tanstack/react-router';
import { z } from 'zod';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { decodeTeamFromSearchParams, type TeamSearchParams } from '@/domain/sharing';
import { GameSelectorPage } from '@/features/game-selector/GameSelectorPage';
import { JourneyPlannerPage } from '@/features/journey-planner/JourneyPlannerPage';
import { TeamPlannerPage } from '@/features/team-builder/TeamPlannerPage';

const searchScalarSchema = z.union([z.string(), z.number(), z.boolean()]).transform(String);

function parseTeamSearch(raw: Record<string, unknown>): TeamSearchParams {
  const result: TeamSearchParams = {};
  for (const key of ['g', 's', 'p'] as const) {
    const parsed = searchScalarSchema.safeParse(raw[key]);
    if (parsed.success && parsed.data.length > 0) {
      result[key] = parsed.data;
    }
  }
  return result;
}

function stringifyTeamSearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === 'string' && value.length > 0) {
      params.set(key, value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function RouteFallback({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-canvas)] px-4 text-center text-[var(--ink-primary)]">
      <div className="max-w-sm space-y-3 rounded-2xl bg-[var(--surface-card)] p-6">
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="text-xs text-[var(--ink-muted)]">{message}</p>
        <Link
          to="/"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 text-xs font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-primary-hover)]"
        >
          Back to Games
        </Link>
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: parseTeamSearch,
  beforeLoad: ({ search }) => {
    const hasSharedParams =
      search.p !== undefined || search.s !== undefined || search.g !== undefined;
    if (!hasSharedParams) return;

    const decoded = decodeTeamFromSearchParams(search, pkmnDexGateway);
    if (decoded.ok && decoded.state.mode === 'campaign' && decoded.state.gameId) {
      throw redirect({
        to: '/game/$gameId/team',
        params: { gameId: decoded.state.gameId },
        search,
        replace: true,
      });
    }
    throw redirect({
      to: '/free',
      search,
      replace: true,
    });
  },
  component: GameSelectorPage,
});

const freeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/free',
  validateSearch: parseTeamSearch,
  component: () => <TeamPlannerPage routeMode="free" />,
});

const gameTeamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game/$gameId/team',
  validateSearch: parseTeamSearch,
  component: () => <TeamPlannerPage routeMode="campaign" />,
});

const gameJourneyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game/$gameId/journey',
  component: JourneyPlannerPage,
});

const routeTree = rootRoute.addChildren([indexRoute, freeRoute, gameTeamRoute, gameJourneyRoute]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    parseSearch: defaultParseSearch,
    stringifySearch: stringifyTeamSearch,
    defaultNotFoundComponent: () => (
      <RouteFallback title="Page not found" message="The requested planner route does not exist." />
    ),
    defaultErrorComponent: ({ error }) => (
      <RouteFallback
        title="Unable to load route"
        message={
          error instanceof Error ? error.message : 'An unexpected navigation error occurred.'
        }
      />
    ),
    ...(history ? { history } : {}),
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
