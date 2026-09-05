import { Link } from 'react-router';
import { TrendingDown, Package } from 'lucide-react';
import type { ClusterSummary } from '../../../lib/api';
import { formatPrice, savingPct, shopLabel } from '../../../lib/format';
import { storeName } from '../../../lib/storeIdentity';
import { ImageWithFallback } from '../../../components/common/ImageWithFallback';

/**
 * The one product grid.
 *
 * Every surface that lists clusters uses this — homepage rails, deals and
 * category browse. They previously each declared their own columns (and the
 * rails used an unconstrained flex row, so cards sized to their own content and
 * no two were the same width). Keep this shared so they cannot drift apart again.
 */
export const PRODUCT_GRID =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3';

/**
 * Catalogue card for one cluster.
 *
 * Works for both halves of the corpus: 76% of clusters carry a real product
 * image, and the rest fall back to a neutral mark rather than a broken one.
 * A cluster with a single store is still a real product page — it just shows a
 * price instead of a saving, so the spread badge and shop count are conditional.
 */
export function ClusterCard({ cluster }: { cluster: ClusterSummary }) {
  const name = cluster.display_name ?? cluster.title;
  const saving = savingPct(cluster.like_for_like_spread_pct);
  // ⛔ THE PRICED COUNT, NOT `n_stores`. `n_stores` counts stores that CARRY the
  // product; this card links to a comparison page that can only render stores with a
  // PRICE. `Xiaomi Redmi 9` is in 3 stores and priced by 1 — a "3 shops" card opening
  // on one price is the shop-count defect `verify_prices.py` exists to prevent.
  // ⚠️ Falls back to `n_stores` so a fixture captured before this field still renders.
  const stores = cluster.n_stores_priced ?? cluster.n_stores ?? 0;
  const likelyUsed = cluster.condition_basis === 'likely_used';

  return (
    <Link
      to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl ultra-border transition-colors hover:border-primary/40"
    >
      {/*
        The image is positioned ABSOLUTELY, not laid out in flow.
        `aspect-square` sets a ratio, not a hard limit: an in-flow image taller
        than the computed height pushes the box past it, which is why deal cards
        measured 213-274px tall on the same 215px column while browse was uniform.
        Out of flow, the height is the ratio and nothing else.
      */}
      <div className="relative aspect-square overflow-hidden bg-white">
        {/* Mark underneath, image on top: no blank frame while a slow retailer
            CDN decodes, and a dead URL simply leaves the mark. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className="h-10 w-10 text-muted-foreground/20" aria-hidden="true" />
        </div>
        {cluster.image && (
          <ImageWithFallback
            src={cluster.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-4"
            fallback={<span className="sr-only">Image unavailable</span>}
          />
        )}
        {/* "Save 40%", not the raw 67% spread. The badge is styled as a saving
            and was read as one, but the API's spread divides by the CHEAPEST
            price — see savingPct. It is also labelled now: a bare number under a
            down-arrow announced as just "67%" to a screen reader. */}
        {saving != null && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-teal/10 px-1.5 py-0.5 text-xs font-semibold text-teal-deep">
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
            Save {Math.round(saving)}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2">
        <p className="microcopy-label">{cluster.brand ?? cluster.category ?? 'Product'}</p>
        {/* Exactly two lines (h-10 = 2 x 20px line-height), never min-height: a
            1-line title against min-h-[2.5em] measured 35px where a 2-line one
            measured 40px, drifting card heights by 5px between rails. */}
        <p className="mt-0.5 line-clamp-2 h-10 text-sm font-semibold text-foreground">{name}</p>
        <div className="mt-auto pt-2">
          <span className="price-num text-base font-bold text-foreground">
            {formatPrice(cluster.best_price)}
          </span>
          {/* Both meta lines are single-line and always occupy their row, even
              when there is nothing to say. A long store name used to wrap and a
              single-store product dropped the shop count entirely, so card
              heights drifted by up to 21px within one row. */}
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {likelyUsed ? 'used/refurb asking' : 'lowest price'}
            {cluster.cheapest_store ? ` · ${storeName(cluster.cheapest_store)}` : ''}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {stores >= 2 ? shopLabel(stores) : ' '}
          </p>
        </div>
      </div>
    </Link>
  );
}
