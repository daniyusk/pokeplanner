import type { JourneyStepType } from '@/domain/types';
import { JOURNEY_STEP_LABELS, JOURNEY_STEP_ORDER } from '../stepLabels';

interface StepTypeSwitcherProps {
  stepType: JourneyStepType;
  onChange: (nextType: JourneyStepType) => void;
}

export function StepTypeSwitcher({ stepType, onChange }: StepTypeSwitcherProps) {
  return (
    <div className="grid grid-cols-5 gap-1 rounded-xl bg-[var(--surface-elevated)] p-1">
      {JOURNEY_STEP_ORDER.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`rounded-lg py-1.5 text-xs font-medium transition ${
            stepType === type
              ? 'bg-[var(--surface-card)] text-[var(--ink-primary)]'
              : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
          }`}
        >
          {JOURNEY_STEP_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
