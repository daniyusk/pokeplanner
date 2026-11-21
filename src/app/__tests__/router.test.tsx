import fs from 'node:fs';
import path from 'node:path';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { STORAGE_KEYS } from '@/data/config/storageKeys';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import type { SavedTeamRecord } from '@/data/storage/teamStorage';
import { decodeTeamFromSearchParams, encodeTeamToSearchParams } from '@/domain/sharing';
import { useTeamStore } from '@/stores/useTeamStore';
import frozenFixtures from '../../../tests/fixtures/shared-urls.json';

const { idbStore } = vi.hoisted(() => ({
  idbStore: new Map<string, unknown>(),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbStore.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    idbStore.set(key, value);
  }),
}));

function installStaticGameFetchMock() {
  const gamesDir = path.resolve(import.meta.dirname, '../../../public/data/games');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      const match = /\/data\/games\/([a-z0-9-]+)\.json$/i.exec(url);
      if (match?.[1]) {
        const filePath = path.join(gamesDir, `${match[1]}.json`);
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            ok: true,
            json: async () => data,
          };
        }
      }
      return { ok: false, json: async () => null };
    }),
  );
}

function renderAtUrl(initialUrl: string) {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const testRouter = createAppRouter(history);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    history,
    testRouter,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>,
    ),
  };
}

