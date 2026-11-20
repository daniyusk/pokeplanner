import { get, set } from 'idb-keyval';
import { z } from 'zod';
import { ALL_POKEMON_TYPES, type GenerationNumber, type Team } from '@/domain/types';

const SAVED_TEAMS_KEY = 'pokeplanner:saved-teams:v1';
const THEME_STORAGE_KEY = 'pokeplanner:theme';

export type ThemeMode = 'light' | 'dark';

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

const teamMemberSchema = z.object({
  speciesSlug: z.string().min(1),
  abilitySlug: z.string().optional(),
  itemSlug: z.string().optional(),
  natureId: z.string().optional(),
  moveSlugs: z.array(z.string()).max(4),
  teraType: z.enum(ALL_POKEMON_TYPES).optional(),
  level: z.number().int().min(1).max(100).optional(),
  nickname: z.string().max(32).optional(),
});

const savedTeamRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  updatedAt: z.string(),
  mode: z.enum(['free', 'campaign']),
  generation: generationSchema,
  gameId: z.string().optional(),
  versionId: z.string().optional(),
  team: z.tuple([
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
    teamMemberSchema.nullable(),
  ]),
});

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

const savedTeamListSchema = z.array(savedTeamRecordSchema);

/**
 * Reads and validates all saved teams from IndexedDB.
 */
export async function listSavedTeams(): Promise<SavedTeamRecord[]> {
  try {
    const raw = await get(SAVED_TEAMS_KEY);
    if (!raw) return [];
    const parsed = savedTeamListSchema.safeParse(raw);
    if (!parsed.success) return [];
    return parsed.data as SavedTeamRecord[];
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
  await set(SAVED_TEAMS_KEY, next);
  return next;
}

/**
 * Deletes a saved team record by ID from IndexedDB.
 */
export async function deleteSavedTeamRecord(id: string): Promise<SavedTeamRecord[]> {
  const existing = await listSavedTeams();
  const next = existing.filter((item) => item.id !== id);
  await set(SAVED_TEAMS_KEY, next);
  return next;
}

export function getThemePreference(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function setThemePreference(theme: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}
