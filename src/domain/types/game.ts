import { type ALL_BATTLE_GIMMICKS, BATTLE_GIMMICK } from '@/domain/constants/pokemon';
import type { GenerationNumber } from './pokemon';

export type BattleGimmick = (typeof ALL_BATTLE_GIMMICKS)[number];

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
  unrestricted: boolean;
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

const GIMMICK_BY_GENERATION: Partial<Record<GenerationNumber, BattleGimmick>> = {
  6: BATTLE_GIMMICK.Mega,
  7: BATTLE_GIMMICK.ZMove,
  8: BATTLE_GIMMICK.Dynamax,
  9: BATTLE_GIMMICK.Terastal,
};

export function getDefaultMechanicsForGeneration(generation: GenerationNumber): GameMechanicsFlags {
  return {
    hasAbilities: generation >= 3,
    hasHeldItems: generation >= 2,
    hasNatures: generation >= 3,
    physicalSpecialSplit: generation >= 4,
    gimmick: GIMMICK_BY_GENERATION[generation] ?? null,
  };
}

export function createFreeModeContext(
  generation: GenerationNumber = 9,
  unrestricted: boolean = generation === 9,
): FreeModeContext {
  return {
    mode: 'free',
    generation,
    unrestricted,
    mechanics: getDefaultMechanicsForGeneration(generation),
  };
}
