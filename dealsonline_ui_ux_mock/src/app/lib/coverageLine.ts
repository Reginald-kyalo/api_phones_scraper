/**
 * The line that says what a comparison rests on. Pure, no React.
 *
 * Every number is derived from the offers passed in: never from a served store
 * count (`n_stores`, `n_stores_priced`), which can describe a different set
 * than the one on screen. A priced offer has a finite positive price. An offer
 * is "recent" when its `observed_at` is within `staleAfterDays` of `now`.
 * An offer with no usable `observed_at` is neither recent nor older: it is
 * `unknown` (as in format.ts, unknown dates are not stale; they are unknown).
 * The second sentence is built from dated offers only.
 */
import type { ClusterStore } from './clusterTypes';

const DAY_MS = 86_400_000;

export interface CoverageLine {
  text: string;
  recent: number;
  older: number;
  unknown: number;
}

type Offer = Pick<ClusterStore, 'price' | 'observed_at'>;

export function coverageLine(
  pricedOffers: ReadonlyArray<Offer> | null | undefined,
  now: number,
  staleAfterDays: number,
): CoverageLine {
  let recent = 0;
  let older = 0;
  let unknown = 0;
  for (const o of pricedOffers ?? []) {
    if (typeof o.price !== 'number' || !Number.isFinite(o.price) || o.price <= 0) continue;
    const seen = o.observed_at ? new Date(o.observed_at).getTime() : NaN;
    if (Number.isNaN(seen)) unknown += 1;
    else if (now - seen <= staleAfterDays * DAY_MS) recent += 1;
    else older += 1;
  }
  const total = recent + older + unknown;
  if (total === 0) return { text: '', recent, older, unknown };

  let text = `${total} matching ${total === 1 ? 'offer' : 'offers'} from the shops we track`;
  if (older > 0) {
    const checked = recent === 0 ? 'None were' : recent === 1 ? '1 was' : `${recent} were`;
    const old = older === 1 ? '1 has an older observation' : `${older} have older observations`;
    text += `. ${checked} checked in the last ${staleAfterDays} days; ${old}.`;
  }
  return { text, recent, older, unknown };
}
