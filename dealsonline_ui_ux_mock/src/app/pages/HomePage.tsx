import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { clusterSaving, formatPrice, hasPrice, pricedShopCount, shopLabel } from '../lib/format';
import { clustersApi, type ClusterDetail, type ClusterSummary } from '../lib/api';
import type { DemoManifest } from '../lib/demoTypes';
import { ClusterCard, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { categoryLabel } from './CatalogueCategoriesPage';
import { imageUsable } from '../lib/images';
import HeroSection from '../components/layout/HeroSection';
import CategoryStrip from '../components/layout/CategoryStrip';
import HowItWorks from '../components/layout/HowItWorks';
import AlertsBanner from '../components/layout/AlertsBanner';
import { SavingBadge } from '../components/common/SavingBadge';
import { PriceOrDash } from '../components/common/PriceOrDash';
import { Button } from '../components/ui/button';
import { Package, ArrowRight, ListOrdered, Receipt, Tag } from 'lucide-react';


/**
 * Homepage cards must have a photo and, for deal rails, a saving we are
 * willing to show (DESIGN_RULES.md §5). A grey box or a "Save 97%" on a KES 5
 * packet is the first thing a shopper would see, so it never gets the slot.
 */
function homepageWorthy(cluster: ClusterSummary): boolean {
  return imageUsable(cluster.image) && hasPrice(cluster.best_price);
}

function diverseDeals(rows: ClusterSummary[]): ClusterSummary[] {
  const best = new Map<string, ClusterSummary>();
  for (const row of rows) {
    const key = row.category ?? 'other';
    const current = best.get(key);
    if (!current || (clusterSaving(row)?.kes ?? 0) > (clusterSaving(current)?.kes ?? 0)) best.set(key, row);
  }
  const firsts = [...best.values()].sort(
    (a, b) => (clusterSaving(b)?.kes ?? 0) - (clusterSaving(a)?.kes ?? 0),
  );
  const rest = rows.filter((row) => !firsts.includes(row));
  return [...firsts, ...rest];
}

/** The one large card on the page: a real cross-shop gap on a real product. */
function FeaturedDeal({ cluster }: { cluster: ClusterSummary }) {
  const name = cluster.display_name ?? cluster.title;
  const saving = clusterSaving(cluster);
  const stores = pricedShopCount(cluster);
  const href = `/prices/${encodeURIComponent(cluster.cluster_id)}`;
  const highest = saving && cluster.best_price != null ? cluster.best_price + saving.kes : null;

  return (
    <section className="mb-12 rounded-lg ultra-border overflow-hidden">
      <div className="grid md:grid-cols-2 items-stretch">
        <Link
          to={href}
          className="relative bg-surface-alt flex items-center justify-center p-8 md:p-10 min-h-[260px]"
        >
          <span className="microcopy-label absolute top-4 left-4">Deal of the day</span>
          {cluster.image ? (
            <ImageWithFallback
              src={cluster.image}
              alt=""
              loading="lazy"
              className="max-h-[240px] w-auto object-contain"
              fallback={<Package className="h-16 w-16 text-muted-foreground/40" aria-hidden="true" />}
            />
          ) : (
            <Package className="h-16 w-16 text-muted-foreground/40" aria-hidden="true" />
          )}
        </Link>

        <div className="p-6 md:p-10 flex flex-col justify-center">
          <p className="microcopy-label">{cluster.brand ?? categoryLabel(cluster.category ?? '')}</p>
          <h3 className="section-title mt-1 mb-3">{name}</h3>

          <div className="flex flex-wrap items-center gap-3 mb-1">
            <PriceOrDash value={cluster.best_price} className="text-2xl md:text-3xl font-bold text-foreground" />
            <SavingBadge saving={saving} />
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Lowest of {shopLabel(stores)}
            {highest != null && <> · dearest <span className="price-num">{formatPrice(highest)}</span></>}
          </p>

          <div>
            <Button asChild className="h-11 px-6">
              <Link to={href}>
                Compare {shopLabel(stores)} <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Rail({
  title,
  subtitle,
  href,
  linkLabel,
  products,
}: {
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
  products: ClusterSummary[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="mb-12">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Link
          to={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:text-link-hover hover:underline underline-offset-4 whitespace-nowrap"
        >
          {linkLabel} <ArrowRight aria-hidden="true" className="w-4 h-4" />
        </Link>
      </div>
      {/* Six cards fill one row at xl; at md (four columns) the last two hide
          rather than leave an orphan row. */}
      <div className={`${PRODUCT_GRID} md:[&>*:nth-child(n+5)]:hidden xl:[&>*:nth-child(n+5)]:flex`}>
        {products.map((product) => (
          <ClusterCard key={`${title}-${product.cluster_id}`} cluster={product} />
        ))}
      </div>
    </section>
  );
}

// The page closes on how we work, stated plainly — including how we make
// money (DESIGN_RULES.md §6). Never "no ads" or "no commission".
const TRUST_POINTS = [
  {
    icon: ListOrdered,
    title: 'Sorted by price',
    body: 'The price list is always ordered by price. Sponsored spots are labelled and sit outside it.',
  },
  {
    icon: Receipt,
    title: 'Open about money',
    body: 'Shops pay us a small fee when you click through. We never sell products ourselves.',
  },
  {
    icon: Tag,
    title: 'Free to use',
    body: 'Compare prices and set alerts without paying, or even an account.',
  },
];

export default function HomePage() {
  // Every figure and every card on this page comes from the captured catalogue
  // in public/demo/ — there is no mock data left. Rails are the comparison-grade
  // categories, in real size order.
  const [manifest, setManifest] = useState<DemoManifest | null>(null);
  const [deals, setDeals] = useState<ClusterSummary[]>([]);
  const [rails, setRails] = useState<{ slug: string; rows: ClusterSummary[] }[]>([]);
  const [showcase, setShowcase] = useState<ClusterDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, d] = await Promise.all([
          clustersApi.getManifest(),
          clustersApi.getDeals(),
        ]);
        if (cancelled) return;
        setManifest(m);
        setDeals(d.results);

        // Hero showcase: a recognisable device carried by several stores with a
        // real photo. Deals are spread-ranked, so the head of the list is
        // dominated by high-spread grocery items — good data, but a spaghetti
        // packet does not read as "know the real price" in a phone mockup.
        // >=6 stores fills the phone's offer list, so the clipped last row reads
        // as "more below" rather than as a rendering fault. Relaxed in steps
        // rather than fixed, so a thin capture still yields a hero.
        // The hero needs per-store prices, which only the detail view carries —
        // a listing row would leave the offer list empty.
        const pricedOffers = (c: ClusterSummary) => c.n_stores_priced ?? c.n_stores ?? 0;
        const showcaseworthy = (c: ClusterSummary) =>
          Boolean(c.image) &&
          (c.n_stores ?? 0) >= 6 &&
          pricedOffers(c) >= 3 &&
          !c.data_warning;
        const acceptable = (c: ClusterSummary) =>
          Boolean(c.image) &&
          pricedOffers(c) >= 2 &&
          (c.n_stores ?? 0) >= 3 &&
          !c.data_warning;
        const device = (c: ClusterSummary) =>
          ['mobile-phones', 'laptops', 'tablets'].includes(c.category ?? '');
        const hero =
          d.results.find((c) => showcaseworthy(c) && device(c)) ??
          d.results.find(showcaseworthy) ??
          d.results.find((c) => acceptable(c) && device(c)) ??
          d.results.find(acceptable) ??
          d.results.find((c) => imageUsable(c.image)) ??
          d.results[0] ??
          null;
        if (hero) {
          clustersApi
            .getDetail(hero.cluster_id)
            .then((full) => {
              if (cancelled) return;
              const usableImage =
                full.image_candidates?.find((image) => imageUsable(image)) ??
                (imageUsable(full.image) ? full.image : null);
              setShowcase(usableImage ? { ...full, image: usableImage } : full);
            })
            .catch(() => {});
        }

        const featured = m.categories.filter((c) => c.comparison_grade).slice(0, 4);
        const pages = await Promise.all(
          featured.map((c) => clustersApi.getCategoryPage(c.slug, 0)),
        );
        if (cancelled) return;
        setRails(featured.map((c, i) => ({ slug: c.slug, rows: pages[i].results.slice(0, 24) })));
      } catch {
        // Static build: a missing fixture leaves the rails empty rather than
        // breaking the page. Rail already returns null for an empty list.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const categoryCount = (slug: string) =>
    manifest?.categories.find((c) => c.slug === slug)?.count ?? 0;
  // Deal rails: photo, a real price and a saving we are willing to show. The
  // feed is ranked by percentage, so its head is a run of near-identical
  // "Save 44%" grocery rows; the homepage instead shows one deal per category,
  // biggest cash saving first, so the rail reads as a cross-section.
  const showableDeals = diverseDeals(deals.filter((c) => homepageWorthy(c) && clusterSaving(c) != null));
  const featuredDeal = showableDeals[0] ?? null;

  return (
    <div className="bg-white">
      <HeroSection productCount={manifest?.total_clusters} showcase={showcase} />
      <div className="mt-5">
        <CategoryStrip />
      </div>

      <div className="page-container py-8">
        {featuredDeal && <FeaturedDeal cluster={featuredDeal} />}

        <Rail
          title="Deals"
          subtitle="The same product, cheaper at one shop than another"
          href="/deals"
          linkLabel="All deals"
          products={showableDeals.slice(1, 7)}
        />

        <HowItWorks />

        {rails.map(({ slug, rows }, i) => (
          <div key={slug}>
            <Rail
              title={categoryLabel(slug)}
              subtitle={`${categoryCount(slug).toLocaleString()} products tracked across Kenyan stores`}
              href={`/browse/${slug}`}
              linkLabel={`All ${categoryLabel(slug).toLowerCase()}`}
              products={rows.filter(homepageWorthy).slice(0, 6)}
            />
            {i === 1 && <AlertsBanner example={showcase} />}
          </div>
        ))}

        {/* Trust close: how we work, including how we make money. The one
            deliberate dark "brand" moment on the page. */}
        <section className="bg-hero-gradient text-white rounded-lg px-6 py-12 md:px-12 md:py-14">
          <div className="max-w-2xl mx-auto text-center">
            <p className="microcopy-label !text-teal-bright mb-4">How SokoPulse works</p>
            <h2 className="section-title !text-white md:text-2xl mb-3">
              Every shop’s price, sorted by price.
            </h2>
            <p className="text-sm md:text-base text-white/65 max-w-xl mx-auto leading-relaxed">
              Shops pay us a small fee when you click through to them, and some pay for clearly
              labelled sponsored spots. Neither affects the order of the price list, which is always
              sorted by price. We never sell products ourselves.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto mt-12">
            {TRUST_POINTS.map((point) => (
              <div key={point.title} className="flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <point.icon aria-hidden="true" className="w-5 h-5 text-teal-bright" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{point.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed max-w-[15rem]">{point.body}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/how-we-make-money"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline underline-offset-4"
            >
              How we make money <ArrowRight aria-hidden="true" className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
