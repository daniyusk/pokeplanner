import type {
  AbilitySlug,
  EffectivenessMultiplier,
  GenerationNumber,
  ItemSlug,
  MoveCategory,
  MoveSlug,
  NatureId,
  PokemonType,
  SpeciesSlug,
  StatId,
  StatsTable,
} from './pokemon';

export interface SpeciesData {
  slug: SpeciesSlug;
  name: string;
  dexNumber: number;
  spriteId: string;
  types: readonly [PokemonType] | readonly [PokemonType, PokemonType];
  baseStats: StatsTable;
  abilities: readonly AbilitySlug[];
  baseSpeciesSlug: SpeciesSlug;
  forme?: string;
  otherFormeSlugs: readonly SpeciesSlug[];
  isMega: boolean;
  isLegendary: boolean;
  nfe: boolean;
  prevoSlug?: SpeciesSlug;
  evoSlugs: readonly SpeciesSlug[];
}

export interface MoveData {
  slug: MoveSlug;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  basePower: number;
  accuracy: number | true;
  pp: number;
  priority: number;
  shortDesc: string;
}

export interface AbilityData {
  slug: AbilitySlug;
  name: string;
  shortDesc: string;
}

export interface ItemData {
  slug: ItemSlug;
  name: string;
  shortDesc: string;
}

export interface NatureData {
  id: NatureId;
  name: string;
  plus?: Exclude<StatId, 'hp'>;
  minus?: Exclude<StatId, 'hp'>;
}

export interface DexGateway {
  getAvailableTypes(generation: GenerationNumber): readonly PokemonType[];
  getTypeEffectiveness(
    attackType: PokemonType,
    defenderTypes: readonly PokemonType[],
    generation: GenerationNumber,
  ): EffectivenessMultiplier;
  getSpecies(slug: string, generation: GenerationNumber): SpeciesData | undefined;
  getMove(slug: string, generation: GenerationNumber): MoveData | undefined;
  getAbility(slug: string, generation: GenerationNumber): AbilityData | undefined;
  getItem(slug: string, generation: GenerationNumber): ItemData | undefined;
  getNature(name: string, generation: GenerationNumber): NatureData | undefined;
  listSpecies(generation: GenerationNumber): readonly SpeciesData[];
  listMoves(generation: GenerationNumber): readonly MoveData[];
  listItems(generation: GenerationNumber): readonly ItemData[];
  listNatures(generation: GenerationNumber): readonly NatureData[];
  getLearnableMoveSlugs(
    speciesSlug: string,
    generation: GenerationNumber,
  ): Promise<readonly MoveSlug[]>;
}
