import { queryOptions } from '@tanstack/react-query';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { loadGameCatalog, loadGameManifest } from '@/data/games/gameLoader';
import type { GenerationNumber, SpeciesSlug } from '@/domain/types';

export function gameCatalogQueryOptions() {
  return queryOptions({
    queryKey: ['game-catalog'] as const,
    queryFn: loadGameCatalog,
  });
}

export function gameManifestQueryOptions(gameId: string) {
  return queryOptions({
    queryKey: ['game-manifest', gameId] as const,
    queryFn: () => loadGameManifest(gameId),
  });
}

export function learnableMoveSlugsQueryOptions(
  speciesSlug: SpeciesSlug,
  generation: GenerationNumber,
) {
  return queryOptions({
    queryKey: ['learnable-moves', generation, speciesSlug] as const,
    queryFn: () => pkmnDexGateway.getLearnableMoveSlugs(speciesSlug, generation),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
