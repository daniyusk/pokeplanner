import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { z } from 'zod';
import { TEAM_SIZE } from '@/domain/constants';
import {
  genderSchema,
  generationSchema,
  levelSchema,
  moveSlugsSchema,
  nicknameSchema,
  pokemonTypeSchema,
  teamNameSchema,
} from '@/domain/schemas';
import { createEmptyTeam, mapTeamSlots, sanitizeTeamMember } from '@/domain/team';
import type { DexGateway, GenerationNumber, Team, TeamMember, TeamSlot } from '@/domain/types';

export interface ShareableTeamState {
  mode: 'free' | 'campaign';
  generation: GenerationNumber;
  gameId?: string;
  versionId?: string;
  teamName?: string;
  team: Team;
}

export type TeamSearchParams = {
  g?: string;
  s?: string;
  p?: string;
};

export type DecodeTeamResult =
  | { ok: true; state: ShareableTeamState; warnings: readonly string[] }
  | { ok: false; error: string };

const compactSlotTupleSchema = z
  .tuple([
    z.string().min(1), // speciesSlug
    z.string().nullable(), // abilitySlug
    z.string().nullable(), // itemSlug
    z.string().nullable(), // natureId
    moveSlugsSchema, // moveSlugs
    pokemonTypeSchema.nullable(), // teraType
    levelSchema.nullable(), // level
    nicknameSchema.nullable(), // nickname
    genderSchema.nullable(), // gender
    z.boolean().nullable(), // shiny
  ])
  .nullable();

const teamPayloadSchema = z.object({
  m: z.enum(['free', 'campaign']),
  g: generationSchema,
  gi: z.string().optional(),
  vi: z.string().optional(),
  tn: teamNameSchema.optional(),
  t: z.tuple([
    compactSlotTupleSchema,
    compactSlotTupleSchema,
    compactSlotTupleSchema,
    compactSlotTupleSchema,
    compactSlotTupleSchema,
    compactSlotTupleSchema,
  ]),
});

type CompactSlotTuple = z.infer<typeof compactSlotTupleSchema>;

function isSpeciesOnlySimpleState(state: ShareableTeamState): boolean {
  if (state.mode !== 'free' || state.teamName || state.gameId || state.versionId) {
    return false;
  }
  return state.team.every((slot) => {
    if (!slot) return true;
    return (
      !slot.abilitySlug &&
      !slot.itemSlug &&
      !slot.natureId &&
      slot.moveSlugs.length === 0 &&
      !slot.teraType &&
      slot.level === undefined &&
      !slot.nickname &&
      !slot.gender &&
      !slot.shiny
    );
  });
}

function toCompactTuple(slot: TeamSlot): CompactSlotTuple {
  if (!slot) return null;
  return [
    slot.speciesSlug,
    slot.abilitySlug ?? null,
    slot.itemSlug ?? null,
    slot.natureId ?? null,
    [...slot.moveSlugs],
    slot.teraType ?? null,
    slot.level ?? null,
    slot.nickname ?? null,
    slot.gender ?? null,
    slot.shiny ?? null,
  ];
}

function fromCompactTuple(
  tuple: CompactSlotTuple,
  generation: GenerationNumber,
  dex: DexGateway,
  warnings: string[],
): TeamSlot {
  if (!tuple) return null;
  const [
    speciesSlug,
    abilitySlug,
    itemSlug,
    natureId,
    moveSlugs,
    teraType,
    level,
    nickname,
    gender,
    shiny,
  ] = tuple;

  const rawMember: TeamMember = {
    speciesSlug,
    moveSlugs,
    ...(abilitySlug ? { abilitySlug } : {}),
    ...(itemSlug ? { itemSlug } : {}),
    ...(natureId ? { natureId } : {}),
    ...(teraType ? { teraType } : {}),
    ...(level !== null ? { level } : {}),
    ...(nickname ? { nickname } : {}),
    ...(gender ? { gender } : {}),
    ...(shiny === true ? { shiny: true } : {}),
  };

  return sanitizeTeamMember(rawMember, generation, dex, { warnings });
}

