import { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Seo } from '../components/common/Seo';
import { Breadcrumbs, type Crumb } from '../components/common/Breadcrumbs';
import { departmentForCategory } from '../data/taxonomyTree';
import { useParams, Link } from 'react-router';
import { clustersApi, type ClusterDetail, type ClusterStore } from '../lib/api';
import {
  checkedAgo,
  checkedAt,
  checkedDate,
  priceVerdict,
  clusterSaving,
  displaySaving,
  formatPrice,
  hasPrice,
  isStale,
  brandName,
  productName,
  shopLabel,
  usablePriceHistory,
} from '../lib/format';
import { departmentDisplayLabel } from '../lib/navLabels';
import { describeLoadError, type LoadError } from '../lib/loadError';
import { bestImage } from '../lib/images';
import { explainOffer, type OfferExplanation } from '../lib/offerExplanation';
import { excludedFromConfig, describeExclusions } from '../lib/excludedOffers';
import { categoryLabel } from './CatalogueCategoriesPage';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Skeleton } from '../components/ui/skeleton';
import { BarChart3, Bell, Check, ExternalLink, Heart, Info, Package, RefreshCw } from 'lucide-react';
import { storeName } from '../lib/storeIdentity';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useLocalComparison, useLocalFavorites } from '../hooks/useLocalStorage';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { SavingBadge } from '../components/common/SavingBadge';
import { StoreMark } from '../components/common/StoreMark';
import { MatchProvenance } from '../features/clusters/components/MatchProvenance';
import { SpreadEvidence } from '../features/clusters/components/SpreadEvidence';
import { ReportDialog } from '../features/clusters/components/ReportDialog';
import PriceAlertDialog from '../features/alerts/components/PriceAlertDialog';
import { AdSlot } from '../components/ads/AdSlot';

// The chart library is most of this page's JavaScript; load it after the
// prices are on screen (benchmark §2.11).
const PRPriceHistoryChart = lazy(() =>
  import('../features/product/components/PriceHistoryChart').then((m) => ({ default: m.PRPriceHistoryChart })),
);

type Config = ClusterDetail['configs'][number];

/** Electronics, where warranty and local-vs-imported units change the deal. */
const WARRANTY_CATEGORIES = new Set([
  'mobile-phones', 'laptops', 'tablets', 'tvs', 'monitors', 'digital-cameras', 'audio-systems', 'headphones', 'speakers', 'printers',
]);

/**
 * "Samsung Galaxy A17 prices in Kenya" (the search people type). No price in
 * the title: a search result or a shared link outlives the price it quoted
 * (design audit §21), and the page itself shows the dated figure.
 */
function productTitle(name: string): string {
  return `${name} prices in Kenya`;
}
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
    return 'We have no new-item prices listed. These are used or refurbished listings.';
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
  return config.facet_label ?? (config.storage_gb != null ? `${config.storage_gb} GB` : 'Version');
}

