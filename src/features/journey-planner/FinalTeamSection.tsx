import { Plus, X } from 'lucide-react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { TEAM_SLOT_INDICES } from '@/domain/constants';
import type { GenerationNumber, Team } from '@/domain/types';

interface FinalTeamSectionProps {
  finalTeam: Team;
  generation: GenerationNumber;
  onAddFinalMember: () => void;
  onEditFinalMember: (speciesSlug: string) => void;
  onRemoveOrReplaceFinalMember: (speciesSlug: string) => void;
}

export function FinalTeamSection({
  finalTeam,
  generation,
  onAddFinalMember,
  onEditFinalMember,
  onRemoveOrReplaceFinalMember,
}: FinalTeamSectionProps) {
  return (
    <section
      aria-label="Final team"
      className="mx-auto w-full max-w-3xl rounded-2xl bg-[var(--surface-card)] p-5 text-center"
    >
      <p className="text-sm font-semibold text-[var(--ink-primary)]">Final Team</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {TEAM_SLOT_INDICES.map((slotPos) => {
          const member = finalTeam[slotPos];
          if (!member) {
            return (
              <div
                key={`final-slot-${slotPos}`}
                className="flex flex-col items-center justify-center"
              >
                <button
                  type="button"
                  onClick={onAddFinalMember}
                  aria-label="Add final team Pokémon"
                  title="Add Pokémon to final team"
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] transition hover:border-[var(--accent-primary)] hover:text-[var(--ink-primary)]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          }
          const sp = pkmnDexGateway.getSpecies(member.speciesSlug, generation);
          if (!sp) return null;
          return (
            <div
              key={`final-slot-${slotPos}-${sp.slug}`}
              className="group relative flex flex-col items-center gap-1"
            >
              <button
                type="button"
                onClick={() => onRemoveOrReplaceFinalMember(member.speciesSlug)}
                aria-label={`Remove or replace ${sp.name}`}
                title={`Remove or replace ${sp.name}`}
                className="absolute -top-1 right-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--ink-muted)] opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:text-red-500 focus-visible:opacity-100"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onEditFinalMember(member.speciesSlug)}
                aria-label={`Edit ${sp.name}`}
                title={`Edit ${sp.name}`}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-elevated)] transition hover:bg-[var(--surface-muted)]"
              >
                <PokemonSprite
                  spriteId={sp.spriteId}
                  dexNumber={sp.dexNumber}
                  name={sp.name}
                  size="custom"
                  shiny={Boolean(member.shiny)}
                  gender={member.gender}
                  className="h-12 w-12"
                />
              </button>
              <span className="max-w-full truncate text-xs font-medium text-[var(--ink-primary)]">
                {sp.name}
              </span>
              <div className="flex flex-wrap justify-center gap-0.5">
                {sp.types.map((t) => (
                  <TypeBadge key={t} type={t} size="sm" compact />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
