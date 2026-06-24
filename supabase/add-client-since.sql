-- ============================================================
-- PASTE THIS INTO SUPABASE SQL EDITOR (run once)
-- ============================================================
-- Adds "client since" date — when you first got them as a client
-- ============================================================

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS client_since DATE;
