import { z } from 'zod';
import { ALL_POKEMON_TYPES } from '@/domain/types';

const generationSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
]);

const pokemonTypeSchema = z.enum(ALL_POKEMON_TYPES);

const mechanicsFlagsSchema = z.object({
  hasAbilities: z.boolean(),
  hasHeldItems: z.boolean(),
  hasNatures: z.boolean(),
  physicalSpecialSplit: z.boolean(),
  gimmick: z.enum(['mega', 'z-move', 'dynamax', 'terastal', 'alpha']).nullable(),
});

const gameVersionInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const checkpointSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  name: z.string().min(1),
  category: z.enum(['gym', 'rival', 'elite-four', 'champion', 'post-game']),
  levelCap: z.number().int().min(1).max(100),
  specialtyType: pokemonTypeSchema.optional(),
  bossName: z.string().min(1),
  bossNotablePokemon: z.array(z.string().min(1)).min(1),
  unlockedLocations: z.array(z.string().min(1)),
});

export const encounterLocationSchema = z.object({
  areaName: z.string().min(1),
  method: z.enum([
    'starter',
    'grass',
    'cave',
    'surf',
    'fish',
    'gift',
    'static',
    'fossil',
    'trade',
    'evolve',
    'honey-tree',
    'swarm',
  ]),
  minLevel: z.number().int().min(1).max(100).optional(),
  maxLevel: z.number().int().min(1).max(100).optional(),
  notes: z.string().optional(),
});

export const gameDexEntrySchema = z.object({
  regionalDexNumber: z.number().int().min(1),
  availability: z.enum([
    'starter',
    'wild',
    'gift',
    'static',
    'fossil',
    'trade-only',
    'evolution',
    'post-game',
  ]),
  exclusiveToVersions: z.array(z.string().min(1)).optional(),
  earliestCheckpointId: z.string().min(1),
  locations: z.array(encounterLocationSchema).min(1),
  evolutionNotes: z
    .object({
      requiresTrade: z.boolean(),
      minEvolutionLevel: z.number().int().min(1).max(100).optional(),
      requiresItem: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

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
});

export const gameCatalogEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  generation: generationSchema,
  region: z.string().min(1),
  versions: z.array(gameVersionInfoSchema).min(1),
  mechanics: mechanicsFlagsSchema,
  manifestPath: z.string().min(1),
});

export const gameCatalogSchema = z.array(gameCatalogEntrySchema);
