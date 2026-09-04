/**
 * The homepage department strip — the storefront's 21 RULED departments.
 *
 * ⛔ NOT `pricerunnerApi`, and no longer the raw tree either. It used to show the first 12 of
 * ~529 browsable roots, which are shop vocabulary: `Laptops` resolves in three places, 75% of
 * those roots are served by ONE shop, and four of the twelve were only there because they had
 * been ordered by the wrong number. These 21 are a human ruling served from API config.
 *
 * ⭐⭐ IT SHOWS ALL 21 AND SCROLLS AT EVERY WIDTH. The old strip cut to 12 and then switched to
 * `lg:justify-between` with `lg:overflow-visible` — a single non-scrolling row — so anything
 * past the cut was unreachable on a wide screen while the narrow one could still scroll to it.
 * A cut plus a wider layout is how a surface silently loses rows.
 *
 * ⛔ THE STRIP IS NOT THE CATALOGUE. 21 departments reach ~45% of placed clusters; `/shelf` owns
 * the rest, which is why the last tile is a door to it rather than another department.
 */
import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';
import { departmentApi, type Department } from '../../lib/api';
import { departmentHref, departmentIcon } from '../../lib/categories';

/** Survives unmount/remount within a session; the server caches the spine for 300s regardless. */
let _cache: Department[] | null = null;

export default function CategoryStrip() {
  const [departments, setDepartments] = useState<Department[]>(_cache ?? []);

  useEffect(() => {
    if (_cache) return;
    let cancelled = false;
    departmentApi.list().then((res) => {
      if (cancelled) return;
      // ⛔ NO `.slice()`. 21 is a ruling; a client-side cut would re-take the editorial decision
      // this endpoint exists to own — and that is exactly how the old top-12 went wrong.
      _cache = res.results;
      setDepartments(_cache);
    }).catch(() => {
      // ⛔ Degrade to nothing, never to a broken row: the homepage below this still works.
    });
    return () => { cancelled = true; };
  }, []);

  if (departments.length === 0) return null;

  return (
    <nav aria-label="Departments" className="bg-white border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide scroll-hint-x">
          {departments.map((d) => {
            const Icon = departmentIcon(d);
            return (
              <Link
                key={d.id}
                to={departmentHref(d.id)}
                className="group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px] max-w-[104px]"
                title={d.label}
              >
                <div className="w-12 h-12 rounded-xl ultra-border flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors">
                  <Icon className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors" strokeWidth={1.75} />
                </div>
                {/* ⭐ A department name is OURS and already clean — it never goes through
                    `categoryLabel`, which exists to repair SHOUTING shop copy. */}
                <span className="text-xs font-medium truncate w-full text-center">{d.label}</span>
              </Link>
            );
          })}

          {/* ⛔⛔ LOAD-BEARING, NOT A FLOURISH. The spine reaches ~45% of placed clusters; the
              other 55% — chiefly `phone-tablet`'s 19,286 undifferentiated ones — are reachable
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
