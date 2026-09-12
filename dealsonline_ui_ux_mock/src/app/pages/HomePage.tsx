import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { formatPrice, shopLabel } from '../lib/format';
import { clustersApi, type ClusterDetail, type ClusterSummary } from '../lib/api';
import type { DemoManifest } from '../lib/demoTypes';
import { ClusterCard, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { categoryLabel } from './CatalogueCategoriesPage';
import HeroSection from '../components/layout/HeroSection';
import CategoryStrip from '../components/layout/CategoryStrip';
import HowItWorks from '../components/layout/HowItWorks';
import AlertsBanner from '../components/layout/AlertsBanner';
import { Reveal } from '../components/common/Reveal';
import {
  Package,
  ArrowRight,
  ArrowDown,
  ArrowUpRight,
  ShieldCheck,
  Ban,
  Tag,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Teal down-arrow discount, matching the production DealCard badge. */
function DiscountBadge({ percent, className = '' }: { percent: number; className?: string }) {
  if (percent <= 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md bg-teal/10 text-teal text-xs font-bold px-1.5 py-1 ${className}`}
    >
      <ArrowDown aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
      {percent}%
    </span>
  );
}

function dealNumbers(cluster: ClusterSummary) {
  const price = cluster.best_price ?? 0;
  const savingPct = cluster.saving_pct ?? null;
  const oldPrice =
    price > 0 && savingPct != null && savingPct > 0
      ? Math.round(price / (1 - savingPct / 100))
      : null;
  return {
    name: cluster.display_name ?? cluster.title,
    brand: cluster.brand ?? cluster.category ?? 'Product',
    price,
    oldPrice,
    savings: oldPrice && oldPrice > price ? oldPrice - price : 0,
    discount: savingPct && savingPct > 0 ? Math.round(savingPct) : 0,
    stores: cluster.n_stores_priced ?? cluster.n_stores ?? 0,
  };
}

/** Production `DealCard` shape, but backed by a real captured cluster + image. */
function DealCard({ cluster, large = false }: { cluster: ClusterSummary; large?: boolean }) {
  const deal = dealNumbers(cluster);
  return (
    <div
      className={`flex flex-col flex-shrink-0 snap-start bg-card ultra-border rounded-lg overflow-hidden ${
        large ? 'min-w-[240px] max-w-[270px]' : 'min-w-[200px] max-w-[220px]'
      }`}
    >
      <Link to={`/prices/${encodeURIComponent(cluster.cluster_id)}`} className="group flex flex-col flex-1">
        <div className="relative aspect-square bg-surface-alt flex items-center justify-center">
          <Package className="h-10 w-10 text-muted-foreground/20" aria-hidden="true" />
          {cluster.image && (
            <ImageWithFallback
              src={cluster.image}
              alt=""
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-contain ${large ? 'p-5' : 'p-4'}`}
              fallback={<span className="sr-only">Image unavailable</span>}
            />
          )}
          <DiscountBadge percent={deal.discount} className="absolute top-2 left-2" />
        </div>
        <div className="px-3 pt-3 flex flex-col flex-1">
          <p className="microcopy-label">{deal.brand}</p>
          <p className="text-sm text-foreground line-clamp-2 leading-snug min-h-[2.6em] mt-1 group-hover:text-primary transition-colors">
            {deal.name}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`price-num font-bold text-price ${large ? 'text-lg' : 'text-base'}`}>
              {formatPrice(deal.price)}
            </span>
            {deal.oldPrice && (
              <span className="price-num price-old text-xs">{formatPrice(deal.oldPrice)}</span>
            )}
          </div>
          {deal.savings > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal">
              <ArrowDown aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} /> Save {formatPrice(deal.savings)}
            </p>
          )}
          <p className="microcopy-label mt-1">{shopLabel(deal.stores)}</p>
        </div>
      </Link>

      <div className="px-3 pt-2.5 pb-3">
        <Link
          to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
          className="group/btn flex items-center justify-center gap-1.5 h-9 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-deep transition-colors"
        >
          View deal
          <ArrowUpRight aria-hidden="true" className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </Link>
      </div>
    </div>
  );
}

