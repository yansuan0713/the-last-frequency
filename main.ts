// The Last Frequency — entry program for make.fun's best-game-01 bounty
// (Node 22, standard library only).
//
// The game itself is the static site in game/: plain files a desktop
// browser loads offline, no build step and no network request. This
// program hands it in. It copies game/ and screenshots/ into the output
// directory and writes dossier.json there with the kit's vendored
// buildDossier, byte for byte the summary the judge reads.
//
// In the grader the output directory is /output; locally, point
// MAKEFUN_OUTPUT_DIR at a folder to rehearse the handover:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, checked here first so a bad handover fails loudly on my
// own machine instead of quietly in the grader.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function countFiles(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

const shotDir = join(root, 'screenshots');
const shotNames = existsSync(shotDir)
  ? readdirSync(shotDir).filter((n) => /\.(png|jpe?g)$/i.test(n)).sort()
  : [];
if (shotNames.length < 3 || shotNames.length > CAPS.screenshots.max) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const bytes = statSync(join(shotDir, name)).size;
  if (bytes > CAPS.screenshots.max_bytes) {
    throw new Error(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
}

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(
  `handed in: ${countFiles(join(outDir, 'game'))} game files, `
  + `${shotNames.length} screenshots (${shotNames.join(', ')}), `
  + `dossier ${Buffer.byteLength(dossier)} bytes`,
);
