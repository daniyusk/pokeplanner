import { Check, Wand2 } from 'lucide-react';
import type { BuildRecommendation } from '@/domain/recommendations';

interface AutoBuildSuggestionCardProps {
  recommendation: BuildRecommendation;
  applied: boolean;
  onApply: () => void;
}

export function AutoBuildSuggestionCard({
  recommendation,
  applied,
  onApply,
}: AutoBuildSuggestionCardProps) {
  return (
    <div className="space-y-2.5 rounded-xl border border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/6 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink-primary)]">
          <Wand2 className="h-3.5 w-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
          <span>Recommended Build for Team</span>
        </div>
        <button
          type="button"
          onClick={onApply}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-[var(--accent-primary)] px-2.5 text-[11px] font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-primary-hover)]"
        >
          {applied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Applied</span>
            </>
          ) : (
            <span>Auto-Fill Build</span>
          )}
        </button>
      </div>

      <ul className="space-y-1 text-[11px] text-[var(--ink-secondary)]">
        {recommendation.ability && (
          <li>
            <strong className="text-[var(--ink-primary)]">{recommendation.ability.name}:</strong>{' '}
            {recommendation.ability.reason}
          </li>
        )}
        {recommendation.item && (
          <li>
            <strong className="text-[var(--ink-primary)]">@ {recommendation.item.name}:</strong>{' '}
            {recommendation.item.reason}
          </li>
        )}
        {recommendation.nature && (
          <li>
            <strong className="text-[var(--ink-primary)]">
              {recommendation.nature.name} Nature:
            </strong>{' '}
            {recommendation.nature.reason}
          </li>
        )}
        {recommendation.moves.length > 0 && (
          <li>
            <strong className="text-[var(--ink-primary)]">Moves:</strong>{' '}
            {recommendation.moves.map((m) => `${m.move.name} (${m.reason})`).join(' · ')}
          </li>
        )}
      </ul>
    </div>
  );
}
