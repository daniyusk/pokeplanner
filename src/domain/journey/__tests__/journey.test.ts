import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  buildDefaultJourneyFromFinalTeam,
  evaluateJourneyCheckpoint,
  getAvailableSpeciesAtCheckpoint,
} from '@/domain/journey';
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

  describe('buildDefaultJourneyFromFinalTeam', () => {
    it('maps final evolutions back to checkpoint-appropriate evolutionary stages and omits post-unlock members', () => {
      const finalTeam: Team = [
        { speciesSlug: 'infernape', moveSlugs: [] },
        { speciesSlug: 'garchomp', moveSlugs: [] },
        { speciesSlug: 'lucario', moveSlugs: [] },
        null,
        null,
        null,
      ];

      const snapshots = buildDefaultJourneyFromFinalTeam(finalTeam, TEST_MANIFEST, pkmnDexGateway);

      // Gym 1 (Lv 14): Chimchar evolved to Monferno at 14; Gible isn't unlocked until Gym 2; Riolu not until Gym 6
      expect(snapshots['gym-1-roark']?.[0]?.speciesSlug).toBe('monferno');
      expect(snapshots['gym-1-roark']?.[1]).toBeNull();
      expect(snapshots['gym-1-roark']?.[2]).toBeNull();

      // Gym 2 (Lv 22): Gible is unlocked and stays Gible (Gabite evolves at Lv 24)
      expect(snapshots['gym-2-gardenia']?.[0]?.speciesSlug).toBe('monferno');
      expect(snapshots['gym-2-gardenia']?.[1]?.speciesSlug).toBe('gible');
      expect(snapshots['gym-2-gardenia']?.[2]).toBeNull();

      // Gym 6 (Lv 41): Infernape (Lv 36), Gabite (Lv 24..47), Lucario (friendship evo unlocked at Gym 6)
      expect(snapshots['gym-6-byron']?.[0]?.speciesSlug).toBe('infernape');
      expect(snapshots['gym-6-byron']?.[1]?.speciesSlug).toBe('gabite');
      expect(snapshots['gym-6-byron']?.[2]?.speciesSlug).toBe('lucario');

      // Champion (Lv 62): Full final forms
      expect(snapshots['champion-cynthia']?.[1]?.speciesSlug).toBe('garchomp');
    });
  });
});
