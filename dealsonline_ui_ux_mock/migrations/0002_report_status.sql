-- 0002: a reader-visible status for each report. Additive only: existing rows
-- keep every value and get NULL here, and the API reads a NULL status as
-- 'received' (so a rolled-back handler that never writes these columns is also
-- fine). New rows are inserted with status 'received' by reportStore.ts.
--   status             received | reviewed | resolved
--   outcome            operator-written text shown to the reader, <= 300 characters
--   status_updated_at  when an operator last changed status/outcome (ISO 8601)
-- Status is changed only by an operator with `wrangler d1 execute` (DEPLOY.md);
-- there is no public write path.

ALTER TABLE reports ADD COLUMN status TEXT
  CHECK (status IS NULL OR status IN ('received', 'reviewed', 'resolved'));
ALTER TABLE reports ADD COLUMN outcome TEXT
  CHECK (outcome IS NULL OR length(outcome) <= 300);
ALTER TABLE reports ADD COLUMN status_updated_at TEXT;
