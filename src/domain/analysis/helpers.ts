import type {
  DexGateway,
  GenerationNumber,
  SpeciesData,
  Team,
  TeamMember,
  TeamSlotIndex,
} from '@/domain/types';

export interface ResolvedTeamEntry {
  slotIndex: TeamSlotIndex;
  member: TeamMember;
  species: SpeciesData;
}

export function resolveTeamEntries(
  team: Team,
  generation: GenerationNumber,
  dex: DexGateway,
): ResolvedTeamEntry[] {
  const entries: ResolvedTeamEntry[] = [];
  for (let i = 0; i < 6; i++) {
    const slotIndex = i as TeamSlotIndex;
    const member = team[slotIndex];
    if (!member) continue;
    const species = dex.getSpecies(member.speciesSlug, generation);
    if (!species) continue;
    entries.push({ slotIndex, member, species });
  }
  return entries;
}
