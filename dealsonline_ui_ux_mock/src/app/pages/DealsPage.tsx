import { useState, useEffect, useMemo, useCallback } from 'react';
import { Seo } from '../components/common/Seo';
import { clustersApi, type ClusterSummary } from '../lib/api';
import { Button } from '../components/ui/button';
import { ClusterCard, ClusterGridSkeleton, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { clusterSaving } from '../lib/format';
import { imageUsable } from '../lib/images';
import { withSponsoredTiles } from '../components/ads/AdSlot';

/**
 * Thresholds on the DIFFERENCE, matching the chip on every card.
 *
 * ⚠️ The old buckets filtered on `like_for_like_spread_pct`, which divides by the
 * cheapest price — so "50%+" admitted anything 33% lower or more, and a card
 * reading "33% lower" appeared under a 50% filter.
 *
 * ⛔ The top bucket had to move from 50% to 40%. Measured over the 3,189 deals:
 * 40%+ has 55, and **50%+ has exactly none** — relabelling the old buckets would
 * have shipped a filter that is empty by construction, which reads as a broken
 * page rather than an honest absence.
 */
const DIFFERENCE_FILTERS = [
  { label: 'Any', min: 0 },
  { label: '10% or more', min: 10 },
  { label: '20% or more', min: 20 },
  { label: '30% or more', min: 30 },
  { label: '40% or more', min: 40 },
] as const;

/**
 * Deals: products listed at a lower price by one shop than another.
 *
 * The page says what the comparison is (lowest against highest listed price
 * for the same product grouping) and what it is not: there is no check
 * schedule to promise, and the thresholds that keep implausible pairs out
 * are a selection rule, not a proof, so they are not recited to shoppers
 * (design audit §9).
 */
export default function DealsPage() {
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [minSaving, setMinSaving] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // One page of deals that pass the guard rails below, filtered where the
      // data is; changing the minimum difference starts again from page one.
      const res = await clustersApi.getDeals({ minSaving });
      setClusters(res.results);
      setPages(res.pages);
      setPage(res.page);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [minSaving]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await clustersApi.getDeals({ page: page + 1, minSaving });
      setClusters((prev) => [...prev, ...res.results]);
      setPage(res.page);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [page, minSaving]);

  useEffect(() => {
    load();
  }, [load]);

  // Guard rails (DESIGN_RULES.md §5): a deal needs a photo and a difference we
  // are willing to show — between 1% and 60%, at least KES 50, and not between
  // used asking prices. Cards that fail are left out, not pushed down.
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
      <Seo title="Deals" description="Lower listed prices for matching products across shops in Kenya." />
      <div className="page-container py-8">
        <div className="mb-6">
          <h1 className="page-title mb-1">Deals</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Lower prices for matching products across shops.
          </p>
          <details className="mt-2 max-w-2xl text-sm text-muted-foreground">
            <summary className="inline-flex cursor-pointer items-center gap-1 text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
              How price differences are calculated
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </summary>
            <p className="mt-2 leading-relaxed">
              We compare the lowest and highest prices listed for the same product grouping and
              show the difference as a percentage of the higher price. Listings are matched
              automatically, so check the shop titles on the product page. Delivery costs are
              excluded.
            </p>
          </details>
        </div>

        {loading ? (
          <div aria-busy="true" aria-label="Loading deals">
            <ClusterGridSkeleton />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground mb-4">We couldn’t load deals. Try again.</p>
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Price difference">
              <span className="mr-1 text-sm text-muted-foreground">Price difference</span>
              {DIFFERENCE_FILTERS.map((f) => (
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
                  {withSponsoredTiles(filtered.map((c) => <ClusterCard key={c.cluster_id} cluster={c} showSaving />))}
                </div>
                {page < pages - 1 && (
                  <div className="flex flex-col items-center gap-2 mt-8">
                    <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      {loadingMore ? 'Loading deals…' : 'Show more deals'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Showing {filtered.length.toLocaleString()} deals from a limited selection.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm mb-3">
                  {minSaving === 0 ? 'No deals to show right now.' : 'No deals match this filter.'}
                </p>
                {minSaving > 0 ? (
                  <Button variant="outline" onClick={() => setMinSaving(0)}>
                    Clear filter
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <a href="/browse">Browse products</a>
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
