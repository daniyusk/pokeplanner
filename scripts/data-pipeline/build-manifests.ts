import fs from 'node:fs';
import path from 'node:path';
import type { GameCatalogEntry } from '../../src/domain/types';
import { EMERALD_DEF } from './campaigns/hoenn';
import { GOLD_SILVER_CRYSTAL_DEF, HEARTGOLD_SOULSILVER_DEF } from './campaigns/johto';
import { FIRERED_LEAFGREEN_DEF, RED_BLUE_YELLOW_DEF } from './campaigns/kanto';
import { PLATINUM_DEF } from './campaigns/sinnoh';
import { BLACK_WHITE_DEF, BLACK2_WHITE2_DEF } from './campaigns/unova';
import { buildGameManifest, type CampaignSourceDef } from './manifestBuilder';

const CAMPAIGNS: readonly CampaignSourceDef[] = [
  RED_BLUE_YELLOW_DEF,
  GOLD_SILVER_CRYSTAL_DEF,
  EMERALD_DEF,
  FIRERED_LEAFGREEN_DEF,
  PLATINUM_DEF,
  HEARTGOLD_SOULSILVER_DEF,
  BLACK_WHITE_DEF,
  BLACK2_WHITE2_DEF,
];

const OUT_DIR = path.resolve(import.meta.dirname, '../../public/data/games');

fs.mkdirSync(OUT_DIR, { recursive: true });

const catalog: GameCatalogEntry[] = [];

for (const def of CAMPAIGNS) {
  const manifest = buildGameManifest(def);
  const fileName = `${manifest.id}.json`;
  const outPath = path.join(OUT_DIR, fileName);

  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  catalog.push({
    id: manifest.id,
    name: manifest.name,
    shortName: manifest.shortName,
    generation: manifest.generation,
    region: manifest.region,
    versions: manifest.versions,
    mechanics: manifest.mechanics,
    manifestPath: `/data/games/${fileName}`,
  });

  console.log(
    `Generated ${fileName}: ${Object.keys(manifest.dex).length} species, ${manifest.checkpoints.length} checkpoints`,
  );
}

fs.writeFileSync(
  path.join(OUT_DIR, 'index.json'),
  `${JSON.stringify(catalog, null, 2)}\n`,
  'utf-8',
);
console.log(`Generated index.json with ${catalog.length} campaigns.`);
