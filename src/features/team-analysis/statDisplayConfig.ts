import { MAX_BASE_STAT_SCALE } from '@/domain/constants';
import type { StatId } from '@/domain/types';

export interface StatDisplayItem {
  key: StatId;
  label: string;
  shortLabel: string;
}

export { MAX_BASE_STAT_SCALE };

const STAT_DISPLAY_MAP: Record<StatId, StatDisplayItem> = {
  hp: { key: 'hp', label: 'HP', shortLabel: 'HP' },
  atk: { key: 'atk', label: 'Attack', shortLabel: 'Atk' },
  def: { key: 'def', label: 'Defense', shortLabel: 'Def' },
  spa: { key: 'spa', label: 'Sp. Atk', shortLabel: 'SpA' },
  spd: { key: 'spd', label: 'Sp. Def', shortLabel: 'SpD' },
  spe: { key: 'spe', label: 'Speed', shortLabel: 'Spe' },
};

const BAR_ORDER: readonly StatId[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
// Radar chart order places Speed between Defense and Special Defense clockwise
const RADAR_ORDER: readonly StatId[] = ['hp', 'atk', 'def', 'spe', 'spd', 'spa'];

export const STAT_BAR_ROWS: readonly StatDisplayItem[] = BAR_ORDER.map(
  (key) => STAT_DISPLAY_MAP[key],
);

export const STAT_RADAR_AXES: readonly StatDisplayItem[] = RADAR_ORDER.map(
  (key) => STAT_DISPLAY_MAP[key],
);

export const STAT_RADAR_RINGS = [50, 100, MAX_BASE_STAT_SCALE] as const;
