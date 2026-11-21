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
  type PokemonGender,
  type PokemonType,
  type SpeciesData,
} from '@/domain/types';

const STANDARD_TYPE_SET: ReadonlySet<string> = new Set(ALL_POKEMON_TYPES);

function isStandardType(value: string): value is PokemonType {
  return STANDARD_TYPE_SET.has(value);
}

const generations = new Generations(Dex as unknown as PkmnDexInterface);
const nationalGenerations = new Generations(Dex as unknown as PkmnDexInterface, (d) =>
  Boolean(d.exists && (!('isNonstandard' in d) || !d.isNonstandard || d.isNonstandard === 'Past')),
);

function getGen(generation: GenerationNumber) {
  return generation === 9 ? nationalGenerations.get(9) : generations.get(generation);
}

type GenInstance = ReturnType<Generations['get']>;
type RawSpecies = NonNullable<ReturnType<GenInstance['species']['get']>>;
type RawMove = NonNullable<ReturnType<GenInstance['moves']['get']>>;
type RawNature = NonNullable<ReturnType<GenInstance['natures']['get']>>;

const availableTypesCache = new Map<GenerationNumber, readonly PokemonType[]>();
const speciesListCache = new Map<GenerationNumber, readonly SpeciesData[]>();
const movesListCache = new Map<GenerationNumber, readonly MoveData[]>();
const itemsListCache = new Map<GenerationNumber, readonly ItemData[]>();
const naturesListCache = new Map<GenerationNumber, readonly NatureData[]>();

const speciesCache = new Map<GenerationNumber, Map<string, SpeciesData | undefined>>();
const moveCache = new Map<GenerationNumber, Map<string, MoveData | undefined>>();
const abilityCache = new Map<GenerationNumber, Map<string, AbilityData | undefined>>();
const itemCache = new Map<GenerationNumber, Map<string, ItemData | undefined>>();
const natureCache = new Map<GenerationNumber, Map<string, NatureData | undefined>>();
const learnableMovesCache = new Map<string, Promise<readonly string[]>>();

function getCachedPointLookup<T>(
  cache: Map<GenerationNumber, Map<string, T | undefined>>,
  generation: GenerationNumber,
  slug: string,
  loader: () => T | undefined,
): T | undefined {
  let genMap = cache.get(generation);
  if (!genMap) {
    genMap = new Map<string, T | undefined>();
    cache.set(generation, genMap);
  }
  const key = toID(slug);
  if (genMap.has(key)) {
    return genMap.get(key);
  }
  const value = loader();
  genMap.set(key, value);
  return value;
}

function computeSpriteId(baseSpecies: string, forme: string): string {
  const baseId = toID(baseSpecies);
  if (!forme) return baseId;
  return `${baseId}-${toID(forme)}`;
}

function deriveAvailableGenders(
  raw: RawSpecies,
  generation: GenerationNumber,
): readonly PokemonGender[] {
  if (generation === 1) return ['N'];
  if (raw.gender === 'M' || raw.gender === 'F' || raw.gender === 'N') {
    return [raw.gender];
  }
  const ratio = raw.genderRatio;
  if (ratio) {
    const genders: PokemonGender[] = [];
    if (ratio.M > 0) genders.push('M');
    if (ratio.F > 0) genders.push('F');
    if (genders.length > 0) return genders;
  }
  return ['N'];
}

function isExcludedSpecialForm(forme: string): boolean {
  if (!forme) return false;
  return (
    forme === 'Gmax' ||
    forme.endsWith('-Gmax') ||
    forme === 'Eternamax' ||
    forme.toLowerCase().includes('totem')
  );
}

function mapNature(raw: RawNature): NatureData {
  return {
    id: raw.name,
    name: raw.name,
    ...(raw.plus ? { plus: raw.plus } : {}),
    ...(raw.minus ? { minus: raw.minus } : {}),
  };
}

