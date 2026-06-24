-- ============================================================
-- PASTE THIS INTO SUPABASE SQL EDITOR (run once)
-- ============================================================
-- Adds a "commercial" flag to policies (like spanish_speaker)
-- 1. Go to https://supabase.com/dashboard → your project
-- 2. SQL Editor → New query → paste below → Run
-- ============================================================

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS commercial BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_policies_commercial ON policies(commercial);
