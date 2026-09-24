import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Loader2 } from 'lucide-react';
import { aisleHref, departmentIcon, formatCount } from '../../lib/categories';
import { useCategoryTree } from './useCategoryTree';

interface Props { enabled: boolean; onNavigate: () => void; }

/** Touch-friendly department → family navigation, backed by the published spine. */
export default function MobileCategoryNav({ enabled, onNavigate }: Props) {
  const { departments, loading, failed } = useCategoryTree(enabled);
  const [openId, setOpenId] = useState<string | null>(null);

  if (failed) return <div className="px-5 py-3"><Link to="/shelf" onClick={onNavigate} className="text-sm text-link underline">Browse all categories</Link></div>;
  if (loading && !departments.length) return <ul className="px-5 py-2 space-y-2" aria-hidden="true">{Array.from({ length: 6 }).map((_, i) => <li key={i} className="h-8 rounded bg-gray-100 animate-pulse" />)}</ul>;

  return <div>
    <p className="px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Shop by category</p>
    <ul>{departments.map((department) => {
      const Icon = departmentIcon(department);
      const open = department.id === openId;
      return <li key={department.id} className="border-b border-border/60 last:border-0">
        <button type="button" onClick={() => setOpenId(open ? null : department.id)} aria-expanded={open} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left text-foreground hover:bg-gray-50">
          <Icon className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 truncate">{department.label}</span><span className="text-xs text-muted-foreground tabular-nums">{formatCount(department.total)}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {open && <div className="bg-gray-50/60 pb-2"><ul>{department.children.map((family) => <li key={family.id}>
          <Link to={aisleHref(department.id, family.id)} onClick={onNavigate} className="block px-5 pt-2 text-xs font-semibold uppercase tracking-wide text-foreground">{family.label}</Link>
          {family.children.slice(0, 6).map((child) => <Link key={child.id} to={aisleHref(department.id, child.id)} onClick={onNavigate} className="block pl-9 pr-5 py-1.5 text-sm text-muted-foreground hover:text-foreground">{child.label}</Link>)}
        </li>)}</ul><Link to={aisleHref(department.id)} onClick={onNavigate} className="block px-5 pt-3 text-sm font-medium text-link">Show all {department.label} →</Link></div>}
      </li>;
    })}</ul>
    <Link to="/shelf" onClick={onNavigate} className="block px-5 py-3 text-sm font-medium text-link">All categories →</Link>
  </div>;
}
