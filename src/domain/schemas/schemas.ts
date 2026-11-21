import { z } from 'zod';
import {
  ALL_BATTLE_GIMMICKS,
  ALL_GENERATIONS,
  ALL_POKEMON_GENDERS,
  ALL_POKEMON_TYPES,
  CHECKPOINT_CATEGORIES,
  DEX_AVAILABILITY_TYPES,
  ENCOUNTER_METHODS,
  LEVEL_BOUNDS,
  MAX_MOVES_PER_MEMBER,
  TEXT_LIMITS,
} from '@/domain/constants';
import type { GenerationNumber } from '@/domain/types';

export const generationSchema = z
  .number()
  .int()
  .refine(
    (value): value is GenerationNumber => (ALL_GENERATIONS as readonly number[]).includes(value),
    { message: 'Invalid Pokémon generation number' },
  );

export const pokemonTypeSchema = z.enum(ALL_POKEMON_TYPES);

export const genderSchema = z.enum(ALL_POKEMON_GENDERS);

export const battleGimmickSchema = z.enum(ALL_BATTLE_GIMMICKS);

export const checkpointCategorySchema = z.enum(CHECKPOINT_CATEGORIES);

export const encounterMethodSchema = z.enum(ENCOUNTER_METHODS);

export const dexAvailabilitySchema = z.enum(DEX_AVAILABILITY_TYPES);

export const levelSchema = z.number().int().min(LEVEL_BOUNDS.min).max(LEVEL_BOUNDS.max);

export const nicknameSchema = z.string().max(TEXT_LIMITS.nicknameMaxLength);

export const teamNameSchema = z.string().max(TEXT_LIMITS.teamNameMaxLength);

export const moveSlugsSchema = z.array(z.string()).max(MAX_MOVES_PER_MEMBER);
