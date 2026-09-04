/**
 * The category tree on small screens.
 *
 * ⛔⛔ WHY THIS EXISTS. The desktop panel sits in a `hidden lg:flex` nav, so below 1024px the
 * trigger did not render at all — measured at 390px and 900px, the sheet offered
 * `Home / All categories / Sale / About` and NO category tree whatsoever. The canonical taxonomy
 * reached a screen and then only reached a wide one, which is the same "works, unreachable"
 * defect the tree already suffered twice: once when nothing queried `browse_nodes`, and again
 * when nothing mounted the panel.
 *
 * ⛔ NOT A SHRUNKEN PANEL. A twelve-column flyout is wrong on a phone. This is an accordion:
 * tap a department to expand its children in place, tap a child to open its shelf.
 *
 * ⭐ ONE DEPARTMENT OPEN AT A TIME. A sheet is ~320px wide and already scrolls; letting several
 * expand at once turns it into a directory again.
 *
 * ⭐⭐ READS THE 21 RULED DEPARTMENTS, not the top 12 of ~529 roots. `categoryLabel` is applied
 * to SHELVES (shop copy, 275 of which SHOUT) and never to a department name, which is ours.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  categoryLabel, departmentHref, departmentIcon, departmentShelves, formatCount, shelfCount,
  shelfHref,
} from '../../lib/categories';
import { useDepartments, useShelves } from './useCategoryTree';

interface Props {
  /** Defers the request until the sheet is actually open. */
  enabled: boolean;
  /** Every link must dismiss the sheet — it does not close itself on navigation. */
  onNavigate: () => void;
}

export default function MobileCategoryNav({ enabled, onNavigate }: Props) {
  const { departments, loading, failed } = useDepartments(enabled);
  const [openId, setOpenId] = useState<string | null>(null);
  const { shelves, loading: shelvesLoading } = useShelves(openId);

  if (failed) {
    return (
      <div className="px-5 py-3">
        <Link
          to="/shelf"
          onClick={onNavigate}
          className="text-sm text-link hover:text-link-hover underline"
        >
          Browse all categories
        </Link>
      </div>
    );
  }

  if (loading && departments.length === 0) {
    return (
      <ul className="px-5 py-2 space-y-2" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-8 rounded bg-gray-100 animate-pulse" />
        ))}
      </ul>
    );
  }

  return (
    <div>
      <p className="px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Shop by category
      </p>

      <ul>
        {departments.map((d) => {
          const Icon = departmentIcon(d);
          const isOpen = openId === d.id;
          // ⭐ `shelves` belongs to whichever department is open, so it is only meaningful here.
          // Drop any that merely restate the department name — see `foldsIntoParent`.
          /* ⛔ The same fold as the desktop panel — the two must not disagree about what a
             department contains. */
          const shown = isOpen ? departmentShelves(shelves, d.label) : [];
          return (
            <li key={d.id} className="border-b border-border/60 last:border-0">
              {/* ⛔ A BUTTON, NOT A LINK. A row that both navigates and expands is ambiguous
                  under a thumb — the row expands, and "Show all" below it navigates. */}
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : d.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left
                           text-foreground hover:bg-gray-50 transition-colors"
              >
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                {/* ⭐ A department name is OURS and already clean — never `categoryLabel`. */}
                <span className="flex-1 truncate">{d.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatCount(d.n_clusters)}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="pb-2 bg-gray-50/60">
                  {shelvesLoading && shown.length === 0 ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-label="Loading subcategories" />
                    </div>
                  ) : (
                    <ul>
                      {/* ⛔ SHELVES are `browse_nodes` slugs — `shelfHref`, never
                          `departmentHref`. The two namespaces overlap on six names. */}
                      {shown.map((c) => (
                        <li key={c.slug}>
                          <Link
                            to={shelfHref(c.slug)}
                            onClick={onNavigate}
                            className="flex items-center gap-2 pl-12 pr-5 py-2 text-sm
                                       text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <span className="flex-1 truncate">{categoryLabel(c)}</span>
                            <span className="text-xs tabular-nums shrink-0">
                              {formatCount(shelfCount(c))}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* ⭐ Always offered, shelves or not: a department adopting ONE shelf has
                      nothing to expand, so this is the only way into it. */}
                  <Link
                    to={departmentHref(d.id)}
                    onClick={onNavigate}
                    className="block pl-12 pr-5 py-2 text-sm font-medium text-link hover:text-link-hover"
                  >
                    Show all {d.label} →
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ⛔⛔ LOAD-BEARING. The 21 departments reach ~45% of placed clusters; this is the ONLY
          route to the other 55%, chiefly `phone-tablet`'s 19,286. Do not remove it. */}
      <Link
        to="/shelf"
        onClick={onNavigate}
        className="block px-5 py-3 text-sm font-medium text-link hover:text-link-hover"
      >
        All categories →
      </Link>
    </div>
  );
}
