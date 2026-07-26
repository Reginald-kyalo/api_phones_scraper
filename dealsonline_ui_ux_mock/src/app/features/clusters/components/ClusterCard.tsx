import { Link } from 'react-router';
import { TrendingDown, Package } from 'lucide-react';
import type { ClusterSummary } from '../../../lib/api';
import { formatPrice, shopLabel } from '../../../lib/format';
import { storeName } from '../../../lib/storeIdentity';
import { ImageWithFallback } from '../../../components/common/ImageWithFallback';

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
  const spread = cluster.like_for_like_spread_pct;
  const stores = cluster.n_stores ?? 0;
  const likelyUsed = cluster.condition_basis === 'likely_used';

  return (
    <Link
      to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
      className="group flex flex-col overflow-hidden rounded-xl ultra-border transition-colors hover:border-primary/40"
    >
      <div className="relative flex aspect-square items-center justify-center bg-white p-4">
        {/* Mark underneath, image on top: no blank frame while a slow retailer
            CDN decodes, and a dead URL simply leaves the mark. */}
        <Package className="absolute h-10 w-10 text-muted-foreground/20" aria-hidden="true" />
        {cluster.image && (
          <ImageWithFallback
            src={cluster.image}
            alt=""
            loading="lazy"
            className="relative max-h-full max-w-full object-contain"
            fallback={<span className="sr-only">Image unavailable</span>}
          />
        )}
        {spread != null && spread > 0 && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-teal/10 px-1.5 py-0.5 text-xs font-semibold text-teal-deep">
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
            {Math.round(spread)}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2">
        <p className="microcopy-label">{cluster.brand ?? cluster.category ?? 'Product'}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{name}</p>
        <div className="mt-auto pt-2">
          <span className="price-num text-base font-bold text-foreground">
            {formatPrice(cluster.best_price)}
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {likelyUsed ? 'used/refurb asking' : 'lowest price'}
            {cluster.cheapest_store ? ` · ${storeName(cluster.cheapest_store)}` : ''}
          </p>
          {stores >= 2 && (
            <p className="text-xs text-muted-foreground">{shopLabel(stores)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
