import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { clustersApi, type ClusterSummary } from '../lib/api';
import { ClusterCard } from '../features/clusters/components/ClusterCard';
import { categoryLabel } from './CatalogueCategoriesPage';
import { Button } from '../components/ui/button';
import { Loader2, ChevronRight, RefreshCw } from 'lucide-react';

/**
 * One category of the catalogue, paginated.
 *
 * The page number lives in the URL so a listing position is linkable and the
 * back button works. Capture ranks rows image > spread > stores > listings with
 * a total tie-break, so page N holds the same products on every rebuild.
 */
export default function CatalogueBrowsePage() {
  const { productType = '' } = useParams<{ productType: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(0, Number(searchParams.get('page') ?? '0') || 0);

  const [rows, setRows] = useState<ClusterSummary[]>([]);
  const [meta, setMeta] = useState<{ count: number; pages: number }>({ count: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await clustersApi.getCategoryPage(productType, page);
      setRows(res.results);
      setMeta({ count: res.count, pages: res.pages });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [productType, page]);

  useEffect(() => { load(); }, [load]);

  const goTo = (next: number) => {
    setSearchParams(next === 0 ? {} : { page: String(next) });
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link to="/browse" className="hover:text-foreground">All categories</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="text-foreground">{categoryLabel(productType)}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {categoryLabel(productType)}
        </h1>
        {!loading && !error && (
          <p className="mt-1 text-sm text-muted-foreground">
            {meta.count.toLocaleString()} products
            {meta.pages > 1 && ` · page ${page + 1} of ${meta.pages}`}
          </p>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading products" />
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              We couldn't load {categoryLabel(productType)}. It may not be a category we track.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={load} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
              <Button asChild variant="ghost"><Link to="/browse">All categories</Link></Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {rows.map((c) => <ClusterCard key={c.cluster_id} cluster={c} />)}
            </div>

            {meta.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button variant="outline" disabled={page === 0} onClick={() => goTo(page - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {meta.pages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= meta.pages - 1}
                  onClick={() => goTo(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
