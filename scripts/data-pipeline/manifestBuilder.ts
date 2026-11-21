import { Generations, type Dex as PkmnDexInterface, toID } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import {
  type Checkpoint,
  type EncounterLocation,
  type EncounterMethod,
  type GameDexEntry,
  type GameManifest,
  type GameMechanicsFlags,
  type GameVersionInfo,
  type GenerationNumber,
  getDefaultMechanicsForGeneration,
} from '../../src/domain/types';

export interface CuratedEncounter {
  species: readonly string[];
  checkpointId: string;
  areaName: string;
  method: EncounterMethod;
  availability?: GameDexEntry['availability'];
  exclusiveToVersions?: readonly string[];
  minLevel?: number;
  maxLevel?: number;
  notes?: string;
}

export interface CampaignSourceDef {
  id: string;
  name: string;
  shortName: string;
  generation: GenerationNumber;
  region: string;
  versionGroup: string;
  versions: readonly GameVersionInfo[];
  mechanics?: GameMechanicsFlags;
  checkpoints: readonly Checkpoint[];
  encounters: readonly CuratedEncounter[];
  /** Species in this game that are locked behind post-game (e.g., National Dex) */
  postGameSpecies?: readonly string[];
}

const generations = new Generations(Dex as unknown as PkmnDexInterface);

function makeDexEntry(
  regionalDexNumber: number,
  availability: GameDexEntry['availability'],
  earliestCheckpointId: string,
  locations: readonly EncounterLocation[],
  exclusiveToVersions?: readonly string[],
  evolutionNotes?: GameDexEntry['evolutionNotes'],
): GameDexEntry {
  return {
    regionalDexNumber,
    availability,
    earliestCheckpointId,
    locations,
    ...(exclusiveToVersions && exclusiveToVersions.length > 0 ? { exclusiveToVersions } : {}),
    ...(evolutionNotes ? { evolutionNotes } : {}),
  };
}

/**
 * Expands curated campaign encounters into a complete GameManifest by traversing
 * generation-accurate evolution trees from `@pkmn/data` and `@pkmn/dex`.
 */
