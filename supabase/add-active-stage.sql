-- Add "active" pipeline stage for current book clients outside the 60-day renewal window.
-- Run in Supabase SQL Editor if policy saves fail on stage = 'active'.

ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_stage_check;

ALTER TABLE policies ADD CONSTRAINT policies_stage_check CHECK (stage IN (
  'upcoming', 'contacted', 'quoted', 'retained', 'active', 'lapsed'
));

-- Optional one-time migration: move off-cycle "retained" rows to active when expiration > 60 days out.
UPDATE policies
SET stage = 'active'
WHERE stage = 'retained'
  AND COALESCE(is_historical, false) = false
  AND renewal_date > (CURRENT_DATE + INTERVAL '60 days');
