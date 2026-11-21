import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { getStarterOptionsForGame } from '@/domain/journey';
import type { GameManifest, SpeciesSlug } from '@/domain/types';

interface JourneyStarterNodeProps {
  manifest: GameManifest;
  versionId?: string;
  starterSlug: SpeciesSlug | null;
  starterLevel: number;
  onSelectStarter: (slug: SpeciesSlug | null) => void;
}

export function JourneyStarterNode({
  manifest,
  versionId,
  starterSlug,
  starterLevel,
  onSelectStarter,
}: JourneyStarterNodeProps) {
  const starterOptions = getStarterOptionsForGame(manifest, versionId);
  const chosenSpecies = starterSlug
    ? pkmnDexGateway.getSpecies(starterSlug, manifest.generation)
    : undefined;

  if (!chosenSpecies) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full max-w-xl rounded-2xl bg-[var(--surface-card)] p-5 text-center">
          <p className="text-sm font-semibold text-[var(--ink-primary)]">Choose Starter</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {starterOptions.map((slug) => {
              const sp = pkmnDexGateway.getSpecies(slug, manifest.generation);
              if (!sp) return null;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => onSelectStarter(slug)}
                  className="flex min-w-[7.5rem] flex-col items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-4 py-3 transition hover:bg-[var(--surface-muted)]"
                >
                  <PokemonSprite
                    spriteId={sp.spriteId}
                    dexNumber={sp.dexNumber}
                    name={sp.name}
                    size="md"
                  />
                  <span className="text-xs font-semibold text-[var(--ink-primary)]">{sp.name}</span>
                  <div className="flex gap-1">
                    {sp.types.map((t) => (
                      <TypeBadge key={t} type={t} size="sm" />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3.5 rounded-2xl bg-[var(--surface-card)] px-5 py-3.5">
        <PokemonSprite
          spriteId={chosenSpecies.spriteId}
          dexNumber={chosenSpecies.dexNumber}
          name={chosenSpecies.name}
          size="custom"
          className="h-14 w-14"
        />
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--ink-primary)]">
              {chosenSpecies.name}
            </span>
            <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[var(--ink-secondary)]">
              Lv {starterLevel}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {chosenSpecies.types.map((t) => (
              <TypeBadge key={t} type={t} size="sm" />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelectStarter(null)}
          className="ml-2 rounded-lg bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
        >
          Change
        </button>
      </div>
    </div>
  );
}
