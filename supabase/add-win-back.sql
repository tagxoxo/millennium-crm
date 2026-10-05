-- Win Back list on the Sales Center.
-- Leads can sit in a win_back stage with the date the person left.
-- Policies can be taken off the Win Back column without deleting the policy.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE leads ADD CONSTRAINT leads_stage_check
  CHECK (stage IN ('new', 'contacted', 'quoted', 'sold', 'win_back'));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS left_on DATE;

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS win_back_closed_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
