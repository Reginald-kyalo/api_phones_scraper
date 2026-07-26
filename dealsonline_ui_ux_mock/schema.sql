-- D1 schema for reader-submitted reports.
--
--   npx wrangler d1 create dealsonline-reports
--   npx wrangler d1 execute dealsonline-reports --remote --file=./schema.sql
--
-- TWO TABLES, because one submission carries many verdicts. `reports` is the
-- submission and its context; `report_facets` is one row per thing the reader
-- ticked. The alternative — a column per question — cannot express the most
-- valuable question at all: "do these belong together?" needs ONE VERDICT PER
-- ABSORBED CLUSTER, an unbounded list. Splitting it this way also means a single
-- report on a 5-way merge yields five independently usable labels instead of one
-- row someone has to re-parse.
--
-- ⚠️ cluster_id is deliberately NOT a foreign key, NOT unique, and NOT NOT-NULL:
--   * not a key   — 4,082 of 61,473 clusters are unions of several engine
--                   clusters, so an id can stop resolving after a rebuild.
--   * nullable    — site-wide reports are not about any one product.
-- Reports are an append-only log of what a reader saw. `store_url` and
-- `captured_at` are what keep a row meaningful once clustering has moved on.
--
-- ✅ The absorbed ids ARE now published (`mvp_merged_from`), so a report can
-- record exactly which ids it judged and be re-attached later. That was not true
-- when this table was first written.

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 'cluster' (a comparison page) | 'deal' (a card) | 'site' (no product)
  scope       TEXT NOT NULL DEFAULT 'cluster',
  cluster_id  TEXT,                 -- NULL when scope = 'site'

  -- Context as the reader saw it. Stored verbatim: a rebuild changes the live
  -- values, and a report is only interpretable against what was on screen.
  title       TEXT,
  category    TEXT,
  captured_at TEXT,                 -- dataset snapshot the reader was looking at
  page_url    TEXT,

  note        TEXT,                 -- the optional free-text comment
  country     TEXT,                 -- cf-ipcountry; coarse enough not to identify anyone
  created_at  TEXT NOT NULL
);

-- One row per ticked item. `kind` says which question, `subject` says which
-- thing it was about (a store name, an absorbed cluster_id), and `value` carries
-- the correction when the reader supplied one.
--
--   kind            subject                     value
--   --------------  --------------------------  ---------------------------
--   grouping        <absorbed cluster_id>       'wrong' | 'ok'
--   title           NULL                        the corrected name, or NULL
--   image           NULL                        NULL
--   price           <store>                     the corrected price, or NULL
--   dead_link       <store>                     NULL
--   lowest_price    NULL                        the store that is actually cheapest
--   spread          NULL                        why the % is wrong (enum)
--   not_a_deal      NULL                        why (enum), optional
--   category        NULL                        the category it should be in
--   other           NULL                        NULL
--
-- ⚠️ `value` is TEXT even for prices. The reader's number is a claim, not a
-- measurement, and coercing it at write time would silently drop anything
-- unparseable — which is itself a signal worth keeping.
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

-- Triage: which clusters draw the most complaints, and about what.
--   SELECT r.cluster_id, f.kind, COUNT(*) n, MAX(r.created_at) last
--   FROM reports r JOIN report_facets f ON f.report_id = r.id
--   GROUP BY r.cluster_id, f.kind ORDER BY n DESC LIMIT 50;
--
-- Merge labels, ready to use: every absorbed cluster a reader called wrong.
--   SELECT f.subject AS absorbed_cluster_id, COUNT(*) votes
--   FROM report_facets f
--   WHERE f.kind = 'grouping' AND f.value = 'wrong'
--   GROUP BY f.subject ORDER BY votes DESC;
