/**
 * The homepage department strip — the 19 redesign spine departments.
 *
 * ⛔ NOT `pricerunnerApi`, and no longer the raw tree either. It used to show the first 12 of
 * ~529 browsable roots, which are shop vocabulary: `Laptops` resolves in three places, 75% of
 * those roots are served by ONE shop, and four of the twelve were only there because they had
 * been ordered by the wrong number.
 *
 * ⭐⭐ REDESIGN SPINE, NOT CURATED DEPARTMENTS. These 19 departments are stamped directly on
 * `browse_nodes.spine_department`, the DESIGNED taxonomy layer measured 2026-09-05. They reach
 * 79.9% of placed clusters (81,525 of 102,038) vs. 46.0% from the old 21 curated departments.
 * Every department is an independent top-level node with no `parent` grouping field — each
 * renders as a plain link, and every tile is the only click-in for that slice of the catalogue.
 *
 * ⭐⭐ IT STILL SCROLLS AT EVERY WIDTH. The old strip cut to 12 and then switched to
 * `lg:justify-between` with `lg:overflow-visible` — a single non-scrolling row — so anything past
 * the cut was unreachable on a wide screen while the narrow one could still scroll to it. Fewer
 * tiles does NOT make that layout safe, so the scrolling row stays.
 *
 * ⛔ THE STRIP IS NOT THE CATALOGUE. 79.9% of placed clusters are browsable through these 19
 * departments; the remaining ~20% live in nodes not yet stamped to any spine department and are
 * reachable ONLY through /shelf, which is why the last tile is a door to it.
 */
import { Link } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import { spineApi, type SpineDepartmentView } from '../../lib/api';
import { aisleHref, departmentIcon } from '../../lib/categories';

/** Survives unmount/remount within a session; the server caches the spine for 300s regardless. */
let _cache: SpineDepartmentView[] | null = null;

type Tile = { key: string; label: string; total: number; dept: SpineDepartmentView };

/**
 * Build tiles from the 19 redesign spine departments. Every department is a top-level node with
 * no `parent` field, so every tile is a plain link — no popovers needed.
 */
function buildTiles(departments: SpineDepartmentView[]): Tile[] {
  return departments.map((d) => ({
    key: d.id,
    label: d.label,
    total: d.n_clusters,
    dept: d,
  }));
}

const TILE =
  'group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px] max-w-[104px]';
const BADGE =
  'w-12 h-12 rounded-xl ultra-border flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors';

export default function CategoryStrip() {
  const [departments, setDepartments] = useState<SpineDepartmentView[]>(_cache ?? []);

  useEffect(() => {
    if (_cache) return;
    let cancelled = false;
    spineApi.list().then((res) => {
      if (cancelled) return;
      _cache = res.results;
      setDepartments(_cache);
    }).catch(() => {
      // ⛔ Degrade to nothing, never to a broken row: the homepage below this still works.
    });
    return () => { cancelled = true; };
  }, []);

  const tiles = useMemo(() => buildTiles(departments), [departments]);

  if (departments.length === 0) return null;

  return (
    <nav aria-label="Departments" className="bg-white border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide scroll-hint-x">
          {tiles.map((tile) => {
            const Icon = departmentIcon(tile.dept);
            return (
              <Link key={tile.key} to={aisleHref(tile.dept.id)} className={TILE}
                    title={tile.label}>
                <div className={BADGE}>
                  <Icon className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors"
                        strokeWidth={1.75} />
                </div>
                {/* ⭐ A department name is OURS and already clean — it never goes through
                    `categoryLabel`, which exists to repair SHOUTING shop copy. */}
                <span className="text-xs font-medium truncate w-full text-center">
                  {tile.label}
                </span>
              </Link>
            );
          })}

          {/* ⛔⛔ LOAD-BEARING, NOT A FLOURISH. The spine reaches ~79.9% of placed clusters; the
              remaining ~20% — nodes not yet stamped to a spine department — are reachable
              ONLY through /shelf. Removing this makes half the catalogue unbrowsable. */}
          <Link
            to="/shelf"
            className="group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px] max-w-[104px]"
            title="All categories"
          >
            <div className="w-12 h-12 rounded-xl ultra-border border-dashed flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors">
              <LayoutGrid className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors" strokeWidth={1.75} />
            </div>
            <span className="text-xs font-medium truncate w-full text-center">All</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
