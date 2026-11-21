import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedTeamRecord } from '@/data/storage/teamStorage';
import { createEmptyTeam } from '@/domain/team';
import { useTeamStore } from '@/stores/useTeamStore';
import { SavedTeamsModal } from '../SavedTeamsModal';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => []),
  set: vi.fn(async () => undefined),
}));

describe('SavedTeamsModal Free Mode label handling', () => {
  beforeEach(() => {
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().selectFreeMode();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('displays Free Mode instead of Gen 9 for saved Free Mode teams', () => {
    const freeRecord: SavedTeamRecord = {
      id: 'team-free-1',
      name: 'OU Balance',
      updatedAt: '2026-01-01T00:00:00.000Z',
      mode: 'free',
      generation: 9,
      team: createEmptyTeam(),
    };
    const campaignRecord: SavedTeamRecord = {
      id: 'team-camp-1',
      name: 'Platinum Run',
      updatedAt: '2026-01-01T00:00:00.000Z',
      mode: 'campaign',
      generation: 4,
      gameId: 'platinum',
      team: createEmptyTeam(),
    };
    useTeamStore.setState({ savedTeams: [freeRecord, campaignRecord] });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SavedTeamsModal open onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Free Mode')).toBeInTheDocument();
    expect(screen.queryByText('Gen 9')).not.toBeInTheDocument();
    expect(screen.getByText('Gen 4')).toBeInTheDocument();
  });

  it('defaults Free Mode saved team name to Free Mode Team', async () => {
    useTeamStore.getState().addSpeciesToTeam('pikachu');
    const saved = await useTeamStore.getState().saveCurrentTeam();
    expect(saved.name).toBe('Free Mode Team');
    expect(fireEvent).toBeDefined();
  });
});
