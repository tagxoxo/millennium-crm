-- Mid-term cancellation date. Separate from Lapsed (did not renew).
-- Run: npm run db:apply supabase/add-cancelled-on.sql

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS cancelled_on DATE;

CREATE INDEX IF NOT EXISTS idx_policies_cancelled_on
  ON policies (cancelled_on)
  WHERE cancelled_on IS NOT NULL;

NOTIFY pgrst, 'reload schema';
