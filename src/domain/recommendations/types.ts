import type {
  AbilityData,
  ItemData,
  MoveCategory,
  MoveData,
  NatureData,
  PokemonType,
  SpeciesData,
  TeamSlotIndex,
} from '@/domain/types';

export interface RecommendationReason {
  category: 'defense' | 'offense' | 'role' | 'campaign';
  impact: 'high' | 'medium';
  summary: string;
  types?: readonly PokemonType[];
}

export interface PokemonRecommendation {
  species: SpeciesData;
  recommendedAbilitySlug?: string;
  score: number;
  fitLabel: 'Top Synergy' | 'Strong Fit' | 'Balanced Pick';
  reasons: readonly RecommendationReason[];
}

export interface RecommendPokemonOptions {
  limit?: number;
  excludeNfe?: boolean;
  excludeLegendaries?: boolean;
  allowMegas?: boolean;
  replaceSlotIndex?: TeamSlotIndex;
  allowedSpeciesSlugs?: ReadonlySet<string>;
}

export interface RecommendedAbility {
  slug: string;
  name: string;
  reason: string;
  data: AbilityData;
}

export interface RecommendedItem {
  slug: string;
  name: string;
  reason: string;
  data: ItemData;
}

export interface RecommendedNature {
  id: string;
  name: string;
  reason: string;
  data: NatureData;
}

export interface RecommendedMove {
  move: MoveData;
  effectiveCategory: MoveCategory;
  reason: string;
}

export interface BuildRecommendation {
  ability?: RecommendedAbility;
  item?: RecommendedItem;
  nature?: RecommendedNature;
  moves: readonly RecommendedMove[];
}
