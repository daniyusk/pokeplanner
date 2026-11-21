import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as sharing from '@/domain/sharing';
import { useTeamStore } from '@/stores/useTeamStore';
import { ShareShowdownModal } from '../ShareShowdownModal';

describe('ShareShowdownModal shell behavior', () => {
  beforeEach(() => {
    useTeamStore.getState().resetTeam();
    useTeamStore.getState().selectFreeMode();
    useTeamStore.getState().setSlotSpecies(0, 'pikachu');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('skips Showdown export calculation while closed and exports when opened', () => {
    const exportSpy = vi.spyOn(sharing, 'exportTeamToShowdown');
    const { rerender } = render(
      <ShareShowdownModal
        open={false}
        onOpenChange={vi.fn()}
        shareUrl="https://example.com/free"
      />,
    );

    expect(exportSpy).not.toHaveBeenCalled();

    rerender(
      <ShareShowdownModal open onOpenChange={vi.fn()} shareUrl="https://example.com/free" />,
    );

    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Exported Showdown team text')).toHaveValue(
      exportSpy.mock.results[0]?.value,
    );
  });
});
