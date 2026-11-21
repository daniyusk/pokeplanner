import { useDraggable, useDroppable } from '@dnd-kit/core';
import { SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { TYPE_COLOR_VARS } from '@/components/pokemon/TypeIcon';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { resolveGenderFormeTarget } from '@/domain/team';
import type { GameContext, PokemonGender, TeamMember, TeamSlotIndex } from '@/domain/types';

interface TeamSlotCardProps {
  slotIndex: TeamSlotIndex;
  member: TeamMember | null;
  context: GameContext;
  onFocusBrowser: () => void;
  onToggleGender: () => void;
  onToggleShiny: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function GenderGlyph({ gender }: { gender: PokemonGender }) {
  if (gender === 'M') {
    return (
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="6.5" cy="9.5" r="3.5" />
        <path d="M9.2 6.8 13.5 2.5M10 2.5h3.5V6" />
      </svg>
    );
  }
  if (gender === 'F') {
    return (
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="6" r="3.5" />
        <path d="M8 9.5V14.5M5.75 12.25h4.5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4.5 8h7" />
    </svg>
  );
}

function canSwitchGender(
  availableGenders: readonly PokemonGender[],
  species: NonNullable<ReturnType<typeof pkmnDexGateway.getSpecies>>,
  generation: GameContext['generation'],
): boolean {
  if (availableGenders.length > 1) return true;
  return Boolean(resolveGenderFormeTarget(species, generation, pkmnDexGateway));
}

export function TeamSlotCard({
  slotIndex,
  member,
  context,
  onFocusBrowser,
  onToggleGender,
  onToggleShiny,
  onEdit,
  onRemove,
}: TeamSlotCardProps) {
  const slotId = `slot-${slotIndex}`;
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: slotId });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: slotId,
    disabled: !member,
  });

  if (!member) {
    return (
      <div
        ref={setDropRef}
        className={`flex flex-col items-center justify-center rounded-2xl py-3 transition ${
          isOver ? 'bg-[var(--surface-elevated)] ring-2 ring-[var(--accent-primary)]/40' : ''
        }`}
      >
        <button
          type="button"
          onClick={onFocusBrowser}
          aria-label="Empty team slot"
          className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--ink-muted)]/50 transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink-secondary)]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 opacity-45"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h6.2m5.6 0H21" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </button>
      </div>
    );
  }

  const species = pkmnDexGateway.getSpecies(member.speciesSlug, context.generation);
  if (!species) return null;

  const primaryTypeColor = TYPE_COLOR_VARS[species.types[0]];
  const currentGender: PokemonGender =
    member.gender && species.availableGenders.includes(member.gender)
      ? member.gender
      : (species.availableGenders[0] ?? 'N');
  const genderToggleable = canSwitchGender(species.availableGenders, species, context.generation);

  const isShiny = Boolean(member.shiny);
  const hasCustomBuild =
    member.moveSlugs.length > 0 || Boolean(member.itemSlug) || Boolean(member.natureId);

  const genderLabel =
    currentGender === 'M'
      ? `Gender: Male (${species.name})`
      : currentGender === 'F'
        ? `Gender: Female (${species.name})`
        : `Genderless (${species.name})`;

  const genderColorClass =
    currentGender === 'M'
      ? 'text-sky-600 dark:text-sky-400'
      : currentGender === 'F'
        ? 'text-rose-500 dark:text-rose-400'
        : 'text-[var(--ink-muted)]';

  return (
    <article
      ref={setDropRef}
      className={`group relative flex flex-col items-center rounded-2xl py-2 text-center transition ${
        isOver ? 'bg-[var(--surface-elevated)] ring-2 ring-[var(--accent-primary)]/40' : ''
      } ${isDragging ? 'opacity-35' : ''}`}
    >
      {/* Pokémon Image with clean circular type backdrop & hover remove */}
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${species.name}`}
          title={`Remove ${species.name}`}
          className="absolute -top-1 -right-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-card)] text-[var(--ink-muted)] opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:text-red-500 focus-visible:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <button
          ref={setDragRef}
          type="button"
          onClick={onEdit}
          aria-label={species.name}
          {...attributes}
          {...listeners}
          className="flex h-24 w-24 cursor-grab touch-none items-center justify-center rounded-full transition-transform duration-150 select-none hover:scale-105 active:cursor-grabbing"
          style={{
            backgroundColor: `color-mix(in srgb, ${primaryTypeColor} 15%, var(--surface-elevated))`,
          }}
        >
          <PokemonSprite
            spriteId={species.spriteId}
            dexNumber={species.dexNumber}
            name={species.name}
            size="lg"
            shiny={isShiny}
            gender={currentGender}
          />
        </button>
      </div>

      {/* Discreet Species Name */}
      <p className="mt-2 max-w-[9rem] truncate text-xs font-semibold text-[var(--ink-primary)]">
        {member.nickname || species.name}
      </p>

      {/* Accessible Types */}
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
        {species.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>

      {/* 3 Core Slot Actions: Gender · Shiny · Adjust */}
      <div className="mt-2 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={onToggleGender}
          disabled={!genderToggleable}
          aria-label={genderLabel}
          title={genderToggleable ? `${genderLabel} — Click to switch` : genderLabel}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-elevated)] transition ${genderColorClass} ${
            genderToggleable ? 'hover:bg-[var(--surface-muted)]' : 'cursor-default opacity-45'
          }`}
        >
          <GenderGlyph gender={currentGender} />
        </button>

        <button
          type="button"
          onClick={onToggleShiny}
          aria-pressed={isShiny}
          aria-label={`Toggle shiny ${species.name}`}
          title={isShiny ? 'Shiny enabled' : 'Shiny disabled'}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
            isShiny
              ? 'bg-amber-500/18 text-amber-600 dark:text-amber-300'
              : 'bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`Adjust ${species.name}`}
          title={`Adjust ${species.name}`}
          className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--ink-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {hasCustomBuild && (
            <span
              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </article>
  );
}
