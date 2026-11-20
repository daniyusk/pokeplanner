import fs from 'node:fs';
import path from 'node:path';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gameManifestSchema } from '@/data/games/gameManifestSchema';
import type { GameManifest } from '@/domain/types';
import { JourneyPlannerPanel } from '@/features/journey-planner/JourneyPlannerPanel';
import { useTeamStore } from '@/stores/useTeamStore';

const b2w2Raw = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, '../../../../public/data/games/black-2-white-2.json'),
    'utf-8',
  ),
);
const B2W2_MANIFEST = gameManifestSchema.parse(b2w2Raw) as GameManifest;

describe('JourneyPlannerPanel UI Integration', () => {
  beforeEach(() => {
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().setGeneration(9);
  });

  afterEach(() => {
    cleanup();
  });

  it('tracks evolution progression, catch locations, and boss matchups across B2W2 checkpoints', () => {
    const store = useTeamStore.getState();
    store.setGeneration(5);
    store.setSlotSpecies(0, 'serperior');
    store.setSlotSpecies(1, 'lucario');
    store.selectCampaignGame(B2W2_MANIFEST, 'black-2');

    render(<JourneyPlannerPanel />);

    expect(screen.getByText(/Journey Planner — Pokémon Black 2 \/ White 2/i)).toBeInTheDocument();
    // At Gym 1 Cheren (Cap Lv 13), Serperior (Lv 36) should auto-devolve to Snivy and Lucario (friendship) is available
    expect(screen.getByText('Snivy')).toBeInTheDocument();
    expect(screen.getByText(/Boss Matchup — Cheren/i)).toBeInTheDocument();

    // Switch to Gym 5 Clay (Cap Lv 33): Snivy -> Servine (Lv 17, Serperior is Lv 36)
    fireEvent.click(screen.getByRole('tab', { name: /Gym 5 — Clay/i }));
    expect(screen.getByText('Servine')).toBeInTheDocument();
    expect(screen.getByText(/Boss Matchup — Clay/i)).toBeInTheDocument();

    // Switch to Champion Iris (Cap Lv 59): Servine -> Serperior
    fireEvent.click(screen.getByRole('tab', { name: /Elite Four & Champion Iris/i }));
    expect(screen.getByText('Serperior')).toBeInTheDocument();
  });
});
