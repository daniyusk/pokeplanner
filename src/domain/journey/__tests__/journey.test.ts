import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  buildVirtualFinalCheckpoint,
  evaluateJourneyCheckpoint,
  FINAL_SEGMENT_CHECKPOINT_ID,
  getAvailableSpeciesAtCheckpoint,
  getAvailableSpeciesInGame,
} from '@/domain/journey';
import {
  buildCheckpointOrderMap,
  diagnoseManifestAvailability,
} from '@/domain/journey/availability';
import type { CampaignGameContext, GameManifest, Team } from '@/domain/types';

const TEST_MANIFEST: GameManifest = {
  id: 'platinum-fixture',
  name: 'Pokémon Platinum',
  shortName: 'Platinum',
  generation: 4,
  region: 'Sinnoh',
  versionGroup: 'platinum',
  versions: [{ id: 'platinum', name: 'Platinum' }],
  mechanics: {
    hasAbilities: true,
    hasHeldItems: true,
    hasNatures: true,
    physicalSpecialSplit: true,
    gimmick: null,
  },
  checkpoints: [
    {
      id: 'gym-1-roark',
      order: 1,
      name: 'Gym 1 — Roark (Oreburgh)',
      category: 'gym',
      levelCap: 14,
      specialtyType: 'Rock',
      bossName: 'Roark',
      bossNotablePokemon: ['geodude', 'onix', 'cranidos'],
      unlockedLocations: ['Twinleaf Town', 'Route 201', 'Oreburgh Gate'],
    },
    {
      id: 'gym-2-gardenia',
      order: 2,
      name: 'Gym 2 — Gardenia (Eterna)',
      category: 'gym',
      levelCap: 22,
      specialtyType: 'Grass',
      bossName: 'Gardenia',
      bossNotablePokemon: ['turtwig', 'cherrim', 'roserade'],
      unlockedLocations: ['Eterna Forest', 'Wayward Cave'],
    },
    {
      id: 'gym-6-byron',
      order: 6,
      name: 'Gym 6 — Byron (Canalave)',
      category: 'gym',
      levelCap: 41,
      specialtyType: 'Steel',
      bossName: 'Byron',
      bossNotablePokemon: ['magneton', 'steelix', 'bastiodon'],
      unlockedLocations: ['Iron Island'],
    },
    {
      id: 'champion-cynthia',
      order: 9,
      name: 'Champion — Cynthia',
      category: 'champion',
      levelCap: 62,
      bossName: 'Cynthia',
      bossNotablePokemon: ['spiritomb', 'roserade', 'milotic', 'lucario', 'garchomp'],
      unlockedLocations: ['Pokémon League'],
    },
  ],
  dex: {
    chimchar: {
      regionalDexNumber: 4,
      availability: 'starter',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Route 201 (Starter)', method: 'starter', minLevel: 5, maxLevel: 5 }],
    },
    monferno: {
      regionalDexNumber: 5,
      availability: 'evolution',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Evolve Chimchar', method: 'evolve' }],
      evolutionNotes: { requiresTrade: false, minEvolutionLevel: 14 },
    },
    infernape: {
      regionalDexNumber: 6,
      availability: 'evolution',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Evolve Monferno', method: 'evolve' }],
      evolutionNotes: { requiresTrade: false, minEvolutionLevel: 36 },
    },
    gible: {
      regionalDexNumber: 109,
      availability: 'wild',
      earliestCheckpointId: 'gym-2-gardenia',
      locations: [
        { areaName: 'Wayward Cave (Hidden Floor)', method: 'cave', minLevel: 15, maxLevel: 20 },
      ],
    },
    gabite: {
      regionalDexNumber: 110,
      availability: 'evolution',
      earliestCheckpointId: 'gym-2-gardenia',
      locations: [{ areaName: 'Evolve Gible', method: 'evolve' }],
      evolutionNotes: { requiresTrade: false, minEvolutionLevel: 24 },
    },
    garchomp: {
      regionalDexNumber: 111,
      availability: 'evolution',
      earliestCheckpointId: 'gym-2-gardenia',
      locations: [{ areaName: 'Evolve Gabite', method: 'evolve' }],
      evolutionNotes: { requiresTrade: false, minEvolutionLevel: 48 },
    },
    kadabra: {
      regionalDexNumber: 21,
      availability: 'evolution',
      earliestCheckpointId: 'gym-1-roark',
      locations: [
        { areaName: 'Route 203 / Evolve Abra', method: 'grass', minLevel: 16, maxLevel: 16 },
      ],
      evolutionNotes: { requiresTrade: false, minEvolutionLevel: 16 },
    },
    alakazam: {
      regionalDexNumber: 22,
      availability: 'trade-only',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Trade Kadabra', method: 'trade' }],
      evolutionNotes: { requiresTrade: true },
    },
    riolu: {
      regionalDexNumber: 115,
      availability: 'gift',
      earliestCheckpointId: 'gym-6-byron',
      locations: [
        { areaName: 'Iron Island (Riley Egg)', method: 'gift', minLevel: 1, maxLevel: 1 },
      ],
    },
    lucario: {
      regionalDexNumber: 116,
      availability: 'evolution',
      earliestCheckpointId: 'gym-6-byron',
      locations: [{ areaName: 'Evolve Riolu (High Friendship, Day)', method: 'evolve' }],
      evolutionNotes: { requiresTrade: false },
    },
    heatran: {
      regionalDexNumber: 151,
      availability: 'post-game',
      earliestCheckpointId: 'champion-cynthia',
      locations: [{ areaName: 'Stark Mountain', method: 'static', minLevel: 70, maxLevel: 70 }],
    },
  },
};

