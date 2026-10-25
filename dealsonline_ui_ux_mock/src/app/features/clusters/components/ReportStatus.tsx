import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { isReportStatusView } from '../../../lib/reportContract';
import type { ReportStatusName, ReportStatusView } from '../../../lib/reportContract';

const STEPS: { name: ReportStatusName; label: string }[] = [
  { name: 'received', label: 'Received' },
  { name: 'reviewed', label: 'Reviewed' },
  { name: 'resolved', label: 'Resolved' },
];

type Load =
  | { kind: 'loading' }
  | { kind: 'ok'; view: ReportStatusView }
  | { kind: 'missing' }
  | { kind: 'error' };

/** The timeline for one report. Shows only what the status endpoint returns. */
export default function ReportStatus({ reportId }: { reportId: string }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    const ctl = new AbortController();
    setLoad({ kind: 'loading' });
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/reports/${encodeURIComponent(reportId)}`, {
          signal: ctl.signal,
          cache: 'no-store',
        });
        if (res.status === 404) return setLoad({ kind: 'missing' });
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !type.includes('json')) return setLoad({ kind: 'error' });
        const body: unknown = await res.json();
        if (!isReportStatusView(body, reportId)) return setLoad({ kind: 'error' });
        setLoad({ kind: 'ok', view: body });
      } catch {
        if (!ctl.signal.aborted) setLoad({ kind: 'error' });
      }
    })();
    return () => ctl.abort();
  }, [reportId]);

  if (load.kind === 'loading') {
    return <p className="text-sm text-muted-foreground" role="status">Checking your report&hellip;</p>;
  }
  if (load.kind === 'missing') {
    return (
      <p className="text-sm text-muted-foreground">
        We couldn&rsquo;t find a report with that reference. Check it and try again.
      </p>
    );
  }
  if (load.kind === 'error') {
    return (
      <p className="text-sm text-muted-foreground" role="alert">
        We couldn&rsquo;t load this report&rsquo;s status. Try again in a moment.
      </p>
    );
  }

  const { view } = load;
  const reached = STEPS.findIndex((s) => s.name === view.status);
  return (
    <div className="space-y-5">
      <ol className="space-y-3" aria-label="Report progress">
        {STEPS.map((step, i) => {
          const done = i <= reached;
          return (
            <li
              key={step.name}
              aria-current={i === reached ? 'step' : undefined}
              className={`flex items-center gap-2.5 text-sm ${done ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  done ? 'border-primary/40 bg-teal/5 text-teal-deep' : 'border-border'
                }`}
                aria-hidden="true"
              >
                {done ? <Check className="h-3 w-3" /> : null}
              </span>
              {step.label}
              {!done ? <span className="sr-only"> (not yet)</span> : null}
            </li>
          );
        })}
      </ol>
      {view.outcome ? (
        <p className="text-sm text-foreground">{view.outcome}</p>
      ) : (
        <p className="text-sm text-muted-foreground">We have not reviewed this yet.</p>
      )}
      <Link to="/" className="text-sm underline">Back to SokoPulse</Link>
    </div>
  );
}
