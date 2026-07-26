import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { clustersApi, type ClusterDetail } from '../lib/api';
import { formatPrice, savingPct, shopLabel } from '../lib/format';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, ExternalLink, AlertTriangle, ArrowLeft, RefreshCw, Package } from 'lucide-react';
import { storeName, storeInitial } from '../lib/storeIdentity';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { MatchProvenance } from '../features/clusters/components/MatchProvenance';
import { SpreadEvidence } from '../features/clusters/components/SpreadEvidence';
import { ReportDialog } from '../features/clusters/components/ReportDialog';
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
  const [capturedAt, setCapturedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!clusterId) return;
    setLoading(true);
    setError(false);
    try {
      setCluster(await clustersApi.getDetail(clusterId));
      clustersApi.getManifest().then((m) => setCapturedAt(m.captured_at)).catch(() => {});
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
  // A saving, never the raw spread — the API's percentage divides by the
  // cheapest price, so it is a markup, not what the shopper keeps. See savingPct.
  const saving = savingPct(cluster.like_for_like_spread_pct);
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
          <div className="relative mb-4 flex h-56 items-center justify-center rounded-xl bg-white p-4 ultra-border">
            {/* Retailer CDNs are slow (~5% of URLs are genuinely dead), so the mark
                sits UNDERNEATH: the frame is never blank while an image decodes,
                and a failure just leaves the mark showing. */}
            <Package
              className="absolute h-10 w-10 text-muted-foreground/20"
              aria-hidden="true"
            />
            <ImageWithFallback
              src={cluster.image}
              alt=""
              className="relative max-h-full max-w-full object-contain"
              fallback={<span className="sr-only">Image unavailable</span>}
            />
          </div>
        )}

        <MatchProvenance cluster={cluster} />

        {/* ⛔ This used to read "treat this spread as a guide" — a caveat about a
            number that is never on the page. Measured over the 88,137 shipped
            clusters, `comparison_grade: false` and "no spread" are the SAME SET,
            zero exceptions: the spread needs a primary_facet and accessories have
            none. So the honest job here is to explain an ABSENCE, not to hedge a
            figure. 35,577 clusters (40% of the catalogue) show this, 654 of them
            with two or more shops. */}
        {!cluster.comparison_grade && (
          <div className="flex items-start gap-2 rounded-lg ultra-border p-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              Accessory listings vary in exact model, so we don&rsquo;t claim a
              like-for-like saving here.{' '}
              {rows.length > 1
                ? 'Compare the shop prices below and check the titles match.'
                : 'Only one shop currently lists it.'}
            </span>
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
            {/* ⛔ rows.length, NOT n_stores. n_stores counts stores that may have
                no usable price, and those are dropped from best_by_store — so on
                1,777 of the 88,137 shipped clusters this read "across 2 shops"
                above a single store row. Same defect as the hero's "5 OFFERS"
                over six rows: a count sourced from something other than the thing
                being counted. */}
            {rows.length > 0 && (
              <span className="text-sm text-muted-foreground mb-1">across {shopLabel(rows.length)}</span>
            )}
          </div>
          {/* Stated once. Where spread_basis exists the panel below makes the same
              claim WITH its two offers attached, and repeating the bare number
              above it would just be the unevidenced version of the same sentence. */}
          {saving != null && !cluster.spread_basis && (
            <p className="text-xs text-teal-deep mt-1">
              Buying at the cheapest shop saves up to {Math.round(saving)}% on the same
              configuration.
            </p>
          )}
          {!likelyUsed && cluster.likely_used_best_price != null && (cluster.n_likely_used ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Used/refurb asking from {formatPrice(cluster.likely_used_best_price)} ({cluster.n_likely_used} listings)
            </p>
          )}
        </div>

        <SpreadEvidence cluster={cluster} />

        {/* Store rows — real prices, real click-through */}
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Price comparison</h2>
          {/* Stale rows never ship, so this only ever confirms freshness or says
              the source dates nothing — it is never a warning. */}
          {cluster.last_seen && (
            <p className="text-xs text-muted-foreground">
              Last checked{' '}
              {new Date(cluster.last_seen).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
          {/* ⛔ Removed: a "this store doesn't publish a date" line for
              freshness_basis === 'unknown'. It blamed the retailer for what was
              actually our own staleness — six categories were stuck on 2026-06-30
              builds, not undated at source. After the re-cluster the bucket is
              empty: 0 of 88,137 clusters are 'unknown' and 0 lack last_seen. */}
        </div>
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

        <div className="-mt-4 mb-8 flex justify-end">
          <ReportDialog cluster={cluster} capturedAt={capturedAt} />
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

        {/* Real history only — 13,287 of 61,473 clusters (21.6%) have >=2 dated
            points, groceries included (24.2%). Never synthesised to fill the slot. */}
        {cluster.price_history && cluster.price_history.length >= 2 && (
          <div className="mt-8">
            <PRPriceHistoryChart title={name} priceHistory={cluster.price_history} />
          </div>
        )}
      </div>
    </div>
  );
}
