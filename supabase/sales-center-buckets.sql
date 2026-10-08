-- Sales Center columns: Home nurturing (stored as new), Quoted, Luis Leads, Win Back.
-- Contacted and Sold are no longer buckets.

UPDATE leads
SET stage = 'new'
WHERE stage IN ('contacted', 'sold');

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE leads ADD CONSTRAINT leads_stage_check
  CHECK (stage IN ('new', 'quoted', 'luis_leads', 'win_back'));

NOTIFY pgrst, 'reload schema';
