import type { ClusterSummary } from './clusterTypes';
import { clusterSaving, hasPrice } from './format';
import { imageUsable } from './images';

/**
 * Which products the homepage shows, in one place, because two programs
 * decide it: HomePage.tsx at run time, and scripts/prerender.ts, which
 * embeds exactly these rows in the homepage HTML so the page can render
 * them without a catalogue request. Change the rule here and both agree.
 */

/** How many cards each homepage rail shows. */
export const RAIL_SIZE = 6;

/**
 * Homepage cards must have a photo and a real price (DESIGN_RULES.md §5). A
 * grey box or "Price unavailable" is the first thing a shopper would see, so
 * it never gets the slot.
 */
export function homepageWorthy(cluster: ClusterSummary): boolean {
  return imageUsable(cluster.image) && hasPrice(cluster.best_price);
}

/**
 * The deals rail: one deal per category, biggest cash difference first, so
 * the rail reads as a cross-section rather than the run of near-identical
 * grocery rows at the head of the percentage-ranked feed. Idempotent, so the
 * client can apply it to the rows the prerender already selected.
 */
export function homepageDeals(rows: ClusterSummary[], n = RAIL_SIZE): ClusterSummary[] {
  const eligible = rows.filter((c) => homepageWorthy(c) && clusterSaving(c) != null);
  const best = new Map<string, ClusterSummary>();
  for (const row of eligible) {
    const key = row.category ?? 'other';
    const current = best.get(key);
    if (!current || (clusterSaving(row)?.kes ?? 0) > (clusterSaving(current)?.kes ?? 0)) best.set(key, row);
  }
  const firsts = [...best.values()].sort(
    (a, b) => (clusterSaving(b)?.kes ?? 0) - (clusterSaving(a)?.kes ?? 0),
  );
  const rest = eligible.filter((row) => !firsts.includes(row));
  return [...firsts, ...rest].slice(0, n);
}

/** A category rail: the first `n` cards worth showing, in capture order. */
export function homepageRail(rows: ClusterSummary[], n = RAIL_SIZE): ClusterSummary[] {
  return rows.filter(homepageWorthy).slice(0, n);
}
