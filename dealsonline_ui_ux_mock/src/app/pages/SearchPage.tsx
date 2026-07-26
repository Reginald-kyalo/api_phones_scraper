import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { clustersApi } from '../lib/api';
import type { SearchRow } from '../lib/demoSource';
import { formatPrice } from '../lib/format';
import { categoryLabel } from './CatalogueCategoriesPage';
import { Button } from '../components/ui/button';
import { Loader2, Search as SearchIcon } from 'lucide-react';

/**
 * Offline search across the whole captured catalogue (61,473 products).
 *
 * The index is sharded per category and fetched in parallel on first use, then
 * cached — so typing a second query costs nothing. Results render from index
 * fields alone; the full cluster is only fetched when one is opened.
 */
export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const slug = searchParams.get('slug') ?? undefined;

  const [rows, setRows] = useState<SearchRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setRows([]);
      setCount(0);
      return;
    }
    setLoading(true);
    clustersApi
      .search(query, { slug, limit: 60 })
      .then((res) => {
        if (cancelled) return;
        setRows(res.results);
        setCount(res.count);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, slug]);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1100px] mx-auto px-4 lg:px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : 'Search'}
        </h1>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Searching" />
          </div>
        ) : !query.trim() ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Search any product to compare prices across Kenyan stores.
          </p>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <SearchIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/browse">Browse all categories</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {count.toLocaleString()} {count === 1 ? 'product' : 'products'}
              {count > rows.length && ` · showing the first ${rows.length}`}
            </p>
            <ul className="mt-6 divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    to={`/prices/${encodeURIComponent(row.id)}`}
                    className="flex items-baseline justify-between gap-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {row.t}
                      </span>
                      {row.c && (
                        <span className="microcopy-label">{categoryLabel(row.c)}</span>
                      )}
                    </span>
                    <span className="price-num flex-shrink-0 text-sm font-bold text-foreground">
                      {formatPrice(row.p)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