export function buildGameManifest(def: CampaignSourceDef): GameManifest {
  const gen = generations.get(def.generation);
  const mechanics = def.mechanics ?? getDefaultMechanicsForGeneration(def.generation);
  const validVersionIds = new Set(def.versions.map((v) => v.id));
  const checkpointOrder = new Map(def.checkpoints.map((cp) => [cp.id, cp.order]));
  const postGameSet = new Set((def.postGameSpecies ?? []).map((s) => toID(s)));
  const lastCheckpoint = def.checkpoints[def.checkpoints.length - 1];
  if (!lastCheckpoint) {
    throw new Error(`Campaign "${def.id}" must define at least one checkpoint.`);
  }

  const dexMap: Record<string, GameDexEntry> = {};
  let nextRegionalNum = 1;
  const regionalNumBySlug = new Map<string, number>();

  const getRegionalNum = (slug: string): number => {
    const existing = regionalNumBySlug.get(slug);
    if (existing !== undefined) return existing;
    const assigned = nextRegionalNum;
    nextRegionalNum += 1;
    regionalNumBySlug.set(slug, assigned);
    return assigned;
  };

  // Pass 1: Register all direct encounters (earliest checkpoint wins if listed multiple times)
  for (const enc of def.encounters) {
    if (!checkpointOrder.has(enc.checkpointId)) {
      throw new Error(`Invalid checkpointId "${enc.checkpointId}" in campaign "${def.id}".`);
    }
    if (enc.exclusiveToVersions) {
      for (const versionId of enc.exclusiveToVersions) {
        if (!validVersionIds.has(versionId)) {
          throw new Error(
            `Encounter in campaign "${def.id}" references unknown version "${versionId}".`,
          );
        }
      }
    }

    for (const rawSpecies of enc.species) {
      const sp = gen.species.get(rawSpecies);
      if (!sp || sp.num <= 0) {
        throw new Error(
          `Unknown species "${rawSpecies}" in Gen ${def.generation} for campaign "${def.id}".`,
        );
      }

      const location: EncounterLocation = {
        areaName: enc.areaName,
        method: enc.method,
        ...(enc.minLevel !== undefined ? { minLevel: enc.minLevel } : {}),
        ...(enc.maxLevel !== undefined ? { maxLevel: enc.maxLevel } : {}),
        ...(enc.notes ? { notes: enc.notes } : {}),
      };

      const availability: GameDexEntry['availability'] =
        enc.availability ??
        (enc.method === 'starter'
          ? 'starter'
          : enc.method === 'gift'
            ? 'gift'
            : enc.method === 'static'
              ? 'static'
              : enc.method === 'fossil'
                ? 'fossil'
                : enc.method === 'trade'
                  ? 'trade-only'
                  : 'wild');

      const existing = dexMap[sp.id];
      if (!existing) {
        const regNum = getRegionalNum(sp.id);
        dexMap[sp.id] = makeDexEntry(
          regNum,
          postGameSet.has(sp.id) ? 'post-game' : availability,
          enc.checkpointId,
          [location],
          enc.exclusiveToVersions,
        );
      } else {
        const currentOrder = checkpointOrder.get(existing.earliestCheckpointId) ?? 999;
        const nextOrder = checkpointOrder.get(enc.checkpointId) ?? 999;
        const earliestCheckpointId =
          nextOrder < currentOrder ? enc.checkpointId : existing.earliestCheckpointId;

        const mergedVersions =
          existing.exclusiveToVersions && enc.exclusiveToVersions
            ? Array.from(new Set([...existing.exclusiveToVersions, ...enc.exclusiveToVersions]))
            : undefined;

        dexMap[sp.id] = makeDexEntry(
          existing.regionalDexNumber,
          existing.availability,
          earliestCheckpointId,
          [...existing.locations, location],
          mergedVersions,
          existing.evolutionNotes,
        );
      }
    }
  }

  // Pass 2: Propagate availability down evolution chains using generation-accurate `@pkmn/data`
  const queue = Object.keys(dexMap);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const slug = queue.shift();
    if (!slug || visited.has(slug)) continue;
    visited.add(slug);

    const parentEntry = dexMap[slug];
    const parentSpecies = gen.species.get(slug);
    if (!parentEntry || !parentSpecies?.evos) continue;

    for (const evoName of parentSpecies.evos) {
      const evo = gen.species.get(evoName);
      if (!evo || evo.num <= 0) continue;

      const requiresTrade = evo.evoType === 'trade';
      const isPostGame = postGameSet.has(evo.id);
      const evoAvailability: GameDexEntry['availability'] = isPostGame
        ? 'post-game'
        : requiresTrade
          ? 'trade-only'
          : 'evolution';

      const evoNotes: GameDexEntry['evolutionNotes'] = {
        requiresTrade,
        ...(evo.evoLevel !== undefined ? { minEvolutionLevel: evo.evoLevel } : {}),
        ...(evo.evoItem ? { requiresItem: evo.evoItem } : {}),
        ...(evo.evoCondition ? { notes: evo.evoCondition } : {}),
      };

      const existingEvo = dexMap[evo.id];
      const evoLocation: EncounterLocation = {
        areaName: `Evolve ${parentSpecies.name}${evo.evoLevel ? ` (Lv ${evo.evoLevel})` : evo.evoItem ? ` (${evo.evoItem})` : requiresTrade ? ' (Trade)' : ''}`,
        method: requiresTrade ? 'trade' : 'evolve',
      };

      if (!existingEvo) {
        const regNum = getRegionalNum(evo.id);
        dexMap[evo.id] = makeDexEntry(
          regNum,
          evoAvailability,
          isPostGame ? lastCheckpoint.id : parentEntry.earliestCheckpointId,
          [evoLocation],
          parentEntry.exclusiveToVersions,
          evoNotes,
        );
        queue.push(evo.id);
      } else if (!existingEvo.evolutionNotes) {
        dexMap[evo.id] = makeDexEntry(
          existingEvo.regionalDexNumber,
          existingEvo.availability,
          existingEvo.earliestCheckpointId,
          existingEvo.locations,
          existingEvo.exclusiveToVersions,
          evoNotes,
        );
      }
    }
  }

  return {
    id: def.id,
    name: def.name,
    shortName: def.shortName,
    generation: def.generation,
    region: def.region,
    versionGroup: def.versionGroup,
    versions: def.versions,
    mechanics,
    checkpoints: def.checkpoints,
    dex: dexMap,
  };
}
