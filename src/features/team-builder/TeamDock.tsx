import type { TeamSlotIndex } from '@/domain/types';
import { useTeamStore } from '@/stores/useTeamStore';
import { TeamSlotCard } from './TeamSlotCard';

const SLOT_INDICES: readonly TeamSlotIndex[] = [0, 1, 2, 3, 4, 5];

export function TeamDock() {
  const context = useTeamStore((s) => s.context);
  const team = useTeamStore((s) => s.team);
  const openPicker = useTeamStore((s) => s.openPicker);
  const openEditor = useTeamStore((s) => s.openEditor);
  const clearSlot = useTeamStore((s) => s.clearSlot);
  const swapSlots = useTeamStore((s) => s.swapSlots);

  const filledCount = team.filter((slot) => slot !== null).length;

  return (
    <section aria-labelledby="team-dock-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="team-dock-heading"
          className="text-lg font-bold tracking-tight text-[var(--ink-primary)]"
        >
          Your Team{' '}
          <span className="text-sm font-medium tabular-nums text-[var(--ink-muted)]">
            ({filledCount}/6)
          </span>
        </h2>
        <p className="text-xs text-[var(--ink-muted)]">
          Press{' '}
          <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] px-1.5 py-0.5 font-mono text-[11px]">
            Ctrl+K
          </kbd>{' '}
          or keys{' '}
          <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] px-1.5 py-0.5 font-mono text-[11px]">
            1–6
          </kbd>{' '}
          to pick quickly
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {SLOT_INDICES.map((slotIndex) => {
          const member = team[slotIndex];
          return (
            <TeamSlotCard
              key={slotIndex}
              slotIndex={slotIndex}
              member={member}
              context={context}
              onAdd={() => openPicker(slotIndex)}
              onEdit={() => openEditor(slotIndex)}
              onRemove={() => clearSlot(slotIndex)}
              {...(slotIndex > 0
                ? { onSwapLeft: () => swapSlots(slotIndex, (slotIndex - 1) as TeamSlotIndex) }
                : {})}
              {...(slotIndex < 5
                ? { onSwapRight: () => swapSlots(slotIndex, (slotIndex + 1) as TeamSlotIndex) }
                : {})}
            />
          );
        })}
      </div>
    </section>
  );
}
