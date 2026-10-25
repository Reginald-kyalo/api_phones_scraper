/**
 * The browser/edge wire contract for POST /api/reports. Types only plus the
 * receipt guard: the runtime validation of a submission lives in
 * functions/lib/reportRequest.ts and never trusts these types.
 */

export type ReportScope = 'cluster' | 'deal' | 'site';

export type ReportFacetKind =
  | 'grouping'
  | 'title'
  | 'image'
  | 'category'
  | 'price'
  | 'dead_link'
  | 'lowest_price'
  | 'spread'
  | 'not_a_deal'
  | 'other';

export interface ReportFacetInput {
  kind: ReportFacetKind;
  subject?: string | null;
  value?: string | null;
}

/** What the browser sends. Optional context values may be null. */
export interface ReportInput {
  scope: ReportScope;
  cluster_id?: string | null;
  title?: string | null;
  category?: string | null;
  captured_at?: string | null;
  page_url?: string | null;
  note?: string | null;
  version?: string | null;
  facets: ReportFacetInput[];
}

/** The receipt echoes ids only, never the submitted note or context. */
export interface ReportReceipt {
  ok: true;
  report_id: string;
  submission_key: string;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isReportReceipt(value: unknown, expectedKey?: string): value is ReportReceipt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.ok !== true) return false;
  if (typeof v.report_id !== 'string' || v.report_id.trim() === '') return false;
  if (typeof v.submission_key !== 'string' || !UUID_RE.test(v.submission_key)) return false;
  if (expectedKey !== undefined && v.submission_key.toLowerCase() !== expectedKey.toLowerCase()) return false;
  return true;
}

export type ReportStatusName = 'received' | 'reviewed' | 'resolved';

/** GET /api/reports/:id — the four public fields and nothing about the report's content. */
export interface ReportStatusView {
  ok: true;
  report_id: string;
  status: ReportStatusName;
  outcome: string | null;
  status_updated_at: string | null;
}

export function isReportStatusView(value: unknown, expectedId?: string): value is ReportStatusView {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.ok !== true) return false;
  if (typeof v.report_id !== 'string' || v.report_id === '') return false;
  if (expectedId !== undefined && v.report_id !== expectedId) return false;
  if (v.status !== 'received' && v.status !== 'reviewed' && v.status !== 'resolved') return false;
  if (v.outcome !== null && typeof v.outcome !== 'string') return false;
  if (v.status_updated_at !== null && typeof v.status_updated_at !== 'string') return false;
  return true;
}
