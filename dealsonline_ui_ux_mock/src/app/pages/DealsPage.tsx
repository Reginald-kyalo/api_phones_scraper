import { useState, useEffect, useMemo, useCallback } from 'react';
import { Seo } from '../components/common/Seo';
import { clustersApi, type ClusterSummary } from '../lib/api';
import { Button } from '../components/ui/button';
import { ClusterCard, ClusterGridSkeleton, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
import { Loader2, RefreshCw } from 'lucide-react';
import { clusterSaving, MAX_DISPLAY_SAVING_PCT, MIN_DISPLAY_SAVING_KES } from '../lib/format';
import { imageUsable } from '../lib/images';
import { withSponsoredTiles } from '../components/ads/AdSlot';

/**
 * Thresholds on the SAVING, matching the badge on every card.
 *
 * ⚠️ The old buckets filtered on `like_for_like_spread_pct`, which divides by the
 * cheapest price — so "50%+" admitted anything saving 33% or more, and a card
 * badged "Save 33%" appeared under a 50% filter.
 *
 * ⛔ The top bucket had to move from 50% to 40%. Measured over the 3,189 deals:
 * 40%+ has 55, and **50%+ has exactly none** — relabelling the old buckets would
 * have shipped a filter that is empty by construction, which reads as a broken
 * page rather than an honest absence.
 */
const SAVING_FILTERS = [
  { label: 'All', min: 0 },
  { label: 'Save 10%+', min: 10 },
  { label: 'Save 20%+', min: 20 },
  { label: 'Save 30%+', min: 30 },
  { label: 'Save 40%+', min: 40 },
] as const;

export default function DealsPage() {
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [minSaving, setMinSaving] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // The captured feed is already multi-store, new-condition and
      // floor-filtered — it reproduces /api/clusters/deals exactly. It is
      // paginated rather than capped, so the first page is a page, not the lot.
      const res = await clustersApi.getDeals();
      setClusters(res.results);
      setTotal(res.count);
      setPages(res.pages);
      setPage(res.page);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await clustersApi.getDeals({ page: page + 1 });
      setClusters((prev) => [...prev, ...res.results]);
      setPage(res.page);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // Guard rails (DESIGN_RULES.md §5): a deal needs a photo and a saving we
  // are willing to show — between 1% and 60%, and at least KES 50. Cards that
  // fail either are not deals worth a shopper's attention, so they are left
  // out of this page rather than pushed down it.
  const showable = useMemo(
    () => clusters.filter((c) => imageUsable(c.image) && clusterSaving(c) != null),
    [clusters],
  );
  const filtered = useMemo(
    () => showable.filter((c) => (clusterSaving(c)?.pct ?? 0) >= minSaving),
    [showable, minSaving],
  );

  return (
    <div className="bg-background">
      <Seo title="Deals" description="The same product, cheaper at one Kenyan shop than another. Real savings between shops, checked daily." />
      <div className="page-container py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="page-title mb-1">Deals</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            The same product, cheaper at one shop than another. Ranked by how much you save buying
            the same configuration at the cheapest shop.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            We leave out savings over {MAX_DISPLAY_SAVING_PCT}% or under KES {MIN_DISPLAY_SAVING_KES}: those are
            almost always two different products, not a deal.
          </p>
        </div>

        {loading ? (
          <ClusterGridSkeleton />
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground mb-4">
              We couldn't load today's deals. Check your connection and try again.
            </p>
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            {/* Saving filter chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {SAVING_FILTERS.map((f) => (
                <Button
                  key={f.min}
                  size="sm"
                  variant={minSaving === f.min ? 'default' : 'outline'}
                  onClick={() => setMinSaving(f.min)}
                  aria-pressed={minSaving === f.min}
                  className="h-8 text-xs rounded-full"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {filtered.length > 0 ? (
              <>
                <div className={PRODUCT_GRID}>
                  {withSponsoredTiles(filtered.map((c) => <ClusterCard key={c.cluster_id} cluster={c} />))}
                </div>
                {page < pages - 1 && (
                  <div className="flex flex-col items-center gap-2 mt-8">
                    <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      {loadingMore ? 'Loading' : 'Load more deals'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {showable.length.toLocaleString()} deals shown from the first{' '}
                      {clusters.length.toLocaleString()} of {total.toLocaleString()} compared products
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>
                  {minSaving === 0
                    ? 'No deals right now. Prices are checked daily.'
                    : `No deals saving ${minSaving}% or more.`}
                </p>
                {minSaving > 0 && (
                  <Button variant="link" onClick={() => setMinSaving(0)} className="mt-2">
                    Show all
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
