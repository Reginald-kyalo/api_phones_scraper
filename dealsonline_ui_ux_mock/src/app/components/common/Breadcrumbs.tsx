import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  /** Omitted on the current page, which is never a link. */
  to?: string;
}

/**
 * The one breadcrumb trail (DESIGN_RULES.md §3a). Every page builds it from
 * the same hierarchy, department → category or shelf → brand, so the trail
 * on a product page is the trail a shopper walked to get there, and every
 * link resolves. "Home" is always first; "All categories" is not a step
 * (the header's Categories button covers it).
 */
export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  const all: Crumb[] = [{ label: 'Home', to: '/' }, ...items];
  return (
    <nav aria-label="Breadcrumb" className={`mb-4 text-sm text-muted-foreground ${className}`}>
      <ol className="flex flex-wrap items-center gap-1">
        {all.map((item, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
              {last || !item.to ? (
                <span aria-current={last ? 'page' : undefined} className="text-foreground">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="hover:text-foreground hover:underline underline-offset-4">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
