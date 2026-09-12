import { Link } from 'react-router';
import { LayoutGrid } from 'lucide-react';
import { SPINE_DEPARTMENTS } from '../../data/spineDepartments';

/**
 * The homepage department strip — the same 19 canonical design departments the
 * production strip now reads from `/clusters/spine-departments`.
 *
 * ⛔ THIS DEMO DOES NOT HIT THE API. `SPINE_DEPARTMENTS` is the static copy of
 * that live list, counts measured 2026-09-12. Links go to `/aisle/:id`, never
 * to `/browse/:id`, because a spine department id is not a captured category
 * slug — the same separation production keeps with `aisleHref`.
 */
const TILE =
  'group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px] max-w-[128px]';
const BADGE =
  'w-12 h-12 rounded-xl ultra-border flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors';

export default function CategoryStrip() {
  return (
    <nav className="bg-white border-b border-border" aria-label="Departments">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide scroll-hint-x">
          {SPINE_DEPARTMENTS.map((department) => {
            const { Icon } = department;
            return (
              <Link
                key={department.id}
                to={`/aisle/${department.id}`}
                className={TILE}
                title={department.label}
              >
                <div className={BADGE}>
                  <Icon
                    className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xs font-medium truncate w-full text-center">
                  {department.label}
                </span>
              </Link>
            );
          })}

          <Link
            to="/browse"
            className="group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px] max-w-[104px]"
            title="All categories"
          >
            <div className="w-12 h-12 rounded-xl ultra-border border-dashed flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors">
              <LayoutGrid
                className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </div>
            <span className="text-xs font-medium truncate w-full text-center">All</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
