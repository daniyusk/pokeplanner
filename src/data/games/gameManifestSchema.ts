import { z } from 'zod';
import {
  battleGimmickSchema,
  checkpointCategorySchema,
  dexAvailabilitySchema,
  encounterMethodSchema,
  generationSchema,
  levelSchema,
  pokemonTypeSchema,
} from '@/domain/schemas';
import type {
  Checkpoint,
  EncounterLocation,
  GameCatalogEntry,
  GameDexEntry,
  GameManifest,
} from '@/domain/types';

const mechanicsFlagsSchema = z.object({
  hasAbilities: z.boolean(),
  hasHeldItems: z.boolean(),
  hasNatures: z.boolean(),
  physicalSpecialSplit: z.boolean(),
  gimmick: battleGimmickSchema.nullable(),
});

const gameVersionInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const checkpointSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  name: z.string().min(1),
  category: checkpointCategorySchema,
  levelCap: levelSchema,
  specialtyType: pokemonTypeSchema.exactOptional(),
  bossName: z.string().min(1),
  bossNotablePokemon: z.array(z.string().min(1)).min(1),
  unlockedLocations: z.array(z.string().min(1)),
}) satisfies z.ZodType<Checkpoint>;

export const encounterLocationSchema = z.object({
  areaName: z.string().min(1),
  method: encounterMethodSchema,
  minLevel: levelSchema.exactOptional(),
  maxLevel: levelSchema.exactOptional(),
  notes: z.string().exactOptional(),
}) satisfies z.ZodType<EncounterLocation>;

export const gameDexEntrySchema = z.object({
  regionalDexNumber: z.number().int().min(1),
  availability: dexAvailabilitySchema,
  exclusiveToVersions: z.array(z.string().min(1)).exactOptional(),
  earliestCheckpointId: z.string().min(1),
  locations: z.array(encounterLocationSchema).min(1),
  evolutionNotes: z
    .object({
      requiresTrade: z.boolean(),
      minEvolutionLevel: levelSchema.exactOptional(),
      requiresItem: z.string().exactOptional(),
      notes: z.string().exactOptional(),
    })
    .exactOptional(),
}) satisfies z.ZodType<GameDexEntry>;

export const gameManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  generation: generationSchema,
  region: z.string().min(1),
  versionGroup: z.string().min(1),
  versions: z.array(gameVersionInfoSchema).min(1),
  mechanics: mechanicsFlagsSchema,
  checkpoints: z.array(checkpointSchema).min(1),
  dex: z.record(z.string().min(1), gameDexEntrySchema),
}) satisfies z.ZodType<GameManifest>;

export const gameCatalogEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  generation: generationSchema,
  region: z.string().min(1),
  versions: z.array(gameVersionInfoSchema).min(1),
  mechanics: mechanicsFlagsSchema,
  manifestPath: z.string().min(1),
}) satisfies z.ZodType<GameCatalogEntry>;

export const gameCatalogSchema = z.array(gameCatalogEntrySchema);
