import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGameManifest } from '@/data/games/gameLoader';
import type { GameCatalogEntry, GameManifest } from '@/domain/types';
import { GameSelectorPage } from '@/features/game-selector/GameSelectorPage';
import { useTeamStore } from '@/stores/useTeamStore';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const MOCK_CATALOG: GameCatalogEntry[] = [
  {
    id: 'platinum',
    name: 'Pokémon Platinum',
    shortName: 'Platinum',
    generation: 4,
    region: 'Sinnoh',
    versions: [{ id: 'platinum', name: 'Platinum' }],
    mechanics: {
      hasAbilities: true,
      hasHeldItems: true,
      hasNatures: true,
      physicalSpecialSplit: true,
      gimmick: null,
    },
    manifestPath: '/data/games/platinum.json',
  },
];

const MOCK_MANIFEST: GameManifest = {
  id: 'platinum',
  name: 'Pokémon Platinum',
  shortName: 'Platinum',
  generation: 4,
  region: 'Sinnoh',
  versionGroup: 'platinum',
  versions: [{ id: 'platinum', name: 'Platinum' }],
  mechanics: {
    hasAbilities: true,
    hasHeldItems: true,
    hasNatures: true,
    physicalSpecialSplit: true,
    gimmick: null,
  },
  checkpoints: [
    {
      id: 'gym-1',
      order: 1,
      name: 'Gym 1',
      category: 'gym',
      levelCap: 14,
      bossName: 'Roark',
      bossNotablePokemon: ['cranidos'],
      unlockedLocations: ['oreburgh-mine'],
    },
  ],
  dex: {},
};

vi.mock('@/data/games/gameLoader', () => ({
  loadGameCatalog: vi.fn(async () => MOCK_CATALOG),
  loadGameManifest: vi.fn(async (gameId: string) => (gameId === 'platinum' ? MOCK_MANIFEST : null)),
}));

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe('GameSelectorPage UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    useTeamStore.getState().resetTeam();
  });

  afterEach(() => {
    cleanup();
  });

  it('displays Free Mode independently without generation numbers alongside curated games', async () => {
    renderWithQueryClient(<GameSelectorPage />);

    const freeModeBtn = screen.getByRole('button', { name: /Free Mode/i });
    expect(freeModeBtn).toBeInTheDocument();
    expect(freeModeBtn).not.toHaveTextContent(/Gen \d/i);

    expect(await screen.findByText('Platinum')).toBeInTheDocument();

    fireEvent.click(freeModeBtn);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/free' });
  });

  it('caches selected game manifests via TanStack Query before navigating', async () => {
    const { queryClient } = renderWithQueryClient(<GameSelectorPage />);
    const platinumBtn = await screen.findByRole('button', { name: /Platinum/i });

    fireEvent.click(platinumBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/game/$gameId/team',
        params: { gameId: 'platinum' },
      });
    });
    expect(loadGameManifest).toHaveBeenCalledWith('platinum');
    expect(queryClient.getQueryData(['game-manifest', 'platinum'])).toEqual(MOCK_MANIFEST);
  });
});
