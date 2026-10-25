/**
 * Browser side of POST /api/reports. "Saved" means exactly one thing here: the
 * response body is a receipt for THIS submission's own key (isReportReceipt).
 * HTTP status and content type are never enough: a static host answers the SPA
 * shell with 200, and a proxy can answer any JSON.
 */
import { isReportReceipt, UUID_RE, type ReportInput, type ReportReceipt } from './reportContract';

export type ReportErrorKind =
  | 'invalid' // 400/413/415: the server refused the content; retrying cannot help
  | 'conflict' // 409: this key was already used for different content
  | 'rate-limited' // 429
  | 'unavailable' // 503 and other server faults
  | 'network' // no response, or timed out
  | 'bad-receipt'; // a response arrived but was not a receipt for our key

export class ReportError extends Error {
  constructor(
    readonly kind: ReportErrorKind,
    readonly status: number,
    /** True when the server may have stored the report despite this failure. */
    readonly uncertain: boolean,
    readonly retryAfterMs: number | null = null,
  ) {
    super(`report failed: ${kind}${status ? ` (${status})` : ''}`);
    this.name = 'ReportError';
  }
}

export const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRY_AFTER_MS = 120000;

function retryAfter(res: Response): number | null {
  const raw = res.headers.get('retry-after');
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  return Math.min(Number(raw.trim()) * 1000, MAX_RETRY_AFTER_MS);
}

export async function submitReport(
  body: ReportInput,
  submissionKey: string,
  fetcher: typeof fetch = (...a) => fetch(...a),
  options: { timeoutMs?: number } = {},
): Promise<ReportReceipt> {
  if (!UUID_RE.test(submissionKey)) throw new ReportError('invalid', 0, false);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetcher(`${import.meta.env.BASE_URL}api/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': submissionKey },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });
    } catch {
      // The request may have reached the server before the connection died.
      throw new ReportError('network', 0, true);
    }

    if (res.status === 200 || res.status === 201) {
      let parsed: unknown;
      try {
        parsed = await res.json();
      } catch {
        throw new ReportError('bad-receipt', res.status, true);
      }
      if (!isReportReceipt(parsed, submissionKey)) throw new ReportError('bad-receipt', res.status, true);
      return parsed;
    }
    if ([400, 413, 415].includes(res.status)) throw new ReportError('invalid', res.status, false);
    if (res.status === 409) throw new ReportError('conflict', res.status, false);
    if (res.status === 429) throw new ReportError('rate-limited', res.status, false, retryAfter(res));
    // 503 is the server saying nothing was stored; other statuses are unknown.
    throw new ReportError('unavailable', res.status, res.status !== 503, retryAfter(res));
  } finally {
    clearTimeout(timer);
  }
}
