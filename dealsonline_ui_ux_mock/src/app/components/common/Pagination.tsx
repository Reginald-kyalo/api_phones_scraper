import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Numbered pager: Previous, 1 … 4 5 6 … 20, Next. Buttons, not links, because
 * the caller owns the URL; the current page is announced to screen readers.
 */
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const items = pageItems(page, pages);
  const base =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors active:translate-y-px';

  return (
    <nav aria-label="Pages" className="mt-10 flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        className={`${base} gap-1 border border-border text-foreground hover:border-muted-foreground disabled:pointer-events-none disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
      </button>
      {items.map((item, i) =>
        item === null ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Page ${item + 1}`}
            aria-current={item === page ? 'page' : undefined}
            className={`${base} hidden sm:inline-flex ${
              item === page
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-surface-alt'
            }`}
          >
            {item + 1}
          </button>
        ),
      )}
      <span className="px-2 text-sm text-muted-foreground sm:hidden">
        {page + 1} of {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages - 1}
        onClick={() => onChange(page + 1)}
        className={`${base} gap-1 border border-border text-foreground hover:border-muted-foreground disabled:pointer-events-none disabled:opacity-40`}
      >
        Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

function pageItems(page: number, pages: number): (number | null)[] {
  const want = new Set([0, pages - 1, page - 1, page, page + 1]);
  const out: (number | null)[] = [];
  for (let i = 0; i < pages; i++) {
    if (want.has(i)) out.push(i);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
}
