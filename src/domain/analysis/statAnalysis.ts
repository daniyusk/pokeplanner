import { getEffectiveMoveCategory } from '@/domain/mechanics';
import type {
  DexGateway,
  GameContext,
  StatId,
  StatsTable,
  Team,
  TeamSlotIndex,
} from '@/domain/types';
import { resolveTeamEntries } from './helpers';

export interface MemberStatSummary {
  slotIndex: TeamSlotIndex;
  speciesName: string;
  baseStats: StatsTable;
  bst: number;
}

export interface TeamStatProfile {
  memberCount: number;
  members: readonly MemberStatSummary[];
  averages: StatsTable & { bst: number };
  peaks: StatsTable;
  moveSplit: {
    physical: number;
    special: number;
    status: number;
  };
  biasSplit: {
    physicalAttackers: number;
    specialAttackers: number;
    mixedAttackers: number;
  };
}

const STAT_KEYS: readonly StatId[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

function emptyStats(): StatsTable {
  return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}

/**
 * Computes team stat averages, peak values, Physical/Special move split (generation-accurate),
 * and offensive stat orientation across the active team.
 */
export function analyzeTeamStats(
  team: Team,
  context: GameContext,
  dex: DexGateway,
): TeamStatProfile {
  const entries = resolveTeamEntries(team, context.generation, dex);
  const totals = emptyStats();
  const peaks = emptyStats();
  let totalBst = 0;

  let physicalMoves = 0;
  let specialMoves = 0;
  let statusMoves = 0;
  let physicalAttackers = 0;
  let specialAttackers = 0;
  let mixedAttackers = 0;

  const members: MemberStatSummary[] = entries.map((entry) => {
    const s = entry.species.baseStats;
    const bst = s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
    totalBst += bst;

    for (const stat of STAT_KEYS) {
      totals[stat] += s[stat];
      if (s[stat] > peaks[stat]) {
        peaks[stat] = s[stat];
      }
    }

    if (s.atk - s.spa >= 15) physicalAttackers += 1;
    else if (s.spa - s.atk >= 15) specialAttackers += 1;
    else mixedAttackers += 1;

    for (const moveSlug of entry.member.moveSlugs) {
      const cat = getEffectiveMoveCategory(moveSlug, context, dex);
      if (cat === 'Physical') physicalMoves += 1;
      else if (cat === 'Special') specialMoves += 1;
      else if (cat === 'Status') statusMoves += 1;
    }

    return {
      slotIndex: entry.slotIndex,
      speciesName: entry.species.name,
      baseStats: s,
      bst,
    };
  });

  const count = entries.length;
  const averages =
    count === 0
      ? { ...emptyStats(), bst: 0 }
      : {
          hp: Math.round(totals.hp / count),
          atk: Math.round(totals.atk / count),
          def: Math.round(totals.def / count),
          spa: Math.round(totals.spa / count),
          spd: Math.round(totals.spd / count),
          spe: Math.round(totals.spe / count),
          bst: Math.round(totalBst / count),
        };

  return {
    memberCount: count,
    members,
    averages,
    peaks,
    moveSplit: {
      physical: physicalMoves,
      special: specialMoves,
      status: statusMoves,
    },
    biasSplit: {
      physicalAttackers,
      specialAttackers,
      mixedAttackers,
    },
  };
}
