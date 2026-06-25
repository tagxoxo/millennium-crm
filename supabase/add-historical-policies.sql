-- Past / historical policies (shown on client profile only, not pipeline)
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS is_historical BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_policies_is_historical ON policies (is_historical);
