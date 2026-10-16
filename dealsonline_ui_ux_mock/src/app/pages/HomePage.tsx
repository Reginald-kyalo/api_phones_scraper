import { useEffect, useState } from 'react';
import { Seo } from '../components/common/Seo';
import { Link } from 'react-router';
import { clusterSaving, hasPrice } from '../lib/format';
import { clustersApi, type ClusterSummary } from '../lib/api';
import type { DemoManifest } from '../lib/demoTypes';
import { ClusterCard, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
import { categoryLabel } from './CatalogueCategoriesPage';
import { imageUsable } from '../lib/images';
import HeroSection from '../components/layout/HeroSection';
import CategoryStrip from '../components/layout/CategoryStrip';
import { AdSlot } from '../components/ads/AdSlot';
import { ArrowRight } from 'lucide-react';


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

function Rail({
  title,
  subtitle,
  href,
  linkLabel,
  products,
}: {
  title: string;
  subtitle?: string;
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
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
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


export default function HomePage() {
  // Every figure and every card on this page comes from the captured catalogue
  // in public/demo/ — there is no mock data left. Rails are the comparison-grade
  // categories, in real size order.
  const [manifest, setManifest] = useState<DemoManifest | null>(null);
  const [deals, setDeals] = useState<ClusterSummary[]>([]);
  const [rails, setRails] = useState<{ slug: string; rows: ClusterSummary[] }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, d] = await Promise.all([
          clustersApi.getManifest(),
          clustersApi.getDeals({ limit: 96 }),
        ]);
        if (cancelled) return;
        setManifest(m);
        setDeals(d.results);

        const featured = m.categories.filter((c) => c.comparison_grade).slice(0, 4);
        const pages = await Promise.all(
          featured.map((c) => clustersApi.getCategoryPage(c.slug, 24)),
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

  return (
    <div className="bg-background">
      <Seo description="Compare prices on phones, laptops, TVs, groceries and more across Kenyan shops. Every shop’s price, sorted by price." />
      <HeroSection
        productCount={manifest?.total_clusters}
        shopCount={manifest?.total_stores}
        dealCount={manifest?.deals.count}
      />
      <div className="mt-5">
        <CategoryStrip />
      </div>

      <div className="page-container py-8">
        <Rail
          title="Deals"
          subtitle="The same product, cheaper at one shop than another"
          href="/deals"
          linkLabel="All deals"
          products={showableDeals.slice(0, 6)}
        />

        {rails.map(({ slug, rows }, i) => (
          <div key={slug}>
            <Rail
              title={categoryLabel(slug)}
              href={`/browse/${slug}`}
              linkLabel={`All ${categoryCount(slug).toLocaleString('en-GB')}`}
              products={rows.filter(homepageWorthy).slice(0, 6)}
            />
            {/* One featured-shop band per homepage, after the second rail. */}
            {i === 1 && <AdSlot placement="home-featured-shop" className="mb-12" />}
          </div>
        ))}
      </div>
    </div>
  );
}