/**
 * The product page: the one page where a shopper has decided to buy.
 *
 * Layout per the design review §3.3. Left: name, variant selector, a one-line
 * summary, the price list sorted by price, history, and "About these
 * prices". Right (sticky on desktop): photo, lowest-price card with "Go to
 * shop" and "Save target price". On mobile a bottom bar carries the lowest
 * price once its card scrolls away.
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
  const [error, setError] = useState<LoadError | null>(null);
  const { addItem } = useRecentlyViewed();

  const load = useCallback(async () => {
    if (!clusterId) return;
    setLoading(true);
    setError(null);
    try {
      setCluster(await clustersApi.getDetail(clusterId));
      clustersApi.getManifest().then((m) => setCapturedAt(m.captured_at)).catch(() => {});
    } catch (err) {
      setError(describeLoadError(err, 'this product'));
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
    // A product the catalogue does not have is not a loading failure, and
    // "Try again" would be a false promise for it (scraping review §3).
    const notFound = error?.kind === 'not-found';
    return (
      <div className="page-container py-16 text-center">
        <Seo title={notFound ? 'Product not found' : 'Product'} noindex />
        <p className="text-sm text-muted-foreground mb-4">
          {notFound ? 'Product not found.' : error?.message ?? 'We couldn’t load this product. Try again.'}
        </p>
        {notFound ? (
          <Button asChild variant="outline">
            <Link to="/browse">Browse categories</Link>
          </Button>
        ) : (
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        )}
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
  const allOffers = useMemo(() => pricedOffers(cluster.best_by_store), [cluster.best_by_store]);
  const excluded = useMemo(
    () => (config ? excludedFromConfig(cluster, config) : null),
    [cluster, config],
  );
  const highest = offers.length > 1 ? offers[offers.length - 1] : null;
  // One percentage needs one version: with "All versions" selected the list
  // mixes configurations, and no single figure describes it (design audit §7).
  const saving = config
    ? offers.length > 1
      ? displaySaving(config.spread_pct, lowest?.[1].price)
      : null
    : configs.length > 1
      ? null
      : clusterSaving(cluster);
  const checked = checkedAgo(cluster.last_seen);
  // Decided now, not at capture: a July check is historical in October.
  const stale = isStale(cluster.last_seen);
  const history = useMemo(() => usablePriceHistory(cluster.price_history), [cluster.price_history]);
  // History is recorded for the product, not per variant or for used stock:
  // a 128GB price judged against 256GB history would mislead. Only products
  // with a single configuration get a verdict.
  const verdict = configs.length < 2 && !likelyUsed ? priceVerdict(cluster.price_history, lowest?.[1].price) : null;

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

  // What the saving compares, for the explainer beside the chip: the two
  // shop prices it is the difference between.
  const sb = cluster.spread_basis;
  const savingPair: SavingPair | null = !saving
    ? null
    : config && lowest && highest
      ? { low: [lowest[0], lowest[1].price as number], high: [highest[0], highest[1].price as number], basis: variantLabel(config) }
      : sb?.cheapest?.store && sb.dearest?.store && hasPrice(sb.cheapest.price) && hasPrice(sb.dearest.price)
        ? { low: [sb.cheapest.store, sb.cheapest.price], high: [sb.dearest.store, sb.dearest.price], basis: sb.facet_label ?? null }
        : null;

  const bestCard = (
    <BestPriceCard
      offer={lowest}
      offerCount={offers.length}
      likelyUsed={likelyUsed}
      stale={stale}
      saving={saving}
      savingPair={savingPair}
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
        // The same title and description as the prerendered page, whichever
        // version is selected, and no price that could go stale in a result.
        title={productTitle(name)}
        description={
          allOffers.length
            ? `View shop listings for ${name}. Compare available versions and prices from ${shopLabel(allOffers.length)}, then visit the shop you choose.`
            : `View shop listings for ${name} from Kenyan shops.`
        }
      />
      <div className="page-container py-6 lg:py-8">
        <ProductCrumbs cluster={cluster} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          {/* ── Left column ── */}
          <div className="min-w-0">
            {/* The breadcrumb names the category and brand; no eyebrow repeating them. */}
            <h1 className="page-title">{name}</h1>

            {configs.length > 1 && (
              <VersionChips
                labels={[...configs.map(variantLabel), 'All versions']}
                selected={selected === -1 ? configs.length : selected}
                onSelect={(i) => setSelected(i === configs.length ? -1 : i)}
              />
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
                  from {shopLabel(offers.length)}
                </>
              ) : (
                'No prices available for this product.'
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

            {verdict && (
              <p className="mt-1 text-sm text-foreground">
                {verdict}{' '}
                <a href="#price-history" className="text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
                  Price history
                </a>
              </p>
            )}

            {/* Mobile: photo and best price come before the list. */}
            <div className="mt-5 space-y-4 lg:hidden">
              <ProductPhoto image={image} compact />
              <div ref={mobileCardRef}>{bestCard}</div>
            </div>

            {(!cluster.comparison_grade || warningCopy(cluster.data_warning)) && (
              <div className="mt-6 space-y-2">
                {!cluster.comparison_grade && (
                  <Note>
                    These listings may differ in exact model or specification, so no price difference is
                    shown. Check the shop titles match before you buy.
                  </Note>
                )}
                {warningCopy(cluster.data_warning) && <Note>{warningCopy(cluster.data_warning)}</Note>}
              </div>
            )}

            {/* Section tabs (benchmark §2.6): jump links that stay under the
                header on long pages. Desktop only; phones have the bottom bar. */}
            <nav
              aria-label="On this page"
              className="sticky top-16 z-30 -mx-1 mt-8 hidden border-b border-border bg-background px-1 lg:block"
            >
              <ul className="flex gap-5 text-sm">
                {[
                  ['#prices', 'Prices'],
                  ...(history.length >= 2 ? [['#price-history', 'Price history']] : []),
                  ['#about-comparison', 'About these prices'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="-mb-px block border-b-2 border-transparent py-2.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* ── The price list ── */}
            <section aria-labelledby="prices" className="mt-8 scroll-mt-32">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="prices" className="section-title scroll-mt-32">
                  {likelyUsed
                    ? 'Used and refurbished prices'
                    : !config && configs.length > 1
                      ? 'Prices across versions'
                      : offers.length > 0
                        ? `Prices from ${shopLabel(offers.length)}`
                        : 'Prices'}
                </h2>
                {offers.length > 1 && <p className="microcopy-label">Lowest price first</p>}
              </div>

              {/* Sponsored shop: its own card ABOVE the list, never a row in it. */}
              <AdSlot placement="product-sponsored-shop" className="mb-3" />

              {offers.length > 0 ? (
                <ul aria-label={`${name} prices`} className="divide-y divide-border rounded-md border border-border list-none p-0">
                  {offers.map(([store, offer], idx) => (
                    <OfferRow
                      key={store}
                      store={store}
                      offer={offer}
                      product={name}
                      lowest={idx === 0 && offers.length > 1}
                      why={config ? explainOffer(offer, config, cluster, Date.now()) : []}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {config ? 'No price listed for this version.' : 'No prices available for this product.'}
                </p>
              )}
              {offers.length > 0 && (
                // One note under the list, not a checklist on every row. The
                // dataset carries no delivery data, so the honest statement
                // is that it is not shown, not that it is free.
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Delivery costs are not shown. Confirm the price, availability and delivery cost with
                  the shop before you buy.
                  {WARRANTY_CATEGORIES.has(cluster.category ?? '') &&
                    ' Check the exact specification, condition and warranty.'}{' '}
                  <a href="#about-comparison" className="text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
                    Report a problem
                  </a>
                </p>
              )}

              {config && excluded && excluded.total > 0 && (
                // Secondary: native <details> is collapsed by default and
                // operable from the keyboard (Tab to focus, Enter/Space to open).
                <details className="mt-3 rounded-md border border-border">
                  <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground">
                    {describeExclusions(excluded, config).heading}
                  </summary>
                  <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                    {describeExclusions(excluded, config).detail}. Only listings that match this version and can
                    be compared are in the list above.
                  </p>
                </details>
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

            {/* Real history only — never synthesised to fill the slot, and
                only where the cleaned series has two points to draw. */}
            {history.length >= 2 && cluster.price_history && (
              <section id="price-history" className="mt-10 scroll-mt-32">
                <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
                  <PRPriceHistoryChart title={name} priceHistory={cluster.price_history} />
                </Suspense>
              </section>
            )}

            {/* ── About these prices ── */}
            <section aria-labelledby="about-comparison" className="mt-10 scroll-mt-32 space-y-3">
              <h2 id="about-comparison" className="section-title scroll-mt-32">About these prices</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We group shop listings using product details. Check each listing’s specification and
                condition before buying.
                {cluster.last_seen && <> Prices checked {checkedDate(cluster.last_seen)}.</>}{' '}
                <Link to="/how-we-make-money" className="text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
                  How we make money
                </Link>
              </p>
              <SpreadEvidence cluster={cluster} />
              <MatchProvenance cluster={cluster} />
              <div className="-ml-3">
                <ReportDialog
                  cluster={cluster}
                  capturedAt={capturedAt}
                  stores={offers.map(([store]) => store)}
                  version={config ? variantLabel(config) : null}
                />
              </div>
            </section>
          </div>

          {/* ── Right column (desktop) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <ProductPhoto image={image} />
              {bestCard}
              {/* The 300×250 rail stays reserved in lib/ads.ts but is not
                  rendered here: with the sponsored-shop card above the list
                  it made two paid elements in one viewport (DESIGN_RULES.md
                  §5 rule 4; journey review). One paid position per product
                  page until that rule changes. */}
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
              <a href={lowest[1].url} target="_blank" rel="noopener noreferrer" aria-label={`Go to shop: ${storeName(lowest[0])}, opens in a new tab`}>
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

function ProductCrumbs({ cluster }: { cluster: ClusterDetail }) {
  const slug = cluster.category ?? '';
  const department = departmentForCategory(slug);
  const brand = cluster.brand?.trim().toLowerCase() ?? '';
  const items: Crumb[] = [];
  if (department) items.push({ label: departmentDisplayLabel(department), to: `/aisle/${department.id}` });
  if (slug) items.push({ label: categoryLabel(slug), to: `/browse/${slug}` });
  // The brand page (/browse/<category>/<brand>) renders any brand; link it
  // only when the value is safe as a URL segment.
  if (brand && /^[a-z0-9][a-z0-9-]*$/.test(brand)) {
    items.push({ label: brandName(brand), to: `/browse/${slug}/${brand}` });
  }
  return <Breadcrumbs items={items} />;
}

/**
 * The version selector as a real radio group: arrow keys move and select,
 * only the chosen chip is in the Tab order (design audit, A02). "All
 * versions" is the last option; it is not like-for-like and the list above
 * says so.
 */
function VersionChips({
  labels,
  selected,
  onSelect,
}: {
  labels: string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, delta: number) => {
    const next = (from + delta + labels.length) % labels.length;
    onSelect(next);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Choose version" className="mt-4 flex flex-wrap gap-2">
      {labels.map((label, i) => {
        const active = selected === i;
        return (
          <button
            key={label}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(i, 1); }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(i, -1); }
            }}
            className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors active:translate-y-px ${
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-muted-foreground'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function OfferRow({ store, offer, product, lowest, why }: { store: string; offer: ClusterStore; product: string; lowest: boolean; why: OfferExplanation[] }) {
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
        {/* The shop's own title, two lines: it is the evidence a shopper
            checks the match against, and one truncated line hid the part
            that differed (review §3). */}
        {offer.title && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{offer.title}</p>}
        {why.length > 0 && (
          <ul aria-label={`About the lower price at ${storeName(store)}`} className="mt-1 list-none space-y-0.5 p-0">
            {why.map((line) => (
              <li key={line.kind} className="text-xs text-muted-foreground">{line.text}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-4">
        <span className="price-num text-base font-bold text-foreground">{formatPrice(offer.price)}</span>
        <Button asChild size="sm" className="h-9 px-4 text-xs">
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Go to shop: ${storeName(store)}, ${product}, opens in a new tab`}
          >
            Go to shop
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </li>
  );
}

type SavingPair = { low: [string, number]; high: [string, number]; basis: string | null };

/**
 * The ⓘ beside the percentage chip (PriceSpy's pattern): says exactly which
 * two prices it compares, so "12% lower" is never a bare claim. A button, so
 * it works by keyboard and touch, not hover alone.
 */
function SavingExplainer({ pair }: { pair: SavingPair }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="What this percentage compares"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm">
        <p className="text-foreground">
          Compared with the highest matching price shown
          {pair.basis ? ` for ${pair.basis}` : ''}:
        </p>
        <dl className="mt-2 space-y-1">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{storeName(pair.low[0])}</dt>
            <dd className="price-num text-foreground">{formatPrice(pair.low[1])}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{storeName(pair.high[0])}</dt>
            <dd className="price-num text-foreground">{formatPrice(pair.high[1])}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function BestPriceCard({
  offer,
  offerCount,
  likelyUsed,
  stale,
  saving,
  savingPair,
  onAlert,
  comparing,
  onCompare,
  saved,
  onSave,
}: {
  offer: Offer | null;
  offerCount: number;
  likelyUsed: boolean;
  /** The last check is over STALE_AFTER_DAYS old: the price is a record, not a quote. */
  stale: boolean;
  saving: ReturnType<typeof displaySaving>;
  savingPair: SavingPair | null;
  onAlert: () => void;
  comparing: boolean;
  onCompare: () => void;
  saved: boolean;
  onSave: () => void;
}) {
  // The heading says what the number is. "Best" bundled price, quality and
  // service into one word the data cannot support (design audit §7).
  const heading = likelyUsed
    ? 'Lowest asking price (used)'
    : stale
      ? 'Last recorded price'
      : offerCount > 1
        ? 'Lowest listed price'
        : 'Listed price';
  return (
    <div className="rounded-md border border-border p-5">
      <p className="microcopy-label">{heading}</p>
      {offer ? (
        <>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="price-num text-3xl font-bold text-foreground">{formatPrice(offer[1].price)}</span>
            <SavingBadge saving={saving} />
            {savingPair && <SavingExplainer pair={savingPair} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            at {storeName(offer[0])}
            {stale && <> · may have changed since it was checked</>}
          </p>
          <Button asChild className="mt-4 h-11 w-full">
            <a
              href={offer[1].url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Go to shop: ${storeName(offer[0])}, opens in a new tab`}
            >
              Go to shop
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No prices available.</p>
      )}
      <Button variant="outline" className="mt-2 h-11 w-full" onClick={onAlert}>
        <Bell className="h-4 w-4" aria-hidden="true" />
        Save target price
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
          {comparing ? 'Added to compare' : 'Add to compare'}
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

/**
 * `compact` is the phone layout: a 160px strip instead of a 4:3 frame, so the
 * best price and the first rows of the price list land on the first screen
 * (benchmark §2.6) rather than one photo filling it.
 */
function ProductPhoto({ image, compact = false }: { image: string | null; compact?: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-md border border-border bg-photo p-3 ${
        compact ? 'h-40' : 'aspect-square'
      }`}
    >
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
