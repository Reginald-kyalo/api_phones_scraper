import { Link } from 'react-router';
import { LayoutGrid } from 'lucide-react';
import { TAXONOMY_DEPARTMENTS } from '../../data/taxonomyTree';
import { departmentDisplayLabel } from '../../lib/navLabels';

/**
 * The homepage department strip — the same 19 canonical design departments the
 * production strip now reads from `/clusters/spine-departments`.
 *
 * ⛔ THIS DEMO DOES NOT HIT THE API. `SPINE_DEPARTMENTS` is the static copy of
 * that live list, counts measured 2026-09-12. Links go to `/aisle/:id`, never
 * to `/browse/:id`, because a spine department id is not a captured category
 * slug — the same separation production keeps with `aisleHref`.
 *
 * Names come from departmentDisplayLabel, the same names the menus, the
 * department page and the breadcrumbs use, so a tile never says "Computing"
 * for a page headed "Computers & networking".
 */

// Labels wrap to two lines instead of truncating: "Phones & Wearables" cut to
// "Phones…" at every width told the shopper nothing.
const TILE =
  'group flex flex-col items-center gap-2 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors w-[92px] flex-shrink-0';
// The badge border stays put: the icon's own scene (icon-motion.css) is the hover.
const BADGE =
  'w-12 h-12 rounded-md ultra-border flex items-center justify-center';

export default function CategoryStrip() {
  return (
    <nav className="bg-background border-b border-border" aria-label="Browse categories">
      <div className="page-container">
        <div className="flex items-start gap-1 overflow-x-auto py-3 scrollbar-hide scroll-hint-x">
          {TAXONOMY_DEPARTMENTS.map((department) => {
            const { Icon } = department;
            const label = departmentDisplayLabel(department);
            return (
              <Link
                key={department.id}
                to={`/aisle/${department.id}`}
                className={TILE}
              >
                <div className={BADGE}>
                  <Icon
                    data-anim={department.id}
                    className="tile-icon w-5 h-5 flex-shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xs font-medium leading-tight line-clamp-2 w-full text-center">
                  {label}
                </span>
              </Link>
            );
          })}

          <Link to="/browse" className={TILE}>
            <div className={BADGE}>
              <LayoutGrid
                data-anim="all"
                className="tile-icon w-5 h-5 flex-shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </div>
            <span className="text-xs font-medium leading-tight w-full text-center">All categories</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
