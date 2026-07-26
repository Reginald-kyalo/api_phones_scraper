import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { formatPrice, shopLabel } from '../lib/format';
import { clustersApi, type ClusterDetail, type ClusterSummary } from '../lib/api';
import type { DemoManifest } from '../lib/demoTypes';
import { ClusterCard, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
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

  return (
    <div className="bg-white">
      <HeroSection productCount={manifest?.total_clusters} variant="light" showcase={showcase} aside={aside} />
      <div className="mt-5">
        <CategoryStrip />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <Rail
          title="Biggest price gaps today"
          subtitle={
            manifest
              ? `${manifest.deals.count.toLocaleString()} products cost measurably less at one store than another`
              : 'The largest like-for-like savings across stores'
          }
          href="/deals"
          linkLabel="See all deals"
          products={deals.slice(0, 6)}
          reveal
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
