/**
 * Why is this offer unusually cheap? Pure, no React.
 *
 * A line is produced only when a data field on the offer supports it. Price
 * alone never yields a reason: when nothing supports one the answer is the
 * single `unknown` line. The comparison set is the selected configuration's
 * `by_store` (like for like), never `best_by_store`, which mixes versions.
 */
import type { ClusterDetail, ClusterStore } from './clusterTypes';
import { checkedDate, isStale } from './format';

export type OfferExplanationKind = 'condition' | 'configuration' | 'stale' | 'unknown';
export interface OfferExplanation {
  kind: OfferExplanationKind;
  text: string;
}

/** Below the median of the configuration's priced offers by at least this share. */
export const CHEAP_BELOW_MEDIAN = 0.15;

type Config = ClusterDetail['configs'][number];

const priced = (o: ClusterStore | null | undefined): o is ClusterStore =>
  o != null && typeof o.price === 'number' && Number.isFinite(o.price) && o.price > 0;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** "128" -> "128 GB" for a storage facet; any other value is named as given. */
function facetName(value: string | number, config: Config): string {
  const v = String(value);
  return /^\d+$/.test(v) && config.storage_gb != null ? `${v} GB` : v;
}

export function explainOffer(
  offer: ClusterStore,
  config: Config,
  _cluster: Pick<ClusterDetail, 'last_seen'>,
  now: number,
): OfferExplanation[] {
  const prices = Object.values(config.by_store ?? {}).filter(priced).map((o) => o.price as number);
  if (!priced(offer) || prices.length < 2) return [];
  if ((offer.price as number) > median(prices) * (1 - CHEAP_BELOW_MEDIAN)) return [];

  const lines: OfferExplanation[] = [];

  const cond = offer.condition?.trim().toLowerCase();
  if (cond === 'used' || cond === 'refurbished') {
    lines.push({ kind: 'condition', text: `This listing is ${cond}.` });
  }

  const own = offer.facet_value == null ? '' : String(offer.facet_value).trim();
  const selected = config.facet_value == null ? '' : String(config.facet_value).trim();
  if (own !== '' && selected !== '' && own !== selected) {
    lines.push({ kind: 'configuration', text: `This price is for the ${facetName(own, config)} version.` });
  }

  if (offer.observed_at && isStale(offer.observed_at, now)) {
    lines.push({ kind: 'stale', text: `This price was last seen on ${checkedDate(offer.observed_at)}.` });
  }

  if (lines.length === 0) {
    lines.push({
      kind: 'unknown',
      text: "We can't tell why this price is lower. Check the listing before you buy.",
    });
  }
  return lines;
}
