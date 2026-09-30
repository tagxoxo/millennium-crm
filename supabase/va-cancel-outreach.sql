-- Canceled-policy outbound call tracker for the VA desk.
-- Cadence days: 1 (call+VM), 2 (call), 3 (VM), 5 (call), 8 (call+VM).

CREATE TABLE IF NOT EXISTS va_cancel_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  cancelled_date DATE NOT NULL,
  amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'reinstated', 'closed')
  ),
  attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  submitted_by UUID REFERENCES auth.users (id)
);

CREATE INDEX IF NOT EXISTS idx_va_cancel_outreach_status
  ON va_cancel_outreach (status);

CREATE INDEX IF NOT EXISTS idx_va_cancel_outreach_cancelled_date
  ON va_cancel_outreach (cancelled_date);

CREATE INDEX IF NOT EXISTS idx_va_cancel_outreach_created_at
  ON va_cancel_outreach (created_at DESC);

ALTER TABLE va_cancel_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VA can select va_cancel_outreach" ON va_cancel_outreach;
CREATE POLICY "VA can select va_cancel_outreach"
  ON va_cancel_outreach
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'va'
    )
  );

DROP POLICY IF EXISTS "VA can insert va_cancel_outreach" ON va_cancel_outreach;
CREATE POLICY "VA can insert va_cancel_outreach"
  ON va_cancel_outreach
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'va'
    )
  );

DROP POLICY IF EXISTS "VA can update va_cancel_outreach" ON va_cancel_outreach;
CREATE POLICY "VA can update va_cancel_outreach"
  ON va_cancel_outreach
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'va'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'va'
    )
  );

DROP POLICY IF EXISTS "Admin can select va_cancel_outreach" ON va_cancel_outreach;
CREATE POLICY "Admin can select va_cancel_outreach"
  ON va_cancel_outreach
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert va_cancel_outreach" ON va_cancel_outreach;
CREATE POLICY "Admin can insert va_cancel_outreach"
  ON va_cancel_outreach
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update va_cancel_outreach" ON va_cancel_outreach;
CREATE POLICY "Admin can update va_cancel_outreach"
  ON va_cancel_outreach
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can delete va_cancel_outreach" ON va_cancel_outreach;
CREATE POLICY "Admin can delete va_cancel_outreach"
  ON va_cancel_outreach
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );
