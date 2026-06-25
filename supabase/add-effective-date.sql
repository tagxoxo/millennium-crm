-- Add effective date to policies (expiration stays in renewal_date)
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS effective_date DATE;

CREATE INDEX IF NOT EXISTS idx_policies_effective_date ON policies(effective_date);
