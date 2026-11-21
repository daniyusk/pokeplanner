import type {
  CHECKPOINT_CATEGORIES,
  DEX_AVAILABILITY_TYPES,
  ENCOUNTER_METHODS,
} from '@/domain/constants/pokemon';
import type { GameMechanicsFlags } from './game';
import type { GenerationNumber, PokemonType, SpeciesSlug } from './pokemon';

export type CheckpointCategory = (typeof CHECKPOINT_CATEGORIES)[number];

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

export type EncounterMethod = (typeof ENCOUNTER_METHODS)[number];

export type DexAvailability = (typeof DEX_AVAILABILITY_TYPES)[number];

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
  availability: DexAvailability;
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
