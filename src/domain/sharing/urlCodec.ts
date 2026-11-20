import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { z } from 'zod';
import {
  ALL_POKEMON_TYPES,
  type DexGateway,
  type GenerationNumber,
  type PokemonType,
  type Team,
  type TeamMember,
  type TeamSlot,
} from '@/domain/types';
import { createEmptyTeam } from './teamHelpers';

export interface ShareableTeamState {
  version: 1;
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

const compactSlotTupleSchema = z
  .tuple([
    z.string().min(1), // speciesSlug
    z.string().nullable(), // abilitySlug
    z.string().nullable(), // itemSlug
    z.string().nullable(), // natureId
    z.array(z.string()).max(4), // moveSlugs
    pokemonTypeSchema.nullable(), // teraType
    z.number().int().min(1).max(100).nullable(), // level
    z.string().max(32).nullable(), // nickname
  ])
  .nullable();

const v1PayloadSchema = z.object({
  v: z.literal(1),
  m: z.enum(['free', 'campaign']),
  g: generationSchema,
  gi: z.string().optional(),
  vi: z.string().optional(),
  tn: z.string().max(60).optional(),
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
      !slot.nickname
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
  ];
}

function fromCompactTuple(
  tuple: CompactSlotTuple,
  generation: GenerationNumber,
  dex: DexGateway,
  warnings: string[],
): TeamSlot {
  if (!tuple) return null;
  const [speciesSlug, abilitySlug, itemSlug, natureId, moveSlugs, teraType, level, nickname] =
    tuple;

  const species = dex.getSpecies(speciesSlug, generation);
  if (!species) {
    warnings.push(`Unknown species "${speciesSlug}" in generation ${generation}.`);
    return null;
  }

  const validMoves = moveSlugs.filter((m) => Boolean(dex.getMove(m, generation)));
  if (validMoves.length !== moveSlugs.length) {
    warnings.push(`Some moves for "${species.name}" are invalid in generation ${generation}.`);
  }

  const validAbility = abilitySlug ? dex.getAbility(abilitySlug, generation)?.slug : undefined;
  const validItem = itemSlug ? dex.getItem(itemSlug, generation)?.slug : undefined;
  const validNature = natureId ? dex.getNature(natureId, generation)?.id : undefined;

  const member: TeamMember = {
    speciesSlug: species.slug,
    moveSlugs: validMoves,
    ...(validAbility ? { abilitySlug: validAbility } : {}),
    ...(validItem ? { itemSlug: validItem } : {}),
    ...(validNature ? { natureId: validNature } : {}),
    ...(teraType ? { teraType: teraType as PokemonType } : {}),
    ...(level !== null ? { level } : {}),
    ...(nickname ? { nickname } : {}),
  };
  return member;
}

/**
 * Encodes the active team state into compact URL search parameters.
 * Simple species-only Free Mode teams use human-readable `g` + `s` params;
 * configured builds or campaigns use a versioned `v1_` compressed payload.
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

  const payload: z.infer<typeof v1PayloadSchema> = {
    v: 1,
    m: state.mode,
    g: state.generation,
    ...(state.gameId ? { gi: state.gameId } : {}),
    ...(state.versionId ? { vi: state.versionId } : {}),
    ...(state.teamName ? { tn: state.teamName } : {}),
    t: [
      toCompactTuple(state.team[0]),
      toCompactTuple(state.team[1]),
      toCompactTuple(state.team[2]),
      toCompactTuple(state.team[3]),
      toCompactTuple(state.team[4]),
      toCompactTuple(state.team[5]),
    ],
  };

  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  return { p: `v1_${compressed}` };
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
    if (!params.p.startsWith('v1_')) {
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

    const validated = v1PayloadSchema.safeParse(parsedJson);
    if (!validated.success) {
      return { ok: false, error: 'Shared team payload failed schema validation.' };
    }

    const data = validated.data;
    const team: Team = [
      fromCompactTuple(data.t[0], data.g, dex, warnings),
      fromCompactTuple(data.t[1], data.g, dex, warnings),
      fromCompactTuple(data.t[2], data.g, dex, warnings),
      fromCompactTuple(data.t[3], data.g, dex, warnings),
      fromCompactTuple(data.t[4], data.g, dex, warnings),
      fromCompactTuple(data.t[5], data.g, dex, warnings),
    ];

    return {
      ok: true,
      warnings,
      state: {
        version: 1,
        mode: data.m,
        generation: data.g,
        ...(data.gi ? { gameId: data.gi } : {}),
        ...(data.vi ? { versionId: data.vi } : {}),
        ...(data.tn ? { teamName: data.tn } : {}),
        team,
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
    const tokens = params.s.split(',').slice(0, 6);
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
