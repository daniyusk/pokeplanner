import fs from 'node:fs';
import path from 'node:path';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { get, set } from 'idb-keyval';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameManifestSchema } from '@/data/games/gameManifestSchema';
import { JourneyPlannerPage } from '@/features/journey-planner/JourneyPlannerPage';
import { useJourneyStore } from '@/stores/useJourneyStore';
import { useTeamStore } from '@/stores/useTeamStore';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={props.to}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
  useParams: () => ({ gameId: 'platinum' }),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => ({})),
  set: vi.fn(async () => undefined),
}));

const platinumRaw = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, '../../../../public/data/games/platinum.json'),
    'utf-8',
  ),
);
const PLATINUM_MANIFEST = gameManifestSchema.parse(platinumRaw);

vi.mock('@/data/games/gameLoader', () => ({
  loadGameCatalog: vi.fn(async () => []),
  loadGameManifest: vi.fn(async (gameId: string) =>
    gameId === 'platinum' ? PLATINUM_MANIFEST : null,
  ),
}));

function renderWithQueryClient(ui: ReactNode, queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  return {
    queryClient: client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  };
}

describe('JourneyPlannerPage UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useJourneyStore.setState({ plansByGameId: {}, isLoaded: true });
    useTeamStore.getState().resetTeam();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('starts at starter selection, adds intermediate evolution/capture branches, and evaluates milestone teams', async () => {
    renderWithQueryClient(<JourneyPlannerPage />);

    // Root starts at Starter Selection
    expect(await screen.findByText('Choose Starter')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Chimchar/i }));

    // Starter is locked in and checkpoints appear
    expect(await screen.findByText('Gym 1 — Roark (Oreburgh)')).toBeInTheDocument();
    expect(screen.getByLabelText('Final team')).toBeInTheDocument();
    // Minimalist '+' trigger should not render visible "Add step" text
    expect(screen.queryByText('Add step')).not.toBeInTheDocument();

    // Add an intermediate step before Gym 1 (chain evolution Chimchar -> Monferno)
    const addStepButtons = screen.getAllByRole('button', { name: 'Add step' });
    // There is one '+' trigger per checkpoint plus one between the last checkpoint and Final Team
    expect(addStepButtons.length).toBe(PLATINUM_MANIFEST.checkpoints.length + 1);
    fireEvent.click(addStepButtons[0] as HTMLElement);

    fireEvent.click(await screen.findByRole('button', { name: 'Evolve' }));
    expect(await screen.findByText('Monferno')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Monferno/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    // Step node appears in the tree and updates the final team
    expect(await screen.findByText('Evolve')).toBeInTheDocument();
    const finalSection = screen.getByLabelText('Final team');
    expect(finalSection).toHaveTextContent('Monferno');
  });

  it('waits for IndexedDB hydration before ensuring a plan so cached manifests do not clobber saved journeys', async () => {
    useJourneyStore.setState({ plansByGameId: {}, isLoaded: false });
    vi.mocked(get).mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return {
        platinum: {
          gameId: 'platinum',
          versionId: 'platinum',
          starterSlug: 'piplup',
          starterLevel: 5,
          steps: [
            {
              id: 'saved-step-1',
              beforeCheckpointId: 'gym-1-roark',
              parentStepId: null,
              order: 1,
              action: { type: 'train', speciesSlug: 'piplup', targetLevel: 14 },
            },
          ],
        },
      };
    });

    const cachedClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    cachedClient.setQueryData(['game-manifest', 'platinum'], PLATINUM_MANIFEST);
    renderWithQueryClient(<JourneyPlannerPage />, cachedClient);

    // Should hydrate the saved starter & step rather than falling back to "Choose Starter"
    expect(await screen.findByText('Gym 1 — Roark (Oreburgh)')).toBeInTheDocument();
    expect(screen.queryByText('Choose Starter')).not.toBeInTheDocument();
    expect(screen.getAllByText('Piplup').length).toBeGreaterThan(0);
    expect(set).not.toHaveBeenCalled();
  });
});
