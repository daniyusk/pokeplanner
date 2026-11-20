import { Generations, type Dex as PkmnDexInterface, toID } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import {
  type AbilityData,
  type AbilitySlug,
  ALL_POKEMON_TYPES,
  type DexGateway,
  type EffectivenessMultiplier,
  type GenerationNumber,
  type ItemData,
  type MoveData,
  type NatureData,
  type PokemonType,
  type SpeciesData,
  type StatId,
} from '@/domain/types';

const STANDARD_TYPE_SET: ReadonlySet<string> = new Set(ALL_POKEMON_TYPES);

function isStandardType(value: string): value is PokemonType {
  return STANDARD_TYPE_SET.has(value);
}

const generations = new Generations(Dex as unknown as PkmnDexInterface);

const availableTypesCache = new Map<GenerationNumber, readonly PokemonType[]>();
const speciesListCache = new Map<GenerationNumber, readonly SpeciesData[]>();
const movesListCache = new Map<GenerationNumber, readonly MoveData[]>();
const itemsListCache = new Map<GenerationNumber, readonly ItemData[]>();
const naturesListCache = new Map<GenerationNumber, readonly NatureData[]>();

function computeSpriteId(baseSpecies: string, forme: string): string {
  const baseId = toID(baseSpecies);
  if (!forme) return baseId;
  return `${baseId}-${toID(forme)}`;
}

function mapSpecies(
  raw: ReturnType<ReturnType<Generations['get']>['species']['get']>,
): SpeciesData | undefined {
  if (!raw) return undefined;

  const validTypes = raw.types.filter(isStandardType);
  if (validTypes.length === 0) return undefined;

  const types: readonly [PokemonType] | readonly [PokemonType, PokemonType] =
    validTypes.length >= 2 && validTypes[1]
      ? [validTypes[0] as PokemonType, validTypes[1]]
      : [validTypes[0] as PokemonType];

  const abilitySlugs: AbilitySlug[] = [];
  for (const key of ['0', '1', 'H', 'S'] as const) {
    const abilityName = raw.abilities[key];
    if (abilityName) {
      const id = toID(abilityName);
      if (id && !abilitySlugs.includes(id)) {
        abilitySlugs.push(id);
      }
    }
  }

  const baseSpeciesSlug = toID(raw.baseSpecies);
  const otherFormeSlugs = raw.formes
    ? raw.formes.map((f) => toID(f)).filter((id) => id !== raw.id)
    : raw.otherFormes
      ? raw.otherFormes.map((f) => toID(f))
      : [];

  return {
    slug: toID(raw.name),
    name: raw.name,
    dexNumber: raw.num,
    spriteId: computeSpriteId(raw.baseSpecies, raw.forme),
    types,
    baseStats: {
      hp: raw.baseStats.hp,
      atk: raw.baseStats.atk,
      def: raw.baseStats.def,
      spa: raw.baseStats.spa,
      spd: raw.baseStats.spd,
      spe: raw.baseStats.spe,
    },
    abilities: abilitySlugs,
    baseSpeciesSlug,
    ...(raw.forme ? { forme: raw.forme } : {}),
    otherFormeSlugs,
    isMega: Boolean(raw.isMega),
    nfe: raw.nfe,
    ...(raw.prevo ? { prevoSlug: toID(raw.prevo) } : {}),
    evoSlugs: raw.evos ? raw.evos.map((e) => toID(e)) : [],
  };
}

function mapMove(
  raw: ReturnType<ReturnType<Generations['get']>['moves']['get']>,
): MoveData | undefined {
  if (!raw || !isStandardType(raw.type)) return undefined;

  return {
    slug: toID(raw.name),
    name: raw.name,
    type: raw.type,
    category: raw.category,
    basePower: raw.basePower,
    accuracy: raw.accuracy,
    pp: raw.pp,
    priority: raw.priority,
    shortDesc: raw.shortDesc,
  };
}

/**
 * Generation-aware adapter over `@pkmn/dex` and `@pkmn/data`.
 */
