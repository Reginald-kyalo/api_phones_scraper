-- 0000: the legacy report/honeypot schema, frozen as it existed before
-- idempotent submissions. Every statement is CREATE ... IF NOT EXISTS, so this
-- bootstraps a fresh database and adopts one created by hand from the old
-- schema.sql without touching a row. Never edit this file: change the schema
-- with a new numbered migration.

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  scope       TEXT NOT NULL DEFAULT 'cluster',
  cluster_id  TEXT,
  title       TEXT,
  category    TEXT,
  captured_at TEXT,
  page_url    TEXT,
  note        TEXT,
  country     TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_facets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id   INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  subject     TEXT,
  value       TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_cluster ON reports (cluster_id);
CREATE INDEX IF NOT EXISTS idx_reports_scope   ON reports (scope, created_at);
CREATE INDEX IF NOT EXISTS idx_facets_report   ON report_facets (report_id);
CREATE INDEX IF NOT EXISTS idx_facets_kind     ON report_facets (kind, subject);

CREATE TABLE IF NOT EXISTS honeypot_hits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ip          TEXT,
  user_agent  TEXT,
  path        TEXT,
  country     TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_honeypot_ip ON honeypot_hits (ip, created_at);
