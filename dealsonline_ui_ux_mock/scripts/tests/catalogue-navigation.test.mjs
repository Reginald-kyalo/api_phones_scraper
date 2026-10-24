// Which navigation a build compiles in, and how a catalogue family's links are made.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load } from './harness.mjs';
import { readCatalogueNavigation } from '../catalogue-navigation.mjs';

const { CATALOGUE_NAVIGATION, familyShelfLinks } = await load('src/app/data/catalogueNavigation.ts');

function dataset(manifest, nav) {
  const dir = mkdtempSync(join(tmpdir(), 'catalogue-nav-'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  if (nav) writeFileSync(join(dir, 'navigation.json'), JSON.stringify(nav));
  return dir;
}

const stamp = { source_collection: 'catalogue_snapshot.storefront_clusters', captured_at: '2026-10-24T16:30:00' };

test('a navigation written for the shipped capture is used', () => {
  const nav = { ...stamp, version: 1, n_families: 0, departments: [] };
  assert.deepEqual(readCatalogueNavigation(dataset(stamp, nav)), nav);
});

test('no navigation (the MVP capture) means the static one', () => {
  assert.equal(readCatalogueNavigation(dataset({ ...stamp, source_collection: 'product_matching_db.product_clusters_mvp' })), null);
});

test('a navigation left by another capture is ignored', () => {
  const nav = { ...stamp, departments: [] };
  assert.equal(readCatalogueNavigation(dataset({ ...stamp, captured_at: '2026-10-25T09:00:00' }, nav)), null);
  assert.equal(readCatalogueNavigation(dataset({ ...stamp, source_collection: 'product_matching_db.product_clusters_mvp' }, nav)), null);
});

test('without the build define the navigation is null', () => {
  assert.equal(CATALOGUE_NAVIGATION, null);
});

const node = (slug, name, n_clusters, n_clusters_subtree) => ({ slug, name, n_clusters, n_clusters_subtree, n_stores: 1 });

test('a family links its leaves, and its own page when products sit at the family', () => {
  const leaves = [node('smartphones', 'Smartphones', 5, 5)];
  assert.deepEqual(familyShelfLinks({ ...node('mobile-phones', 'Mobile Phones', 0, 5), leaves }).map((l) => l.slug), ['smartphones']);
  assert.deepEqual(
    familyShelfLinks({ ...node('mobile-phones', 'Mobile Phones', 2, 7), leaves }),
    [
      { slug: 'smartphones', label: 'Smartphones', count: 5 },
      { slug: 'mobile-phones', label: 'All Mobile Phones', count: 7 },
    ],
  );
});

test('a family with no leaves still has a link', () => {
  assert.deepEqual(familyShelfLinks({ ...node('wearables', 'Wearables', 3, 3), leaves: [] }).map((l) => l.slug), ['wearables']);
});
