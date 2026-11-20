import type { Team } from '@/domain/types';

export function createEmptyTeam(): Team {
  return [null, null, null, null, null, null];
}
