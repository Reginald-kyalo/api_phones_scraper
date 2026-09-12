import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { SPINE_DEPARTMENTS } from '../../data/spineDepartments';
import { LIVE_SPINE_SHELVES, spineShelfDisplay } from '../../data/liveSpineShelves';

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
        {SPINE_DEPARTMENTS.map((department) => {
          const { Icon } = department;
          const isOpen = openId === department.id;
          const shelves = LIVE_SPINE_SHELVES[department.id] ?? [];
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
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {department.n_clusters.toLocaleString()}
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
                  {shelves.length > 0 ? (
                    <ul>
                      {shelves.map((shelf) => (
                        <li key={shelf.slug}>
                          <Link
                            to={`/shelf/${shelf.slug}`}
                            onClick={onNavigate}
                            className="flex items-center gap-2 pl-12 pr-5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <span className="flex-1 truncate">{spineShelfDisplay(shelf)}</span>
                            <span className="text-xs tabular-nums shrink-0">
                              {shelf.count.toLocaleString()}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
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
