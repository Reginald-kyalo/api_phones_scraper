import { useState } from 'react';
import { ChevronDown, GitMerge } from 'lucide-react';
import type { ClusterDetail } from '../../../lib/api';

/**
 * Honesty surface for automatically-merged clusters.
 *
 * Shown only where a merge actually happened (`mvp_n_merged > 1`). `mvp_generated`
 * is NOT the signal — it is true for every cluster rebuilt through the MVP path,
 * most of which were passed through untouched, so keying on it would warn on
 * engine-clean data.
 *
 * The dataset's own stated limit is that roughly 1 in 6 merges joins two things a
 * human would call variants (organic vs conventional, 500g vs 1kg), so this says
 * plainly that the grouping is automatic and points at the store titles.
 */
export function MatchProvenance({ cluster }: { cluster: ClusterDetail }) {
  const [open, setOpen] = useState(false);
  const merged = cluster.mvp_n_merged ?? 0;
  if (merged <= 1) return null;

  return (
    <div className="mb-4 rounded-lg ultra-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 p-3 text-left text-sm text-muted-foreground"
      >
        <GitMerge className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1">
          Grouped from {merged} product listings by title similarity
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            These listings were matched automatically, not checked by hand. Similar
            sizes or variants are occasionally grouped together, so compare the store
            titles below before you buy.
          </p>
          {cluster.mvp_rule && (
            <p className="mt-2 break-words font-mono text-[11px]">{cluster.mvp_rule}</p>
          )}
        </div>
      )}
    </div>
  );
}
