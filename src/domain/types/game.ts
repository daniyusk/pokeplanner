import type { GenerationNumber } from './pokemon';

export type BattleGimmick = 'mega' | 'z-move' | 'dynamax' | 'terastal' | 'alpha';

export interface GameMechanicsFlags {
  hasAbilities: boolean;
  hasHeldItems: boolean;
  hasNatures: boolean;
  physicalSpecialSplit: boolean;
  gimmick: BattleGimmick | null;
}

export interface FreeModeContext {
  mode: 'free';
  generation: GenerationNumber;
  mechanics: GameMechanicsFlags;
}

export interface CampaignGameContext {
  mode: 'campaign';
  gameId: string;
  versionId?: string;
  generation: GenerationNumber;
  mechanics: GameMechanicsFlags;
}

export type GameContext = FreeModeContext | CampaignGameContext;

export function getDefaultMechanicsForGeneration(generation: GenerationNumber): GameMechanicsFlags {
  let gimmick: BattleGimmick | null = null;
  if (generation === 6) gimmick = 'mega';
  else if (generation === 7) gimmick = 'z-move';
  else if (generation === 8) gimmick = 'dynamax';
  else if (generation === 9) gimmick = 'terastal';

  return {
    hasAbilities: generation >= 3,
    hasHeldItems: generation >= 2,
    hasNatures: generation >= 3,
    physicalSpecialSplit: generation >= 4,
    gimmick,
  };
}

export function createFreeModeContext(generation: GenerationNumber = 9): FreeModeContext {
  return {
    mode: 'free',
    generation,
    mechanics: getDefaultMechanicsForGeneration(generation),
  };
}
