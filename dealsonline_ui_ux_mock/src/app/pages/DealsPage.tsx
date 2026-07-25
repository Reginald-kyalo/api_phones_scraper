import { useState, useEffect, useMemo, useCallback } from 'react';
import { clustersApi, type ClusterSummary } from '../lib/api';
import { Button } from '../components/ui/button';
import { ClusterDealCard } from '../features/clusters/components/ClusterDealCard';
import { Loader2, Tag, RefreshCw } from 'lucide-react';

const SPREAD_FILTERS = [
  { label: 'All deals', min: 0 },
  { label: '10%+', min: 10 },
  { label: '20%+', min: 20 },
  { label: '30%+', min: 30 },
  { label: '50%+', min: 50 },
] as const;

export default function DealsPage() {
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [minSpread, setMinSpread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Backend caps limit at 50; minStores 2 ⇒ every row is a real comparison.
      const res = await clustersApi.getDeals({ limit: 50, minStores: 2 });
      setClusters(res.results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => clusters.filter((c) => (c.like_for_like_spread_pct ?? 0) >= minSpread),
    [clusters, minSpread],
  );

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading deals" />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5 text-teal-deep" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Today's best deals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Same product, different stores — ranked by how much the price varies for the same configuration.
          </p>
        </div>

        {error ? (
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
            {/* Spread filter chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {SPREAD_FILTERS.map((f) => (
                <Button
                  key={f.min}
                  size="sm"
                  variant={minSpread === f.min ? 'default' : 'outline'}
                  onClick={() => setMinSpread(f.min)}
                  className={`h-8 text-xs rounded-full ${minSpread === f.min ? '' : 'hover:border-primary/40'}`}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((c) => (
                  <ClusterDealCard key={c.cluster_id} cluster={c} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>
                  {minSpread === 0
                    ? 'No cross-store deals right now — check back soon.'
                    : `No deals with a ${minSpread}%+ price spread.`}
                </p>
                {minSpread > 0 && (
                  <Button variant="link" onClick={() => setMinSpread(0)} className="mt-2">
                    Show all deals
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
