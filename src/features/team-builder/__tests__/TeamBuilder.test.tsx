import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { BuildDrawer } from '@/features/team-builder/BuildDrawer';
import { PokemonBrowser } from '@/features/team-builder/PokemonBrowser';
import { TeamDock } from '@/features/team-builder/TeamDock';
import { useTeamStore } from '@/stores/useTeamStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => []),
  set: vi.fn(async () => undefined),
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

describe('TeamBuilder UI Integration', () => {
  beforeEach(() => {
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().selectFreeMode();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('adds a Pokémon by clicking in the bottom visual list, toggles gender/shiny, and opens adjust drawer', async () => {
    renderWithQueryClient(
      <>
        <TeamDock onFocusBrowser={() => undefined} />
        <PokemonBrowser />
        <BuildDrawer />
      </>,
    );

    expect(screen.getAllByRole('button', { name: 'Empty team slot' })).toHaveLength(6);

    const searchInput = screen.getByLabelText('Search Pokémon');
    fireEvent.change(searchInput, { target: { value: 'Volcarona' } });

    const volcaronaTile = await screen.findByRole('button', { name: 'Volcarona' });
    // Visual list tiles should not display text names visibly
    expect(volcaronaTile.textContent).toBe('');

    fireEvent.click(volcaronaTile);

    // Slot card displays Volcarona's name, types, gender, shiny, and adjust controls
    expect(screen.getByText('Volcarona')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Fire')).toBeInTheDocument();
    expect(screen.queryByText(/#\d{4}/)).not.toBeInTheDocument();

    // Toggle gender (M -> F) and verify sprite updates to female variant
    const genderBtn = screen.getByRole('button', { name: /Gender: Male \(Volcarona\)/i });
    fireEvent.click(genderBtn);
    expect(useTeamStore.getState().team[0]?.gender).toBe('F');
    const slotImages = screen.getAllByRole('img', { name: 'Volcarona' });
    expect(slotImages.some((img) => img.getAttribute('src')?.includes('volcarona-f.png'))).toBe(
      true,
    );

    // Toggle shiny
    const shinyBtn = screen.getByRole('button', { name: 'Toggle shiny Volcarona' });
    fireEvent.click(shinyBtn);
    expect(useTeamStore.getState().team[0]?.shiny).toBe(true);

    // Open adjust drawer — header sprite also uses female variant when selected
    const adjustBtn = screen.getByRole('button', { name: 'Adjust Volcarona' });
    fireEvent.click(adjustBtn);

    expect(await screen.findByRole('heading', { name: 'Volcarona' })).toBeInTheDocument();
    const drawerDialog = screen.getByRole('dialog');
    const drawerImgs = drawerDialog.querySelectorAll('img[alt="Volcarona"]');
    expect(
      Array.from(drawerImgs).some((img) => img.getAttribute('src')?.includes('volcarona-f.png')),
    ).toBe(true);

    // Clicking Volcarona again in browser adds a second copy instead of removing it
    fireEvent.click(volcaronaTile);
    expect(useTeamStore.getState().team[0]?.speciesSlug).toBe('volcarona');
    expect(useTeamStore.getState().team[1]?.speciesSlug).toBe('volcarona');
  });

  it('caches learnable move slugs across BuildDrawer reopens for the same species and generation', async () => {
    const learnsetSpy = vi.spyOn(pkmnDexGateway, 'getLearnableMoveSlugs');
    useTeamStore.getState().setSlotSpecies(0, 'volcarona');

    renderWithQueryClient(
      <>
        <TeamDock onFocusBrowser={() => undefined} />
        <BuildDrawer />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Adjust Volcarona' }));
    expect(await screen.findByRole('heading', { name: 'Volcarona' })).toBeInTheDocument();
    await waitFor(() => {
      expect(learnsetSpy).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close build drawer' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Volcarona' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Adjust Volcarona' }));
    expect(await screen.findByRole('heading', { name: 'Volcarona' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(learnsetSpy).toHaveBeenCalledTimes(1);
  });

  it('does not fetch learnsets while closed and resets filter queries when switching slots', async () => {
    const learnsetSpy = vi.spyOn(pkmnDexGateway, 'getLearnableMoveSlugs');
    useTeamStore.getState().setSlotSpecies(0, 'volcarona');
    useTeamStore.getState().setSlotSpecies(1, 'pikachu');

    renderWithQueryClient(
      <>
        <TeamDock onFocusBrowser={() => undefined} />
        <BuildDrawer />
      </>,
    );

    expect(learnsetSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Adjust Volcarona' }));
    expect(await screen.findByRole('heading', { name: 'Volcarona' })).toBeInTheDocument();

    const moveSearch = screen.getByLabelText('Search moves') as HTMLInputElement;
    fireEvent.change(moveSearch, { target: { value: 'quiver' } });
    expect(moveSearch.value).toBe('quiver');

    fireEvent.click(screen.getByRole('button', { name: 'Close build drawer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adjust Pikachu' }));
    expect(await screen.findByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    expect((screen.getByLabelText('Search moves') as HTMLInputElement).value).toBe('');
  });

  it('resets all local PokemonBrowser filters including checkboxes when switching scope', async () => {
    renderWithQueryClient(<PokemonBrowser />);

    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));
    const fullyEvolvedCheckbox = screen.getByLabelText('Fully Evolved') as HTMLInputElement;
    const noLegendariesCheckbox = screen.getByLabelText('No Legendaries') as HTMLInputElement;
    fireEvent.click(fullyEvolvedCheckbox);
    fireEvent.click(noLegendariesCheckbox);
    expect(fullyEvolvedCheckbox.checked).toBe(true);
    expect(noLegendariesCheckbox.checked).toBe(true);

    act(() => {
      useTeamStore.getState().selectCampaignGame({
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
        checkpoints: [],
        dex: {},
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: /Filters/i }));
    expect((screen.getByLabelText('Fully Evolved') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('No Legendaries') as HTMLInputElement).checked).toBe(false);
  });
});
