import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Seo } from '../components/common/Seo';
import { useParams, Link } from 'react-router';
import { clustersApi, type ClusterDetail, type ClusterStore } from '../lib/api';
import {
  checkedAgo,
  checkedAt,
  clusterSaving,
  displaySaving,
  formatPrice,
  hasPrice,
  brandName,
  productName,
  shopLabel,
} from '../lib/format';
import { bestImage } from '../lib/images';
import { categoryLabel } from './CatalogueCategoriesPage';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { BarChart3, Bell, Check, ChevronRight, ExternalLink, Heart, Info, Package, RefreshCw } from 'lucide-react';
import { storeName } from '../lib/storeIdentity';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useLocalComparison, useLocalFavorites } from '../hooks/useLocalStorage';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { SavingBadge } from '../components/common/SavingBadge';
import { StoreMark } from '../components/common/StoreMark';
import { MatchProvenance } from '../features/clusters/components/MatchProvenance';
import { SpreadEvidence } from '../features/clusters/components/SpreadEvidence';
import { ReportDialog } from '../features/clusters/components/ReportDialog';
import { PRPriceHistoryChart } from '../features/product/components/PriceHistoryChart';
import PriceAlertDialog from '../features/alerts/components/PriceAlertDialog';
import { AdSlot } from '../components/ads/AdSlot';

type Config = ClusterDetail['configs'][number];
type Offer = [store: string, offer: ClusterStore];

/** Shops that can actually PRICE something, cheapest first. */
function pricedOffers(byStore: Record<string, ClusterStore> | null | undefined): Offer[] {
  return Object.entries(byStore ?? {})
    .filter(([, offer]) => offer != null && hasPrice(offer.price))
    .sort(([, a], [, b]) => (a.price as number) - (b.price as number));
}

/**
 * The capture's data_warning is written for us, not for shoppers
 * ("classifieds/refurb asking price"). Say what it means for the buyer, and
 * say nothing for a warning we have no wording for (DESIGN_RULES.md §6).
 */
function warningCopy(warning: string | null | undefined): string | null {
  if (!warning) return null;
  if (warning.startsWith('no confident retail price')) {
    return 'We found no shop selling this new. These prices are for used or refurbished listings.';
  }
  if (warning.startsWith('implausibly low best price')) {
    return 'One price here looks too low for the same item. Check the listing before you buy.';
  }
  if (warning.startsWith('wide price spread')) {
    return 'Prices vary a lot between shops. Check each listing is the same item and condition.';
  }
  return null;
}

function variantLabel(config: Config): string {
  return config.facet_label ?? (config.storage_gb != null ? `${config.storage_gb}GB` : 'Variant');
}

/**
 * The product page: the one page where a shopper has decided to buy.
 *
 * Layout per the design review §3.3. Left: name, variant selector, a one-line
 * summary, the price list sorted by price, history, and "about this
 * comparison". Right (sticky on desktop): photo, best-price card with "Go to
 * shop" and "Set a price alert", then the reserved sponsored slot. On mobile
 * a bottom bar carries the best price once its card scrolls away.
 *
 * Renders the honest-price contract: condition_basis labels the headline,
 * data_warning and comparison_grade=false become plain notes, and every row
 * carries the shop's own listing title and a real click-through URL.
 */
export default function ClusterPricesPage() {
  const { clusterId } = useParams<{ clusterId: string }>();
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { addItem } = useRecentlyViewed();

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

  useEffect(() => {
    if (!cluster) return;
    addItem({
      id: cluster.cluster_id,
      name: productName(cluster),
      image: bestImage(cluster) ?? '',
      category: categoryLabel(cluster.category ?? ''),
    });
  }, [cluster, addItem]);

  if (loading) return <ProductPageSkeleton />;

  if (error || !cluster) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">We couldn’t load this product. Try again.</p>
        <Button variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  return <ProductView cluster={cluster} capturedAt={capturedAt} />;
}

