import { useEffect, useRef, useState } from 'react';
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
import { productName } from '../../../lib/format';
import { Label } from '../../../components/ui/label';
import type { ClusterDetail } from '../../../lib/api';
import { storeName } from '../../../lib/storeIdentity';
import { submitReport, ReportError } from '../../../lib/reportClient';
import type { ReportFacetInput, ReportInput } from '../../../lib/reportContract';

/** A fresh identity for one logical submission (secure contexts and older browsers). */
function newSubmissionKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Report a bad listing.
 *
 * The options are the dataset's real failure modes, not generic feedback
 * categories: automatic merging joins variants roughly 1 in 6 times, thin
 * clusters can carry a mis-parsed price, and category slugs come verbatim from
 * the store's own page. Naming them is what makes a report actionable — "wrong
 * grouping" routes to the matcher, "wrong category" to the categoriser.
 *
 * Values must stay in step with ReportFacetKind in src/app/lib/reportContract.ts
 * (the server validates against the same list in functions/lib/reportRequest.ts).
 */
const REPORT_REASONS = [
  { value: 'grouping', label: 'Different products grouped together' },
  { value: 'price', label: 'Incorrect price' },
  { value: 'spread', label: 'Incorrect price difference' },
  { value: 'dead_link', label: 'Broken or unavailable listing' },
  { value: 'category', label: 'Wrong category' },
  { value: 'image', label: 'Wrong image' },
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
  stores: displayedStores,
  version,
}: {
  cluster: ClusterDetail;
  capturedAt?: string;
  /**
   * The shops whose offers are on screen, so "Which shop?" lists what the
   * reader is looking at. The dialog used to list `best_by_store`, which for
   * a 128GB page named two shops the page did not show (journey review §1).
   */
  stores?: string[];
  /** The selected version, recorded with the report and shown in its heading. */
  version?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState('');
  const [store, setStore] = useState<string>('');
  const [rejected, setRejected] = useState<string[]>([]);
  const [state, setState] = useState<State>('idle');
  // One submission identity per logical report. It survives failed attempts so a
  // retry of the same content cannot store twice; any edit makes a new identity.
  const attempt = useRef<{ key: string; json: string; uncertain: boolean } | null>(null);
  const generation = useRef(0); // bumped on close so a late response is ignored
  const inFlight = useRef(false);
  const [lastError, setLastError] = useState<ReportError | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (retryAt === null) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= retryAt) setRetryAt(null);
    }, 250);
    return () => clearInterval(t);
  }, [retryAt]);

  const stores = displayedStores ?? Object.keys(cluster.best_by_store ?? {});
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
  function facets(): ReportFacetInput[] {
    if (reason === 'grouping' && rejected.length) {
      return rejected.map((id) => ({ kind: 'grouping', subject: id, value: 'wrong' }));
    }
    // A shop picked earlier may no longer be on screen (the version changed);
    // only a displayed shop can be named.
    const shop = STORE_SCOPED.has(reason) && store && stores.includes(store) ? store : null;
    return [
      {
        kind: reason as ReportFacetInput['kind'],
        subject: shop,
        value: reason === 'grouping' ? 'wrong' : null,
      },
    ];
  }

  function buildBody(): ReportInput {
    return {
      scope: 'cluster',
      cluster_id: cluster.cluster_id,
      note,
      // `version` is the exact selected configuration, stored in its own column.
      // The title keeps the human-readable version too, for operators reading
      // older rows or tools that only show the title.
      title: version ? `${productName(cluster)} · ${version}` : productName(cluster),
      category: cluster.category,
      captured_at: capturedAt ?? null,
      version: version ?? null,
      page_url: location.href,
      facets: facets(),
    };
  }

  // The content a retry would send, compared with what the unsure attempt sent.
  const draftJson = reason ? JSON.stringify(buildBody()) : '';
  const editedAfterUncertain =
    state === 'error' && !!attempt.current?.uncertain && draftJson !== attempt.current.json;
  const waitSeconds = retryAt !== null ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
  const coolingDown = waitSeconds > 0;

  async function submit() {
    if (!reason || inFlight.current || coolingDown) return;
    const body = buildBody();
    const json = JSON.stringify(body);
    // Same content as the last attempt: same key. Different content (or a key the
    // server rejected as reused): a new submission identity.
    if (!attempt.current || attempt.current.json !== json) {
      attempt.current = { key: newSubmissionKey(), json, uncertain: false };
    }
    const mine = attempt.current;
    const gen = generation.current;
    inFlight.current = true;
    setState('sending');
    try {
      await submitReport(body, mine.key);
      if (gen !== generation.current) return;
      setLastError(null);
      setState('sent');
    } catch (e) {
      if (gen !== generation.current) return;
      const err = e instanceof ReportError ? e : new ReportError('network', 0, true);
      mine.uncertain = err.uncertain;
      // The server refused this key/content pairing for good: never send it again.
      if (err.kind === 'conflict' || err.kind === 'invalid') attempt.current = null;
      setLastError(err);
      setRetryAt(err.retryAfterMs ? Date.now() + err.retryAfterMs : null);
      setNow(Date.now());
      setState('error');
    } finally {
      inFlight.current = false;
    }
  }

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      generation.current++;
      attempt.current = null;
      setLastError(null);
      setRetryAt(null);
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
            {productName(cluster)}{version ? ` · ${version}` : ''}
          </DialogDescription>
        </DialogHeader>

        {state === 'sent' ? (
          <div className="py-6 text-center">
            <Check className="mx-auto mb-3 h-8 w-8 text-teal-deep" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Report received. Thank you.</p>
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
                        : 'border-border hover:bg-surface-alt'
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
                  Which listing doesn&rsquo;t belong? (optional)
                </legend>
                <div className="space-y-1.5">
                  {members.map((m) => (
                    <label
                      key={m.cluster_id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-2.5 text-sm hover:bg-surface-alt"
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
                  <option value="">All listed shops</option>
                  {stores.map((s) => (
                    <option key={s} value={s}>{storeName(s)}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="report-note">Details (optional)</Label>
              <Textarea
                id="report-note"
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="For example, a 500 g pack is compared with a 1 kg pack."
                className="mt-1.5"
                rows={3}
              />
            </div>

            {state === 'error' && (
              <div role="alert" className="space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  We couldn&rsquo;t save your report. Your text is still here. Try again.
                </p>
                {editedAfterUncertain && (
                  <p className="pl-6">
                    Your earlier report may already have arrived. Sending this one will add a
                    second report.
                  </p>
                )}
                {coolingDown && lastError && (
                  <p className="pl-6">You can try again in {waitSeconds} seconds.</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => reset(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!reason || state === 'sending' || coolingDown}
                onClick={submit}
              >
                {state === 'sending' ? 'Sending…' : state === 'error' ? 'Try again' : 'Send report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
