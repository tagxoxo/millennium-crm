-- ============================================================
-- PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- ============================================================
-- 1. Go to https://supabase.com/dashboard
-- 2. Open your project (millennium-crm)
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New query"
-- 5. Select ALL of the SQL below (from ALTER TABLE... through the closing ); )
-- 6. Click "Run" (or press Cmd+Enter)
-- 7. You should see "Success. No rows returned"
-- ============================================================

ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_carrier_check;

ALTER TABLE policies ADD CONSTRAINT policies_carrier_check
  CHECK (carrier IN (
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
