import { useCallback, useEffect, useState } from 'react';
import { Seo } from '../components/common/Seo';
import { Link } from 'react-router';
import { clustersApi, type ClusterSummary } from '../lib/api';
import type { PublicManifest } from '../lib/cataloguePublic';
import { homepageDeals, homepageRail, RAIL_SIZE } from '../lib/homepage';
import { describeLoadError } from '../lib/loadError';
import { ClusterCard, PRODUCT_GRID } from '../features/clusters/components/ClusterCard';
import { categoryLabel } from './CatalogueCategoriesPage';
import HeroSection from '../components/layout/HeroSection';
import CategoryStrip from '../components/layout/CategoryStrip';
import { AdSlot } from '../components/ads/AdSlot';
import { Button } from '../components/ui/button';
import { ArrowRight, RefreshCw } from 'lucide-react';

function Rail({
  title,
  subtitle,
  href,
  linkLabel,
  products,
  showSaving = false,
}: {
  title: string;
  subtitle?: string;
  href: string;
  linkLabel: string;
  products: ClusterSummary[];
  /** Deals only: the one rail where the difference between shops is the point. */
  showSaving?: boolean;
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
          <ClusterCard key={`${title}-${product.cluster_id}`} cluster={product} showSaving={showSaving} />
        ))}
      </div>
    </section>
  );
}


export default function HomePage() {
  // Every figure and every card on this page comes from the captured catalogue
  // in public/demo/ — there is no mock data left. Rails are the comparison-grade
  // categories, in real size order.
  const [manifest, setManifest] = useState<PublicManifest | null>(null);
  const [deals, setDeals] = useState<ClusterSummary[]>([]);
  const [rails, setRails] = useState<{ slug: string; rows: ClusterSummary[] }[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setFailed(null);
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
      } catch (err) {
        // A failed load used to leave an empty page with no explanation
        // (design audit, R01). Search and the category strip still work; the
        // rails say what happened and offer a retry.
        if (!cancelled) setFailed(describeLoadError(err, 'products').message);
      }
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  // Selection rules live in lib/homepage.ts, shared with the prerender.
  const showableDeals = homepageDeals(deals);

  return (
    <div className="bg-background">
      <Seo description="Compare listed prices for phones, laptops, groceries and more from Kenyan shops. Review your options before visiting a shop." />
      <HeroSection
        productCount={manifest?.total_clusters}
        shopCount={manifest?.total_stores}
      />
      <div className="mt-5">
        <CategoryStrip />
      </div>

      <div className="page-container py-8">
        {failed && !manifest ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-sm text-muted-foreground">{failed}</p>
            <Button variant="outline" onClick={retry} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            <Rail
              title="Deals"
              subtitle="Lower prices across shops"
              href="/deals"
              linkLabel="View all deals"
              products={showableDeals}
              showSaving
            />

            {rails.map(({ slug, rows }, i) => (
              <div key={slug}>
                <Rail
                  title={categoryLabel(slug)}
                  href={`/browse/${slug}`}
                  linkLabel={`View all ${categoryLabel(slug).toLowerCase()}`}
                  products={homepageRail(rows, RAIL_SIZE)}
                />
                {/* One featured-shop band per homepage, after the second rail. */}
                {i === 1 && <AdSlot placement="home-featured-shop" className="mb-12" />}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