function mapSpecies(
  raw: RawSpecies | undefined,
  generation: GenerationNumber,
): SpeciesData | undefined {
  if (!raw) return undefined;

  const [firstType, secondType] = raw.types.filter(isStandardType);
  if (!firstType) return undefined;

  const types: readonly [PokemonType] | readonly [PokemonType, PokemonType] = secondType
    ? [firstType, secondType]
    : [firstType];

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

  const isLegendary = raw.tags.some(
    (tag) => tag === 'Restricted Legendary' || tag === 'Sub-Legendary' || tag === 'Mythical',
  );

  const evoCondition =
    raw.evoItem ??
    raw.evoCondition ??
    (raw.evoType && raw.evoType !== 'levelExtra' ? raw.evoType : undefined);

  return {
    slug: raw.id,
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
    availableGenders: deriveAvailableGenders(raw, generation),
    generationIntroduced: raw.gen,
    baseSpeciesSlug,
    ...(raw.forme ? { forme: raw.forme } : {}),
    otherFormeSlugs,
    isMega: Boolean(raw.isMega),
    isLegendary,
    isBattleOnly: Boolean(raw.battleOnly) || Boolean(raw.isMega),
    nfe: raw.nfe,
    ...(raw.prevo ? { prevoSlug: toID(raw.prevo) } : {}),
    evoSlugs: raw.evos ? raw.evos.map((e) => toID(e)) : [],
    ...(raw.evoLevel !== undefined ? { evoLevel: raw.evoLevel } : {}),
    ...(evoCondition ? { evoCondition } : {}),
  };
}

function mapMove(raw: RawMove | undefined): MoveData | undefined {
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
 * Generation 9 exposes the unrestricted National Dex for generation-independent Free Mode.
 */
export const pkmnDexGateway: DexGateway = {
  getAvailableTypes(generation: GenerationNumber): readonly PokemonType[] {
    const cached = availableTypesCache.get(generation);
    if (cached) return cached;

    const gen = getGen(generation);
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
    const gen = getGen(generation);
    return gen.types.totalEffectiveness(attackType, [...defenderTypes]);
  },

  getSpecies(slug: string, generation: GenerationNumber): SpeciesData | undefined {
    return getCachedPointLookup(speciesCache, generation, slug, () => {
      const gen = getGen(generation);
      return mapSpecies(gen.species.get(slug), generation);
    });
  },

  getMove(slug: string, generation: GenerationNumber): MoveData | undefined {
    return getCachedPointLookup(moveCache, generation, slug, () => {
      const gen = getGen(generation);
      return mapMove(gen.moves.get(slug));
    });
  },

  getAbility(slug: string, generation: GenerationNumber): AbilityData | undefined {
    return getCachedPointLookup(abilityCache, generation, slug, () => {
      const gen = getGen(generation);
      const raw = gen.abilities.get(slug);
      if (!raw) return undefined;
      return {
        slug: raw.id,
        name: raw.name,
        shortDesc: raw.shortDesc,
      };
    });
  },

  getItem(slug: string, generation: GenerationNumber): ItemData | undefined {
    return getCachedPointLookup(itemCache, generation, slug, () => {
      const gen = getGen(generation);
      const raw = gen.items.get(slug);
      if (!raw) return undefined;
      return {
        slug: raw.id,
        name: raw.name,
        shortDesc: raw.shortDesc,
      };
    });
  },

  getNature(name: string, generation: GenerationNumber): NatureData | undefined {
    return getCachedPointLookup(natureCache, generation, name, () => {
      const gen = getGen(generation);
      const raw = gen.natures.get(name);
      return raw ? mapNature(raw) : undefined;
    });
  },

  listSpecies(generation: GenerationNumber): readonly SpeciesData[] {
    const cached = speciesListCache.get(generation);
    if (cached) return cached;

    const gen = getGen(generation);
    const list: SpeciesData[] = [];
    for (const raw of gen.species) {
      if (isExcludedSpecialForm(raw.forme)) continue;
      const mapped = mapSpecies(raw, generation);
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

    const gen = getGen(generation);
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

    const gen = getGen(generation);
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

    const gen = getGen(generation);
    const list: NatureData[] = [];
    for (const raw of gen.natures) {
      list.push(mapNature(raw));
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    naturesListCache.set(generation, list);
    return list;
  },

  getLearnableMoveSlugs(speciesSlug: string, generation: GenerationNumber) {
    const key = `${generation}:${toID(speciesSlug)}`;
    const cached = learnableMovesCache.get(key);
    if (cached) return cached;

    const gen = getGen(generation);
    const pending = gen.learnsets
      .learnable(speciesSlug)
      .then((learnable) => (learnable ? Object.keys(learnable) : []))
      .catch((error: unknown) => {
        learnableMovesCache.delete(key);
        throw error;
      });
    learnableMovesCache.set(key, pending);
    return pending;
  },
};
