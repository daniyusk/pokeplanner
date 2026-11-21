import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TeamAnalysisSection } from '@/features/team-analysis/TeamAnalysisSection';
import { useTeamStore } from '@/stores/useTeamStore';

describe('TeamAnalysisSection UI Integration', () => {
  beforeEach(() => {
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().setGeneration(5);
  });

  afterEach(() => {
    cleanup();
  });

  it('updates defensive matrix, offensive coverage, and stats tabs interactively', () => {
    const store = useTeamStore.getState();
    store.setSlotSpecies(0, 'heatran');
    store.setSlotSpecies(1, 'magnezone');
    store.setSlotSpecies(2, 'tyranitar');

    render(<TeamAnalysisSection />);

    // Critical Ground weakness insight appears immediately
    expect(screen.getByText(/Critical shared weakness to .*Ground/i)).toBeInTheDocument();

    // Switch to Offensive Coverage tab
    fireEvent.click(screen.getByRole('tab', { name: /Offensive Coverage/i }));
    expect(screen.getByText(/Super-Effective Coverage:/i)).toBeInTheDocument();

    // Switch to Stats & Roles tab
    fireEvent.click(screen.getByRole('tab', { name: /Stats & Roles/i }));
    expect(screen.getByText(/Average BST:/i)).toBeInTheDocument();

    // Radar chart axis labels must be placed outside the outer polygon spokes, not clamped onto vertices
    const radar = screen.getByRole('img', { name: /Team base stat radar chart/i });
    const hpLabel = screen.getByText('HP', { selector: 'text' });
    const speLabel = screen.getByText('Spe', { selector: 'text' });
    const spokeLines = Array.from(radar.querySelectorAll('line'));
    const spokeYValues = spokeLines.map((line) => Number(line.getAttribute('y2')));
    const minSpokeY = Math.min(...spokeYValues);
    const maxSpokeY = Math.max(...spokeYValues);

    expect(Number(hpLabel.getAttribute('y'))).toBeLessThan(minSpokeY);
    expect(Number(speLabel.getAttribute('y'))).toBeGreaterThan(maxSpokeY);
  });

  it('displays fractional 1.25x weaknesses as threats in DefensiveMatrix', () => {
    const store = useTeamStore.getState();
    store.setSlotSpecies(0, 'toxicroak');
    store.updateSlotMember(0, { abilitySlug: 'dryskin' });

    render(<TeamAnalysisSection />);

    fireEvent.click(screen.getByRole('button', { name: /Filter: Threats & Resists/i }));
    expect(screen.getByText('1.25×')).toBeInTheDocument();
  });
});
