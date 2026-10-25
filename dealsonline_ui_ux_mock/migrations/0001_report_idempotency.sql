-- 0001: idempotent report submissions. Additive only: existing reports keep
-- their numeric ids and every old row stays valid (the new columns are NULL on
-- them, and the unique indexes ignore NULLs).
--   submission_key   the client's Idempotency-Key (lowercase UUID)
--   payload_hash     SHA-256 of the canonical report body (see reportStore.ts)
--   selected_version the dataset version the reader had selected
--   position         a facet's index within its report, in submitted order

ALTER TABLE reports ADD COLUMN submission_key TEXT;
ALTER TABLE reports ADD COLUMN payload_hash TEXT;
ALTER TABLE reports ADD COLUMN selected_version TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_submission_key
  ON reports (submission_key) WHERE submission_key IS NOT NULL;

ALTER TABLE report_facets ADD COLUMN position INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS uq_facets_report_position
  ON report_facets (report_id, position);
