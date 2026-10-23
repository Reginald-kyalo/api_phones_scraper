import { useCallback, useEffect, useState } from 'react';
import { Seo } from '../components/common/Seo';
import { Link, useParams, useSearchParams } from 'react-router';
import { PackageOpen, RefreshCw } from 'lucide-react';
import { browseApi, type BrowseNode, type ClusterSummary } from '../lib/api';
import { ClusterCard, ClusterGridSkeleton, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/ui/button';
import { PAGE_SIZE } from '../lib/listing';
import { MULTI_SHOP_LABEL } from '../features/search/components/ListingFiltersPanel';
import { shelfPlacement } from '../data/taxonomyTree';
import { browseLabel, departmentDisplayLabel, familyDisplayLabel } from '../lib/navLabels';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { describeLoadError } from '../lib/loadError';



/**
 * The trail comes from the taxonomy (department → family → shelf), not from
 * the shop's own ancestor slugs: 56 of those named pages that do not exist,
 * so the old breadcrumb links went to "We couldn't find that category".
 */
function Crumbs({ slug, heading }: { slug: string; heading: string }) {
  const place = shelfPlacement(slug);
  return (
    <Breadcrumbs
      items={
        place
          ? [
              { label: departmentDisplayLabel(place.department), to: `/aisle/${place.department.id}` },
              { label: familyDisplayLabel(place.family), to: `/aisle/${place.department.id}#${place.family.id}` },
              { label: heading },
            ]
          : [{ label: 'All categories', to: '/browse' }, { label: heading }]
      }
    />
  );
}

/**
 * A shelf (/shelf/:slug): one page of products from a shop-named category.
 *
 * Four states that used to share two messages are kept apart (design audit,
 * R03): the request failed (Try again), the shelf is empty, the filter
 * excludes everything (clear it), and the page number is past the end
 * (go to the first page). The shelf API has only the multi-shop switch and
 * paging; price sorting and budgets need a query change and stay on the
 * category pages for now.
 */
export default function DemoShelfPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const multiStoreOnly = params.get('multi_store') === '1';
  const page = Math.max(0, (Number(params.get('page') ?? '1') || 1) - 1);

  const [node, setNode] = useState<BrowseNode | null>(null);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsFailed, setProductsFailed] = useState<string | null>(null);
  const [error, setError] = useState<'missing' | 'failed' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    browseApi
      .getTree(slug)
      .then((res) => {
        if (cancelled) return;
        setNode(res.parent);
      })
      .catch((err) => {
        if (cancelled) return;
        // A shelf the catalogue has never heard of is "not found"; a shelf it
        // could not read is a failure with a retry.
        setError(describeLoadError(err).kind === 'not-found' ? 'missing' : 'failed');
        setNode(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setProductsLoading(true);
    setProductsFailed(null);
    setClusters([]);
    browseApi
      .getClusters(slug, { limit: PAGE_SIZE, offset: page * PAGE_SIZE, multiStoreOnly })
      .then((res) => {
        if (cancelled) return;
        setClusters(res.results);
        setTotal(res.total);
      })
      .catch((err) => {
        // Products must not blank the tree; navigation still works. The grid
        // says the prices did not load, not that there is no stock.
        if (!cancelled) setProductsFailed(describeLoadError(err, 'these products').message);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, multiStoreOnly, page, attempt]);


  const toggleMultiStore = useCallback(() => {
    const next = new URLSearchParams(params);
    if (multiStoreOnly) next.delete('multi_store');
    else next.set('multi_store', '1');
    next.delete('page');
    setParams(next, { replace: true });
  }, [params, multiStoreOnly, setParams]);

  const goToPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 0) next.set('page', String(p + 1));
    else next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0 });
  };

  if (!slug) {
    return (
      <div className="bg-background min-h-screen">
        <div className="page-container py-16 text-center">
          <p className="section-title mb-4">Category not found.</p>
          <Link to="/browse" className="text-sm text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
            Browse categories
          </Link>
        </div>
      </div>
    );
  }

  const heading = node ? browseLabel(node) : slug;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pastEnd = !productsLoading && !productsFailed && total > 0 && page >= pages;

  return (
    <div className="bg-background min-h-screen">
      <Seo title={`${heading} prices in Kenya`} description={`Compare ${heading.toLowerCase()} listings from Kenyan shops. Check product versions, shop prices and available details before buying.`} />
      <div className="page-container py-8">
        {error !== 'missing' && <Crumbs slug={slug} heading={heading} />}

        {error === 'missing' ? (
          <div className="py-12 text-center">
            <p className="section-title mb-4">Category not found.</p>
            <Link to="/browse" className="text-sm text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
              Browse categories
            </Link>
          </div>
        ) : error === 'failed' ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">We couldn’t load this category. Try again.</p>
            <Button variant="outline" onClick={retry} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : null}

        {error === null && (
          <>
            <h1 className="page-title">{heading}</h1>
            {/* Subcategory tiles are gone: 185 of the 208 the shops named had
                no page of their own, and every product is already listed
                here (descendant closure), so the tiles only led to dead ends. */}

            <section aria-label="Products">
              <div className="mt-1 mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {loading || productsLoading
                    ? ' '
                    : productsFailed
                      ? ' '
                      : total > 0
                        ? `${total.toLocaleString('en-GB')} ${total === 1 ? 'product' : 'products'}`
                        : multiStoreOnly
                          ? 'No products match this filter'
                          : 'No products listed in this category yet'}
                </p>
                <button
                  type="button"
                  onClick={toggleMultiStore}
                  aria-pressed={multiStoreOnly}
                  className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors active:translate-y-px ${
                    multiStoreOnly
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-muted-foreground'
                  }`}
                >
                  {MULTI_SHOP_LABEL}
                </button>
              </div>

              {productsLoading ? (
                <ClusterGridSkeleton />
              ) : productsFailed ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-4">{productsFailed}</p>
                  <Button variant="outline" onClick={retry} className="gap-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Try again
                  </Button>
                </div>
              ) : pastEnd ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-4">This results page is no longer available.</p>
                  <Button variant="outline" onClick={() => goToPage(0)}>
                    Go to first page
                  </Button>
                </div>
              ) : clusters.length > 0 ? (
                <>
                  <div className={PRODUCT_GRID}>
                    {clusters.map((cluster) => (
                      <ClusterCard key={cluster.cluster_id} cluster={cluster} />
                    ))}
                  </div>
                  <Pagination page={page} pages={pages} onChange={goToPage} />
                </>
              ) : multiStoreOnly ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-3">No products here have prices from 2 or more shops.</p>
                  <Button variant="outline" onClick={toggleMultiStore}>
                    Clear filter
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-sm mb-3">No products listed in this category yet.</p>
                  <Button asChild variant="outline">
                    <Link to="/browse">Browse categories</Link>
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
