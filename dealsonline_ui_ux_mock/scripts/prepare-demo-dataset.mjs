/**
 * Materialise `public/demo/` before Vite reads it.
 *
 * The catalogue is ~151 MB across ~430 JSON files and it is NOT tracked loose:
 * git keeps every version of every changed file forever, a re-capture rewrites
 * nearly all of them, and Cloudflare Pages re-clones the repo on every build. One
 * deterministic archive is ~15 MB and an unchanged capture costs zero new objects.
 *
 * ⛔ THIS CANNOT BE "generate it in CI" IN THE LITERAL SENSE. The capture reads
 * MongoDB, which no hosted builder can reach. The dataset therefore has to arrive
 * as an artefact; the only question is where from.
 *
 * Two sources, same result:
 *   - default: the committed archive at data/demo-dataset.tar.gz. Zero setup, and
 *     any checkout is self-consistent — deploy an old commit, get its dataset.
 *   - DEMO_DATASET_URL: fetched instead. Set this to an R2 / Release URL to take
 *     the 15 MB out of the repo entirely, without touching any other code.
 *
 * Idempotent: a stamp records which archive produced the current tree, so repeat
 * builds and `npm run dev` skip the work.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = join(ROOT, 'public', 'demo');
const ARCHIVE = join(ROOT, 'data', 'demo-dataset.tar.gz');
const STAMP = join(DEMO, '.source');
const URL_SOURCE = process.env.DEMO_DATASET_URL;

const die = (msg) => {
  // Never let the build "succeed" into a site with no catalogue: every page
  // would render its empty state, which reads as a data bug rather than a
  // missing file, and it would ship.
  console.error(`\n  prepare-demo-dataset: ${msg}\n`);
  process.exit(1);
};

async function archiveBytes() {
  if (URL_SOURCE) {
    console.log(`prepare-demo-dataset: fetching ${URL_SOURCE}`);
    const res = await fetch(URL_SOURCE);
    if (!res.ok) die(`GET ${URL_SOURCE} -> ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (!existsSync(ARCHIVE)) {
    die(
      `no dataset. Expected ${ARCHIVE}\n` +
        `  Capture it:  CLUSTERS_COLLECTION=product_clusters_mvp \\\n` +
        `                 apienv/bin/python -m scripts.capture_demo_dataset\n` +
        `  Or host it:  DEMO_DATASET_URL=https://… npm run build`,
    );
  }
  return readFileSync(ARCHIVE);
}

const bytes = await archiveBytes();
const digest = createHash('sha256').update(bytes).digest('hex');

if (existsSync(join(DEMO, 'manifest.json')) && existsSync(STAMP)) {
  if (readFileSync(STAMP, 'utf8').trim() === digest) {
    console.log('prepare-demo-dataset: public/demo is current');
    process.exit(0);
  }
}

// Unpack beside the target and swap. Extracting in place would leave the tree
// half-written if tar failed, and would strand shards a shrunken capture no
// longer contains — which the router would happily keep serving.
//
// ⚠️ Staged inside the repo, not in tmpdir: /tmp is usually a separate mount and
// rename(2) across filesystems fails with EXDEV.
mkdirSync(join(ROOT, 'public'), { recursive: true });
const staging = mkdtempSync(join(ROOT, 'public', '.demo-staging-'));
const tarball = join(staging, 'demo.tar.gz');
writeFileSync(tarball, bytes);

try {
  execFileSync('tar', ['-xzf', tarball, '-C', staging], { stdio: 'inherit' });
} catch {
  die('could not extract the archive (is `tar` on PATH?)');
}

const unpacked = join(staging, 'demo');
if (!existsSync(join(unpacked, 'manifest.json'))) {
  die('the archive contains no demo/manifest.json');
}

mkdirSync(dirname(DEMO), { recursive: true });
rmSync(DEMO, { recursive: true, force: true });
renameSync(unpacked, DEMO);
writeFileSync(STAMP, `${digest}\n`);
rmSync(staging, { recursive: true, force: true });

const manifest = JSON.parse(readFileSync(join(DEMO, 'manifest.json'), 'utf8'));
if (!manifest.total_clusters) die('manifest reports no clusters');
console.log(
  `prepare-demo-dataset: ${manifest.total_clusters.toLocaleString()} clusters, ` +
    `captured ${manifest.captured_at}`,
);
