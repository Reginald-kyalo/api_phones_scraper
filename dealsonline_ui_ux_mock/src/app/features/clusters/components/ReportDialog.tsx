import { useState } from 'react';
import { Flag, Check, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import type { ClusterDetail } from '../../../lib/api';
import { storeName } from '../../../lib/storeIdentity';

/**
 * Report a bad listing.
 *
 * The options are the dataset's real failure modes, not generic feedback
 * categories: automatic merging joins variants roughly 1 in 6 times, thin
 * clusters can carry a mis-parsed price, and category slugs come verbatim from
 * the store's own page. Naming them is what makes a report actionable — "wrong
 * grouping" routes to the matcher, "wrong category" to the categoriser.
 *
 * Values must stay in step with REASONS in functions/api/reports.ts.
 */
const REPORT_REASONS = [
  { value: 'grouping', label: 'These are different products' },
  { value: 'price', label: 'A price is wrong' },
  { value: 'spread', label: "The saving isn't real" },
  { value: 'dead_link', label: 'A link is broken or the product is gone' },
  { value: 'category', label: "It's in the wrong category" },
  { value: 'image', label: 'The picture is wrong' },
  { value: 'other', label: 'Something else' },
] as const;

/**
 * Which reasons are ABOUT one shop rather than the product as a whole. Only
 * these attach the selected store as the facet's subject — tagging a shop onto
 * "the picture is wrong" would invent a claim the reader never made.
 */
const STORE_SCOPED = new Set<string>(['price', 'dead_link']);

/**
 * `spread` only means something where the saving is on screen with its evidence,
 * and `grouping` only where a merge actually happened. Offering either otherwise
 * invites a verdict on something the reader was never shown.
 */
function reasonsFor(cluster: ClusterDetail) {
  const merged = (cluster.mvp_n_merged ?? 0) > 1;
  const hasSpread = !!cluster.spread_basis?.cheapest && !!cluster.spread_basis?.dearest;
  return REPORT_REASONS.filter(
    (r) => (r.value !== 'grouping' || merged) && (r.value !== 'spread' || hasSpread),
  );
}

type State = 'idle' | 'sending' | 'sent' | 'error';

export function ReportDialog({
  cluster,
  capturedAt,
}: {
  cluster: ClusterDetail;
  capturedAt?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState('');
  const [store, setStore] = useState<string>('');
  const [rejected, setRejected] = useState<string[]>([]);
  const [state, setState] = useState<State>('idle');

  const stores = Object.keys(cluster.best_by_store ?? {});
  const reasons = reasonsFor(cluster);
  const members = cluster.mvp_merged_members ?? [];
  const askWhichShop = STORE_SCOPED.has(reason) && stores.length > 1;

  /**
   * One tick = one facet. A 5-way merge the reader picks apart yields five
   * independently usable labels, each naming the absorbed cluster_id it judged —
   * which is what makes them training data rather than a comment to re-read.
   *
   * The fallback matters: "these are different products" with nothing ticked is
   * still a real verdict about the group, so it sends one subject-less facet
   * rather than nothing at all.
   */
  function facets() {
    if (reason === 'grouping' && rejected.length) {
      return rejected.map((id) => ({ kind: 'grouping', subject: id, value: 'wrong' }));
    }
    return [
      {
        kind: reason,
        subject: STORE_SCOPED.has(reason) && store ? store : null,
        value: reason === 'grouping' ? 'wrong' : null,
      },
    ];
  }

  async function submit() {
    if (!reason) return;
    setState('sending');
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'cluster',
          cluster_id: cluster.cluster_id,
          note,
          title: cluster.display_name ?? cluster.title,
          category: cluster.category,
          captured_at: capturedAt ?? null,
          page_url: location.href,
          facets: facets(),
        }),
      });
      // A static preview has no Function behind /api/reports and returns the
      // SPA shell with a 200, so "ok" alone is not proof it was stored.
      const saved =
        res.ok && (res.headers.get('content-type') || '').includes('json');
      setState(saved ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setReason('');
      setNote('');
      setStore('');
      setRejected([]);
      setState('idle');
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          Report a problem
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            {cluster.display_name ?? cluster.title}
          </DialogDescription>
        </DialogHeader>

        {state === 'sent' ? (
          <div className="py-6 text-center">
            <Check className="mx-auto mb-3 h-8 w-8 text-teal-deep" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Thanks — that helps.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We review reports and correct the matching behind this page.
            </p>
            <Button className="mt-5" onClick={() => reset(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-foreground">
                What&rsquo;s wrong?
              </legend>
              <div className="space-y-1.5">
                {reasons.map((r) => (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors ${
                      reason === r.value
                        ? 'border-primary/40 bg-teal/5'
                        : 'border-border hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="accent-teal-deep"
                    />
                    <span className="text-foreground">{r.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* The merge, named. Ticking a row sends a verdict against that exact
                absorbed cluster_id, so the label survives the next rebuild — the
                surviving id may not. Only shown for `grouping`: this list is the
                answer to "which of these doesn't belong", not to any other
                question. */}
            {reason === 'grouping' && members.length > 1 && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-foreground">
                  Which of these doesn&rsquo;t belong? (optional)
                </legend>
                <div className="space-y-1.5">
                  {members.map((m) => (
                    <label
                      key={m.cluster_id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-2.5 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={rejected.includes(m.cluster_id)}
                        onChange={(e) =>
                          setRejected((prev) =>
                            e.target.checked
                              ? [...prev, m.cluster_id]
                              : prev.filter((id) => id !== m.cluster_id),
                          )
                        }
                        className="mt-0.5 accent-teal-deep"
                      />
                      <span className="text-foreground">{m.title ?? m.cluster_id}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {askWhichShop && (
              <div>
                <Label htmlFor="report-store">Which shop? (optional)</Label>
                <select
                  id="report-store"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
                >
                  <option value="">All of them</option>
                  {stores.map((s) => (
                    <option key={s} value={s}>{storeName(s)}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="report-note">Anything to add? (optional)</Label>
              <Textarea
                id="report-note"
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. the 500g and 1kg packs are listed as one product"
                className="mt-1.5"
                rows={3}
              />
            </div>

            {state === 'error' && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                We couldn&rsquo;t save that report. Try again in a moment.
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => reset(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!reason || state === 'sending'}
                onClick={submit}
              >
                {state === 'sending' ? 'Sending…' : 'Send report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
