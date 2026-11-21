import { get, set } from 'idb-keyval';
import { z } from 'zod';
import { STORAGE_KEYS } from '@/data/config/storageKeys';
import {
  genderSchema,
  generationSchema,
  levelSchema,
  moveSlugsSchema,
  nicknameSchema,
  pokemonTypeSchema,
  teamNameSchema,
} from '@/domain/schemas';
import type { GenerationNumber, Team, TeamMember } from '@/domain/types';

export type ThemeMode = 'light' | 'dark';

export interface SavedTeamRecord {
  id: string;
  name: string;
  updatedAt: string;
  mode: 'free' | 'campaign';
  generation: GenerationNumber;
  gameId?: string;
  versionId?: string;
  team: Team;
}

const teamMemberSchema = z.object({
  speciesSlug: z.string().min(1),
  abilitySlug: z.string().exactOptional(),
  itemSlug: z.string().exactOptional(),
  natureId: z.string().exactOptional(),
  moveSlugs: moveSlugsSchema,
  teraType: pokemonTypeSchema.exactOptional(),
  level: levelSchema.exactOptional(),
  nickname: nicknameSchema.exactOptional(),
  gender: genderSchema.exactOptional(),
  shiny: z.boolean().exactOptional(),
}) satisfies z.ZodType<TeamMember>;

const savedTeamRecordSchema = z.object({
  id: z.string().min(1),
  name: teamNameSchema.min(1),
  updatedAt: z.string(),
  mode: z.enum(['free', 'campaign']),
  generation: generationSchema,
  gameId: z.string().exactOptional(),
  versionId: z.string().exactOptional(),
  team: z.tuple([
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
  ]),
}) satisfies z.ZodType<SavedTeamRecord>;

const savedTeamListSchema = z.array(savedTeamRecordSchema);

/**
 * Reads and validates all saved teams from IndexedDB.
 */
export async function listSavedTeams(): Promise<SavedTeamRecord[]> {
  try {
    const raw = await get(STORAGE_KEYS.savedTeams);
    if (!raw) return [];
    const parsed = savedTeamListSchema.safeParse(raw);
    if (!parsed.success) return [];
    return parsed.data;
  } catch {
    return [];
  }
}

/**
 * Inserts or updates a saved team record in IndexedDB.
 */
export async function saveTeamRecord(record: SavedTeamRecord): Promise<SavedTeamRecord[]> {
  const existing = await listSavedTeams();
  const filtered = existing.filter((item) => item.id !== record.id);
  const next = [record, ...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await set(STORAGE_KEYS.savedTeams, next);
  return next;
}

/**
 * Deletes a saved team record by ID from IndexedDB.
 */
export async function deleteSavedTeamRecord(id: string): Promise<SavedTeamRecord[]> {
  const existing = await listSavedTeams();
  const next = existing.filter((item) => item.id !== id);
  await set(STORAGE_KEYS.savedTeams, next);
  return next;
}

export function getThemePreference(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.theme);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function setThemePreference(theme: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}
