// Bundles one of the app's TypeScript modules for a node:test run. esbuild
// strips types; Vite's import.meta.env is defined as a root deploy.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(import.meta.dirname, '..', '..');
const require = createRequire(join(root, 'package.json'));
const { build } = require('esbuild');

export const ROOT = root;

export async function load(entry) {
  const outdir = join(root, 'node_modules', '.cache', 'tests');
  mkdirSync(outdir, { recursive: true });
  const outfile = join(outdir, `${basename(entry).replace(/[^\w.-]/g, '_')}.mjs`);
  await build({
    entryPoints: [join(root, entry)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'error',
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.VITE_CATALOGUE': '"api"', 'import.meta.env.DEV': 'false' },
  });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}
