import { ExternalLink } from 'lucide-react';
import { type ClusterStore } from '../../../lib/api';
import { formatPrice } from '../../../lib/format';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

/**
 * One shop's offer for one comparable thing — a cluster, or a single configuration of it.
 *
 * ⭐ WHY THIS IS SHARED. The comparison page renders two lists of the same shape: the
 * cluster-level `best_by_store` and, per variant, `configs[].by_store`. They were one list and
 * one dead number, and the number lied about what the page would show. Building both from one
 * component is the same discipline the `n_stores_priced` fix used on the backend — `by_store`
 * is built once and used twice, so the count and the rows cannot disagree.
 */
export function OfferRow({
  store,
  offer,
  best = false,
  compact = false,
}: {
  store: string;
  offer: ClusterStore;
  best?: boolean;
  compact?: boolean;
}) {
  return (
    <li
      data-testid={compact ? 'variant-offer' : 'offer'}
      className={`flex items-center gap-4 rounded-xl transition-colors ultra-border hover:bg-gray-50 ${
        compact ? 'p-3' : 'p-4'
      } ${best ? 'border-primary/20' : 'border-border'}`}
    >
      <div
        className={`flex-shrink-0 rounded-lg flex items-center justify-center bg-foreground text-background font-bold ${
          compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
        }`}
        aria-hidden="true"
      >
        {store[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
            {store}
          </span>
          {best && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-teal/10 text-teal-deep border-primary/20"
            >
              Best price
            </Badge>
          )}
        </div>
        {offer.title && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{offer.title}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span
          className={`price-num font-bold text-foreground ${compact ? 'text-base' : 'text-lg'}`}
        >
          {formatPrice(offer.price)}
        </span>
        <Button asChild size="sm" className="text-xs h-8 px-4">
          <a href={offer.url ?? undefined} target="_blank" rel="noopener noreferrer">
            Go to store
            <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </li>
  );
}

/**
 * The shops that can actually PRICE something, cheapest first.
 *
 * ⛔⛔ COUNT THIS, DO NOT TRUST A FIELD. At cluster level `n_stores_priced` is served and
 * correct; at CONFIG level the TypeScript declared `n_stores_priced: number` and the API never
 * sent it — `ClusterConfig` has no such field in `app/api/schemas/clusters.py`. Anything
 * following the type's own advice would have read `undefined` and rendered "compared across
 * NaN shops". Deriving from the map that will be rendered cannot drift from it.
 *
 * ⚠️ The `>= 1` floor is `formatPrice`'s: the feed carries placeholder prices of 0.1 that would
 * otherwise render as "KES 0" and be counted as a comparable offer.
 */
export function pricedOffers(
  byStore: Record<string, ClusterStore> | null | undefined,
): [string, ClusterStore][] {
  return Object.entries(byStore ?? {})
    .filter(([, o]) => o != null && o.price != null && (o.price as number) >= 1)
    .sort(([, a], [, b]) => (a.price as number) - (b.price as number));
}
