import fs from 'node:fs';
import path from 'node:path';
import { Generations, type Dex as PkmnDexInterface } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import { gameCatalogSchema, gameManifestSchema } from '../../src/data/games/gameManifestSchema';

const OUT_DIR = path.resolve(import.meta.dirname, '../../public/data/games');
const INDEX_PATH = path.join(OUT_DIR, 'index.json');
const generations = new Generations(Dex as unknown as PkmnDexInterface);

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Missing game catalog index at ${INDEX_PATH}. Run pnpm data:build first.`);
  }

  const rawCatalog = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  const catalog = gameCatalogSchema.parse(rawCatalog);

  for (const entry of catalog) {
    const manifestPath = path.join(OUT_DIR, `${entry.id}.json`);
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Missing manifest file ${manifestPath}`);
    }

    const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const manifest = gameManifestSchema.parse(rawManifest);

    const checkpointIds = new Set(manifest.checkpoints.map((cp) => cp.id));
    const validVersionIds = new Set(manifest.versions.map((v) => v.id));
    const gen = generations.get(manifest.generation);

    for (const cp of manifest.checkpoints) {
      for (const bossMon of cp.bossNotablePokemon) {
        if (!gen.species.get(bossMon)) {
          throw new Error(
            `[${manifest.id}] Boss Pokémon "${bossMon}" in checkpoint "${cp.id}" does not exist in Gen ${manifest.generation}`,
          );
        }
      }
    }

    for (const [slug, dexEntry] of Object.entries(manifest.dex)) {
      if (!gen.species.get(slug)) {
        throw new Error(
          `[${manifest.id}] Dex species "${slug}" does not exist in Gen ${manifest.generation}`,
        );
      }
      if (!checkpointIds.has(dexEntry.earliestCheckpointId)) {
        throw new Error(
          `[${manifest.id}] Dex species "${slug}" references unknown checkpoint "${dexEntry.earliestCheckpointId}"`,
        );
      }
      for (const versionId of dexEntry.exclusiveToVersions ?? []) {
        if (!validVersionIds.has(versionId)) {
          throw new Error(
            `[${manifest.id}] Dex species "${slug}" references unknown version "${versionId}"`,
          );
        }
      }
    }

    console.log(
      `Validated ${entry.id}.json (${Object.keys(manifest.dex).length} species, ${manifest.checkpoints.length} checkpoints)`,
    );
  }
}

main();
