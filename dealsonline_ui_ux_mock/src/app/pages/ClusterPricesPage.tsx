import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { clustersApi, type ClusterDetail } from '../lib/api';
import { formatPrice, shopLabel } from '../lib/format';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, ExternalLink, AlertTriangle, ArrowLeft, RefreshCw, Package } from 'lucide-react';
import { storeName, storeInitial } from '../lib/storeIdentity';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { MatchProvenance } from '../features/clusters/components/MatchProvenance';
import { PRPriceHistoryChart } from '../features/product/components/PriceHistoryChart';

/**
 * Live cross-store price comparison for one cluster (the matching engine's
 * output). Renders the honest-price contract: condition_basis labels the
 * headline, data_warning is surfaced as a caveat, comparison_grade=false gets
 * an accessory disclaimer, and per-store rows carry real click-through URLs.
 */
export default function ClusterPricesPage() {
  const { clusterId } = useParams<{ clusterId: string }>();
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!clusterId) return;
    setLoading(true);
    setError(false);
    try {
      setCluster(await clustersApi.getDetail(clusterId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading price comparison" />
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">We couldn't load this price comparison.</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link to="/deals">All deals</Link>
          </Button>
        </div>
      </div>
    );
  }

  const name = cluster.display_name ?? cluster.title;
  const likelyUsed = cluster.condition_basis === 'likely_used';
  const rows = Object.entries(cluster.best_by_store)
    .filter(([, s]) => s.price != null && s.price >= 1)
    .sort(([, a], [, b]) => (a.price as number) - (b.price as number));
  const spread = cluster.like_for_like_spread_pct;
  const facetChips = Object.entries(cluster.spec_facets).flatMap(([k, vals]) =>
    vals.map((v) => `${k.toUpperCase()} ${v}`),
  );

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[900px] mx-auto px-4 lg:px-6 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-1">
          <Link to="/deals">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All deals
          </Link>
        </Button>

        <p className="microcopy-label">
          {[cluster.brand, cluster.category].filter(Boolean).join(' · ') || 'Price comparison'}
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight mt-1 mb-3">{name}</h1>

        {facetChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {facetChips.map((chip) => (
              <Badge key={chip} variant="secondary" className="text-[11px] bg-teal/10 text-teal-deep border-primary/20">
                {chip}
              </Badge>
            ))}
          </div>
        )}

        {cluster.image && (
          <div className="mb-4 flex h-56 items-center justify-center rounded-xl bg-white p-4 ultra-border">
            {/* Store images 404 often enough that a bare <img> leaves an empty
                framed box; fall back to the same neutral mark the cards use. */}
            <ImageWithFallback
              src={cluster.image}
              alt=""
              className="max-h-full max-w-full object-contain"
              fallback={<Package className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />}
            />
          </div>
        )}

        <MatchProvenance cluster={cluster} />

        {!cluster.comparison_grade && (
          <div className="flex items-start gap-2 rounded-lg ultra-border p-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            Accessory listings vary in exact model — treat this spread as a guide, not a like-for-like deal.
          </div>
        )}
        {cluster.data_warning && (
          <div className="flex items-start gap-2 rounded-lg ultra-border p-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            {cluster.data_warning}
          </div>
        )}

        {/* Honest two-tier price block */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-flex flex-col ultra-border">
          <p className="microcopy-label mb-0.5">
            {likelyUsed ? 'Lowest asking price (used/refurb)' : 'Best price (new)'}
          </p>
          <div className="flex items-end gap-3">
            <span className="price-num text-3xl font-bold text-foreground">{formatPrice(cluster.best_price)}</span>
            {cluster.n_stores != null && cluster.n_stores > 0 && (
              <span className="text-sm text-muted-foreground mb-1">across {shopLabel(cluster.n_stores)}</span>
            )}
          </div>
          {spread != null && spread > 0 && (
            <p className="text-xs text-teal-deep mt-1">
              Prices for the same configuration vary up to {Math.round(spread)}% — comparing pays.
            </p>
          )}
          {!likelyUsed && cluster.likely_used_best_price != null && (cluster.n_likely_used ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Used/refurb asking from {formatPrice(cluster.likely_used_best_price)} ({cluster.n_likely_used} listings)
            </p>
          )}
        </div>

        {/* Store rows — real prices, real click-through */}
        <h2 className="text-lg font-semibold text-foreground mb-3">Price comparison</h2>
        <div className="space-y-3 mb-8">
          {rows.map(([rawStore, offer], idx) => (
            <div
              key={rawStore}
              className={`flex items-center gap-4 rounded-xl p-4 transition-colors ultra-border hover:bg-gray-50 ${
                idx === 0 ? 'border-primary/20' : 'border-border'
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-foreground text-background font-bold text-sm">
                {storeInitial(rawStore)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{storeName(rawStore)}</span>
                  {idx === 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-teal/10 text-teal-deep border-primary/20">
                      Best price
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{offer.title}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="price-num text-lg font-bold text-foreground">{formatPrice(offer.price)}</span>
                <Button asChild size="sm" className="text-xs h-8 px-4">
                  <a href={offer.url} target="_blank" rel="noopener noreferrer">
                    Go to store
                    <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Per-configuration splits */}
        {cluster.configs.length > 1 && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-1">By configuration</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Like-for-like prices per variant — the honest comparison.
            </p>
            <div className="space-y-3">
              {cluster.configs.map((cfg, i) => (
                <div key={i} className="rounded-xl ultra-border p-4">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">
                      {cfg.facet_label ?? (cfg.storage_gb != null ? `${cfg.storage_gb}GB` : 'Variant')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      from <span className="price-num font-bold text-foreground">{formatPrice(cfg.best_price)}</span>
                      {cfg.cheapest_store ? ` at ${cfg.cheapest_store}` : ''}
                      {cfg.n_stores != null ? ` · ${shopLabel(cfg.n_stores)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Real history only — 3,595 of 62,668 clusters have >=2 captured points,
            and groceries have none. Never synthesised to fill the slot. */}
        {cluster.price_history && cluster.price_history.length >= 2 && (
          <div className="mt-8">
            <PRPriceHistoryChart title={name} priceHistory={cluster.price_history} />
          </div>
        )}
      </div>
    </div>
  );
}
