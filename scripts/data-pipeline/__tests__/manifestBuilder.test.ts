import { describe, expect, it } from 'vitest';
import { getDefaultMechanicsForGeneration } from '../../../src/domain/types';
import { FIRERED_LEAFGREEN_DEF, RED_BLUE_YELLOW_DEF } from '../campaigns/kanto';
import { buildGameManifest, type CampaignSourceDef } from '../manifestBuilder';

describe('manifestBuilder campaign pipeline', () => {
  it('keeps version exclusives scoped to RBY vs FRLG without cross-game leakage', () => {
    const rby = buildGameManifest(RED_BLUE_YELLOW_DEF);
    const frlg = buildGameManifest(FIRERED_LEAFGREEN_DEF);

    expect(rby.dex.sandshrew?.exclusiveToVersions).toEqual(['blue']);
    expect(rby.dex.sandslash?.exclusiveToVersions).toEqual(['blue']);
    expect(rby.dex.ekans?.exclusiveToVersions).toEqual(['red']);
    expect(rby.dex.arbok?.exclusiveToVersions).toEqual(['red']);

    expect(frlg.dex.sandshrew?.exclusiveToVersions).toEqual(['leafgreen']);
    expect(frlg.dex.sandslash?.exclusiveToVersions).toEqual(['leafgreen']);
    expect(frlg.dex.ekans?.exclusiveToVersions).toEqual(['firered']);
    expect(frlg.dex.arbok?.exclusiveToVersions).toEqual(['firered']);
  });

  it('derives mechanics from generation defaults when omitted and rejects invalid exclusive versions', () => {
    const baseDef: CampaignSourceDef = {
      id: 'test-gen4',
      name: 'Test Gen 4',
      shortName: 'T4',
      generation: 4,
      region: 'Sinnoh',
      versionGroup: 'platinum',
      versions: [{ id: 'platinum', name: 'Platinum' }],
      checkpoints: [
        {
          id: 'gym-1',
          order: 1,
          name: 'Gym 1',
          category: 'gym',
          levelCap: 14,
          bossName: 'Roark',
          bossNotablePokemon: ['cranidos'],
          unlockedLocations: ['oreburgh'],
        },
      ],
      encounters: [
        {
          species: ['turtwig'],
          checkpointId: 'gym-1',
          areaName: 'Lake Verity',
          method: 'starter',
        },
      ],
    };

    const manifest = buildGameManifest(baseDef);
    expect(manifest.mechanics).toEqual(getDefaultMechanicsForGeneration(4));

    expect(() =>
      buildGameManifest({
        ...baseDef,
        encounters: [
          {
            species: ['cranidos'],
            checkpointId: 'gym-1',
            areaName: 'Oreburgh',
            method: 'fossil',
            exclusiveToVersions: ['diamond'],
          },
        ],
      }),
    ).toThrow(/unknown version/i);
  });
});
