import type { GameMechanicsFlags } from './game';
import type { GenerationNumber, PokemonType, SpeciesSlug } from './pokemon';

export type CheckpointCategory = 'gym' | 'rival' | 'elite-four' | 'champion' | 'post-game';

export interface Checkpoint {
  id: string;
  order: number;
  name: string;
  category: CheckpointCategory;
  levelCap: number;
  specialtyType?: PokemonType;
  bossName: string;
  bossNotablePokemon: readonly SpeciesSlug[];
  unlockedLocations: readonly string[];
}

export type EncounterMethod =
  | 'starter'
  | 'grass'
  | 'cave'
  | 'surf'
  | 'fish'
  | 'gift'
  | 'static'
  | 'fossil'
  | 'trade'
  | 'evolve'
  | 'headbutt'
  | 'honey-tree'
  | 'swarm';

export interface EncounterLocation {
  areaName: string;
  method: EncounterMethod;
  minLevel?: number;
  maxLevel?: number;
  notes?: string;
}

export interface EvolutionNotes {
  requiresTrade: boolean;
  minEvolutionLevel?: number;
  requiresItem?: string;
  notes?: string;
}

export interface GameDexEntry {
  regionalDexNumber: number;
  availability:
    | 'starter'
    | 'wild'
    | 'gift'
    | 'static'
    | 'fossil'
    | 'trade-only'
    | 'evolution'
    | 'post-game';
  exclusiveToVersions?: readonly string[];
  earliestCheckpointId: string;
  locations: readonly EncounterLocation[];
  evolutionNotes?: EvolutionNotes;
}

export interface GameVersionInfo {
  id: string;
  name: string;
}

export interface GameManifest {
  id: string;
  name: string;
  shortName: string;
  generation: GenerationNumber;
  region: string;
  versionGroup: string;
  versions: readonly GameVersionInfo[];
  mechanics: GameMechanicsFlags;
  checkpoints: readonly Checkpoint[];
  dex: Readonly<Record<SpeciesSlug, GameDexEntry>>;
}

export interface GameCatalogEntry {
  id: string;
  name: string;
  shortName: string;
  generation: GenerationNumber;
  region: string;
  versions: readonly GameVersionInfo[];
  mechanics: GameMechanicsFlags;
  manifestPath: string;
}
