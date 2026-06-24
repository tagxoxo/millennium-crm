-- ============================================================
-- PASTE THIS INTO SUPABASE SQL EDITOR (run once)
-- ============================================================
-- Adds 6-month vs 12-month term tracking on policies
-- ============================================================

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS term_months INTEGER NOT NULL DEFAULT 12;

ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_term_months_check;

ALTER TABLE policies ADD CONSTRAINT policies_term_months_check
  CHECK (term_months IN (6, 12));

CREATE INDEX IF NOT EXISTS idx_policies_term_months ON policies(term_months);
