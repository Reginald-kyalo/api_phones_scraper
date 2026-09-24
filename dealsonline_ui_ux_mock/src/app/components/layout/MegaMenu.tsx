import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, X } from 'lucide-react';
import { TAXONOMY_DEPARTMENTS, spineShelfDisplay } from '../../data/taxonomyTree';

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Static category panel driven by the derived hierarchy. Every captured shelf
 * is available beneath a family heading; the menu never truncates a department.
 */
export default function MegaMenu({ open, onClose }: MegaMenuProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (TAXONOMY_DEPARTMENTS.length > 0) setActiveId((cur) => cur ?? TAXONOMY_DEPARTMENTS[0].id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = TAXONOMY_DEPARTMENTS.find((d) => d.id === activeId) ?? TAXONOMY_DEPARTMENTS[0];

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

          <div className="flex gap-8 min-h-[320px]">
            <nav
              aria-label="Departments"
              className="w-72 flex-shrink-0 border-r border-border pr-6 max-h-[420px] overflow-y-auto"
            >
              <ul className="space-y-0.5">
                {TAXONOMY_DEPARTMENTS.map((department) => {
                  const { Icon } = department;
                  const on = activeId === department.id;
                  return (
                    <li key={department.id}>
                      <Link
                        to={`/aisle/${department.id}`}
                        onMouseEnter={() => setActiveId(department.id)}
                        onFocus={() => setActiveId(department.id)}
                        onClick={onClose}
                        aria-current={on ? 'true' : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          on
                            ? 'bg-gray-100 text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                        <span className="flex-1 truncate">{department.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {department.n_clusters.toLocaleString()}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex-1 min-w-0">
              {active && (
                <>
                  <div className="flex items-baseline gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-foreground">{active.label}</h3>
                    <span className="text-sm text-muted-foreground">
                      {active.n_clusters.toLocaleString()} products
                    </span>
                  </div>

                  {active.families.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 max-h-[420px] overflow-y-auto pr-2">
                      {active.families.map((family) => (
                        <section key={family.id} aria-labelledby={`family-${active.id}-${family.id}`}>
                          <h4 id={`family-${active.id}-${family.id}`} className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                            {family.label}
                          </h4>
                          <ul className="space-y-0.5">
                            {family.shelves.map((shelf) => (
                              <li key={shelf.slug}>
                                <Link
                                  to={`/shelf/${shelf.slug}`}
                                  onClick={onClose}
                                  title={spineShelfDisplay(shelf)}
                                  className="group flex items-baseline justify-between gap-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <span className="truncate group-hover:underline">{spineShelfDisplay(shelf)}</span>
                                  <span className="text-xs tabular-nums flex-shrink-0">{shelf.count.toLocaleString()}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">
                        {active.label} is a single shelf.
                      </p>
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-4">
                    <Link
                      to={`/aisle/${active.id}`}
                      onClick={onClose}
                      className="text-sm font-medium text-link hover:text-link-hover transition-colors"
                    >
                      Show all {active.label} ({active.n_clusters.toLocaleString()}) →
                    </Link>
                    <Link
                      to="/browse"
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
        </div>
      </div>
    </>
  );
}
