import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Seo } from '../components/common/Seo';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { departmentDisplayLabel, familyDisplayLabel } from '../lib/navLabels';
import { categoryLabel } from '../lib/categories';
import { clustersApi } from '../lib/api';
import type { PublicManifest } from '../lib/cataloguePublic';
import { orderedFamilies, spineShelfDisplay, taxonomyDepartmentById } from '../data/taxonomyTree';

/**
 * A department (/aisle/:id): the way from the homepage strip and the
 * Categories menu to a page with products on it.
 *
 * Two kinds of link, both plain text (no boxes: a box per name was most of
 * the page and said nothing):
 *
 * 1. "Compare prices": the captured comparison categories in this department
 *    (/browse/:slug), the pages with brand pages, filters and price ranges.
 *    First, because they are where the comparisons are.
 * 2. The shelves, grouped by family, each a page of products (/shelf/:slug).
 *    "Other" comes last.
 *
 * The approved phone product-type tree is not shown: its pages carried no
 * products, so a shopper who followed it found nothing to compare.
 */
export default function DemoAislePage() {
  const { id } = useParams<{ id: string }>();
  const { hash } = useLocation();
  const department = taxonomyDepartmentById(id);
  const [manifest, setManifest] = useState<PublicManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    clustersApi.getManifest().then((m) => { if (!cancelled) setManifest(m); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Family links from the directory and the menus land on their section
  // (/aisle/x#family). Root scrolls to the top on every path change and the
  // router does nothing with the hash, so this page brings the heading into
  // view itself once it has rendered (design audit, D09).
  useEffect(() => {
    if (!hash || !department) return;
    const target = decodeURIComponent(hash.slice(1));
    const frame = requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [hash, department]);

  if (!department) {
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

  const label = departmentDisplayLabel(department);
  const compare = (manifest?.categories ?? []).filter((c) => department.capturedSlugs.includes(c.slug));
  const families = orderedFamilies(department);

  return (
    <div className="bg-background min-h-screen">
      <Seo title={`${label} prices in Kenya`} description={`Compare ${label.toLowerCase()} listings from Kenyan shops. Check product versions, shop prices and available details before buying.`} />
      <div className="page-container py-8">
        <Breadcrumbs items={[{ label }]} />

        <h1 className="page-title">{label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {department.n_shelves.toLocaleString('en-GB')} categories
          {department.n_clusters > 0 && ` · ${department.n_clusters.toLocaleString('en-GB')} products`}
        </p>

        {compare.length > 0 && (
          <section aria-labelledby="compare-heading" className="mt-8">
            <h2 id="compare-heading" className="section-title">Compare prices</h2>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {compare.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/browse/${c.slug}`}
                    className="text-sm font-medium text-link underline underline-offset-4 decoration-link/40 hover:decoration-link"
                  >
                    {categoryLabel(c.slug)}
                  </Link>
                  <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{c.count.toLocaleString('en-GB')}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {families.map((family) => (
          <section
            key={family.id}
            id={family.id}
            aria-labelledby={`${department.id}-${family.id}`}
            className="mt-8 scroll-mt-24 border-t border-border pt-6"
          >
            <h2 id={`${department.id}-${family.id}`} className="section-title">{familyDisplayLabel(family)}</h2>
            <ul className="mt-2 columns-2 gap-x-8 sm:columns-3 lg:columns-4">
              {family.shelves.map((shelf) => (
                <li key={shelf.slug} className="break-inside-avoid py-1">
                  <Link
                    to={`/shelf/${shelf.slug}`}
                    className="text-sm text-foreground hover:text-link hover:underline underline-offset-4"
                  >
                    {spineShelfDisplay(shelf)}
                  </Link>
                  <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                    {shelf.count.toLocaleString('en-GB')}
                    <span className="sr-only"> products</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
