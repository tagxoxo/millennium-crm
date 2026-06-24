-- ============================================================
-- PASTE THIS INTO SUPABASE SQL EDITOR (run once)
-- ============================================================
-- Adds prior carrier — who they were with before you moved them
-- ============================================================

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS prior_carrier TEXT;

ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_prior_carrier_check;

ALTER TABLE policies ADD CONSTRAINT policies_prior_carrier_check
  CHECK (prior_carrier IS NULL OR prior_carrier IN (
    'trexis',
    'progressive',
    'gainsco',
    'foremost',
    'safeco',
    'national_general',
    'bristol_west',
    'geico',
    'liberty_mutual_bop',
    'liberty_mutual_surety_bond',
    'tapco',
    'cna',
    'bruce_messier',
    'mesa',
    'acceptance_independent'
  ));
