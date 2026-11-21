import { describe, expect, it } from 'vitest';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  createEmptyJourneyPlan,
  evaluateJourneyTree,
  FINAL_SEGMENT_CHECKPOINT_ID,
  getStarterOptionsForGame,
  seedJourneyPlanFromTeam,
} from '@/domain/journey';
import type { CampaignGameContext, GameManifest, JourneyPlan, Team } from '@/domain/types';

const PLATINUM_TREE_FIXTURE: GameManifest = {
  id: 'platinum-tree-fixture',
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
      name: 'Gym 1 — Roark',
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
      name: 'Gym 2 — Gardenia',
      category: 'gym',
      levelCap: 22,
      specialtyType: 'Grass',
      bossName: 'Gardenia',
      bossNotablePokemon: ['turtwig', 'cherrim', 'roserade'],
      unlockedLocations: ['Eterna Forest', 'Wayward Cave'],
    },
    {
      id: 'champion-cynthia',
      order: 3,
      name: 'Champion — Cynthia',
      category: 'champion',
      levelCap: 62,
      bossName: 'Cynthia',
      bossNotablePokemon: ['spiritomb', 'roserade', 'garchomp'],
      unlockedLocations: ['Pokémon League'],
    },
  ],
  dex: {
    turtwig: {
      regionalDexNumber: 1,
      availability: 'starter',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Route 201', method: 'starter', minLevel: 5, maxLevel: 5 }],
    },
    chimchar: {
      regionalDexNumber: 4,
      availability: 'starter',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Route 201', method: 'starter', minLevel: 5, maxLevel: 5 }],
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
    piplup: {
      regionalDexNumber: 7,
      availability: 'starter',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Route 201', method: 'starter', minLevel: 5, maxLevel: 5 }],
    },
    bidoof: {
      regionalDexNumber: 13,
      availability: 'wild',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Route 201', method: 'grass', minLevel: 2, maxLevel: 4 }],
    },
    starly: {
      regionalDexNumber: 10,
      availability: 'wild',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Route 201', method: 'grass', minLevel: 2, maxLevel: 4 }],
    },
    staravia: {
      regionalDexNumber: 11,
      availability: 'evolution',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Evolve Starly', method: 'evolve' }],
      evolutionNotes: { requiresTrade: false, minEvolutionLevel: 14 },
    },
    gible: {
      regionalDexNumber: 109,
      availability: 'wild',
      earliestCheckpointId: 'gym-2-gardenia',
      locations: [{ areaName: 'Wayward Cave', method: 'cave', minLevel: 15, maxLevel: 20 }],
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
      locations: [{ areaName: 'Route 203', method: 'grass', minLevel: 16, maxLevel: 16 }],
      evolutionNotes: { requiresTrade: false, minEvolutionLevel: 16 },
    },
    alakazam: {
      regionalDexNumber: 22,
      availability: 'trade-only',
      earliestCheckpointId: 'gym-1-roark',
      locations: [{ areaName: 'Trade Kadabra', method: 'trade' }],
      evolutionNotes: { requiresTrade: true },
    },
  },
};

const PLATINUM_CONTEXT: CampaignGameContext = {
  mode: 'campaign',
  gameId: PLATINUM_TREE_FIXTURE.id,
  versionId: 'platinum',
  generation: 4,
  mechanics: PLATINUM_TREE_FIXTURE.mechanics,
};

