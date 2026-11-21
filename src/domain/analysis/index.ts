export { type ResolvedTeamEntry, resolveTeamEntries } from '@/domain/team';
export {
  analyzeTeamDefense,
  type DefensiveProfile,
  type DefensiveTypeRow,
  type SlotDefensiveCell,
  type WeaknessSeverity,
} from './defensiveAnalysis';
export {
  analyzeTeamOffense,
  type OffensiveContributor,
  type OffensiveCoverage,
  type OffensiveCoverageEntry,
} from './offensiveAnalysis';
export {
  analyzeTeamStats,
  type MemberStatSummary,
  type TeamStatProfile,
} from './statAnalysis';
export {
  analyzeTeam,
  type TeamAnalysisReport,
  type TeamInsight,
} from './teamReport';