function mapTuplesToTeam(
  tuples: readonly CompactSlotTuple[],
  generation: GenerationNumber,
  dex: DexGateway,
  warnings: string[],
): Team {
  return [
    fromCompactTuple(tuples[0] ?? null, generation, dex, warnings),
    fromCompactTuple(tuples[1] ?? null, generation, dex, warnings),
    fromCompactTuple(tuples[2] ?? null, generation, dex, warnings),
    fromCompactTuple(tuples[3] ?? null, generation, dex, warnings),
    fromCompactTuple(tuples[4] ?? null, generation, dex, warnings),
    fromCompactTuple(tuples[5] ?? null, generation, dex, warnings),
  ];
}

/**
 * Encodes the active team state into compact URL search parameters.
 * Simple species-only Free Mode teams use human-readable `g` + `s` params;
 * configured builds or campaigns use a compressed `p` payload.
 */
export function encodeTeamToSearchParams(state: ShareableTeamState): TeamSearchParams {
  if (isSpeciesOnlySimpleState(state)) {
    const hasAnyMember = state.team.some((slot) => slot !== null);
    if (!hasAnyMember) {
      return state.generation === 9 ? {} : { g: String(state.generation) };
    }
    const speciesList = state.team.map((slot) => (slot ? slot.speciesSlug : '-')).join(',');
    return {
      g: String(state.generation),
      s: speciesList,
    };
  }

  const payload: z.infer<typeof teamPayloadSchema> = {
    m: state.mode,
    g: state.generation,
    ...(state.gameId ? { gi: state.gameId } : {}),
    ...(state.versionId ? { vi: state.versionId } : {}),
    ...(state.teamName ? { tn: state.teamName } : {}),
    t: mapTeamSlots(state.team, toCompactTuple),
  };

  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  return { p: compressed };
}

/**
 * Decodes URL search parameters back into a validated ShareableTeamState.
 */
export function decodeTeamFromSearchParams(
  params: Record<string, unknown>,
  dex: DexGateway,
): DecodeTeamResult {
  const warnings: string[] = [];

  if (typeof params.p === 'string' && params.p.length > 0) {
    const jsonString = decompressFromEncodedURIComponent(params.p);
    if (!jsonString) {
      return { ok: false, error: 'Shared team link is corrupted or incomplete.' };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch {
      return { ok: false, error: 'Shared team payload contains invalid JSON.' };
    }

    const validated = teamPayloadSchema.safeParse(parsedJson);
    if (!validated.success) {
      return { ok: false, error: 'Shared team payload failed schema validation.' };
    }

    const data = validated.data;
    return {
      ok: true,
      warnings,
      state: {
        mode: data.m,
        generation: data.g,
        ...(data.gi ? { gameId: data.gi } : {}),
        ...(data.vi ? { versionId: data.vi } : {}),
        ...(data.tn ? { teamName: data.tn } : {}),
        team: mapTuplesToTeam(data.t, data.g, dex, warnings),
      },
    };
  }

  let generation: GenerationNumber = 9;
  if (params.g !== undefined) {
    const numericGen = Number(params.g);
    const parsedGen = generationSchema.safeParse(numericGen);
    if (!parsedGen.success) {
      return { ok: false, error: `Invalid generation parameter "${String(params.g)}".` };
    }
    generation = parsedGen.data;
  }

  const team = createEmptyTeam();
  if (typeof params.s === 'string' && params.s.length > 0) {
    const tokens = params.s.split(',').slice(0, TEAM_SIZE);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]?.trim();
      if (!token || token === '-') continue;

      const species = dex.getSpecies(token, generation);
      if (!species) {
        warnings.push(`Unknown species "${token}" in generation ${generation}.`);
        continue;
      }

      team[i] = {
        speciesSlug: species.slug,
        moveSlugs: [],
      };
    }
  }

  return {
    ok: true,
    warnings,
    state: {
      mode: 'free',
      generation,
      team,
    },
  };
}
