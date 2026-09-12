import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  ChevronRight,
  FolderTree,
  Loader2,
  PackageOpen,
  Store,
} from 'lucide-react';
import { browseApi, type BrowseNode, type ClusterSummary } from '../lib/api';
import { ClusterCard, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';

const PAGE = 24;

/** Render a shop-written browse-node label without echoing its ALL-CAPS form. */
function browseLabel(node: Pick<BrowseNode, 'slug' | 'label'>): string {
  const raw = (node.label ?? '').trim();
  if (!raw) return node.slug;
  if (raw === raw.toUpperCase() && /[A-Z]{2,}/.test(raw)) {
    return raw.toLowerCase().replace(/(^|[\s/()-])([a-z])/g, (_: string, sep: string, ch: string) => sep + ch.toUpperCase());
  }
  if (raw === raw.toLowerCase()) return raw.replace(/^[a-z]/, (c) => c.toUpperCase());
  return raw;
}

/**
 * Drop a child that merely restates its parent (`Phones` under `Smartphones`).
 * Products are already in the parent page via descendant closure, so this only
 * removes a redundant navigation tile.
 */
function canonicalForm(label: string | null): string {
  return (label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, '')
    .replace(/s$/, '');
}

const MODIFIERS = new Set(['smart', 'mobile', 'cell', 'feature']);

function foldsIntoParent(child: Pick<BrowseNode, 'label'>, parentLabel: string | null): boolean {
  const c = canonicalForm(child.label);
  const p = canonicalForm(parentLabel);
  if (!c || !p || c === p || !p.endsWith(c) || p.length <= c.length) return false;
  return MODIFIERS.has(p.slice(0, p.length - c.length));
}

function foldChildren<T extends Pick<BrowseNode, 'label'>>(children: T[], parentLabel: string | null): T[] {
  return children.filter((child) => !foldsIntoParent(child, parentLabel));
}

function Crumbs({ node }: { node: BrowseNode | null }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <Link to="/browse" className="hover:text-foreground">All categories</Link>
        </li>
        {(node?.ancestors ?? []).map((slug, i) => (
          <li key={slug} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <Link to={`/shelf/${encodeURIComponent(slug)}`} className="hover:text-foreground">
              {browseLabel({ slug, label: node?.ancestor_labels?.[i] ?? null })}
            </Link>
          </li>
        ))}
        {node && (
          <li className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-foreground font-medium">
              {browseLabel(node)}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

export default function DemoShelfPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const multiStoreOnly = params.get('multi_store') === '1';

  const [node, setNode] = useState<BrowseNode | null>(null);
  const [children, setChildren] = useState<BrowseNode[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<'missing' | 'failed' | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChildren([]);
    browseApi
      .getTree(slug)
      .then((res) => {
        if (cancelled) return;
        setNode(res.parent);
        setChildren(res.results);
      })
      .catch(() => {
        if (cancelled) return;
        setError('failed');
        setNode(null);
        setChildren([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setProductsLoading(true);
    setClusters([]);
    browseApi
      .getClusters(slug, { limit: PAGE, multiStoreOnly })
      .then((res) => {
        if (cancelled) return;
        setClusters(res.results);
        setTotal(res.total);
      })
      .catch(() => {
        // Products must not blank the tree; navigation still works without stock.
        if (cancelled) setClusters([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, multiStoreOnly]);

  const loadMore = useCallback(() => {
    if (!slug || loadingMore) return;
    setLoadingMore(true);
    browseApi
      .getClusters(slug, { limit: PAGE, offset: clusters.length, multiStoreOnly })
      .then((res) => {
        setClusters((prev) => {
          const seen = new Set(prev.map((cluster) => cluster.cluster_id));
          return [...prev, ...res.results.filter((cluster) => !seen.has(cluster.cluster_id))];
        });
        setTotal(res.total);
      })
      .catch(() => {
        // Leave what is already on screen; the button stays available to retry.
      })
      .finally(() => setLoadingMore(false));
  }, [slug, clusters.length, loadingMore, multiStoreOnly]);

  const toggleMultiStore = useCallback(() => {
    const next = new URLSearchParams(params);
    if (multiStoreOnly) next.delete('multi_store');
    else next.set('multi_store', '1');
    setParams(next, { replace: true });
  }, [params, multiStoreOnly, setParams]);

  if (!slug) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-16 text-center">
          <p className="text-base font-medium text-foreground mb-1">No such category</p>
          <Link to="/browse" className="text-sm text-link hover:text-link-hover underline">
            Browse all categories
          </Link>
        </div>
      </div>
    );
  }

  const heading = node ? browseLabel(node) : slug;
  const shownChildren = foldChildren(children, node?.label ?? null);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        {error !== 'missing' && <Crumbs node={node} />}

        {error === 'missing' ? (
          <div className="py-12 text-center">
            <p className="text-base font-medium text-foreground mb-1">No such category</p>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-mono">{slug}</span> is not a shelf in this catalogue.
            </p>
            <Link to="/browse" className="text-sm text-link hover:text-link-hover underline">
              Browse all categories
            </Link>
          </div>
        ) : error === 'failed' ? (
          <p className="text-sm text-muted-foreground py-8">
            That category could not be loaded. Please try again.
          </p>
        ) : null}

        {error === null && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <FolderTree className="w-5 h-5 text-teal-deep" aria-hidden="true" />
                <h1 className="text-xl md:text-2xl font-bold text-foreground">{heading}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {node?.coarse
                  ? 'A grouping of several departments — pick one below to narrow it down.'
                  : node?.unsorted
                    ? 'A single shelf — everything here is listed below.'
                    : 'Categories built from what Kenyan shops actually stock.'}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted/40" />
                ))}
              </div>
            ) : shownChildren.length > 0 ? (
              <section aria-label="Subcategories" className="mb-10">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {shownChildren.map((child) => (
                    <Link
                      key={child.slug}
                      to={`/shelf/${encodeURIComponent(child.slug)}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border
                                 px-4 py-3 hover:border-teal-deep hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground truncate">
                        {browseLabel(child)}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {child.n_clusters_subtree.toLocaleString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-label="Products">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {total > 0 ? `${total.toLocaleString()} products` : 'Products'}
                </h2>
                <button
                  type="button"
                  onClick={toggleMultiStore}
                  aria-pressed={multiStoreOnly}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm
                              transition-colors ${
                    multiStoreOnly
                      ? 'border-teal-deep bg-teal/10 text-teal-deep font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-teal-deep'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" aria-hidden="true" />
                  Only compared across 2+ shops
                </button>
              </div>

              {productsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-label="Loading products" />
                </div>
              ) : clusters.length > 0 ? (
                <>
                  <div className={PRODUCT_GRID}>
                    {clusters.map((cluster) => (
                      <ClusterCard key={cluster.cluster_id} cluster={cluster} />
                    ))}
                  </div>
                  {clusters.length < total && (
                    <div className="flex flex-col items-center gap-2 pt-8">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5
                                   text-sm font-medium text-foreground hover:border-teal-deep
                                   hover:bg-muted/40 transition-colors disabled:opacity-60"
                      >
                        {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                        {loadingMore ? 'Loading…' : 'Show more products'}
                      </button>
                      <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                        Showing {clusters.length.toLocaleString()} of {total.toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageOpen className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm">
                    {multiStoreOnly
                      ? 'No products on this shelf are priced at 2+ shops.'
                      : 'No products on this shelf.'}
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
