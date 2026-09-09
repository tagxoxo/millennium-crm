-- Add Safeway to policies.carrier and policies.prior_carrier checks
-- Run: npm run db:apply supabase/add-safeway-carrier.sql

ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_carrier_check;

ALTER TABLE policies ADD CONSTRAINT policies_carrier_check
  CHECK (carrier IN (
    'trexis',
    'progressive',
    'gainsco',
    'foremost',
    'safeco',
    'safeway',
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

ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_prior_carrier_check;

ALTER TABLE policies ADD CONSTRAINT policies_prior_carrier_check
  CHECK (prior_carrier IS NULL OR prior_carrier IN (
    'trexis',
    'progressive',
    'gainsco',
    'foremost',
    'safeco',
    'safeway',
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
