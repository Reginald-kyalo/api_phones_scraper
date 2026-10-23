/**
 * Page-sized catalogue data embedded in prerendered HTML.
 *
 * The prerender writes a product page's HTML from the dataset, then React
 * replaces that HTML with its own render and asks the catalogue for the same
 * product again. When that request fails the page loses its heading and
 * prices (scraping review 2026-10-23, §2). So the prerender also embeds the
 * responses the page will ask for, as JSON in a script tag, and the client
 * answers its first requests from there instead of the network.
 *
 * Only the current page's data is embedded: one product, or one page of a
 * listing. The HTML and the payload are built from one dataset version, so
 * the embedded response is the response the API would give.
 *
 * Shared by scripts/prerender.ts (writes) and lib/api.ts (reads), so the key
 * for a request is computed by one function on both sides.
 */

export const INITIAL_DATA_ID = 'catalogue-initial';
export const INITIAL_SCHEMA_VERSION = 1 as const;

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * One string per request: the operation and its result-changing parameters,
 * sorted, with empty values dropped (the same rule lib/api.ts applies when it
 * builds the URL), so "limit=48&slug=x" and "slug=x&limit=48" are one key.
 */
export function queryKey(op: string, params: QueryParams = {}): string {
  const qs = new URLSearchParams();
  for (const name of Object.keys(params).sort()) {
    const value = params[name];
    if (value === undefined || value === null || value === '') continue;
    qs.set(name, String(value));
  }
  const s = qs.toString();
  return s ? `${op}?${s}` : op;
}

export interface InitialQuery {
  key: string;
  response: unknown;
}

export interface InitialPayload {
  schemaVersion: typeof INITIAL_SCHEMA_VERSION;
  /** The dataset's capture timestamp, for diagnostics. */
  catalogueVersion: string;
  /** Decoded pathname the payload belongs to; any other page ignores it. */
  pathname: string;
  queries: InitialQuery[];
}

/**
 * JSON that is safe inside a <script> element: a `<` in a product title
 * cannot close the tag, and the two Unicode line separators that are legal in
 * JSON but not in JavaScript source are escaped too.
 */
// Built from code points so this source file itself contains no raw separator.
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), 'g');
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), 'g');

export function serializeInitialData(payload: InitialPayload): string {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(LINE_SEP, '\u2028')
    .replace(PARA_SEP, '\u2029');
}

export function initialDataScript(payload: InitialPayload): string {
  return `<script type="application/json" id="${INITIAL_DATA_ID}">${serializeInitialData(payload)}</script>`;
}

function isPayload(value: unknown): value is InitialPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === INITIAL_SCHEMA_VERSION &&
    typeof v.catalogueVersion === 'string' &&
    typeof v.pathname === 'string' &&
    Array.isArray(v.queries) &&
    v.queries.every((q) => q && typeof q === 'object' && typeof (q as InitialQuery).key === 'string' && 'response' in (q as object))
  );
}

/**
 * The payload on this page, or null when there is none, it is malformed, or
 * it was written for a different pathname (a bookmark served by the 404
 * shell, say). Pure: pass the document and location to test it.
 */
export function readInitialCatalogueData(
  doc: Pick<Document, 'getElementById'>,
  pathname: string,
): InitialPayload | null {
  const el = doc.getElementById(INITIAL_DATA_ID);
  if (!el?.textContent) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(el.textContent);
  } catch {
    return null;
  }
  if (!isPayload(parsed)) return null;
  let here: string;
  try {
    here = decodeURIComponent(pathname);
  } catch {
    here = pathname;
  }
  return parsed.pathname === here ? parsed : null;
}

let store: Map<string, unknown> | null | undefined;

/**
 * The embedded response for one request, once. The first call reads the
 * payload; each key is handed out a single time, so a later navigation back
 * to the same page fetches live data like any other page.
 */
export function takeInitialResponse<T>(op: string, params: QueryParams = {}): T | undefined {
  if (typeof document === 'undefined' || typeof location === 'undefined') return undefined;
  if (store === undefined) {
    const payload = readInitialCatalogueData(document, location.pathname);
    store = payload ? new Map(payload.queries.map((q) => [q.key, q.response])) : null;
  }
  if (!store) return undefined;
  const key = queryKey(op, params);
  if (!store.has(key)) return undefined;
  const response = store.get(key) as T;
  store.delete(key);
  return response;
}

/** Test seam. */
export function resetInitialCatalogueData() {
  store = undefined;
}