describe('Domain Journey Tree Seam', () => {
  it('lists game starters and includes Pikachu for Pokémon Yellow', () => {
    expect(getStarterOptionsForGame(PLATINUM_TREE_FIXTURE)).toEqual([
      'turtwig',
      'chimchar',
      'piplup',
    ]);

    const rbyFixture: GameManifest = {
      ...PLATINUM_TREE_FIXTURE,
      id: 'red-blue-yellow',
      generation: 1,
      versions: [
        { id: 'red', name: 'Red' },
        { id: 'yellow', name: 'Yellow' },
      ],
      dex: {
        bulbasaur: {
          regionalDexNumber: 1,
          availability: 'starter',
          earliestCheckpointId: 'gym-1-roark',
          locations: [{ areaName: 'Pallet Town', method: 'starter' }],
        },
        pikachu: {
          regionalDexNumber: 25,
          availability: 'wild',
          earliestCheckpointId: 'gym-1-roark',
          locations: [{ areaName: 'Viridian Forest', method: 'grass' }],
        },
      },
    };
    expect(getStarterOptionsForGame(rbyFixture, 'yellow')).toEqual(['pikachu', 'bulbasaur']);
    expect(getStarterOptionsForGame(rbyFixture, 'red')).toEqual(['bulbasaur']);
  });

  it('evaluates branching intermediate steps from starter root through checkpoints to final team', () => {
    const plan: JourneyPlan = {
      gameId: PLATINUM_TREE_FIXTURE.id,
      versionId: 'platinum',
      starterSlug: 'chimchar',
      starterLevel: 5,
      steps: [
        {
          id: 'step-train-chimchar',
          beforeCheckpointId: 'gym-1-roark',
          parentStepId: null,
          order: 1,
          action: { type: 'train', speciesSlug: 'chimchar', targetLevel: 14 },
        },
        {
          id: 'step-evo-monferno',
          beforeCheckpointId: 'gym-1-roark',
          parentStepId: 'step-train-chimchar',
          order: 1,
          action: {
            type: 'evolve',
            fromSpeciesSlug: 'chimchar',
            toSpeciesSlug: 'monferno',
            targetLevel: 14,
          },
        },
        {
          id: 'step-cap-bidoof',
          beforeCheckpointId: 'gym-1-roark',
          parentStepId: null,
          order: 2,
          action: { type: 'capture', speciesSlug: 'bidoof', level: 3, location: 'Route 201' },
        },
        {
          id: 'step-cap-starly',
          beforeCheckpointId: 'gym-1-roark',
          parentStepId: null,
          order: 3,
          action: { type: 'capture', speciesSlug: 'starly', level: 4, location: 'Route 201' },
        },
        {
          id: 'step-replace-gible',
          beforeCheckpointId: 'gym-2-gardenia',
          parentStepId: null,
          order: 1,
          action: {
            type: 'replace',
            outSpeciesSlug: 'bidoof',
            inSpeciesSlug: 'gible',
            level: 17,
            location: 'Wayward Cave',
          },
        },
        {
          id: 'step-evo-staravia',
          beforeCheckpointId: 'gym-2-gardenia',
          parentStepId: null,
          order: 2,
          action: { type: 'evolve', fromSpeciesSlug: 'starly', toSpeciesSlug: 'staravia' },
        },
        {
          id: 'step-goal-flamewheel',
          beforeCheckpointId: 'gym-2-gardenia',
          parentStepId: null,
          order: 3,
          action: {
            type: 'goal',
            title: 'Teach Flame Wheel',
            speciesSlug: 'monferno',
            moveSlug: 'flamewheel',
          },
        },
        {
          id: 'step-evo-infernape',
          beforeCheckpointId: 'champion-cynthia',
          parentStepId: null,
          order: 1,
          action: {
            type: 'evolve',
            fromSpeciesSlug: 'monferno',
            toSpeciesSlug: 'infernape',
            targetLevel: 58,
          },
        },
        {
          id: 'step-evo-gabite',
          beforeCheckpointId: 'champion-cynthia',
          parentStepId: null,
          order: 2,
          action: {
            type: 'evolve',
            fromSpeciesSlug: 'gible',
            toSpeciesSlug: 'gabite',
            targetLevel: 24,
          },
        },
        {
          id: 'step-evo-garchomp',
          beforeCheckpointId: 'champion-cynthia',
          parentStepId: 'step-evo-gabite',
          order: 1,
          action: {
            type: 'evolve',
            fromSpeciesSlug: 'gabite',
            toSpeciesSlug: 'garchomp',
            targetLevel: 58,
          },
        },
      ],
    };

    const evaluated = evaluateJourneyTree(
      plan,
      PLATINUM_TREE_FIXTURE,
      PLATINUM_CONTEXT,
      pkmnDexGateway,
      { excludeTradeEvolutions: true },
    );

    expect(evaluated.starterSpecies?.slug).toBe('chimchar');
    expect(evaluated.totalSteps).toBe(10);
    expect(evaluated.totalIssues).toBe(0);

    const gym1 = evaluated.milestones[0];
    expect(gym1?.rootBranches).toHaveLength(3);
    expect(gym1?.rootBranches[0]?.children).toHaveLength(1);
    expect(gym1?.teamAtMilestone[0]?.speciesSlug).toBe('monferno');
    expect(gym1?.teamAtMilestone[0]?.level).toBe(14);
    expect(gym1?.teamAtMilestone[1]?.speciesSlug).toBe('bidoof');
    expect(gym1?.teamAtMilestone[2]?.speciesSlug).toBe('starly');

    const gym2 = evaluated.milestones[1];
    expect(gym2?.teamAtMilestone[0]?.moveSlugs).toContain('flamewheel');
    expect(gym2?.teamAtMilestone[1]?.speciesSlug).toBe('gible');
    expect(gym2?.teamAtMilestone[2]?.speciesSlug).toBe('staravia');

    expect(evaluated.finalTeam[0]?.speciesSlug).toBe('infernape');
    expect(evaluated.finalTeam[1]?.speciesSlug).toBe('garchomp');
    expect(evaluated.finalTeam[2]?.speciesSlug).toBe('staravia');
  });

  it('flags level cap warnings, full team capture errors, and unavailable Pokémon diagnostics', () => {
    const plan = createEmptyJourneyPlan(PLATINUM_TREE_FIXTURE);
    plan.starterSlug = 'chimchar';
    plan.steps = [
      {
        id: 's1',
        beforeCheckpointId: 'gym-1-roark',
        parentStepId: null,
        order: 1,
        action: { type: 'train', speciesSlug: 'chimchar', targetLevel: 20 },
      },
      {
        id: 's2',
        beforeCheckpointId: 'gym-1-roark',
        parentStepId: null,
        order: 2,
        action: { type: 'capture', speciesSlug: 'gible' },
      },
      {
        id: 's3',
        beforeCheckpointId: 'gym-1-roark',
        parentStepId: null,
        order: 3,
        action: { type: 'capture', speciesSlug: 'alakazam' },
      },
    ];

    const evaluated = evaluateJourneyTree(
      plan,
      PLATINUM_TREE_FIXTURE,
      PLATINUM_CONTEXT,
      pkmnDexGateway,
      { excludeTradeEvolutions: true },
    );

    const gym1 = evaluated.milestones[0];
    expect(gym1?.rootBranches[0]?.status).toBe('warning');
    expect(gym1?.rootBranches[1]?.status).toBe('warning');
    expect(gym1?.rootBranches[2]?.status).toBe('warning');
    expect(evaluated.totalIssues).toBeGreaterThanOrEqual(3);
  });

  it('seeds a valid JourneyPlan from an existing final team', () => {
    const finalTeam: Team = [
      { speciesSlug: 'infernape', moveSlugs: [] },
      { speciesSlug: 'garchomp', moveSlugs: [] },
      null,
      null,
      null,
      null,
    ];

    const seeded = seedJourneyPlanFromTeam(finalTeam, PLATINUM_TREE_FIXTURE, pkmnDexGateway);
    expect(seeded.starterSlug).toBe('chimchar');
    expect(seeded.steps.length).toBeGreaterThanOrEqual(3);

    const evaluated = evaluateJourneyTree(
      seeded,
      PLATINUM_TREE_FIXTURE,
      PLATINUM_CONTEXT,
      pkmnDexGateway,
    );
    expect(evaluated.finalTeam[0]?.speciesSlug).toBe('infernape');
    expect(evaluated.finalTeam[1]?.speciesSlug).toBe('garchomp');
  });

  it('evaluates post-checkpoint steps between the last milestone and the Final Team', () => {
    const plan = createEmptyJourneyPlan(PLATINUM_TREE_FIXTURE);
    plan.starterSlug = 'chimchar';
    plan.steps = [
      {
        id: 'post-e4-capture',
        beforeCheckpointId: FINAL_SEGMENT_CHECKPOINT_ID,
        parentStepId: null,
        order: 1,
        action: { type: 'capture', speciesSlug: 'gible', level: 70 },
      },
    ];

    const evaluated = evaluateJourneyTree(
      plan,
      PLATINUM_TREE_FIXTURE,
      PLATINUM_CONTEXT,
      pkmnDexGateway,
    );

    expect(evaluated.postBranches).toHaveLength(1);
    expect(evaluated.milestones.at(-1)?.teamAtMilestone[1]).toBeNull();
    expect(evaluated.finalTeam[0]?.speciesSlug).toBe('chimchar');
    expect(evaluated.finalTeam[1]?.speciesSlug).toBe('gible');
  });
});
