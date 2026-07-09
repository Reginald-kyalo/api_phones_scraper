import { Link } from 'react-router';
import { TrendingDown, AlertTriangle } from 'lucide-react';
import { type ClusterSummary } from '../../../lib/api';
import { formatPrice, shopLabel } from '../../../lib/format';

/**
 * Text-first deal card for a cross-store cluster (the feed carries no images).
 * Honest-price contract: label refurb/used headlines, surface data_warning.
 */
export function ClusterDealCard({ cluster }: { cluster: ClusterSummary }) {
  const name = cluster.display_name ?? cluster.title;
  const spread = cluster.like_for_like_spread_pct;
  const likelyUsed = cluster.condition_basis === 'likely_used';

  return (
    <Link
      to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
      className="flex flex-col rounded-xl p-4 ultra-border hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="microcopy-label">{cluster.brand ?? cluster.category ?? 'Product'}</p>
        {spread != null && spread > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-deep bg-teal/10 rounded px-1.5 py-0.5">
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
            {Math.round(spread)}%
          </span>
        )}
      </div>
      <h3 className="font-semibold text-sm text-foreground mt-1 line-clamp-2">{name}</h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="price-num text-lg font-bold text-foreground">{formatPrice(cluster.best_price)}</span>
        <span className="text-xs text-muted-foreground">
          {likelyUsed ? 'used/refurb asking' : 'lowest new price'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {[cluster.cheapest_store, shopLabel(cluster.n_stores ?? 0)].filter(Boolean).join(' · ')}
      </p>
      {cluster.data_warning && (
        <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          {cluster.data_warning}
        </p>
      )}
    </Link>
  );
}
