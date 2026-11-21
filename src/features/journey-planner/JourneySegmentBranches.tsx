import { Plus } from 'lucide-react';
import type { EvaluatedJourneyBranchNode } from '@/domain/journey';
import type { GenerationNumber, JourneyStepNode } from '@/domain/types';
import { JourneyStepCard } from './JourneyStepCard';

interface JourneySegmentBranchesProps {
  checkpointId: string;
  branches: readonly EvaluatedJourneyBranchNode[];
  generation: GenerationNumber;
  onAddRootStep: (checkpointId: string) => void;
  onAddChildStep: (parentNode: JourneyStepNode, branchNode: EvaluatedJourneyBranchNode) => void;
  onEditStep: (branchNode: EvaluatedJourneyBranchNode) => void;
  onRemoveStep: (stepId: string) => void;
}

function BranchSubtree({
  branch,
  generation,
  onAddChildStep,
  onEditStep,
  onRemoveStep,
}: {
  branch: EvaluatedJourneyBranchNode;
  generation: GenerationNumber;
  onAddChildStep: (parentNode: JourneyStepNode, branchNode: EvaluatedJourneyBranchNode) => void;
  onEditStep: (branchNode: EvaluatedJourneyBranchNode) => void;
  onRemoveStep: (stepId: string) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <JourneyStepCard
        branch={branch}
        generation={generation}
        onAddChildStep={onAddChildStep}
        onEditStep={onEditStep}
        onRemoveStep={onRemoveStep}
      />

      {branch.children.length === 1 && branch.children[0] && (
        <>
          <div className="h-4 w-px bg-[var(--border-strong)]" aria-hidden="true" />
          <BranchSubtree
            branch={branch.children[0]}
            generation={generation}
            onAddChildStep={onAddChildStep}
            onEditStep={onEditStep}
            onRemoveStep={onRemoveStep}
          />
        </>
      )}

      {branch.children.length > 1 && (
        <div className="flex flex-col items-center">
          <div className="h-4 w-px bg-[var(--border-strong)]" aria-hidden="true" />
          <div className="flex flex-wrap justify-center gap-3 border-t border-[var(--border-strong)] pt-4">
            {branch.children.map((child) => (
              <BranchSubtree
                key={child.node.id}
                branch={child}
                generation={generation}
                onAddChildStep={onAddChildStep}
                onEditStep={onEditStep}
                onRemoveStep={onRemoveStep}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function JourneySegmentBranches({
  checkpointId,
  branches,
  generation,
  onAddRootStep,
  onAddChildStep,
  onEditStep,
  onRemoveStep,
}: JourneySegmentBranchesProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Top stem */}
      <div className="h-5 w-px bg-[var(--border-strong)]" aria-hidden="true" />

      {branches.length > 0 && (
        <div className="flex max-w-full flex-col items-center">
          {branches.length > 1 && (
            <div className="h-px w-3/4 bg-[var(--border-strong)]" aria-hidden="true" />
          )}
          <div className="flex flex-wrap items-start justify-center gap-4 pt-3">
            {branches.map((branch) => (
              <div key={branch.node.id} className="flex flex-col items-center">
                {branches.length > 1 && (
                  <div
                    className="-mt-3 mb-2 h-3 w-px bg-[var(--border-strong)]"
                    aria-hidden="true"
                  />
                )}
                <BranchSubtree
                  branch={branch}
                  generation={generation}
                  onAddChildStep={onAddChildStep}
                  onEditStep={onEditStep}
                  onRemoveStep={onRemoveStep}
                />
              </div>
            ))}
          </div>
          <div className="h-4 w-px bg-[var(--border-strong)]" aria-hidden="true" />
        </div>
      )}

      {/* Segment action trigger */}
      <button
        type="button"
        onClick={() => onAddRootStep(checkpointId)}
        aria-label="Add step"
        title="Add step"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--ink-secondary)] transition hover:border-[var(--accent-primary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {/* Bottom stem into milestone */}
      <div className="h-5 w-px bg-[var(--border-strong)]" aria-hidden="true" />
    </div>
  );
}