describe('App Router & Shared URL Seam', () => {
  beforeEach(() => {
    idbStore.clear();
    useTeamStore.setState({
      teamsByScope: {},
      savedTeams: [],
      isStorageLoaded: false,
      editingSlotIndex: null,
    });
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().selectFreeMode();
    installStaticGameFetchMock();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('redirects compact species-only shared URLs (numeric g param) from / to /free and hydrates the team', async () => {
    const { history } = renderAtUrl(
      `/?g=${frozenFixtures.compactGen5.params.g}&s=${frozenFixtures.compactGen5.params.s}`,
    );

    expect(await screen.findByText('Serperior')).toBeInTheDocument();
    expect(screen.getByText('Lucario')).toBeInTheDocument();
    expect(screen.getByText('Volcarona')).toBeInTheDocument();

    await waitFor(() => {
      expect(history.location.pathname).toBe('/free');
    });
    expect(useTeamStore.getState().context.generation).toBe(5);
  });

  it('redirects shared Free Mode builds from / to /free and hydrates build details', async () => {
    const { history } = renderAtUrl(`/?p=${frozenFixtures.gen5Builds.params.p}`);

    expect(await screen.findByText('Serperior')).toBeInTheDocument();
    await waitFor(() => {
      expect(history.location.pathname).toBe('/free');
    });
    expect(useTeamStore.getState().teamName).toBe('Unova Champ');
    expect(useTeamStore.getState().team[0]?.abilitySlug).toBe('contrary');
  });

  it('shows a non-fatal notice banner when a shared URL has an invalid generation param', async () => {
    const { history } = renderAtUrl('/?g=42&s=pikachu,-,-,-,-,-');

    expect(await screen.findByText(/Invalid generation parameter "42"/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(history.location.pathname).toBe('/free');
    });
  });

  it('renders a navigable not-found fallback for unknown routes', async () => {
    renderAtUrl('/unknown/route');

    expect(await screen.findByRole('link', { name: /Back to Games/i })).toBeInTheDocument();
  });

  it('redirects campaign shared URLs from / to /game/$gameId/team and loads campaign state', async () => {
    const campaignParams = encodeTeamToSearchParams({
      mode: 'campaign',
      generation: 4,
      gameId: 'platinum',
      versionId: 'platinum',
      teamName: 'Sinnoh Squad',
      team: [
        { speciesSlug: 'infernape', moveSlugs: ['closecombat'], gender: 'M', shiny: true },
        null,
        null,
        null,
        null,
        null,
      ],
    });

    const { history } = renderAtUrl(`/?p=${campaignParams.p}`);

    expect(await screen.findByText('Infernape')).toBeInTheDocument();
    await waitFor(() => {
      expect(history.location.pathname).toBe('/game/platinum/team');
    });
    expect(useTeamStore.getState().context.mode).toBe('campaign');
    expect(useTeamStore.getState().teamName).toBe('Sinnoh Squad');
  });

  it('navigates and retains state when loading a campaign team while in Free Mode, and vice versa', async () => {
    const savedTeams: SavedTeamRecord[] = [
      {
        id: 'saved-platinum',
        name: 'Platinum Run',
        updatedAt: '2026-01-02T00:00:00.000Z',
        mode: 'campaign',
        generation: 4,
        gameId: 'platinum',
        versionId: 'platinum',
        team: [
          { speciesSlug: 'infernape', moveSlugs: ['flareblitz'] },
          null,
          null,
          null,
          null,
          null,
        ],
      },
      {
        id: 'saved-emerald',
        name: 'Hoenn Core',
        updatedAt: '2026-01-01T00:00:00.000Z',
        mode: 'campaign',
        generation: 3,
        gameId: 'emerald',
        versionId: 'emerald',
        team: [
          { speciesSlug: 'swampert', moveSlugs: ['earthquake'] },
          null,
          null,
          null,
          null,
          null,
        ],
      },
      {
        id: 'saved-free',
        name: 'Free Legends',
        updatedAt: '2026-01-03T00:00:00.000Z',
        mode: 'free',
        generation: 9,
        team: [
          { speciesSlug: 'volcarona', moveSlugs: ['quiverdance'] },
          null,
          null,
          null,
          null,
          null,
        ],
      },
    ];
    idbStore.set(STORAGE_KEYS.savedTeams, savedTeams);

    const { history } = renderAtUrl('/free');

    // Wait for initial load and open Saved Teams modal
    const savedBtn = await screen.findByRole('button', { name: 'Saved teams' });
    fireEvent.click(savedBtn);

    // 1. Load Platinum campaign team from Free Mode
    const platinumLabel = await screen.findByText('Platinum Run');
    const platinumRow = platinumLabel.closest('li');
    expect(platinumRow).not.toBeNull();
    fireEvent.click(within(platinumRow as HTMLElement).getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(history.location.pathname).toBe('/game/platinum/team');
    });
    expect(await screen.findByText('Infernape')).toBeInTheDocument();
    expect(useTeamStore.getState().activeManifest?.id).toBe('platinum');
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('infernape');

    // 2. From Platinum, load Emerald campaign team (tests staying mounted across campaign gameId changes)
    fireEvent.click(screen.getByRole('button', { name: 'Saved teams' }));
    const emeraldLabel = await screen.findByText('Hoenn Core');
    const emeraldRow = emeraldLabel.closest('li');
    expect(emeraldRow).not.toBeNull();
    fireEvent.click(within(emeraldRow as HTMLElement).getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(history.location.pathname).toBe('/game/emerald/team');
    });
    expect(await screen.findByText('Swampert')).toBeInTheDocument();
    expect(useTeamStore.getState().activeManifest?.id).toBe('emerald');
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('swampert');

    // 3. From Emerald, load Free Mode team
    fireEvent.click(screen.getByRole('button', { name: 'Saved teams' }));
    const freeLabel = await screen.findByText('Free Legends');
    const freeRow = freeLabel.closest('li');
    expect(freeRow).not.toBeNull();
    fireEvent.click(within(freeRow as HTMLElement).getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(history.location.pathname).toBe('/free');
    });
    expect(await screen.findByText('Volcarona')).toBeInTheDocument();
    expect(useTeamStore.getState().context.mode).toBe('free');
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('volcarona');
  });

  it('syncs URL search params when editing a team on /free without re-running initialization', async () => {
    const { history } = renderAtUrl('/free');

    const searchInput = await screen.findByLabelText('Search Pokémon');
    fireEvent.change(searchInput, { target: { value: 'Pikachu' } });

    const pikachuTile = await screen.findByRole('button', { name: 'Pikachu' });
    fireEvent.click(pikachuTile);

    expect(await screen.findByText('Pikachu')).toBeInTheDocument();
    await waitFor(() => {
      expect(history.location.search).toMatch(/^\?p=(?!v\d+_)/);
    });

    // Toggling shiny updates the URL in place without reverting the team
    fireEvent.click(screen.getByRole('button', { name: 'Toggle shiny Pikachu' }));
    await waitFor(() => {
      const params = Object.fromEntries(new URLSearchParams(history.location.search));
      const decoded = decodeTeamFromSearchParams(params, pkmnDexGateway);
      expect(decoded.ok && decoded.state.team[0]?.speciesSlug).toBe('pikachu');
      expect(decoded.ok && decoded.state.team[0]?.shiny).toBe(true);
    });
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('pikachu');
    expect(useTeamStore.getState().team[0]?.shiny).toBe(true);
  });
});
