import {
  calculateDefensiveMultiplier,
  type DefensiveMultiplierResult,
  getAvailableTypes,
} from '@/domain/mechanics';
import type { DexGateway, GameContext, PokemonType, Team } from '@/domain/types';
import { resolveTeamEntries } from './helpers';

export type WeaknessSeverity = 'critical' | 'warning' | 'balanced' | 'strong';

export interface SlotDefensiveCell extends DefensiveMultiplierResult {}

export interface DefensiveTypeRow {
  attackType: PokemonType;
  slots: readonly (SlotDefensiveCell | null)[];
  weakCount: number;
  quadWeakCount: number;
  resistCount: number;
  immuneCount: number;
  netScore: number;
  severity: WeaknessSeverity;
}

export interface DefensiveProfile {
  rows: readonly DefensiveTypeRow[];
  criticalWeaknesses: readonly PokemonType[];
  uncoveredWeaknesses: readonly PokemonType[];
  strongResistances: readonly PokemonType[];
}

function classifySeverity(
  weakCount: number,
  quadWeakCount: number,
  resistCount: number,
  immuneCount: number,
): WeaknessSeverity {
  const mitigation = resistCount + immuneCount;

  if (
    (weakCount >= 3 && mitigation === 0) ||
    (quadWeakCount >= 1 && mitigation === 0 && weakCount >= 2)
  ) {
    return 'critical';
  }

  if (
    weakCount >= 3 ||
    (weakCount >= 2 && mitigation === 0) ||
    (quadWeakCount >= 1 && mitigation === 0)
  ) {
    return 'warning';
  }

  if (mitigation >= 2 && weakCount === 0) {
    return 'strong';
  }

  return 'balanced';
}

/**
 * Analyzes defensive type matchups across all 6 team slots for every type
 * available in the active generation, including Ability and Held Item interceptors.
 */
export function analyzeTeamDefense(
  team: Team,
  context: GameContext,
  dex: DexGateway,
): DefensiveProfile {
  const availableTypes = getAvailableTypes(context.generation, dex);
  const entries = resolveTeamEntries(team, context.generation, dex);

  const rows: DefensiveTypeRow[] = [];
  const criticalWeaknesses: PokemonType[] = [];
  const uncoveredWeaknesses: PokemonType[] = [];
  const strongResistances: PokemonType[] = [];

  for (const attackType of availableTypes) {
    const slots: (SlotDefensiveCell | null)[] = [null, null, null, null, null, null];
    let weakCount = 0;
    let quadWeakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;

    for (const entry of entries) {
      const result = calculateDefensiveMultiplier(
        attackType,
        {
          types: entry.species.types,
          ...(entry.member.abilitySlug ? { abilitySlug: entry.member.abilitySlug } : {}),
          ...(entry.member.itemSlug ? { itemSlug: entry.member.itemSlug } : {}),
          ...(entry.member.teraType ? { teraType: entry.member.teraType } : {}),
        },
        context,
        dex,
      );

      slots[entry.slotIndex] = result;

      if (result.multiplier === 0) {
        immuneCount += 1;
      } else if (result.multiplier < 1) {
        resistCount += 1;
      } else if (result.multiplier >= 4) {
        weakCount += 1;
        quadWeakCount += 1;
      } else if (result.multiplier >= 2) {
        weakCount += 1;
      }
    }

    const severity =
      entries.length === 0
        ? 'balanced'
        : classifySeverity(weakCount, quadWeakCount, resistCount, immuneCount);

    const netScore = Number(
      (resistCount + immuneCount * 1.5 - weakCount - quadWeakCount).toFixed(2),
    );

    rows.push({
      attackType,
      slots,
      weakCount,
      quadWeakCount,
      resistCount,
      immuneCount,
      netScore,
      severity,
    });

    if (entries.length > 0) {
      if (severity === 'critical') criticalWeaknesses.push(attackType);
      if (weakCount >= 2 && resistCount + immuneCount === 0) uncoveredWeaknesses.push(attackType);
      if (severity === 'strong') strongResistances.push(attackType);
    }
  }

  return {
    rows,
    criticalWeaknesses,
    uncoveredWeaknesses,
    strongResistances,
  };
}
