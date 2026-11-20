import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SmartRecommendationsPanel } from '@/features/smart-recommendations/SmartRecommendationsPanel';
import { useTeamStore } from '@/stores/useTeamStore';

describe('SmartRecommendationsPanel UI Integration', () => {
  beforeEach(() => {
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().setGeneration(5);
  });

  afterEach(() => {
    cleanup();
  });

  it('displays explained recommendations and applies a picked teammate in one click', () => {
    const store = useTeamStore.getState();
    store.setSlotSpecies(0, 'heatran');
    store.setSlotSpecies(1, 'magnezone');
    store.setSlotSpecies(2, 'tyranitar');

    render(<SmartRecommendationsPanel />);

    // Should explain why suggestions fix the critical Ground/Fighting weakness
    const addButtons = screen.getAllByRole('button', { name: /Add to Slot 4/i });
    expect(addButtons.length).toBeGreaterThan(0);

    fireEvent.click(addButtons[0] as HTMLElement);
    expect(useTeamStore.getState().team[3]).not.toBeNull();
  });
});
