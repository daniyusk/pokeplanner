import { MOVE_CATEGORY, MOVE_SLUG, POKEMON_TYPE } from '@/domain/constants';
import type {
  DexGateway,
  GameContext,
  MoveCategory,
  MoveData,
  MoveSlug,
  PokemonType,
} from '@/domain/types';

const PRE_GEN4_SPECIAL_TYPES: ReadonlySet<PokemonType> = new Set([
  POKEMON_TYPE.Fire,
  POKEMON_TYPE.Water,
  POKEMON_TYPE.Grass,
  POKEMON_TYPE.Electric,
  POKEMON_TYPE.Ice,
  POKEMON_TYPE.Psychic,
  POKEMON_TYPE.Dragon,
  POKEMON_TYPE.Dark,
]);

/**
 * Resolves the effective category ('Physical' | 'Special' | 'Status') directly from move metadata
 * under the active GameContext, handling the Generation 4 Physical/Special split.
 */
export function resolveMoveCategory(
  move: Pick<MoveData, 'type' | 'category'>,
  context: GameContext,
): MoveCategory {
  if (move.category === MOVE_CATEGORY.Status) {
    return MOVE_CATEGORY.Status;
  }

  if (!context.mechanics.physicalSpecialSplit) {
    return PRE_GEN4_SPECIAL_TYPES.has(move.type) ? MOVE_CATEGORY.Special : MOVE_CATEGORY.Physical;
  }

  return move.category;
}

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
  return move ? resolveMoveCategory(move, context) : undefined;
}

/**
 * Filters a generation move pool against a species' learnable move slug set,
 * mapping Hidden Power type variants when the base `hiddenpower` move is learnable.
 */
export function filterLearnableMoves(
  allMoves: readonly MoveData[],
  learnableSlugs: ReadonlySet<string>,
): MoveData[] {
  const hasHiddenPower = learnableSlugs.has(MOVE_SLUG.HiddenPower);
  return allMoves.filter(
    (move) =>
      learnableSlugs.has(move.slug) ||
      (hasHiddenPower && move.slug.startsWith(MOVE_SLUG.HiddenPower)),
  );
}
