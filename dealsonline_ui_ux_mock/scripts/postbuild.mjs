/**
 * Runs after `vite build`:
 *
 * 1. Refuses to publish the raw dataset from a Cloudflare Pages build. Pages
 *    sets CF_PAGES=1 in its build environment; without VITE_CATALOGUE=api that
 *    build would ship every catalogue file under /demo/ for anyone to download
 *    (scraping review 2026-10-23, §1). ALLOW_PUBLIC_CATALOGUE=1 overrides it
 *    for a deliberately public preview.
 * 2. Writes dist/_headers: long cache for hashed assets, and for /demo/ only
 *    while the dataset is actually in dist.
 * 3. Prerenders every page worth a search result, writes sitemap.xml,
 *    robots.txt, llms.txt and makes 404.html the app shell
 *    (scripts/prerender.ts, bundled here with esbuild so it can import the
 *    app's own TypeScript).
 * 4. With VITE_CATALOGUE=api, takes the dataset OUT of the site: dist/demo
 *    moves to .catalogue/, which `npm run catalogue:upload` copies to the
 *    private R2 bucket the catalogue function reads, and then checks that no
 *    catalogue file or archive is left anywhere in dist.
 */
import { existsSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dist = join(process.cwd(), 'dist');
const base = process.env.BASE_PATH || '/';
const apiMode = process.env.VITE_CATALOGUE === 'api';

if (process.env.CF_PAGES && !apiMode && process.env.ALLOW_PUBLIC_CATALOGUE !== '1') {
  console.error(
    '\n  postbuild: refusing to publish the raw catalogue from a Cloudflare Pages build.\n' +
      '  Set VITE_CATALOGUE=api (and bind the CATALOGUE R2 bucket; see DEPLOY.md), or set\n' +
      '  ALLOW_PUBLIC_CATALOGUE=1 for a preview that is meant to expose every data file.\n',
  );
  process.exit(1);
}

writeFileSync(
  join(dist, '_headers'),
  (apiMode ? '' : `${base}demo/*\n  Cache-Control: public, max-age=31536000, immutable\n\n`) +
    `${base}assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
);

console.log(`postbuild: base=${base}, _headers written`);

const bundle = join(process.cwd(), 'node_modules', '.cache', 'prerender.mjs');
await build({
  entryPoints: [join(process.cwd(), 'scripts', 'prerender.ts')],
  outfile: bundle,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'warning',
  define: { 'import.meta.env.BASE_URL': JSON.stringify(base) },
});
await import(pathToFileURL(bundle).href);

/** Files in dist that are not catalogue data even though they are JSON. */
const PUBLIC_JSON_ALLOWED = new Set(['shop-icons/index.json']);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

if (apiMode) {
  const out = join(process.cwd(), '.catalogue');
  rmSync(out, { recursive: true, force: true });
  if (existsSync(join(dist, 'demo'))) renameSync(join(dist, 'demo'), out);
  if (!existsSync(join(out, 'manifest.json'))) {
    console.error('\n  postbuild: .catalogue/manifest.json is missing after the move; the private dataset is incomplete.\n');
    process.exit(1);
  }
  const leaked = walk(dist)
    .map((f) => relative(dist, f).split('\\').join('/'))
    .filter((f) => (f.endsWith('.json') && !PUBLIC_JSON_ALLOWED.has(f)) || /\.(tar\.gz|tgz|zip)$/.test(f) || f.startsWith('demo/'));
  if (leaked.length) {
    console.error(`\n  postbuild: catalogue data would be published:\n    ${leaked.slice(0, 10).join('\n    ')}\n`);
    process.exit(1);
  }
  console.log('postbuild: catalogue moved out of dist to .catalogue/ (upload with npm run catalogue:upload); no data files remain in dist');
}