const TEST_CONTEXT: CampaignGameContext = {
  mode: 'campaign',
  gameId: TEST_MANIFEST.id,
  versionId: 'platinum',
  generation: 4,
  mechanics: TEST_MANIFEST.mechanics,
};

describe('Domain Journey Seam', () => {
  describe('getAvailableSpeciesAtCheckpoint', () => {
    it('filters species unlocked at or before the checkpoint and excludes trade evolutions when requested', () => {
      const atRoark = getAvailableSpeciesAtCheckpoint(TEST_MANIFEST, 'gym-1-roark', {
        excludeTradeEvolutions: true,
      });
      expect(atRoark.has('chimchar')).toBe(true);
      expect(atRoark.has('gible')).toBe(false);
      expect(atRoark.has('riolu')).toBe(false);
      expect(atRoark.has('alakazam')).toBe(false);

      const atGardeniaWithTrades = getAvailableSpeciesAtCheckpoint(
        TEST_MANIFEST,
        'gym-2-gardenia',
        { excludeTradeEvolutions: false },
      );
      expect(atGardeniaWithTrades.has('gible')).toBe(true);
      expect(atGardeniaWithTrades.has('alakazam')).toBe(true);
      expect(atGardeniaWithTrades.has('lucario')).toBe(false);
    });

    it('applies post-game exclusion consistently before Champion and unlocks post-game only in Final segment', () => {
      expect(getAvailableSpeciesInGame(TEST_MANIFEST).has('heatran')).toBe(false);
      expect(
        getAvailableSpeciesAtCheckpoint(TEST_MANIFEST, 'champion-cynthia').has('heatran'),
      ).toBe(false);
      expect(
        getAvailableSpeciesAtCheckpoint(TEST_MANIFEST, FINAL_SEGMENT_CHECKPOINT_ID).has('heatran'),
      ).toBe(true);
      expect(
        getAvailableSpeciesAtCheckpoint(TEST_MANIFEST, FINAL_SEGMENT_CHECKPOINT_ID, {
          excludePostGame: true,
        }).has('heatran'),
      ).toBe(false);

      const cpMap = buildCheckpointOrderMap(TEST_MANIFEST);
      const cynthia = cpMap.get('champion-cynthia');
      expect(cynthia).toBeDefined();
      if (cynthia) {
        expect(
          diagnoseManifestAvailability('heatran', 'Heatran', cynthia, TEST_MANIFEST, cpMap).status,
        ).toBe('unavailable-yet');
      }
      expect(
        diagnoseManifestAvailability(
          'heatran',
          'Heatran',
          buildVirtualFinalCheckpoint(TEST_MANIFEST),
          TEST_MANIFEST,
          cpMap,
        ).status,
      ).toBe('ok');
    });
  });

  describe('evaluateJourneyCheckpoint', () => {
    it('flags level cap warnings, unavailable-yet Pokémon, trade violations, and evaluates boss matchups', () => {
      const teamAtRoark: Team = [
        { speciesSlug: 'monferno', moveSlugs: ['machpunch', 'ember'] },
        { speciesSlug: 'garchomp', moveSlugs: ['dragonclaw', 'earthquake'] }, // Caught at Gym 2 AND evolves at Lv 48!
        { speciesSlug: 'alakazam', moveSlugs: ['psychic'] },
        null,
        null,
        null,
      ];

      const evalRoark = evaluateJourneyCheckpoint(
        teamAtRoark,
        'gym-1-roark',
        TEST_MANIFEST,
        TEST_CONTEXT,
        pkmnDexGateway,
        { excludeTradeEvolutions: true },
      );

      expect(evalRoark.slots[0]?.status).toBe('ready');
      expect(evalRoark.slots[1]?.status).toBe('unavailable-yet');
      expect(evalRoark.slots[1]?.messages.some((m) => m.includes('Lv 48'))).toBe(true);
      expect(evalRoark.slots[2]?.status).toBe('trade-blocked');

      // Monferno's Fighting STAB + Garchomp's Ground hit Roark's Rock team super-effectively
      expect(evalRoark.bossMatchups.length).toBe(3);
      expect(evalRoark.overallRating).toBe('Favorable');
    });
  });
});
