/**
 * Request validation for POST /api/reports: a bounded body reader and a pure
 * parser from untrusted JSON to a typed report, with no storage call either way.
 *
 * Bounds are the public contract (production foundation, phase one): 64 KiB of
 * actual UTF-8 body bytes (counted from the stream, never from Content-Length);
 * at most 60 facets; strings are required as strings (or null), never coerced,
 * trimmed, and rejected rather than truncated when overlength. Unknown fields
 * are ignored and never persisted. Report text is untrusted: it is data, and
 * must be escaped by any future triage interface.
 */
import { UUID_RE, type ReportFacetKind, type ReportScope } from '../../src/app/lib/reportContract';

export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_FACETS = 60;
export const MAX_NOTE = 1000;
export const MAX_TITLE = 500;
export const MAX_CLUSTER_ID = 512;
export const MAX_CATEGORY = 128;
export const MAX_VERSION = 256;
export const MAX_CAPTURED_AT = 40;
export const MAX_PAGE_URL = 2048;
export const MAX_SUBJECT = 512;
export const MAX_VALUE = 200;

const SCOPES = new Set<string>(['cluster', 'deal', 'site']);

/**
 * The checklist axes. Each names something the reader can actually see on the
 * page: `grouping` routes to the matcher, `category` to the categoriser,
 * `price` and `lowest_price` to the price guard, `dead_link` to freshness.
 * Keep in step with the checklist the UI renders.
 */
const KINDS = new Set<string>([
  'grouping', 'title', 'image', 'category', 'price', 'dead_link',
  'lowest_price', 'spread', 'not_a_deal', 'other',
]);

export interface ValidatedFacet {
  kind: ReportFacetKind;
  subject: string | null;
  value: string | null;
}

export interface ValidatedReport {
  scope: ReportScope;
  cluster_id: string | null;
  title: string | null;
  category: string | null;
  captured_at: string | null;
  page_url: string | null;
  note: string | null;
  selected_version: string | null;
  facets: ValidatedFacet[];
}

export type ReportParseResult =
  | { ok: true; report: ValidatedReport }
  | { ok: false; error: string };

export type ReportRequestResult =
  | { ok: true; report: ValidatedReport; submissionKey: string }
  | { ok: false; status: 400 | 413 | 415; error: string };

class Reject extends Error {}

const fail = (message: string): never => {
  throw new Reject(message);
};

const codePoints = (s: string) => [...s].length;

/** Optional text: absent/null/blank is null; anything but a string is rejected. */
function text(obj: Record<string, unknown>, name: string, max: number, label = name): string | null {
  const v = obj[name];
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return fail(`${label} must be a string`);
  const s = v.trim();
  if (codePoints(s) > max) return fail(`${label} is too long`);
  return s || null;
}

function pageUrl(obj: Record<string, unknown>): string | null {
  const s = text(obj, 'page_url', MAX_PAGE_URL);
  if (s === null) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return fail('page_url must be an absolute http(s) URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return fail('page_url must be an absolute http(s) URL');
  if (u.username || u.password) return fail('page_url must not contain credentials');
  return s;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseReportBody(value: unknown): ReportParseResult {
  try {
    if (!isObject(value)) return fail('expected a JSON object');

    const rawScope = value.scope;
    if (rawScope !== undefined && rawScope !== null && typeof rawScope !== 'string') fail('scope must be a string');
    const scope = ((rawScope as string | null | undefined) ?? '').trim() || 'cluster';
    if (!SCOPES.has(scope)) fail('unknown scope');

    const clusterId = text(value, 'cluster_id', MAX_CLUSTER_ID);
    // Only a site-wide report may omit the product; anything else without one
    // cannot be routed to a fix.
    if (scope !== 'site' && !clusterId) fail('cluster_id is required unless scope is "site"');

    const rawFacets = value.facets;
    if (rawFacets !== undefined && rawFacets !== null && !Array.isArray(rawFacets)) fail('facets must be an array');
    const list: unknown[] = (rawFacets as unknown[] | null | undefined) ?? [];
    if (list.length > MAX_FACETS) fail('too many facets');

    const note = text(value, 'note', MAX_NOTE);
    const facets: ValidatedFacet[] = list.map((f, i) => {
      if (!isObject(f)) return fail(`facet ${i} must be an object`);
      if (typeof f.kind !== 'string') return fail(`facet ${i} kind must be a string`);
      const kind = f.kind.trim();
      if (!KINDS.has(kind)) return fail('unknown facet kind');
      return {
        kind: kind as ReportFacetKind,
        subject: text(f, 'subject', MAX_SUBJECT, `facet ${i} subject`),
        value: text(f, 'value', MAX_VALUE, `facet ${i} value`),
      };
    });

    // A submission with neither a ticked box nor a comment says nothing.
    if (!facets.length && !note) fail('nothing reported');

    return {
      ok: true,
      report: {
        scope: scope as ReportScope,
        cluster_id: clusterId,
        title: text(value, 'title', MAX_TITLE),
        category: text(value, 'category', MAX_CATEGORY),
        captured_at: text(value, 'captured_at', MAX_CAPTURED_AT),
        page_url: pageUrl(value),
        note,
        selected_version: text(value, 'version', MAX_VERSION),
        facets,
      },
    };
  } catch (e) {
    if (e instanceof Reject) return { ok: false, error: e.message };
    throw e;
  }
}

/** Reads at most MAX_BODY_BYTES from the stream; null means over the limit. */
async function readBounded(request: Request): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

const isJsonType = (header: string | null) => {
  const type = (header || '').split(';')[0].trim().toLowerCase();
  return type === 'application/json';
};

/**
 * Validates the envelope (media type, idempotency key, size) and the body.
 * `requireKey` false lets a request without a key through with a server-made
 * one (old clients): that keeps them working but cannot deduplicate retries.
 */
export async function readReportRequest(
  request: Request,
  options: { requireKey?: boolean } = {},
): Promise<ReportRequestResult> {
  if (!isJsonType(request.headers.get('content-type'))) {
    return { ok: false, status: 415, error: 'content-type must be application/json' };
  }

  const header = request.headers.get('idempotency-key');
  let submissionKey: string;
  if (header === null || header.trim() === '') {
    if (options.requireKey) {
      return { ok: false, status: 400, error: 'This page is out of date. Reload it and try again.' };
    }
    submissionKey = crypto.randomUUID();
  } else if (UUID_RE.test(header.trim())) {
    submissionKey = header.trim().toLowerCase();
  } else {
    return { ok: false, status: 400, error: 'invalid Idempotency-Key' };
  }

  // Content-Length is advisory (it can be absent or false): used only to refuse
  // early. The stream count below is the authority.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'report is too large' };
  }
  const bytes = await readBounded(request);
  if (bytes === null) return { ok: false, status: 413, error: 'report is too large' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes));
  } catch {
    return { ok: false, status: 400, error: 'expected a JSON body' };
  }
  const result = parseReportBody(parsed);
  if (!result.ok) return { ok: false, status: 400, error: result.error };
  return { ok: true, report: result.report, submissionKey };
}
