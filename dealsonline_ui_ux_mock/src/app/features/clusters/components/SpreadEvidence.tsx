import { ArrowRight } from 'lucide-react';
import type { ClusterDetail } from '../../../lib/api';
import { displaySaving, formatPrice } from '../../../lib/format';
import { storeName } from '../../../lib/storeIdentity';

/**
 * Shows the two offers the headline saving is computed from.
 *
 * A percentage on its own is an assertion. `spread_basis` names the exact pair
 * behind it, so the reader can check it instead of having to trust it — and the
 * store titles are quoted VERBATIM because that is the only place the dataset's
 * sharpest known defect becomes visible:
 *
 *   Kleenit Grooved Sponge      carrefour   67   ┐ a "67% saving" between
 *   Kleenit Grooved Sponge X2   quickmart  112   ┘ a 1-pack and a 2-pack
 *
 * The grocery merge unions flavour and pack variants into a single config while
 * keeping `primary_facet: size`, so the "like-for-like" pair genuinely can be two
 * different products. Paraphrasing or truncating the titles would hide exactly
 * the thing worth seeing.
 */
export function SpreadEvidence({ cluster }: { cluster: ClusterDetail }) {
  const basis = cluster.spread_basis;
  const low = basis?.cheapest;
  const high = basis?.dearest;
  // The panel headlines the SAVING, matching the card the reader arrived from.
  // `spread_pct` is a markup over the cheapest price and would read ~27 points
  // higher for the same two offers — see savingPct.
  if (!basis || !low || !high) return null;
  if (low.price == null || high.price == null) return null;
  // Same capped number as the badge. When the gap is too big to call a saving
  // (usually two different products) the evidence still shows, unlabelled, so
  // the reader can see why.
  const saving = displaySaving(basis.spread_pct, low.price);

  // The engine writes "—" when a category has no facet to split on, which is not
  // a configuration a reader can be told two offers share.
  const facet = basis.facet_label && basis.facet_label !== '—' ? basis.facet_label : null;

  return (
    <section aria-labelledby="spread-evidence" className="rounded-md ultra-border p-4">
      <h2 id="spread-evidence" className="microcopy-label mb-3">
        {saving ? `What the ${saving.pct}% saving compares` : 'The two prices behind the gap'}
        {facet ? ` · ${facet}` : ''}
      </h2>

      <div className="space-y-2">
        {[
          { offer: low, tone: 'text-foreground' },
          { offer: high, tone: 'text-muted-foreground' },
        ].map(({ offer, tone }, i) => (
          <div key={i} className="flex items-baseline gap-3">
            <span className="w-24 flex-shrink-0 truncate text-xs text-muted-foreground">
              {offer.store ? storeName(offer.store) : 'Unknown shop'}
            </span>
            <span className={`price-num w-24 flex-shrink-0 text-sm font-bold ${tone}`}>
              {formatPrice(offer.price)}
            </span>
            {/* Verbatim, not truncated — see the note above. */}
            <span className="min-w-0 flex-1 text-xs text-foreground">{offer.title}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
        Read both names before you buy. These were matched automatically, so a size
        or flavour can differ. If they aren&rsquo;t the same product, report it below.
      </p>
    </section>
  );
}
