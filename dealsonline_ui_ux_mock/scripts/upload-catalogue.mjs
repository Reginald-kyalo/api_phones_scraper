/**
 * Copy the built catalogue (.catalogue/, written by a VITE_CATALOGUE=api build)
 * to the private R2 bucket the catalogue function reads.
 *
 *   CLOUDFLARE_ACCOUNT_ID=…  CLOUDFLARE_API_TOKEN=…  npm run catalogue:upload
 *
 * Bucket name: CATALOGUE_BUCKET (default sokopulse-catalogue). Re-run after
 * every dataset re-capture; unchanged files are simply overwritten. Pass
 * --local to fill wrangler's local R2 instead (for `wrangler pages dev`).
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const root = join(process.cwd(), '.catalogue');
const bucket = process.env.CATALOGUE_BUCKET || 'sokopulse-catalogue';
const target = process.argv.includes('--local') ? '--local' : '--remote';
// Local R2 is one SQLite file and errors under parallel writes.
const CONCURRENCY = target === '--local' ? 1 : 8;
const ATTEMPTS = 3;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(root).filter((f) => f.endsWith('.json'));
const wrangler = join(process.cwd(), 'node_modules', '.bin', 'wrangler');
let done = 0;
let failed = 0;

async function put(file) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    if (await putOnce(file, attempt === ATTEMPTS)) break;
  }
  done += 1;
  if (done % 100 === 0 || done === files.length) console.log(`${done}/${files.length}`);
}

/** One upload attempt; reports a failure only on the last attempt. */
function putOnce(file, last) {
  const key = relative(root, file).split('\\').join('/');
  return new Promise((resolve) => {
    const child = spawn(
      wrangler,
      ['r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--content-type', 'application/json', target],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let err = '';
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      if (code !== 0 && last) {
        failed += 1;
        console.error(`failed: ${key}\n${err.trim()}`);
      }
      resolve(code === 0);
    });
  });
}

const queue = [...files];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await put(queue.shift());
  }),
);
console.log(failed ? `${failed} files failed; re-run to retry` : `uploaded ${files.length} files to ${bucket}`);
process.exit(failed ? 1 : 0);
