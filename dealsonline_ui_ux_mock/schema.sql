-- D1 schema for reader-submitted listing reports.
--
--   npx wrangler d1 create dealsonline-reports
--   npx wrangler d1 execute dealsonline-reports --remote --file=./schema.sql
--
-- ⚠️ cluster_id is deliberately NOT a foreign key or a unique key. 4,082 of
-- 61,473 clusters are unions of several engine clusters and the absorbed ids
-- are not published, so an id can stop resolving after a rebuild. Reports are
-- an append-only log of what a reader saw; store_url and captured_at are what
-- make a row still meaningful once the clustering has moved on.
CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_id  TEXT NOT NULL,
  reason      TEXT NOT NULL,
  note        TEXT,
  title       TEXT,       -- what the reader saw, which may differ after a rebuild
  category    TEXT,
  store       TEXT,       -- set when the report is about one store's offer
  store_url   TEXT,       -- the durable anchor: a real listing, independent of clustering
  captured_at TEXT,       -- dataset snapshot the reader was looking at
  page_url    TEXT,
  country     TEXT,       -- cf-ipcountry; coarse enough not to identify anyone
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_cluster ON reports (cluster_id);
CREATE INDEX IF NOT EXISTS idx_reports_reason  ON reports (reason, created_at);

-- Triage: which clusters draw the most complaints.
--   SELECT cluster_id, reason, COUNT(*) n, MAX(created_at) last
--   FROM reports GROUP BY cluster_id, reason ORDER BY n DESC LIMIT 50;
