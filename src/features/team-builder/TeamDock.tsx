import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TYPE_COLOR_VARS } from '@/components/pokemon/TypeIcon';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { TEAM_SLOT_INDICES } from '@/domain/constants';
import type { TeamSlotIndex } from '@/domain/types';
import { useTeamStore } from '@/stores/useTeamStore';
import { TeamSlotCard } from './TeamSlotCard';

function parseSlotIndex(id: string | number): TeamSlotIndex | null {
  if (typeof id !== 'string' || !id.startsWith('slot-')) return null;
  const parsed = Number(id.slice(5));
  if (parsed >= 0 && parsed <= 5 && Number.isInteger(parsed)) {
    return parsed as TeamSlotIndex;
  }
  return null;
}

interface TeamDockProps {
  onFocusBrowser: () => void;
}

export function TeamDock({ onFocusBrowser }: TeamDockProps) {
  const context = useTeamStore((s) => s.context);
  const team = useTeamStore((s) => s.team);
  const toggleSlotGender = useTeamStore((s) => s.toggleSlotGender);
  const toggleSlotShiny = useTeamStore((s) => s.toggleSlotShiny);
  const openEditor = useTeamStore((s) => s.openEditor);
  const clearSlot = useTeamStore((s) => s.clearSlot);
  const swapSlots = useTeamStore((s) => s.swapSlots);

  const [activeDragIndex, setActiveDragIndex] = useState<TeamSlotIndex | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragIndex(parseSlotIndex(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const fromIndex = parseSlotIndex(event.active.id);
    const toIndex = event.over ? parseSlotIndex(event.over.id) : null;
    setActiveDragIndex(null);
    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      swapSlots(fromIndex, toIndex);
    }
  };

  const activeMember = activeDragIndex !== null ? team[activeDragIndex] : null;
  const activeSpecies = activeMember
    ? pkmnDexGateway.getSpecies(activeMember.speciesSlug, context.generation)
    : null;

  return (
    <section aria-label="Your team">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragIndex(null)}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {TEAM_SLOT_INDICES.map((slotIndex) => (
            <TeamSlotCard
              key={slotIndex}
              slotIndex={slotIndex}
              member={team[slotIndex]}
              context={context}
              onFocusBrowser={onFocusBrowser}
              onToggleGender={() => toggleSlotGender(slotIndex)}
              onToggleShiny={() => toggleSlotShiny(slotIndex)}
              onEdit={() => openEditor(slotIndex)}
              onRemove={() => clearSlot(slotIndex)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeMember && activeSpecies ? (
            <div
              className="flex h-24 w-24 cursor-grabbing items-center justify-center rounded-full shadow-lg"
              style={{
                backgroundColor: `color-mix(in srgb, ${TYPE_COLOR_VARS[activeSpecies.types[0]]} 20%, var(--surface-card))`,
              }}
            >
              <PokemonSprite
                spriteId={activeSpecies.spriteId}
                dexNumber={activeSpecies.dexNumber}
                name={activeSpecies.name}
                size="lg"
                shiny={Boolean(activeMember.shiny)}
                gender={activeMember.gender}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
