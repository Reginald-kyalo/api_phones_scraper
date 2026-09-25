import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { TAXONOMY_DEPARTMENTS, spineShelfDisplay } from '../../data/taxonomyTree';
import { phoneCategoryHref, phoneChildren } from '../../data/phoneCategories';

interface Props {
  /** Kept for signature parity with production; this demo has no request to defer. */
  enabled?: boolean;
  onNavigate: () => void;
}

/**
 * Static copy of the production mobile category accordion. It expands one
 * design department at a time and links captured demo categories to `/browse`.
 */
export default function MobileCategoryNav({ onNavigate }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <p className="px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Shop by category
      </p>

      <ul>
        {TAXONOMY_DEPARTMENTS.map((department) => {
          const { Icon } = department;
          const isOpen = openId === department.id;
          return (
            <li key={department.id} className="border-b border-border/60 last:border-0">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : department.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left text-foreground hover:bg-gray-50 transition-colors"
              >
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                <span className="flex-1 truncate">{department.label}</span>
                {department.id !== 'phones-wearables' && <span className="text-xs text-muted-foreground tabular-nums shrink-0">{department.n_clusters.toLocaleString()}</span>}
                <ChevronDown
                  aria-hidden="true"
                  className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="pb-2 bg-gray-50/60">
                  {department.id === 'phones-wearables' ? (
                    <div className="px-5 py-2 space-y-2">
                      {phoneChildren('phones-wearables').map((family) => (
                        <details key={family.id} className="rounded-md border border-border/70 bg-white">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">{family.label}</summary>
                          <div className="border-t border-border/70 pb-1">
                            <Link to={phoneCategoryHref(family.id)} onClick={onNavigate} className="block px-3 py-2 text-sm text-link">Browse {family.label}</Link>
                            {phoneChildren(family.id).map((child) => <div key={child.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                              <Link to={phoneCategoryHref(child.id)} onClick={onNavigate} className="text-sm text-muted-foreground hover:text-foreground">{child.label}</Link>
                              {phoneChildren(child.id).filter((node) => node.kind === 'shortcut').map((shortcut) => <Link key={shortcut.id} to={phoneCategoryHref(shortcut.id)} onClick={onNavigate} className="text-xs text-link underline">{shortcut.label} · pending</Link>)}
                            </div>)}
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : department.families.length > 0 ? (
                    <div className="px-5 py-2 space-y-2">
                      {department.families.map((family) => (
                        <details key={family.id} className="group rounded-md border border-border/70 bg-white" open={family.shelves.length <= 6}>
                          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                            {family.label} <span className="ml-1 text-muted-foreground">({family.shelves.length})</span>
                          </summary>
                          <ul className="border-t border-border/70 pb-1">
                            {family.shelves.map((shelf) => (
                              <li key={shelf.slug}>
                                <Link to={`/shelf/${shelf.slug}`} onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                  <span className="flex-1 truncate">{spineShelfDisplay(shelf)}</span>
                                  <span className="text-xs tabular-nums shrink-0">{shelf.count.toLocaleString()}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-12 pr-5 py-2 text-sm text-muted-foreground">
                      This department is a single shelf.
                    </p>
                  )}

                  <Link
                    to={`/aisle/${department.id}`}
                    onClick={onNavigate}
                    className="block pl-12 pr-5 py-2 text-sm font-medium text-link hover:text-link-hover"
                  >
                    Show all {department.label} →
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Link
        to="/browse"
        onClick={onNavigate}
        className="block px-5 py-3 text-sm font-medium text-link hover:text-link-hover"
      >
        All categories →
      </Link>
    </div>
  );
}
