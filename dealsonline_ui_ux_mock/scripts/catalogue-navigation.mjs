/**
 * Which navigation a build compiles in (src/app/data/catalogueNavigation.ts).
 *
 * A catalogue capture (scripts/capture_catalogue_shelves.py in the API repo)
 * writes `demo/navigation.json` beside `demo/manifest.json`, both stamped with
 * the capture's `source_collection` and `captured_at`. The build uses that
 * navigation only when both stamps match the manifest it ships: the MVP
 * capture writes no navigation.json, and a stale one left by an earlier
 * capture describes a different dataset, so either way the build falls back
 * to the static engine navigation (null here).
 *
 * Read by vite.config.ts (the app) and scripts/postbuild.mjs (the prerender),
 * so the menus and the prerendered pages always agree.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readCatalogueNavigation(demoDir) {
  const navPath = join(demoDir, 'navigation.json');
  const manifestPath = join(demoDir, 'manifest.json');
  if (!existsSync(navPath) || !existsSync(manifestPath)) return null;
  const nav = JSON.parse(readFileSync(navPath, 'utf8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (nav.source_collection !== manifest.source_collection || nav.captured_at !== manifest.captured_at) {
    console.warn(
      `catalogue-navigation: ignoring ${navPath} (written for ${nav.source_collection} @ ${nav.captured_at}, ` +
        `dataset is ${manifest.source_collection} @ ${manifest.captured_at}); using the static navigation`,
    );
    return null;
  }
  return nav;
}

/** The `define` both bundlers take: the navigation as a JSON expression, or null. */
export const catalogueNavigationDefine = (demoDir) => ({
  __CATALOGUE_NAVIGATION__: JSON.stringify(readCatalogueNavigation(demoDir)),
});
