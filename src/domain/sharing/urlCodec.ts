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
  version: 1 | 2;
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

const compactSlotFields = [
  z.string().min(1), // speciesSlug
  z.string().nullable(), // abilitySlug
  z.string().nullable(), // itemSlug
  z.string().nullable(), // natureId
  moveSlugsSchema, // moveSlugs
  pokemonTypeSchema.nullable(), // teraType
  levelSchema.nullable(), // level
  nicknameSchema.nullable(), // nickname
] as const;

const compactSlotTupleSchema = z.tuple([...compactSlotFields]).nullable();

const compactSlotV2TupleSchema = z
  .tuple([
    ...compactSlotFields,
    genderSchema.nullable(), // gender
    z.boolean().nullable(), // shiny
  ])
  .nullable();

const payloadMetaShape = {
  m: z.enum(['free', 'campaign']),
  g: generationSchema,
  gi: z.string().optional(),
  vi: z.string().optional(),
  tn: teamNameSchema.optional(),
};

const v1PayloadSchema = z.object({
  ...payloadMetaShape,
  v: z.literal(1),
  t: z.tuple([
    compactSlotTupleSchema,
    compactSlotTupleSchema,
    compactSlotTupleSchema,
    compactSlotTupleSchema,
    compactSlotTupleSchema,
    compactSlotTupleSchema,
  ]),
});

const v2PayloadSchema = z.object({
  ...payloadMetaShape,
  v: z.literal(2),
  t: z.tuple([
    compactSlotV2TupleSchema,
    compactSlotV2TupleSchema,
    compactSlotV2TupleSchema,
    compactSlotV2TupleSchema,
    compactSlotV2TupleSchema,
    compactSlotV2TupleSchema,
  ]),
});

type CompactSlotTuple = z.infer<typeof compactSlotTupleSchema>;
type CompactSlotV2Tuple = z.infer<typeof compactSlotV2TupleSchema>;

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

function hasV2SlotFields(team: Team): boolean {
  return team.some((slot) => Boolean(slot && (slot.gender !== undefined || slot.shiny)));
}

function toBaseSlotTuple(slot: TeamMember): NonNullable<CompactSlotTuple> {
  return [
    slot.speciesSlug,
    slot.abilitySlug ?? null,
    slot.itemSlug ?? null,
    slot.natureId ?? null,
    [...slot.moveSlugs],
    slot.teraType ?? null,
    slot.level ?? null,
    slot.nickname ?? null,
  ];
}

function toCompactTuple(slot: TeamSlot): CompactSlotTuple {
  return slot ? toBaseSlotTuple(slot) : null;
}

function toCompactV2Tuple(slot: TeamSlot): CompactSlotV2Tuple {
  return slot ? [...toBaseSlotTuple(slot), slot.gender ?? null, slot.shiny ?? null] : null;
}

function fromCompactTuple(
  tuple: CompactSlotTuple | CompactSlotV2Tuple,
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
  tuples: readonly (CompactSlotTuple | CompactSlotV2Tuple)[],
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

function buildPayloadBase(state: ShareableTeamState) {
  return {
    m: state.mode,
    g: state.generation,
    ...(state.gameId ? { gi: state.gameId } : {}),
    ...(state.versionId ? { vi: state.versionId } : {}),
    ...(state.teamName ? { tn: state.teamName } : {}),
  };
}

/**
 * Encodes the active team state into compact URL search parameters.
 * Simple species-only Free Mode teams use human-readable `g` + `s` params;
 * configured builds or campaigns use a versioned `v1_` or `v2_` compressed payload.
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

  const useV2 = state.version === 2 || hasV2SlotFields(state.team);
  const payload = useV2
    ? ({
        ...buildPayloadBase(state),
        v: 2,
        t: mapTeamSlots(state.team, toCompactV2Tuple),
      } satisfies z.infer<typeof v2PayloadSchema>)
    : ({
        ...buildPayloadBase(state),
        v: 1,
        t: mapTeamSlots(state.team, toCompactTuple),
      } satisfies z.infer<typeof v1PayloadSchema>);

  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  return { p: `v${payload.v}_${compressed}` };
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
    const isV1 = params.p.startsWith('v1_');
    const isV2 = params.p.startsWith('v2_');
    if (!isV1 && !isV2) {
      return { ok: false, error: 'Unsupported shared link version.' };
    }

    const compressed = params.p.slice(3);
    const jsonString = decompressFromEncodedURIComponent(compressed);
    if (!jsonString) {
      return { ok: false, error: 'Shared team link is corrupted or incomplete.' };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch {
      return { ok: false, error: 'Shared team payload contains invalid JSON.' };
    }

    const validated = isV2
      ? v2PayloadSchema.safeParse(parsedJson)
      : v1PayloadSchema.safeParse(parsedJson);

    if (!validated.success) {
      return { ok: false, error: 'Shared team payload failed schema validation.' };
    }

    const data = validated.data;
    return {
      ok: true,
      warnings,
      state: {
        version: data.v,
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
      version: 1,
      mode: 'free',
      generation,
      team,
    },
  };
}
