/**
 * Post-build fixups that Vite cannot do itself.
 *
 * 1. 404.html lives in public/ and is copied verbatim, so its redirect target
 *    has to be patched with the real base path after the fact.
 * 2. Emits _headers so hosts that read it cache the immutable dataset hard —
 *    /demo is ~143 MB of content-stable JSON, and re-downloading it per visit
 *    is the difference between a fast demo and a slow one.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const base = process.env.BASE_PATH || '/';

const notFound = join(dist, '404.html');
writeFileSync(notFound, readFileSync(notFound, 'utf8').replaceAll('__BASE__', base));

writeFileSync(
  join(dist, '_headers'),
  `${base}demo/*\n  Cache-Control: public, max-age=31536000, immutable\n\n` +
    `${base}assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
);

console.log(`postbuild: base=${base}, 404 redirect patched, _headers written`);
