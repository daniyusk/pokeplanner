import { ChevronDown, ChevronUp, MapPin, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import type { JourneyMilestoneEvaluation } from '@/domain/journey';
import { resolveTeamEntries } from '@/domain/team';
import type { GenerationNumber } from '@/domain/types';

interface JourneyMilestoneNodeProps {
  milestone: JourneyMilestoneEvaluation;
  generation: GenerationNumber;
}

export function JourneyMilestoneNode({ milestone, generation }: JourneyMilestoneNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const { checkpoint, teamAtMilestone, checkpointEvaluation } = milestone;

  const ratingStyle =
    checkpointEvaluation.overallRating === 'Favorable'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : checkpointEvaluation.overallRating === 'Risky'
        ? 'bg-red-500/15 text-red-700 dark:text-red-300'
        : 'bg-amber-500/15 text-amber-800 dark:text-amber-300';

  const activeSlots = resolveTeamEntries(teamAtMilestone, generation, pkmnDexGateway);

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl bg-[var(--surface-card)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Checkpoint identity */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">{checkpoint.name}</h3>
            {checkpoint.specialtyType && <TypeBadge type={checkpoint.specialtyType} size="sm" />}
            <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[var(--ink-secondary)]">
              Cap Lv {checkpoint.levelCap}
            </span>
          </div>
        </div>

        {/* Center: Active Team arriving at this milestone */}
        <div className="flex flex-wrap items-center gap-1.5">
          {activeSlots.length === 0 ? (
            <span className="text-xs text-[var(--ink-muted)]">No Pokémon yet</span>
          ) : (
            activeSlots.map(({ member, slotIndex, species: sp }) => (
              <div
                key={`slot-${slotIndex}-${member.speciesSlug}`}
                className="flex items-center gap-1 rounded-lg bg-[var(--surface-elevated)] pr-2 pl-1 py-0.5"
                title={sp.name}
              >
                <PokemonSprite
                  spriteId={sp.spriteId}
                  dexNumber={sp.dexNumber}
                  name={sp.name}
                  size="custom"
                  shiny={Boolean(member.shiny)}
                  gender={member.gender}
                  className="h-7 w-7"
                />
                {member.level !== undefined && (
                  <span className="text-[10px] font-medium tabular-nums text-[var(--ink-secondary)]">
                    {member.level}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right: Rating & Expand */}
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${ratingStyle}`}>
            {checkpointEvaluation.overallRating}
          </span>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`Details for ${checkpoint.name}`}
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--ink-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checkpointEvaluation.bossMatchups.map((m) => (
              <div
                key={m.bossSpecies.slug}
                className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-elevated)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <PokemonSprite
                    spriteId={m.bossSpecies.spriteId}
                    dexNumber={m.bossSpecies.dexNumber}
                    name={m.bossSpecies.name}
                    size="xs"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink-primary)]">
                      {m.bossSpecies.name}
                    </p>
                    <div className="mt-0.5 flex gap-1">
                      {m.bossSpecies.types.map((t) => (
                        <TypeBadge key={t} type={t} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  {m.counteredBy.length > 0 ? (
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">
                      {m.counteredBy.slice(0, 2).join(', ')}
                    </p>
                  ) : (
                    <p className="text-amber-700 dark:text-amber-300">No counter</p>
                  )}
                  {m.threatens.length > 0 && (
                    <p className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                      <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                      <span>{m.threatens[0]}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {checkpoint.unlockedLocations.length > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
              <MapPin
                className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]"
                aria-hidden="true"
              />
              <span>{checkpoint.unlockedLocations.join(' · ')}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
