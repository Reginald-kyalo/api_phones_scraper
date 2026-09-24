import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Loader2, X } from 'lucide-react';
import { aisleHref, categoryIcon, departmentIcon, formatCount } from '../../lib/categories';
import { useCategoryTree } from '../../features/categories/useCategoryTree';

interface MegaMenuProps { open: boolean; onClose: () => void; }

const PREVIEW_FAMILIES = 9;
const PREVIEW_CHILDREN = 5;

/** The desktop entry point for the authored department → family → product-type tree. */
export default function MegaMenu({ open, onClose }: MegaMenuProps) {
  const { departments, loading, failed } = useCategoryTree(open);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (departments.length) setActiveId((current) => current ?? departments[0].id);
  }, [departments]);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onKeyDown]);

  if (!open) return null;
  const active = departments.find((department) => department.id === activeId) ?? null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed left-0 right-0 top-[57px] z-50 bg-white border-b border-border shadow-lg"
           role="dialog" aria-modal="true" aria-label="All categories">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <button onClick={onClose} className="absolute top-4 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" aria-label="Close categories menu">
            <X className="w-5 h-5 text-gray-500" />
          </button>
          {failed ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Categories could not be loaded. <Link to="/shelf" onClick={onClose} className="text-link hover:text-link-hover underline">Browse all categories</Link></p>
          ) : (
            <div className="flex gap-8 min-h-[320px]">
              <nav aria-label="Departments" className="w-72 flex-shrink-0 border-r border-border pr-6 max-h-[420px] overflow-y-auto">
                {loading ? <ul className="space-y-1.5" aria-hidden="true">{Array.from({ length: 8 }).map((_, i) => <li key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}</ul> : (
                  <ul className="space-y-0.5">{departments.map((department) => {
                    const Icon = departmentIcon(department);
                    const selected = department.id === activeId;
                    return <li key={department.id}><Link to={aisleHref(department.id)} onMouseEnter={() => setActiveId(department.id)} onFocus={() => setActiveId(department.id)} onClick={onClose} aria-current={selected ? 'true' : undefined} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${selected ? 'bg-gray-100 text-foreground font-medium' : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'}`}>
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} /><span className="flex-1 truncate">{department.label}</span><span className="text-xs text-muted-foreground tabular-nums">{formatCount(department.total)}</span><ChevronRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    </Link></li>;
                  })}</ul>
                )}
              </nav>
              <div className="flex-1 min-w-0">
                {active && <>
                  <div className="flex items-baseline gap-2 mb-4"><h3 className="text-lg font-semibold text-foreground">{active.label}</h3><span className="text-sm text-muted-foreground">{active.total.toLocaleString()} products</span></div>
                  {active.children.length ? <ul className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">{active.children.slice(0, PREVIEW_FAMILIES).map((family) => {
                    const Icon = categoryIcon({ slug: family.id, label: family.label });
                    return <li key={family.id}><Link to={aisleHref(active.id, family.id)} onClick={onClose} className="group flex items-center gap-2 text-sm font-medium text-foreground hover:text-link"><Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" /><span className="truncate">{family.label}</span><span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">{formatCount(family.total)}</span></Link>
                      {family.children.length > 0 && <ul className="mt-1 ml-5 space-y-1">{family.children.slice(0, PREVIEW_CHILDREN).map((child) => <li key={child.id}><Link to={aisleHref(active.id, child.id)} onClick={onClose} className="block truncate text-sm text-muted-foreground hover:text-foreground hover:underline">{child.label}</Link></li>)}</ul>}
                    </li>;
                  })}</ul> : <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-border"><p className="text-sm text-muted-foreground">{active.label} is ready to browse.</p></div>}
                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-4"><Link to={aisleHref(active.id)} onClick={onClose} className="text-sm font-medium text-link hover:text-link-hover">View all {active.label} →</Link><Link to="/shelf" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">All categories →</Link></div>
                </>}
                {loading && !active && <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-label="Loading categories" /></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