export const pkmnDexGateway: DexGateway = {
  getAvailableTypes(generation: GenerationNumber): readonly PokemonType[] {
    const cached = availableTypesCache.get(generation);
    if (cached) return cached;

    const gen = generations.get(generation);
    const types: PokemonType[] = [];
    for (const typeObj of gen.types) {
      if (isStandardType(typeObj.name)) {
        types.push(typeObj.name);
      }
    }

    availableTypesCache.set(generation, types);
    return types;
  },

  getTypeEffectiveness(
    attackType: PokemonType,
    defenderTypes: readonly PokemonType[],
    generation: GenerationNumber,
  ): EffectivenessMultiplier {
    const gen = generations.get(generation);
    return gen.types.totalEffectiveness(attackType, [...defenderTypes]);
  },

  getSpecies(slug: string, generation: GenerationNumber): SpeciesData | undefined {
    const gen = generations.get(generation);
    return mapSpecies(gen.species.get(slug));
  },

  getMove(slug: string, generation: GenerationNumber): MoveData | undefined {
    const gen = generations.get(generation);
    return mapMove(gen.moves.get(slug));
  },

  getAbility(slug: string, generation: GenerationNumber): AbilityData | undefined {
    const gen = generations.get(generation);
    const raw = gen.abilities.get(slug);
    if (!raw) return undefined;
    return {
      slug: raw.id,
      name: raw.name,
      shortDesc: raw.shortDesc,
    };
  },

  getItem(slug: string, generation: GenerationNumber): ItemData | undefined {
    const gen = generations.get(generation);
    const raw = gen.items.get(slug);
    if (!raw) return undefined;
    return {
      slug: raw.id,
      name: raw.name,
      shortDesc: raw.shortDesc,
    };
  },

  getNature(name: string, generation: GenerationNumber): NatureData | undefined {
    const gen = generations.get(generation);
    const raw = gen.natures.get(name);
    if (!raw) return undefined;
    return {
      id: raw.name,
      name: raw.name,
      ...(raw.plus ? { plus: raw.plus as Exclude<StatId, 'hp'> } : {}),
      ...(raw.minus ? { minus: raw.minus as Exclude<StatId, 'hp'> } : {}),
    };
  },

  listSpecies(generation: GenerationNumber): readonly SpeciesData[] {
    const cached = speciesListCache.get(generation);
    if (cached) return cached;

    const gen = generations.get(generation);
    const list: SpeciesData[] = [];
    for (const raw of gen.species) {
      const mapped = mapSpecies(raw);
      if (mapped && mapped.dexNumber > 0) {
        list.push(mapped);
      }
    }
    list.sort((a, b) => a.dexNumber - b.dexNumber || a.name.localeCompare(b.name));
    speciesListCache.set(generation, list);
    return list;
  },

  listMoves(generation: GenerationNumber): readonly MoveData[] {
    const cached = movesListCache.get(generation);
    if (cached) return cached;

    const gen = generations.get(generation);
    const list: MoveData[] = [];
    for (const raw of gen.moves) {
      const mapped = mapMove(raw);
      if (mapped) {
        list.push(mapped);
      }
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    movesListCache.set(generation, list);
    return list;
  },

  listItems(generation: GenerationNumber): readonly ItemData[] {
    if (generation < 2) return [];
    const cached = itemsListCache.get(generation);
    if (cached) return cached;

    const gen = generations.get(generation);
    const list: ItemData[] = [];
    for (const raw of gen.items) {
      list.push({
        slug: raw.id,
        name: raw.name,
        shortDesc: raw.shortDesc,
      });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    itemsListCache.set(generation, list);
    return list;
  },

  listNatures(generation: GenerationNumber): readonly NatureData[] {
    if (generation < 3) return [];
    const cached = naturesListCache.get(generation);
    if (cached) return cached;

    const gen = generations.get(generation);
    const list: NatureData[] = [];
    for (const raw of gen.natures) {
      list.push({
        id: raw.name,
        name: raw.name,
        ...(raw.plus ? { plus: raw.plus as Exclude<StatId, 'hp'> } : {}),
        ...(raw.minus ? { minus: raw.minus as Exclude<StatId, 'hp'> } : {}),
      });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    naturesListCache.set(generation, list);
    return list;
  },

  async getLearnableMoveSlugs(speciesSlug: string, generation: GenerationNumber) {
    const gen = generations.get(generation);
    const learnable = await gen.learnsets.learnable(speciesSlug);
    if (!learnable) return [];
    return Object.keys(learnable);
  },
};