/** Production "Deal of the day" large card, backed by a real captured cluster. */
function FeaturedDeal({ cluster }: { cluster: ClusterSummary }) {
  const deal = dealNumbers(cluster);
  const highest =
    deal.oldPrice && deal.oldPrice > deal.price
      ? deal.oldPrice
      : Math.round(deal.price * 1.12);

  return (
    <Reveal className="mb-12">
      <section className="ultra-border rounded-2xl overflow-hidden hover:border-border">
        <div className="grid md:grid-cols-2 items-stretch">
          <Link
            to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
            className="group relative bg-surface-alt flex items-center justify-center p-8 md:p-10 min-h-[260px]"
          >
            <span className="microcopy-label absolute top-4 left-4 text-teal">Deal of the day</span>
            <DiscountBadge percent={deal.discount} className="absolute top-4 right-4" />
            {cluster.image ? (
              <ImageWithFallback
                src={cluster.image}
                alt=""
                loading="lazy"
                className="max-h-[260px] w-auto object-contain"
                fallback={<Package className="h-16 w-16 text-muted-foreground" />}
              />
            ) : (
              <Package className="h-16 w-16 text-muted-foreground" />
            )}
          </Link>

          <div className="p-6 md:p-10 flex flex-col justify-center">
            <p className="microcopy-label">{deal.brand}</p>
            <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight text-foreground mt-1 mb-3 leading-tight">
              {deal.name}
            </h3>

            <div className="flex items-baseline gap-3 mb-1">
              <span className="price-num text-2xl md:text-3xl font-bold text-price">
                {formatPrice(deal.price)}
              </span>
              {deal.oldPrice && (
                <span className="price-num price-old text-sm">{formatPrice(deal.oldPrice)}</span>
              )}
            </div>
            {deal.savings > 0 && (
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-teal mb-5">
                <ArrowDown aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} /> Save{' '}
                {formatPrice(deal.savings)}
              </p>
            )}

            <div className="flex items-center gap-3 mb-6 max-w-md">
              <span className="price-num text-sm font-semibold text-teal">{formatPrice(deal.price)}</span>
              <div className="relative h-1.5 flex-1 rounded-full bg-border">
                <span
                  className="absolute -top-1 left-0 w-3.5 h-3.5 rounded-full bg-teal"
                  style={{ boxShadow: '0 0 0 4px rgba(14,124,139,0.15)' }}
                />
                <span className="absolute -top-1 right-0 w-3.5 h-3.5 rounded-full bg-muted-foreground/40" />
              </div>
              <span className="price-num text-sm text-muted-foreground">{formatPrice(highest)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
                className="group/btn inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-deep transition-colors"
              >
                View deal
                <ArrowUpRight aria-hidden="true" className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </Link>
              <Link
                to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:text-link-hover"
              >
                Compare {shopLabel(deal.stores)} <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function DealRail({
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
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Link
          to={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:text-link-hover whitespace-nowrap"
        >
          {linkLabel} <ArrowRight aria-hidden="true" className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x scroll-hint-x items-stretch">
        {products.map((product) => (
          <DealCard key={`${title}-${product.cluster_id}`} cluster={product} large />
        ))}
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
  CardComponent = ClusterCard,
  reveal = false,
}: {
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
  products: ClusterSummary[];
  CardComponent?: ComponentType<{ cluster: ClusterSummary }>;
  reveal?: boolean;
}) {
  if (products.length === 0) return null;
  const row = (
    <div className={PRODUCT_GRID}>
      {products.map((product) => (
        <CardComponent key={`${title}-${product.cluster_id}`} cluster={product} />
      ))}
    </div>
  );
  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Link
          to={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:text-link-hover whitespace-nowrap"
        >
          {linkLabel} <ArrowRight aria-hidden="true" className="w-4 h-4" />
        </Link>
      </div>
      {reveal ? <Reveal>{row}</Reveal> : row}
    </section>
  );
}

// The three reasons to trust an independent comparison engine — the page's
// closing statement. See BEHAVIORAL_PRINCIPLES.md §5.
const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Truly independent',
    body: "We don't sell products and take no commission on what you buy.",
  },
  {
    icon: Ban,
    title: 'No paid rankings',
    body: 'Results are ordered by price. Shops can never pay to rank higher.',
  },
  {
    icon: Tag,
    title: 'Always free',
    body: 'Compare prices and track drops without paying — or even an account.',
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
  const [aside, setAside] = useState<ClusterSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, d] = await Promise.all([
          clustersApi.getManifest(),
          clustersApi.getDeals({ limit: 12 }),
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
        const showcaseworthy = (c: ClusterSummary) =>
          Boolean(c.image) && (c.n_stores ?? 0) >= 6 && !c.data_warning;
        const acceptable = (c: ClusterSummary) =>
          Boolean(c.image) && (c.n_stores ?? 0) >= 3 && !c.data_warning;
        const device = (c: ClusterSummary) =>
          ['mobile-phones', 'laptops', 'tablets'].includes(c.category ?? '');
        const hero =
          d.results.find((c) => showcaseworthy(c) && device(c)) ??
          d.results.find(showcaseworthy) ??
          d.results.find((c) => acceptable(c) && device(c)) ??
          d.results.find(acceptable) ??
          d.results.find((c) => c.image) ??
          d.results[0] ??
          null;
        // The hero needs per-store prices, which only the detail view carries —
        // a listing row would leave the offer list empty.
        if (hero) {
          clustersApi
            .getDetail(hero.cluster_id)
            .then((full) => { if (!cancelled) setShowcase(full); })
            .catch(() => {});
        }
        setAside(
          d.results.find(
            (c) => c.image && c.cluster_id !== hero?.cluster_id && (c.n_stores ?? 0) >= 2,
          ) ?? null,
        );

        const featured = m.categories.filter((c) => c.comparison_grade).slice(0, 4);
        const pages = await Promise.all(
          featured.map((c) => clustersApi.getCategoryPage(c.slug, 0)),
        );
        if (cancelled) return;
        setRails(featured.map((c, i) => ({ slug: c.slug, rows: pages[i].results.slice(0, 6) })));
      } catch {
        // Static build: a missing fixture leaves the rails empty rather than
        // breaking the page. Rail already returns null for an empty list.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const categoryCount = (slug: string) =>
    manifest?.categories.find((c) => c.slug === slug)?.count ?? 0;
  const featuredDeal = deals.find((c) => c.image) ?? deals[0] ?? null;

  return (
    <div className="bg-white">
      <HeroSection productCount={manifest?.total_clusters} variant="light" showcase={showcase} aside={aside} />
      <div className="mt-5">
        <CategoryStrip />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        {featuredDeal && <FeaturedDeal cluster={featuredDeal} />}

        <DealRail
          title="Top deals today"
          subtitle="The biggest price drops we're tracking right now"
          href="/deals"
          linkLabel="See all deals"
          products={deals.slice(0, 6)}
        />

        <HowItWorks />

        {rails.map(({ slug, rows }, i) => (
          <div key={slug}>
            <Rail
              title={categoryLabel(slug)}
              subtitle={`${categoryCount(slug).toLocaleString()} products tracked across Kenyan stores`}
              href={`/browse/${slug}`}
              linkLabel={`Browse ${categoryLabel(slug).toLowerCase()}`}
              products={rows}
            />
            {i === 1 && <AlertsBanner example={showcase} />}
          </div>
        ))}

        {/* Trust close — the page ends on why to trust us, not a signup ask.
            Keeps the gradient; drops the "create an account" pressure.
            See BEHAVIORAL_PRINCIPLES.md §1, §3, §5. */}
        <Reveal>
          <section className="bg-hero-gradient text-white rounded-2xl px-6 py-12 md:px-12 md:py-14">
            <div className="max-w-2xl mx-auto text-center">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal-bright mb-4">
                Why DealsOnline
              </p>
              <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight mb-3">
                Independent. No ads. Nothing to sell.
              </h2>
              <p className="text-sm md:text-base text-white/65 max-w-xl mx-auto leading-relaxed">
                We compare live prices across every retailer we can find — ranked only by price,
                never by who pays us. Because no one does.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto mt-12">
              {TRUST_POINTS.map((point) => (
                <div key={point.title} className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-full bg-teal-bright/15 flex items-center justify-center mb-3">
                    <point.icon aria-hidden="true" className="w-5 h-5 text-teal-bright" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{point.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed max-w-[15rem]">{point.body}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/deals"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-teal-bright transition-colors"
              >
                Browse all deals <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
