import type { DexGateway, GameContext, MoveCategory, MoveSlug, PokemonType } from '@/domain/types';

const PRE_GEN4_SPECIAL_TYPES: ReadonlySet<PokemonType> = new Set([
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Ice',
  'Psychic',
  'Dragon',
  'Dark',
]);

/**
 * Resolves the effective category ('Physical' | 'Special' | 'Status') of a move
 * under the active GameContext, handling the Generation 4 Physical/Special split.
 */
export function getEffectiveMoveCategory(
  moveSlug: MoveSlug,
  context: GameContext,
  dex: DexGateway,
): MoveCategory | undefined {
  const move = dex.getMove(moveSlug, context.generation);
  if (!move) return undefined;

  if (move.category === 'Status') {
    return 'Status';
  }

  if (!context.mechanics.physicalSpecialSplit) {
    return PRE_GEN4_SPECIAL_TYPES.has(move.type) ? 'Special' : 'Physical';
  }

  return move.category;
}
