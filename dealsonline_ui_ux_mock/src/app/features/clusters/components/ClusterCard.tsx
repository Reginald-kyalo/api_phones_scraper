import { Link } from 'react-router';
import { Package } from 'lucide-react';
import type { ClusterSummary } from '../../../lib/api';
import { clusterSaving, eyebrow, pricedShopCount, productName, shopLabel } from '../../../lib/format';
import { storeName } from '../../../lib/storeIdentity';
import { categoryLabel } from '../../../lib/categories';
import { ImageWithFallback } from '../../../components/common/ImageWithFallback';
import { SavingBadge } from '../../../components/common/SavingBadge';
import { PriceOrDash } from '../../../components/common/PriceOrDash';
import { Skeleton } from '../../../components/ui/skeleton';

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
  const name = productName(cluster);
  // Capped and floored in one place, so this card, the deals filter and the
  // product page always agree. See displaySaving.
  const saving = clusterSaving(cluster);
  // The priced count, not `n_stores` — see pricedShopCount.
  const stores = pricedShopCount(cluster);
  const likelyUsed = cluster.condition_basis === 'likely_used';
  const shop = cluster.cheapest_store ? storeName(cluster.cheapest_store) : null;

  return (
    <Link
      to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
      className="group flex h-full flex-col overflow-hidden rounded-md card-interactive bg-card"
    >
      {/*
        The image is positioned ABSOLUTELY, not laid out in flow.
        `aspect-square` sets a ratio, not a hard limit: an in-flow image taller
        than the computed height pushes the box past it, which is why deal cards
        measured 213-274px tall on the same 215px column while browse was uniform.
        Out of flow, the height is the ratio and nothing else.
      */}
      <div className="relative aspect-square overflow-hidden bg-photo">
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
            className="absolute inset-0 h-full w-full object-contain p-3"
            fallback={<span className="sr-only">Image unavailable</span>}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2">
        <p className="microcopy-label truncate">{eyebrow(cluster, categoryLabel)}</p>
        {/* Exactly two lines (h-10 = 2 x 20px line-height), never min-height: a
            1-line title against min-h-[2.5em] measured 35px where a 2-line one
            measured 40px, drifting card heights by 5px between rails. */}
        <p className="mt-0.5 line-clamp-2 h-10 text-sm font-semibold text-foreground">{name}</p>
        {/* Spec line (benchmark §2.5): storage, RAM, network where the name
            alone does not say. Always a row, so cards in a grid row align. */}
        <p className="mt-0.5 h-4 truncate text-xs text-muted-foreground">{cluster.spec_line ?? '\u00a0'}</p>
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            {/* "from" when it is the lowest of several prices (PriceSpy's
                wording): the card is a starting point, not the only price. */}
            {stores >= 2 && <span className="text-xs text-muted-foreground">from</span>}
            <PriceOrDash value={cluster.best_price} className="text-base font-bold text-foreground" />
          </div>
          {/* Every line below keeps its row, filled or not, so prices and
              shop lines sit at the same height across a grid row. */}
          <div className="mt-1 flex h-5 items-center">
            {saving ? (
              <SavingBadge saving={saving} />
            ) : likelyUsed ? (
              <span className="text-xs text-muted-foreground">Used or refurbished</span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {shop
              ? stores >= 2
                ? <><span className="text-foreground">{shop}</span> +{shopLabel(stores - 1)}</>
                : <>Only at <span className="text-foreground">{shop}</span></>
              : stores >= 2 ? shopLabel(stores) : '\u00a0'}
          </p>
        </div>
      </div>
    </Link>
  );
}

/**
 * Loading state for any PRODUCT_GRID: the exact card shape, so nothing shifts
 * when the real cards land (DESIGN_RULES.md §4).
 */
export function ClusterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={PRODUCT_GRID} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-md border border-border">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-3 pt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-3 h-5 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
