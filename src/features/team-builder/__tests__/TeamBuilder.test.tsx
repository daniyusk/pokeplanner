import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuildDrawer } from '@/features/team-builder/BuildDrawer';
import { PokemonPickerModal } from '@/features/team-builder/PokemonPickerModal';
import { TeamDock } from '@/features/team-builder/TeamDock';
import { useTeamStore } from '@/stores/useTeamStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => []),
  set: vi.fn(async () => undefined),
}));

describe('TeamBuilder UI Integration', () => {
  beforeEach(() => {
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().setGeneration(5);
  });

  afterEach(() => {
    cleanup();
  });

  it('lets a user pick a Pokémon into a slot and open its Build Drawer', async () => {
    render(
      <>
        <TeamDock />
        <PokemonPickerModal />
        <BuildDrawer />
      </>,
    );

    const addButtons = screen.getAllByRole('button', { name: /Add Pokémon/i });
    expect(addButtons).toHaveLength(6);

    fireEvent.click(addButtons[0] as HTMLElement);

    const searchInput = await screen.findByLabelText('Search Pokémon');
    fireEvent.change(searchInput, { target: { value: 'Volcarona' } });

    const volcaronaOption = await screen.findByRole('button', { name: /Volcarona/i });
    fireEvent.click(volcaronaOption);

    // Slot 1 now displays Volcarona and its types (Bug / Fire)
    expect(screen.getByText('Volcarona')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Fire')).toBeInTheDocument();

    // Clicking the build preview opens BuildDrawer
    const configureBtn = screen.getByRole('button', { name: /Flame Body/i });
    fireEvent.click(configureBtn);

    expect(await screen.findByText('Volcarona — Build')).toBeInTheDocument();
  });
});
