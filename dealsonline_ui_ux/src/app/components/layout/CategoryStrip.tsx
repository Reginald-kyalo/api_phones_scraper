/**
 * The homepage department strip — the storefront's 21 RULED departments, in 12 tiles.
 *
 * ⛔ NOT `pricerunnerApi`, and no longer the raw tree either. It used to show the first 12 of
 * ~529 browsable roots, which are shop vocabulary: `Laptops` resolves in three places, 75% of
 * those roots are served by ONE shop, and four of the twelve were only there because they had
 * been ordered by the wrong number. These 21 are a human ruling served from API config.
 *
 * ⭐⭐ GROUPED, NOT CUT — AND THE DIFFERENCE IS THE WHOLE POINT. `Laptops` and `Computers` sat
 * side by side as peers, as did five separate grocery departments. Grouping collapses 21 tiles
 * to 12 while EVERY ONE of the 21 stays reachable, one click deeper. That is the opposite of
 * the old top-12, which reached 12 and lost 9.
 *
 * ⛔⛔ THE GROUPS ARE NOT INVENTED HERE, AND NOT INVENTED IN THIS FILE'S SIBLINGS EITHER. They
 * arrive on `Department.parent` from `app/api/departments.py`, where each multi-member group is
 * one the DESIGNED spine already rules (measured 2026-09-05 via `browse_nodes.spine_department`).
 * A client-side grouping table here would be a second, drifting ruling — the exact "21 in one
 * nav and 19 in another" failure the roadmap names.
 *
 * ⛔ A GROUP OF ONE RENDERS AS A PLAIN LINK. Making someone open a popover to discover a single
 * destination is worse than no grouping at all. Eight departments stand alone today and are
 * plain links; the API guarantees no one-member group exists, and this renderer would degrade
 * gracefully if one ever did.
 *
 * ⭐⭐ IT STILL SCROLLS AT EVERY WIDTH. The old strip cut to 12 and then switched to
 * `lg:justify-between` with `lg:overflow-visible` — a single non-scrolling row — so anything past
 * the cut was unreachable on a wide screen while the narrow one could still scroll to it. Fewer
 * tiles does NOT make that layout safe, so the scrolling row stays.
 *
 * ⛔ THE STRIP IS NOT THE CATALOGUE. 21 departments reach ~45% of placed clusters; `/shelf` owns
 * the rest, which is why the last tile is a door to it rather than another department.
 */
import { Link } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, LayoutGrid, Package } from 'lucide-react';
import { departmentApi, type Department } from '../../lib/api';
import { departmentHref, departmentIcon, formatCount } from '../../lib/categories';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

/** Survives unmount/remount within a session; the server caches the spine for 300s regardless. */
let _cache: Department[] | null = null;

type Tile =
  /** One department, linking straight to its page. */
  | { key: string; label: string; total: number; dept: Department; children?: never }
  /** A ruled group, opening a menu of its departments. */
  | { key: string; label: string; total: number; dept?: never; children: Department[] };

/**
 * Collapse the flat department list onto the parents the API publishes.
 *
 * ⛔ ORDER IS PRESERVED FROM THE API, NOT RE-SORTED BY STOCK. `departments.py` records that its
 * order is EDITORIAL — "Kitchen (1,857) sits below Bakery (425) because a shopper reads a
 * storefront by domain, not by inventory" — and a client-side sort would re-take exactly the
 * decision that endpoint exists to own. A group takes the position of its first member.
 *
 * ⛔ A department with no parent, or the only member of its group, becomes a plain link.
 */
function buildTiles(departments: Department[]): Tile[] {
  const tiles: Tile[] = [];
  const groups = new Map<string, Department[]>();

  for (const d of departments) {
    if (!d.parent) {
      tiles.push({ key: d.id, label: d.label, total: d.n_clusters, dept: d });
      continue;
    }
    const members = groups.get(d.parent);
    if (members) {
      members.push(d);
      continue;
    }
    // First member of this group claims the group's position in editorial order.
    const fresh: Department[] = [d];
    groups.set(d.parent, fresh);
    tiles.push({
      key: `group:${d.parent}`,
      label: d.parent,
      total: 0, // filled below, once every member is known
      children: fresh,
    });
  }

  return tiles.map((t) =>
    t.children
      ? t.children.length === 1
        // ⛔ A popover over one destination is worse than no grouping. Degrade to a link.
        ? { key: t.children[0].id, label: t.children[0].label,
            total: t.children[0].n_clusters, dept: t.children[0] }
        : { ...t, total: t.children.reduce((sum, d) => sum + d.n_clusters, 0) }
      : t,
  );
}

const TILE =
  'group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px] max-w-[104px]';
const BADGE =
  'w-12 h-12 rounded-xl ultra-border flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors';

export default function CategoryStrip() {
  const [departments, setDepartments] = useState<Department[]>(_cache ?? []);

  useEffect(() => {
    if (_cache) return;
    let cancelled = false;
    departmentApi.list().then((res) => {
      if (cancelled) return;
      // ⛔ NO `.slice()`. 21 is a ruling; a client-side cut would re-take the editorial decision
      // this endpoint exists to own — and that is exactly how the old top-12 went wrong.
      // Grouping is not a cut: all 21 stay reachable.
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
            if (tile.dept) {
              const Icon = departmentIcon(tile.dept);
              return (
                <Link key={tile.key} to={departmentHref(tile.dept.id)} className={TILE}
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
            }

            // ⭐ The group's icon is its LARGEST member's, so the tile still reads as the thing
            // most of its stock is. A dedicated group icon table would be a fifth place category
            // presentation is decided.
            const biggest = tile.children.reduce(
              (a, b) => (b.n_clusters > a.n_clusters ? b : a), tile.children[0]);
            const Icon = departmentIcon(biggest) ?? Package;

            return (
              <Popover key={tile.key}>
                <PopoverTrigger className={TILE} title={tile.label}>
                  <div className={BADGE}>
                    <Icon className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors"
                          strokeWidth={1.75} />
                  </div>
                  <span className="flex items-center gap-0.5 text-xs font-medium truncate w-full justify-center">
                    {tile.label}
                    <ChevronDown className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  </span>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-60 p-1.5">
                  {tile.children.map((d) => {
                    const ChildIcon = departmentIcon(d);
                    return (
                      <Link
                        key={d.id}
                        to={departmentHref(d.id)}
                        className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-gray-50"
                      >
                        <ChildIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                                   aria-hidden="true" />
                        <span className="flex-1 text-foreground">{d.label}</span>
                        {/* ⛔ The department's OWN total, never the group's — a tile that
                            advertised the group's number would promise a page it never opens. */}
                        <span className="price-num text-xs text-muted-foreground">
                          {formatCount(d.n_clusters)}
                        </span>
                      </Link>
                    );
                  })}
                </PopoverContent>
              </Popover>
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
