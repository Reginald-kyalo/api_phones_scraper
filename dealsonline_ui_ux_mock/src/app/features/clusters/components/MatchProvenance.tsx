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
 * human would call variants (organic vs conventional, 500g vs 1kg). The shopper
 * needs that limitation and the evidence (the shop titles), not the matching
 * algorithm's vocabulary: "title similarity" went (design audit §8).
 */
export function MatchProvenance({ cluster }: { cluster: ClusterDetail }) {
  const [open, setOpen] = useState(false);
  const merged = cluster.mvp_n_merged ?? 0;
  if (merged <= 1) return null;
  const members = cluster.mvp_merged_members ?? [];

  return (
    <div className="rounded-md ultra-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 p-3 text-left text-sm text-muted-foreground"
      >
        <GitMerge className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1">How listings are matched</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Listings are matched automatically. Similar names can refer to different sizes,
            versions or pack quantities.
            {members.length > 1 ? ' The original shop titles are shown below.' : ''}
          </p>
          {/* The names the engine unified. Telling a reader the listings were
              grouped and then showing only the winning title asks them to audit
              a merge with the evidence withheld — the differing names ARE the
              thing to check ("Green Label" against "Blue Label").
              `mvp_merged_from` cannot be used here: it is identity keys,
              unreadable to a person. */}
          {members.length > 1 && (
            <ul className="mt-2 space-y-1">
              {members.map((m) => (
                <li key={m.cluster_id} className="flex gap-2">
                  <span aria-hidden="true" className="text-muted-foreground/50">
                    ·
                  </span>
                  <span className="text-foreground">{m.title ?? m.cluster_id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