function ProductView({ cluster, capturedAt }: { cluster: ClusterDetail; capturedAt?: string }) {
  const name = productName(cluster);
  const likelyUsed = cluster.condition_basis === 'likely_used';
  const image = bestImage(cluster);

  // Variant selector. With several configurations the default is the one most
  // shops price, so the first list a shopper sees is like-for-like; "Any
  // variant" shows each shop's cheapest offer whatever the configuration.
  const configs = useMemo(
    () => cluster.configs.filter((c) => pricedOffers(c.by_store).length > 0),
    [cluster.configs],
  );
  const defaultConfig = useMemo(() => {
    if (configs.length < 2) return -1;
    let best = 0;
    configs.forEach((c, i) => {
      if (pricedOffers(c.by_store).length > pricedOffers(configs[best].by_store).length) best = i;
    });
    return best;
  }, [configs]);
  const [selected, setSelected] = useState(defaultConfig);
  useEffect(() => setSelected(defaultConfig), [defaultConfig]);

  const config = selected >= 0 ? configs[selected] : null;
  const offers = config ? pricedOffers(config.by_store) : pricedOffers(cluster.best_by_store);
  const lowest = offers[0] ?? null;
  const highest = offers.length > 1 ? offers[offers.length - 1] : null;
  const saving = config
    ? offers.length > 1
      ? displaySaving(config.spread_pct, lowest?.[1].price)
      : null
    : clusterSaving(cluster);
  const checked = checkedAgo(cluster.last_seen);

  const [alertOpen, setAlertOpen] = useState(false);
  const alertProduct = {
    id: cluster.cluster_id,
    name,
    price: lowest?.[1].price ?? cluster.best_price ?? 0,
    image,
    categoryName: categoryLabel(cluster.category ?? ''),
  };

  // Mobile sticky bar appears once the in-flow best-price card has scrolled off.
  const mobileCardRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = mobileCardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) =>
      setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { isInComparison, toggleComparison } = useLocalComparison();
  const comparing = isInComparison(cluster.cluster_id);
  const onCompare = () =>
    toggleComparison({
      id: cluster.cluster_id,
      name,
      image,
      price: lowest?.[1].price ?? cluster.best_price ?? 0,
      numStores: offers.length,
      categoryName: categoryLabel(cluster.category ?? ''),
      productType: cluster.category ?? '',
    });

  const { isFavorite, toggleFavorite } = useLocalFavorites();
  const saved = isFavorite(cluster.cluster_id);
  const onSave = () =>
    toggleFavorite({
      id: cluster.cluster_id,
      name,
      brand: cluster.brand ?? '',
      category: categoryLabel(cluster.category ?? ''),
      image: image ?? '',
    });

  const bestCard = (
    <BestPriceCard
      offer={lowest}
      likelyUsed={likelyUsed}
      saving={saving}
      onAlert={() => setAlertOpen(true)}
      comparing={comparing}
      onCompare={onCompare}
      saved={saved}
      onSave={onSave}
    />
  );

  return (
    <div className="bg-background">
      <Seo
        title={lowest ? `${name}: ${formatPrice(lowest[1].price)} at ${storeName(lowest[0])}` : name}
        description={
          lowest
            ? `${name} from ${formatPrice(lowest[1].price)}. Compare ${shopLabel(offers.length)} in Kenya, sorted by price.`
            : `Compare ${name} prices across Kenyan shops.`
        }
      />
      <div className="page-container py-6 lg:py-8">
        <Breadcrumbs cluster={cluster} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          {/* ── Left column ── */}
          <div className="min-w-0">
            {cluster.brand && <p className="microcopy-label">{cluster.brand}</p>}
            <h1 className="page-title mt-1">{name}</h1>

            {configs.length > 1 && (
              <div role="radiogroup" aria-label="Variant" className="mt-4 flex flex-wrap gap-2">
                {configs.map((c, i) => (
                  <VariantChip key={i} active={selected === i} onClick={() => setSelected(i)}>
                    {variantLabel(c)}
                  </VariantChip>
                ))}
                <VariantChip active={selected === -1} onClick={() => setSelected(-1)}>
                  Any variant
                </VariantChip>
              </div>
            )}

            <p className="mt-4 text-sm text-muted-foreground">
              {lowest ? (
                <>
                  <span className="price-num text-foreground">{formatPrice(lowest[1].price)}</span>
                  {highest && (
                    <>
                      {' '}to <span className="price-num text-foreground">{formatPrice(highest[1].price)}</span>
                    </>
                  )}{' '}
                  across {shopLabel(offers.length)}
                </>
              ) : (
                'No shop has a current price for this.'
              )}
              {checked && cluster.last_seen && (
                <>
                  {' · checked '}
                  <time dateTime={cluster.last_seen} title={`${checkedAt(cluster.last_seen)} (Kenya time)`}>
                    {checked}
                  </time>
                </>
              )}
            </p>

            {/* Mobile: photo and best price come before the list. */}
            <div className="mt-5 space-y-4 lg:hidden">
              <ProductPhoto image={image} />
              <div ref={mobileCardRef}>{bestCard}</div>
            </div>

            {(!cluster.comparison_grade || warningCopy(cluster.data_warning)) && (
              <div className="mt-6 space-y-2">
                {!cluster.comparison_grade && (
                  <Note>
                    Accessory listings vary in exact model, so we don’t claim a saving here. Check the
                    shop titles match before you buy.
                  </Note>
                )}
                {warningCopy(cluster.data_warning) && <Note>{warningCopy(cluster.data_warning)}</Note>}
              </div>
            )}

            {/* ── The price list ── */}
            <section aria-labelledby="prices" className="mt-8">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="prices" className="section-title">
                  {likelyUsed ? 'Used and refurbished prices' : 'Prices'}
                </h2>
                <p className="microcopy-label">Sorted by price</p>
              </div>

              {/* Sponsored shop: its own card ABOVE the list, never a row in it. */}
              <AdSlot placement="product-sponsored-shop" className="mb-3" />

              {offers.length > 0 ? (
                <ul aria-label={`${name} prices`} className="divide-y divide-border rounded-md border border-border list-none p-0">
                  {offers.map(([store, offer], idx) => (
                    <OfferRow key={store} store={store} offer={offer} lowest={idx === 0 && offers.length > 1} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No shop has a usable price for this variant right now.</p>
              )}

              {!likelyUsed && cluster.likely_used_best_price != null && (cluster.n_likely_used ?? 0) > 0 && (
                <details className="mt-3 rounded-md border border-border">
                  <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground">
                    Used and refurbished from{' '}
                    <span className="price-num text-foreground">{formatPrice(cluster.likely_used_best_price)}</span>{' '}
                    ({cluster.n_likely_used} {cluster.n_likely_used === 1 ? 'listing' : 'listings'})
                  </summary>
                  <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                    Kept out of the list above so new and used prices are never compared with each other.
                  </p>
                </details>
              )}
            </section>

            {/* Real history only — never synthesised to fill the slot. */}
            {cluster.price_history && cluster.price_history.length >= 2 && (
              <section className="mt-10">
                <PRPriceHistoryChart title={name} priceHistory={cluster.price_history} />
              </section>
            )}

            {/* ── About this comparison ── */}
            <section aria-labelledby="about-comparison" className="mt-10 space-y-3">
              <h2 id="about-comparison" className="section-title">About this comparison</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We match the same product across shops by its listing details, then sort every price by
                price. Each row shows the shop’s own listing title so you can check the match.
                {cluster.last_seen && (
                  <>
                    {' '}Last full check{' '}
                    {new Date(cluster.last_seen).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    .
                  </>
                )}{' '}
                <Link to="/how-we-make-money" className="text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
                  How we make money
                </Link>
              </p>
              <SpreadEvidence cluster={cluster} />
              <MatchProvenance cluster={cluster} />
              <div className="-ml-3">
                <ReportDialog cluster={cluster} capturedAt={capturedAt} />
              </div>
            </section>
          </div>

          {/* ── Right column (desktop) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <ProductPhoto image={image} />
              {bestCard}
              <AdSlot placement="product-rail" />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky bar: the ORGANIC best price, never a sponsored one. */}
      {lowest && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3 shadow-raised transition-transform duration-150 ease-out lg:hidden ${
            showBar ? 'translate-y-0' : 'translate-y-full'
          }`}
          aria-hidden={!showBar}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">Lowest at {storeName(lowest[0])}</p>
              <p className="price-num text-base font-bold text-foreground">{formatPrice(lowest[1].price)}</p>
            </div>
            <Button asChild className="h-10 px-5" tabIndex={showBar ? 0 : -1}>
              <a href={lowest[1].url} target="_blank" rel="noopener noreferrer">
                Go to shop
              </a>
            </Button>
          </div>
        </div>
      )}

      {alertOpen && (
        <PriceAlertDialog open={alertOpen} onOpenChange={setAlertOpen} product={alertProduct} />
      )}
    </div>
  );
}

function Breadcrumbs({ cluster }: { cluster: ClusterDetail }) {
  const slug = cluster.category ?? '';
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground hover:underline underline-offset-4">Home</Link>
      {slug && (
        <>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link to={`/browse/${slug}`} className="hover:text-foreground hover:underline underline-offset-4">
            {categoryLabel(slug)}
          </Link>
        </>
      )}
      {cluster.brand && (
        <>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="text-foreground">{brandName(cluster.brand)}</span>
        </>
      )}
    </nav>
  );
}

function VariantChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors active:translate-y-px ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-muted-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function OfferRow({ store, offer, lowest }: { store: string; offer: ClusterStore; lowest: boolean }) {
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <StoreMark store={store} url={offer.url} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{storeName(store)}</span>
          {lowest && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
              Lowest
            </span>
          )}
        </div>
        {offer.title && <p className="mt-0.5 truncate text-xs text-muted-foreground">{offer.title}</p>}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-4">
        <span className="price-num text-base font-bold text-foreground">{formatPrice(offer.price)}</span>
        <Button asChild size="sm" className="h-9 px-4 text-xs">
          <a href={offer.url} target="_blank" rel="noopener noreferrer">
            Go to shop
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </li>
  );
}

function BestPriceCard({
  offer,
  likelyUsed,
  saving,
  onAlert,
  comparing,
  onCompare,
  saved,
  onSave,
}: {
  offer: Offer | null;
  likelyUsed: boolean;
  saving: ReturnType<typeof displaySaving>;
  onAlert: () => void;
  comparing: boolean;
  onCompare: () => void;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="rounded-md border border-border p-5">
      <p className="microcopy-label">{likelyUsed ? 'Lowest asking price (used)' : 'Best price'}</p>
      {offer ? (
        <>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="price-num text-3xl font-bold text-foreground">{formatPrice(offer[1].price)}</span>
            <SavingBadge saving={saving} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">at {storeName(offer[0])}</p>
          <Button asChild className="mt-4 h-11 w-full">
            <a href={offer[1].url} target="_blank" rel="noopener noreferrer">
              Go to shop
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No current price.</p>
      )}
      <Button variant="outline" className="mt-2 h-11 w-full" onClick={onAlert}>
        <Bell className="h-4 w-4" aria-hidden="true" />
        Set a price alert
      </Button>
      <div className="mt-3 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onCompare}
          aria-pressed={comparing}
          className="inline-flex items-center gap-1.5 text-foreground hover:underline underline-offset-4"
        >
          {comparing ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          )}
          {comparing ? 'Added to compare' : 'Compare with others'}
        </button>
        <button
          type="button"
          onClick={onSave}
          aria-pressed={saved}
          className="inline-flex items-center gap-1.5 text-foreground hover:underline underline-offset-4"
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {comparing && (
        <Link to="/compare" className="mt-2 block text-sm text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
          View comparison
        </Link>
      )}
    </div>
  );
}

function ProductPhoto({ image }: { image: string | null }) {
  return (
    <div className="relative flex aspect-[4/3] items-center justify-center rounded-md border border-border bg-photo p-3 lg:aspect-square">
      <Package className="absolute h-10 w-10 text-muted-foreground/20" aria-hidden="true" />
      {image && (
        <ImageWithFallback
          src={image}
          alt=""
          className="relative max-h-full max-w-full object-contain"
          fallback={<span className="sr-only">Image unavailable</span>}
        />
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-surface-alt px-3 py-2.5 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="page-container py-6 lg:py-8" aria-busy="true" aria-label="Loading product">
      <Skeleton className="mb-4 h-4 w-48" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-8 w-3/4" />
          <Skeleton className="mt-4 h-4 w-80" />
          <div className="mt-8 space-y-0 rounded-md border border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
                <Skeleton className="h-9 w-9" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-9 w-40" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block space-y-4">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
