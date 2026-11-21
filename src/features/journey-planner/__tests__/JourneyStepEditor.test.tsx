import fs from 'node:fs';
import path from 'node:path';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameManifestSchema } from '@/data/games/gameManifestSchema';
import type { EvaluatedJourneyBranchNode } from '@/domain/journey';
import { createEmptyTeam } from '@/domain/team';
import { JourneyStepCard } from '../JourneyStepCard';
import { JourneyStepEditor, type StepEditorContext } from '../JourneyStepEditor';

const platinumRaw = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, '../../../../public/data/games/platinum.json'),
    'utf-8',
  ),
);
const PLATINUM_MANIFEST = gameManifestSchema.parse(platinumRaw);
const CHECKPOINT = PLATINUM_MANIFEST.checkpoints[0];
if (!CHECKPOINT) throw new Error('Expected at least one checkpoint in Platinum manifest');

describe('JourneyStepEditor shell and keyed reset', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing when closed', () => {
    const context: StepEditorContext = {
      mode: 'create',
      checkpoint: CHECKPOINT,
      parentStepId: null,
      teamAvailableAtPoint: createEmptyTeam(),
    };
    const { container } = render(
      <JourneyStepEditor
        open={false}
        editorContext={context}
        manifest={PLATINUM_MANIFEST}
        excludeTradeEvolutions
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not leak stale capture location from a previously edited step into another step', () => {
    const captureContext: StepEditorContext = {
      mode: 'edit',
      checkpoint: CHECKPOINT,
      parentStepId: null,
      editStepId: 'step-capture-1',
      initialAction: {
        type: 'capture',
        speciesSlug: 'starly',
        level: 4,
        location: 'Route 201',
      },
      teamAvailableAtPoint: createEmptyTeam(),
    };

    const goalContext: StepEditorContext = {
      mode: 'edit',
      checkpoint: CHECKPOINT,
      parentStepId: null,
      editStepId: 'step-goal-2',
      initialAction: {
        type: 'goal',
        title: 'Catch Starly early',
      },
      teamAvailableAtPoint: createEmptyTeam(),
    };

    const { rerender } = render(
      <JourneyStepEditor
        open
        editorContext={captureContext}
        manifest={PLATINUM_MANIFEST}
        excludeTradeEvolutions
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Route 201')).toBeInTheDocument();

    rerender(
      <JourneyStepEditor
        open={false}
        editorContext={null}
        manifest={PLATINUM_MANIFEST}
        excludeTradeEvolutions
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    rerender(
      <JourneyStepEditor
        open
        editorContext={goalContext}
        manifest={PLATINUM_MANIFEST}
        excludeTradeEvolutions
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Switch type inside step 2 from Goal -> Capture and ensure old Route 201 did not leak
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    const locationField = screen.getByLabelText(/Location/i) as HTMLInputElement;
    expect(locationField.value).toBe('');
  });

  it('allows clearing Train target level input before typing a new two-digit level', () => {
    const createContext: StepEditorContext = {
      mode: 'create',
      checkpoint: CHECKPOINT,
      parentStepId: null,
      teamAvailableAtPoint: [
        { speciesSlug: 'chimchar', moveSlugs: [] },
        null,
        null,
        null,
        null,
        null,
      ],
    };

    const onSubmit = vi.fn();
    render(
      <JourneyStepEditor
        open
        editorContext={createContext}
        manifest={PLATINUM_MANIFEST}
        excludeTradeEvolutions
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Train' }));
    const levelInput = screen.getByLabelText('Target Level') as HTMLInputElement;
    fireEvent.change(levelInput, { target: { value: '' } });
    expect(levelInput.value).toBe('');

    fireEvent.change(levelInput, { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'train', targetLevel: 25 }),
    );
  });

  it('displays every diagnostic warning on JourneyStepCard when multiple warnings apply', () => {
    const branch: EvaluatedJourneyBranchNode = {
      node: {
        id: 'step-multi-warn',
        beforeCheckpointId: CHECKPOINT.id,
        parentStepId: null,
        order: 1,
        action: { type: 'capture', speciesSlug: 'starly', level: 55 },
      },
      status: 'warning',
      messages: ['Exclusive to Diamond (not catchable in platinum).', 'Lv 55 exceeds Lv 14 cap.'],
      teamAfterStep: createEmptyTeam(),
      teamBeforeStep: createEmptyTeam(),
      children: [],
    };

    render(
      <JourneyStepCard
        branch={branch}
        generation={4}
        onAddChildStep={vi.fn()}
        onEditStep={vi.fn()}
        onRemoveStep={vi.fn()}
      />,
    );

    expect(screen.getByText(/Exclusive to Diamond/i)).toBeInTheDocument();
    expect(screen.getByText(/Lv 55 exceeds Lv 14 cap/i)).toBeInTheDocument();
  });
});
