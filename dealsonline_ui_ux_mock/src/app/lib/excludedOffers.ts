/**
 * Which listings are NOT in the like-for-like comparison, and why. Pure, no React.
 *
 * The comparison set is the selected configuration's `by_store`. Every other
 * offer the cluster holds (its `best_by_store`, which mixes configurations, and
 * every configuration's own map) is "left out". An offer is counted under a
 * reason only when a data field supports it, and once, under the first match:
 * other_configuration, used, unpriced, out_of_stock. An offer with no supporting
 * field is not counted: nothing is invented to make the total look complete.
 * Never reads a served store count; everything is derived from the offers.
 */
import type { ClusterDetail, ClusterStore } from './clusterTypes';

type Config = ClusterDetail['configs'][number];
type Offers = Record<string, ClusterStore> | null | undefined;

export type ExclusionKind = 'other_configuration' | 'used' | 'unpriced' | 'out_of_stock';
export interface ExclusionSummary {
  total: number;
  reasons: Array<{ kind: ExclusionKind; count: number }>;
}

const ORDER: ExclusionKind[] = ['other_configuration', 'used', 'unpriced', 'out_of_stock'];

const facet = (v: string | number | null | undefined): string => (v == null ? '' : String(v).trim());

/** One offer is one listing: its url, else store + title + price. */
const identity = (store: string, o: ClusterStore): string =>
  o.url ? `u:${o.url}` : `s:${store}|${o.title}|${o.price}`;

const isPriced = (o: ClusterStore) => typeof o.price === 'number' && Number.isFinite(o.price) && o.price > 0;

function isUsed(o: ClusterStore): boolean {
  const c = o.condition?.trim().toLowerCase();
  return c === 'used' || c === 'refurbished' || o.likely_used === true;
}

function isOutOfStock(o: ClusterStore): boolean {
  const s = o.stock_status?.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return s === 'out_of_stock' || s === 'delisted' || o.delisted === true;
}

export function excludedFromConfig(
  cluster: Pick<ClusterDetail, 'configs' | 'best_by_store'> | Partial<ClusterDetail>,
  config: Pick<Config, 'by_store' | 'facet_value'> | { by_store?: Offers; facet_value?: Config['facet_value'] },
): ExclusionSummary {
  const inMap = new Set<string>();
  for (const [store, o] of Object.entries((config.by_store ?? {}) as Record<string, ClusterStore>)) {
    if (o) inMap.add(identity(store, o));
  }

  // identity -> [offer, the facet it is known to belong to, if any]
  const seen = new Map<string, { offer: ClusterStore; facet: string; inConfigMap: boolean }>();
  const add = (store: string, o: ClusterStore | null | undefined, ownFacet: string, fromConfig = false) => {
    if (!o) return;
    const key = identity(store, o);
    const prev = seen.get(key);
    const f = facet(o.facet_value) || ownFacet;
    if (!prev) seen.set(key, { offer: o, facet: f, inConfigMap: fromConfig });
    else {
      if (!prev.facet && f) prev.facet = f;
      if (fromConfig) prev.inConfigMap = true;
    }
  };
  for (const c of cluster.configs ?? []) {
    for (const [store, o] of Object.entries((c.by_store ?? {}) as Record<string, ClusterStore>)) {
      add(store, o, facet(c.facet_value), true);
    }
  }
  for (const [store, o] of Object.entries((cluster.best_by_store ?? {}) as Record<string, ClusterStore>)) {
    add(store, o, '');
  }

  const selected = facet(config.facet_value);
  const counts = new Map<ExclusionKind, number>();
  const bump = (k: ExclusionKind) => counts.set(k, (counts.get(k) ?? 0) + 1);

  for (const [key, { offer, facet: f, inConfigMap }] of seen) {
    if (inMap.has(key)) continue;
    // Being in another configuration's map is itself the evidence, whatever the facet strings.
    if (inConfigMap || (f !== '' && selected !== '' && f !== selected)) bump('other_configuration');
    else if (isUsed(offer)) bump('used');
    else if (!isPriced(offer)) bump('unpriced');
    else if (isOutOfStock(offer)) bump('out_of_stock');
  }

  const reasons = ORDER.filter((k) => counts.has(k)).map((kind) => ({ kind, count: counts.get(kind) as number }));
  return { total: reasons.reduce((n, r) => n + r.count, 0), reasons };
}

/** The disclosure's words. `detail` is null when nothing is excluded. */
export function describeExclusions(
  summary: ExclusionSummary,
  config: Pick<Config, 'storage_gb'>,
): { heading: string; detail: string } {
  const n = summary.total;
  const heading = `${n} other ${n === 1 ? 'listing was' : 'listings were'} left out of this comparison`;
  const one = (count: number, single: string, plural: string) => `${count} ${count === 1 ? single : plural}`;
  const parts = summary.reasons.map(({ kind, count }) => {
    switch (kind) {
      case 'other_configuration':
        return one(count, `is a different ${config.storage_gb != null ? 'storage size' : 'version'}`,
          `are a different ${config.storage_gb != null ? 'storage size' : 'version'}`);
      case 'used':
        return one(count, 'is a used item', 'are used items');
      case 'unpriced':
        return one(count, 'has no price listed', 'have no price listed');
      case 'out_of_stock':
        return one(count, 'is out of stock', 'are out of stock');
    }
  });
  return { heading, detail: parts.join(', ') };
}
