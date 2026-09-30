-- Cadence start date: Day 1 begins when outreach starts, not the cancelled date.
-- Cancelled dates are usually known the next day (e.g. 10/01 list is 09/30 cancels).

ALTER TABLE va_cancel_outreach
  ADD COLUMN IF NOT EXISTS start_date DATE;

UPDATE va_cancel_outreach
SET start_date = COALESCE(
  start_date,
  (created_at AT TIME ZONE 'America/Chicago')::date,
  cancelled_date
)
WHERE start_date IS NULL;

ALTER TABLE va_cancel_outreach
  ALTER COLUMN start_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_va_cancel_outreach_start_date
  ON va_cancel_outreach (start_date);

DROP POLICY IF EXISTS "VA can delete va_cancel_outreach" ON va_cancel_outreach;
CREATE POLICY "VA can delete va_cancel_outreach"
  ON va_cancel_outreach
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'va'
    )
  );
