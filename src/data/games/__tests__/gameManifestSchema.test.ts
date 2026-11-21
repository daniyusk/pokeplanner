import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkpointSchema,
  encounterLocationSchema,
  gameDexEntrySchema,
  gameManifestSchema,
} from '@/data/games/gameManifestSchema';
import type { GameManifest } from '@/domain/types';

const platinumRaw = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, '../../../../public/data/games/platinum.json'),
    'utf-8',
  ),
);

describe('gameManifestSchema contract', () => {
  it('parses a valid game manifest directly into GameManifest without casting', () => {
    const manifest: GameManifest = gameManifestSchema.parse(platinumRaw);
    expect(manifest.id).toBe('platinum');
    expect(manifest.checkpoints.length).toBeGreaterThan(0);
  });

  it('rejects invalid enum values for checkpoint category, encounter method, and availability', () => {
    expect(
      checkpointSchema.safeParse({
        id: 'gym-1',
        order: 1,
        name: 'Gym 1',
        category: 'trial',
        levelCap: 14,
        bossName: 'Roark',
        bossNotablePokemon: ['cranidos'],
        unlockedLocations: ['oreburgh'],
      }).success,
    ).toBe(false);

    expect(
      encounterLocationSchema.safeParse({
        areaName: 'Route 201',
        method: 'raid',
      }).success,
    ).toBe(false);

    expect(
      gameDexEntrySchema.safeParse({
        regionalDexNumber: 1,
        availability: 'mythical',
        earliestCheckpointId: 'starter',
        locations: [{ areaName: 'Twinleaf Town', method: 'starter' }],
      }).success,
    ).toBe(false);
  });

  it('enforces exactOptional semantics by rejecting explicit undefined values', () => {
    expect(
      checkpointSchema.safeParse({
        id: 'gym-1',
        order: 1,
        name: 'Gym 1',
        category: 'gym',
        levelCap: 14,
        specialtyType: undefined,
        bossName: 'Roark',
        bossNotablePokemon: ['cranidos'],
        unlockedLocations: ['oreburgh'],
      }).success,
    ).toBe(false);
  });

  it('ensures every published campaign manifest only cites its own declared version IDs', () => {
    const gamesDir = path.resolve(import.meta.dirname, '../../../../public/data/games');
    const files = fs
      .readdirSync(gamesDir)
      .filter((name) => name.endsWith('.json') && name !== 'index.json');

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(gamesDir, file), 'utf-8'));
      const manifest: GameManifest = gameManifestSchema.parse(raw);
      const validVersionIds = new Set(manifest.versions.map((v) => v.id));

      for (const [slug, entry] of Object.entries(manifest.dex)) {
        for (const versionId of entry.exclusiveToVersions ?? []) {
          expect(validVersionIds.has(versionId), `${file} -> ${slug} leaked "${versionId}"`).toBe(
            true,
          );
        }
      }
    }
  });
});
