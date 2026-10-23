/**
 * Publish the built catalogue (.catalogue/, written by a VITE_CATALOGUE=api
 * build) to the private R2 bucket the catalogue function reads.
 *
 *   CLOUDFLARE_ACCOUNT_ID=…  CLOUDFLARE_API_TOKEN=…  npm run catalogue:upload
 *
 * Versioned, so an interrupted upload can never mix two datasets (scraping
 * review 2026-10-23, §1): every file goes under versions/<version>/, and
 * only when every file is there does `current.json` at the bucket root
 * switch to that version. The function reads current.json (functions/api/
 * catalogue/[[op]].ts) and picks it up within five minutes. Rollback is one
 * command: `--activate <previous version>`.
 *
 *   --version <v>    name this upload (default: capture date + manifest hash)
 *   --activate <v>   only point current.json at an already uploaded version
 *   --local          wrangler's local R2 instead (for `wrangler pages dev`)
 *
 * Bucket name: CATALOGUE_BUCKET (default sokopulse-catalogue).
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const root = join(process.cwd(), '.catalogue');
const bucket = process.env.CATALOGUE_BUCKET || 'sokopulse-catalogue';
const args = process.argv.slice(2);
const target = args.includes('--local') ? '--local' : '--remote';
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
// Local R2 is one SQLite file and errors under parallel writes.
const CONCURRENCY = target === '--local' ? 1 : 8;
const ATTEMPTS = 3;
const wrangler = join(process.cwd(), 'node_modules', '.bin', 'wrangler');

function run(cliArgs) {
  return new Promise((resolve) => {
    const child = spawn(wrangler, cliArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => resolve({ ok: code === 0, err: err.trim() }));
  });
}

async function putFile(key, file) {
  let last = { ok: false, err: '' };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    last = await run(['r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--content-type', 'application/json', target]);
    if (last.ok) return true;
  }
  console.error(`failed: ${key}\n${last.err}`);
  return false;
}

async function activate(version, files) {
  const dir = mkdtempSync(join(tmpdir(), 'catalogue-current-'));
  const file = join(dir, 'current.json');
  writeFileSync(file, JSON.stringify({ version, activated_at: new Date().toISOString(), files }));
  const ok = await putFile('current.json', file);
  if (!ok) {
    console.error('could not write current.json; the previous version stays active');
    process.exit(1);
  }
  console.log(`activated ${version} in ${bucket} (the function re-reads current.json within 5 minutes)`);
}

const activateOnly = flag('--activate');
if (activateOnly) {
  if (!/^[A-Za-z0-9._-]+$/.test(activateOnly)) {
    console.error('version names use letters, digits, ".", "_" and "-" only');
    process.exit(1);
  }
  await activate(activateOnly, null);
  process.exit(0);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const manifestFile = join(root, 'manifest.json');
let manifestBytes;
try {
  manifestBytes = readFileSync(manifestFile);
} catch {
  console.error(`no catalogue at ${root}; run VITE_CATALOGUE=api npm run build first`);
  process.exit(1);
}
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const defaultVersion = `${String(manifest.captured_at ?? '').slice(0, 10) || 'undated'}-${createHash('sha256').update(manifestBytes).digest('hex').slice(0, 8)}`;
const version = flag('--version') ?? defaultVersion;
if (!/^[A-Za-z0-9._-]+$/.test(version)) {
  console.error('version names use letters, digits, ".", "_" and "-" only');
  process.exit(1);
}

const files = walk(root).filter((f) => f.endsWith('.json'));
console.log(`uploading ${files.length} files as version ${version} to ${bucket}`);
let done = 0;
let failed = 0;
const queue = [...files];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const file = queue.shift();
      const key = `versions/${version}/${relative(root, file).split('\\').join('/')}`;
      if (!(await putFile(key, file))) failed += 1;
      done += 1;
      if (done % 100 === 0 || done === files.length) console.log(`${done}/${files.length}`);
    }
  }),
);

if (failed) {
  console.error(`${failed} files failed; version ${version} was NOT activated. Re-run to retry (unchanged files are overwritten in place).`);
  process.exit(1);
}
await activate(version, files.length);
console.log(`rollback: node scripts/upload-catalogue.mjs --activate <previous version>${target === '--local' ? ' --local' : ''}`);
