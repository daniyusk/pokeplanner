import { ArrowLeft, ArrowRight, Plus, SlidersHorizontal, X } from 'lucide-react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { TYPE_COLOR_VARS } from '@/components/pokemon/TypeIcon';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import type { GameContext, TeamMember, TeamSlotIndex } from '@/domain/types';

interface TeamSlotCardProps {
  slotIndex: TeamSlotIndex;
  member: TeamMember | null;
  context: GameContext;
  onAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onSwapLeft?: () => void;
  onSwapRight?: () => void;
}

export function TeamSlotCard({
  slotIndex,
  member,
  context,
  onAdd,
  onEdit,
  onRemove,
  onSwapLeft,
  onSwapRight,
}: TeamSlotCardProps) {
  if (!member) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="group relative flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)]/60 p-4 text-center transition hover:border-[var(--accent-primary)] hover:bg-[var(--surface-card)]"
      >
        <span className="absolute top-2.5 left-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--ink-muted)]">
          {slotIndex + 1}
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--ink-secondary)] transition group-hover:bg-[var(--accent-primary)] group-hover:text-[var(--accent-ink)]">
          <Plus className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--ink-primary)]">Add Pokémon</p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Click or press {slotIndex + 1}</p>
        </div>
      </button>
    );
  }

  const species = pkmnDexGateway.getSpecies(member.speciesSlug, context.generation);
  if (!species) return null;

  const primaryTypeColor = TYPE_COLOR_VARS[species.types[0]];
  const abilityName =
    context.mechanics.hasAbilities && member.abilitySlug
      ? pkmnDexGateway.getAbility(member.abilitySlug, context.generation)?.name
      : undefined;
  const itemName =
    context.mechanics.hasHeldItems && member.itemSlug
      ? pkmnDexGateway.getItem(member.itemSlug, context.generation)?.name
      : undefined;

  return (
    <article
      className="relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)]"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 18%, color-mix(in srgb, ${primaryTypeColor} 14%, transparent), transparent 68%)`,
      }}
    >
      {/* Top Action Row */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold tabular-nums text-[var(--ink-muted)]">
          #{String(species.dexNumber).padStart(4, '0')}
        </span>
        <div className="flex items-center gap-0.5">
          {onSwapLeft && (
            <button
              type="button"
              onClick={onSwapLeft}
              aria-label={`Move ${species.name} left`}
              title="Move left"
              className="rounded p-1 text-[var(--ink-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {onSwapRight && (
            <button
              type="button"
              onClick={onSwapRight}
              aria-label={`Move ${species.name} right`}
              title="Move right"
              className="rounded p-1 text-[var(--ink-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${species.name} from slot ${slotIndex + 1}`}
            title="Remove Pokémon"
            className="rounded p-1 text-[var(--ink-muted)] transition hover:bg-red-500/15 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sprite & Identity */}
      <button
        type="button"
        onClick={onAdd}
        title={`Change ${species.name}`}
        className="group my-1 flex flex-col items-center text-center focus-visible:rounded-lg"
      >
        <PokemonSprite
          spriteId={species.spriteId}
          dexNumber={species.dexNumber}
          name={species.name}
          size="md"
          className="transition-transform duration-200 group-hover:scale-105"
        />
        <span className="mt-1 line-clamp-1 text-sm font-bold tracking-tight text-[var(--ink-primary)]">
          {member.nickname ? member.nickname : species.name}
        </span>
        {member.nickname && (
          <span className="text-[11px] text-[var(--ink-muted)]">{species.name}</span>
        )}
      </button>

      {/* Type Badges */}
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
        {species.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>

      {/* Build Preview / Configure Trigger */}
      <button
        type="button"
        onClick={onEdit}
        className="mt-3 flex w-full flex-col gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-2 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
      >
        <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-[var(--ink-secondary)]">
          <span className="truncate">
            {abilityName ?? (context.mechanics.hasAbilities ? 'Select ability' : species.name)}
          </span>
          <SlidersHorizontal className="h-3 w-3 shrink-0 text-[var(--ink-muted)]" />
        </div>

        {(itemName || member.natureId || member.teraType) && (
          <div className="flex flex-wrap gap-1 text-[10px] text-[var(--ink-muted)]">
            {itemName && (
              <span className="rounded bg-[var(--surface-card)] px-1.5 py-0.5 font-medium text-[var(--ink-secondary)]">
                @ {itemName}
              </span>
            )}
            {member.natureId && (
              <span className="rounded bg-[var(--surface-card)] px-1.5 py-0.5 font-medium">
                {member.natureId}
              </span>
            )}
            {context.mechanics.gimmick === 'terastal' && member.teraType && (
              <span className="rounded bg-[var(--surface-card)] px-1.5 py-0.5 font-medium">
                Tera {member.teraType}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 pt-0.5">
          {[0, 1, 2, 3].map((moveSlot) => {
            const moveSlug = member.moveSlugs[moveSlot];
            const move = moveSlug
              ? pkmnDexGateway.getMove(moveSlug, context.generation)
              : undefined;
            if (!move) {
              return (
                <span
                  key={moveSlot}
                  className="truncate rounded bg-[var(--surface-card)]/60 px-1.5 py-0.5 text-[10px] text-[var(--ink-muted)]"
                >
                  —
                </span>
              );
            }
            return (
              <span
                key={moveSlot}
                className="flex items-center gap-1 truncate rounded bg-[var(--surface-card)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-primary)]"
                title={move.name}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: TYPE_COLOR_VARS[move.type] }}
                  aria-hidden="true"
                />
                <span className="truncate">{move.name}</span>
              </span>
            );
          })}
        </div>
      </button>
    </article>
  );
}
