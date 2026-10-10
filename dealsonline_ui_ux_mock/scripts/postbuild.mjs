/**
 * Post-build fixups that Vite cannot do itself.
 *
 * 1. Emits _headers so hosts that read it cache the immutable dataset hard —
 *    /demo is ~143 MB of content-stable JSON, and re-downloading it per visit
 *    is the difference between a fast demo and a slow one.
 * 2. Prerenders every page worth a search result to static HTML, writes
 *    sitemap.xml and robots.txt, and makes 404.html the app shell
 *    (scripts/prerender.ts, bundled here with esbuild so it can import the
 *    app's own TypeScript).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dist = join(process.cwd(), 'dist');
const base = process.env.BASE_PATH || '/';

writeFileSync(
  join(dist, '_headers'),
  `${base}demo/*\n  Cache-Control: public, max-age=31536000, immutable\n\n` +
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
