/**
 * The category panel — the site's entry into the storefront's 21 ruled DEPARTMENTS.
 *
 * ⛔⛔ THIS COMPONENT WAS ONCE MOUNTED NOWHERE. It existed, read the retired 424-node PriceRunner
 * spine, and no page imported it — while the header's "All categories" button quietly
 * `navigate()`d to `/browse` instead. A panel nothing renders is the same defect as a tree
 * nothing navigates, one layer up: it looks like a working surface in the file listing and is
 * unreachable in the product. It is mounted by `Header.tsx`, which is the point of it.
 *
 * ⭐⭐ IT NOW SHOWS DEPARTMENTS, NOT ROOTS, AND THERE IS NO TOP-N CUT LEFT. It used to take the
 * top 12 of ~529 browsable roots — shop vocabulary, where `Laptops` appears three times and 75%
 * of the roots are served by one shop. The 21 departments are a human ruling served from API
 * config, so the panel renders all of them and cannot cut the list wrongly.
 *
 * ⛔ THE PANEL IS THE ENTRY; THE DEPARTMENT PAGE IS THE DESTINATION. Every column link and every
 * "show all" lands on `/department/:id` or `/shelf/:slug`, both of which own a breadcrumb, a
 * linkable URL and pagination that a flyout cannot.
 *
 * ⛔⛔ AND THE "ALL CATEGORIES" DOOR IS LOAD-BEARING, NOT DECORATION. The spine reaches ~45% of
 * placed clusters by design — the remaining 55%, chiefly `phone-tablet`'s 19,286
 * undifferentiated clusters, are reachable ONLY through `/shelf`. Removing that link makes half
 * the catalogue unbrowsable.
 *
 * ⛔ NEVER PASS A DEPARTMENT ID TO `shelfHref`, OR A NODE SLUG TO `departmentHref`. Six ids also
 * name a node (`audio`, `bakery`, `cleaning`, `fresh`, `hardware`, `pantry`) and the pages
 * differ, so the mistake resolves to a plausible wrong page instead of erroring.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Loader2, X } from 'lucide-react';
import {
  categoryIcon, categoryLabel, departmentHref, departmentIcon, departmentShelves, formatCount,
  shelfCount, shelfHref,
} from '../../lib/categories';
import { useDepartments, useShelves } from '../../features/categories/useCategoryTree';

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
}

/** Shelves per department. Beyond this the column stops being scannable and "show all" wins. */
const SHELVES = 8;

export default function MegaMenu({ open, onClose }: MegaMenuProps) {
  // ⭐ The fetch and the module-level cache live in `useCategoryTree`, shared with the mobile
  // sheet — so the two surfaces cannot disagree about what "the departments" are.
  const { departments, loading, failed } = useDepartments(open);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { shelves, loading: shelvesLoading } = useShelves(open ? activeId : null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ⛔ The first department is the default column, but only once the list exists.
  useEffect(() => {
    if (departments.length > 0) setActiveId((cur) => cur ?? departments[0].id);
  }, [departments]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const active = departments.find((d) => d.id === activeId) ?? null;
  // ⭐ Drop an adopted shelf that only restates the department name — see `foldsIntoParent`.
  // ⛔ `departmentShelves`, NOT `foldChildren` — a department ADOPTS roots and is named after
  // the principal one, so restatement is normal there and `foldsIntoParent` skips it. See its
  // docstring: 46 adopted shelves across 21 departments, `foldChildren` removed one.
  const shownShelves = departmentShelves(shelves, active?.label ?? null);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className="fixed left-0 right-0 top-[57px] z-50 bg-white border-b border-border shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label="All categories"
      >
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close categories menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {failed ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Categories could not be loaded.{' '}
                <Link to="/shelf" onClick={onClose} className="text-link hover:text-link-hover underline">
                  Browse all categories
                </Link>
              </p>
            </div>
          ) : (
            <div className="flex gap-8 min-h-[320px]">
              {/* Departments */}
              <nav aria-label="Departments" className="w-72 flex-shrink-0 border-r border-border pr-6 max-h-[420px] overflow-y-auto">
                {loading ? (
                  <ul className="space-y-1.5" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <li key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-0.5">
                    {departments.map((d) => {
                      const Icon = departmentIcon(d);
                      const on = activeId === d.id;
                      return (
                        <li key={d.id}>
                          <Link
                            to={departmentHref(d.id)}
                            onMouseEnter={() => setActiveId(d.id)}
                            onFocus={() => setActiveId(d.id)}
                            onClick={onClose}
                            aria-current={on ? 'true' : undefined}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                              on
                                ? 'bg-gray-100 text-foreground font-medium'
                                : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                            {/* ⭐ A department name is OURS and already clean — it never goes
                                through `categoryLabel`, which exists to repair shop copy. */}
                            <span className="flex-1 truncate">{d.label}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatCount(d.n_clusters)}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </nav>

              {/* The active department's adopted shelves */}
              <div className="flex-1 min-w-0">
                {active && (
                  <>
                    <div className="flex items-baseline gap-2 mb-4">
                      <h3 className="text-lg font-semibold text-foreground">{active.label}</h3>
                      <span className="text-sm text-muted-foreground">
                        {active.n_clusters.toLocaleString()} products
                      </span>
                    </div>

                    {shelvesLoading && shownShelves.length === 0 ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-label="Loading shelves" />
                      </div>
                    ) : shownShelves.length > 0 ? (
                      <ul className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                        {shownShelves.slice(0, SHELVES * 3).map((s) => {
                          const Icon = categoryIcon(s);
                          return (
                            <li key={s.slug}>
                              {/* ⛔ A SHELF, so `shelfHref` — these are `browse_nodes` slugs and
                                  `/department/{slug}` would 404 or, worse, resolve elsewhere. */}
                              <Link
                                to={shelfHref(s.slug)}
                                onClick={onClose}
                                title={categoryLabel(s)}
                                className="group flex items-baseline justify-between gap-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <span className="flex items-baseline gap-2 min-w-0">
                                  <Icon className="w-3.5 h-3.5 shrink-0 self-center" strokeWidth={1.75} aria-hidden="true" />
                                  <span className="truncate group-hover:underline">
                                    {categoryLabel(s)}
                                  </span>
                                </span>
                                <span className="text-xs tabular-nums flex-shrink-0">
                                  {formatCount(shelfCount(s))}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      /* ⭐ A department adopting one shelf has nothing to list here. Not an
                         error — the department itself is the shelf, so send them straight to it. */
                      <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">
                          {active.label} is a single shelf.
                        </p>
                      </div>
                    )}

                    <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-4">
                      <Link
                        to={departmentHref(active.id)}
                        onClick={onClose}
                        className="text-sm font-medium text-link hover:text-link-hover transition-colors"
                      >
                        Show all {active.label} ({active.n_clusters.toLocaleString()}) →
                      </Link>
                      {/* ⛔⛔ LOAD-BEARING. The 21 departments reach ~45% of the catalogue; this
                          is the ONLY route to the other 55%. Do not remove it. */}
                      <Link
                        to="/shelf"
                        onClick={onClose}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        All categories →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
