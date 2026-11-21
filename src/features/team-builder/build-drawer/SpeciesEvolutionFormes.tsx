import { ArrowRight } from 'lucide-react';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import type { GenerationNumber, SpeciesData } from '@/domain/types';

interface SpeciesEvolutionFormesProps {
  species: SpeciesData;
  generation: GenerationNumber;
  allForms: readonly SpeciesData[];
  onSelectSpecies: (slug: string) => void;
}

export function SpeciesEvolutionFormes({
  species,
  generation,
  allForms,
  onSelectSpecies,
}: SpeciesEvolutionFormesProps) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {species.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {species.prevoSlug && (
            <button
              type="button"
              onClick={() => onSelectSpecies(species.prevoSlug as string)}
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-1 font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)]"
            >
              ← Prevo
            </button>
          )}
          {species.evoSlugs.map((evoSlug) => {
            const evo = pkmnDexGateway.getSpecies(evoSlug, generation);
            if (!evo) return null;
            return (
              <button
                key={evoSlug}
                type="button"
                onClick={() => onSelectSpecies(evoSlug)}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-1 font-medium text-[var(--ink-primary)] hover:border-[var(--accent-primary)]"
              >
                <span>{evo.name}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      </div>

      {allForms.length > 1 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--ink-secondary)]">Form</p>
          <div className="flex flex-wrap gap-1.5">
            {allForms.map((formSpecies) => {
              const isCurrent = formSpecies.slug === species.slug;
              return (
                <button
                  key={formSpecies.slug}
                  type="button"
                  onClick={() => onSelectSpecies(formSpecies.slug)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                    isCurrent
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-ink)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {formSpecies.forme || 'Base'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
