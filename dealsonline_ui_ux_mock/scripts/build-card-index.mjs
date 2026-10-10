/**
 * Build a compact card index per category, so browse filters and sorts cover
 * EVERY product in the static demo instead of the first 5,000.
 *
 * Reads the paginated listing pages unpacked by prepare-demo-dataset and writes
 * public/demo/cards/<slug>.json: only the fields a product card and the filters
 * need, as arrays rather than objects (keys repeated 42,000 times are most of
 * the size). Order is the capture's rank order, so "Most compared" is unchanged.
 *
 * Row layout (must match CARD_FIELDS in src/app/lib/demoSource.ts):
 *   [cluster_id, name, brand, best_price, n_stores_priced, n_stores,
 *    like_for_like_spread_pct, cheapest_store_index, image, likely_used]
 * Shop names are interned in `stores` and referenced by index.
 *
 * Derived data, never committed: runs after demo:prepare (predev / prebuild)
 * and skips itself when the stamp matches the dataset that produced it.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = 1;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = join(ROOT, 'public', 'demo');
const OUT = join(DEMO, 'cards');
const STAMP = join(OUT, '.source');

const source = readFileSync(join(DEMO, '.source'), 'utf8').trim();
const stamp = `${source}:v${VERSION}`;
if (existsSync(STAMP) && readFileSync(STAMP, 'utf8').trim() === stamp) {
  console.log('build-card-index: public/demo/cards is current');
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(join(DEMO, 'manifest.json'), 'utf8'));
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const pad = (n) => String(n).padStart(3, '0');
let total = 0;
for (const { slug, pages } of manifest.categories) {
  const stores = [];
  const storeIndex = new Map();
  const intern = (s) => {
    if (!s) return -1;
    if (!storeIndex.has(s)) {
      storeIndex.set(s, stores.length);
      stores.push(s);
    }
    return storeIndex.get(s);
  };
  const rows = [];
  for (let p = 0; p < pages; p++) {
    const file = join(DEMO, 'categories', `${slug}-${pad(p)}.json`);
    for (const r of JSON.parse(readFileSync(file, 'utf8'))) {
      rows.push([
        r.cluster_id,
        r.display_name ?? r.title,
        r.brand ?? null,
        r.best_price ?? null,
        r.n_stores_priced ?? null,
        r.n_stores ?? null,
        r.like_for_like_spread_pct ?? null,
        intern(r.cheapest_store),
        r.image ?? null,
        r.condition_basis === 'likely_used' ? 1 : 0,
      ]);
    }
  }
  writeFileSync(join(OUT, `${slug}.json`), JSON.stringify({ slug, stores, rows }));
  total += rows.length;
}
writeFileSync(STAMP, `${stamp}\n`);
console.log(`build-card-index: ${total.toLocaleString()} cards in ${manifest.categories.length} categories`);
