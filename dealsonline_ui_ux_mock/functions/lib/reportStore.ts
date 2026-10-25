/**
 * Durable, idempotent storage for one report (the `reports` parent and its
 * `report_facets` children) in D1.
 *
 * ONE `db.batch()` does the whole write. D1 runs a batch as a single
 * transaction and rolls it back if any statement fails, so a report either
 * lands with every facet or not at all. There is deliberately no separate
 * parent INSERT beforehand: its id would exist before the children, and a
 * failure between the two is exactly the partial write this replaces.
 *
 * Inside the batch:
 *   1. the parent is inserted with `ON CONFLICT (submission_key) DO NOTHING`,
 *      targeting only the idempotency index (any other constraint failure still
 *      raises and rolls the batch back);
 *   2. each facet is inserted from a SELECT that resolves the parent BY KEY, and
 *      only where that parent's `payload_hash` equals ours. A caller whose key
 *      was already taken by a different body therefore inserts no children, and
 *      a replay hits the `(report_id, position)` index and adds nothing.
 *
 * Afterwards the winning row is read back and checked (hash and facet count)
 * before success is claimed. Created-versus-replay comes from the parent
 * statement's `meta.changes` inside the batch result, not from a lookup done
 * beforehand, so two racing callers cannot both believe they created it.
 */
import type { ValidatedReport } from './reportRequest';

/** The key was already used for a report with a different body. */
export class ReportConflictError extends Error {
  constructor() {
    super('idempotency key already used for a different report');
    this.name = 'ReportConflictError';
  }
}

/**
 * The text that identifies a report's content. A fixed field order (never an
 * object spread) with facets in submitted order. The request country and server
 * timestamps are excluded: a retry from another network is still the same report.
 */
export function canonicalReportBody(report: ValidatedReport): string {
  return JSON.stringify([
    1, // canonical-form version
    report.scope,
    report.cluster_id,
    report.title,
    report.category,
    report.captured_at,
    report.page_url,
    report.note,
    report.selected_version,
    report.facets.map((f) => [f.kind, f.subject, f.value]),
  ]);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function saveReport(
  db: D1Database,
  submissionKey: string,
  report: ValidatedReport,
  context: { country: string | null },
): Promise<{ reportId: string; created: boolean }> {
  const payloadHash = await sha256Hex(canonicalReportBody(report));

  const parent = db
    .prepare(
      `INSERT INTO reports
         (scope, cluster_id, title, category, captured_at, page_url, note,
          country, created_at, submission_key, payload_hash, selected_version, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, 'received')
       ON CONFLICT (submission_key) WHERE submission_key IS NOT NULL DO NOTHING`,
    )
    .bind(
      report.scope, report.cluster_id, report.title, report.category,
      report.captured_at, report.page_url, report.note, context.country,
      submissionKey, payloadHash, report.selected_version,
    );

  const children = report.facets.map((f, position) =>
    db
      .prepare(
        `INSERT INTO report_facets (report_id, kind, subject, value, position)
         SELECT r.id, ?, ?, ?, ?
           FROM reports r
          WHERE r.submission_key = ? AND r.payload_hash = ?
         ON CONFLICT (report_id, position) DO NOTHING`,
      )
      .bind(f.kind, f.subject, f.value, position, submissionKey, payloadHash),
  );

  const results = await db.batch([parent, ...children]);
  const created = results[0]?.meta?.changes === 1;

  // Whoever won, read the row that now owns this key and verify it is ours.
  const winner = await db
    .prepare(
      `SELECT r.id AS id, r.payload_hash AS payload_hash,
              (SELECT COUNT(*) FROM report_facets f WHERE f.report_id = r.id) AS facet_count
         FROM reports r WHERE r.submission_key = ?`,
    )
    .bind(submissionKey)
    .first<{ id: number; payload_hash: string; facet_count: number }>();

  if (!winner) throw new Error('report row missing after write');
  if (winner.payload_hash !== payloadHash) throw new ReportConflictError();
  if (winner.facet_count !== report.facets.length) throw new Error('report facets incomplete after write');
  return { reportId: String(winner.id), created };
}

export type ReportStatus = 'received' | 'reviewed' | 'resolved';

export interface ReportStatusView {
  report_id: string;
  status: ReportStatus;
  outcome: string | null;
  status_updated_at: string | null;
}

/** Report ids are positive integers; anything else cannot exist, so is not looked up. */
const REPORT_ID_RE = /^[1-9][0-9]{0,14}$/;

/**
 * The reader-visible status of one report, or null when the id is malformed or
 * unknown. Selects only the four public columns: the note, page URL and facets
 * are never read. A NULL (or unrecognised) status reads as 'received'.
 */
export async function getReportStatus(db: D1Database, id: string): Promise<ReportStatusView | null> {
  if (!REPORT_ID_RE.test(id)) return null;
  const row = await db
    .prepare('SELECT id, status, outcome, status_updated_at FROM reports WHERE id = ?')
    .bind(Number(id))
    .first<{ id: number; status: string | null; outcome: string | null; status_updated_at: string | null }>();
  if (!row) return null;
  const status: ReportStatus = row.status === 'reviewed' || row.status === 'resolved' ? row.status : 'received';
  return {
    report_id: String(row.id),
    status,
    outcome: row.outcome ?? null,
    status_updated_at: row.status_updated_at ?? null,
  };
}
