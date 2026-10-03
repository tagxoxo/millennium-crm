-- Inbound website-lead call tracker for the VA desk.
-- Weekday cadence: 1 (call + double dial + VM#1), 2 call, 3 call+VM#2,
-- 4 call, 5 call, 6 call+VM#3, 7 call. Saturday and Sunday are skipped.

CREATE TABLE IF NOT EXISTS va_inbound_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'transferred', 'callback', 'closed')
  ),
  callback_at TIMESTAMPTZ,
  attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  submitted_by UUID REFERENCES auth.users (id)
);

CREATE INDEX IF NOT EXISTS idx_va_inbound_leads_status
  ON va_inbound_leads (status);

CREATE INDEX IF NOT EXISTS idx_va_inbound_leads_start_date
  ON va_inbound_leads (start_date);

CREATE INDEX IF NOT EXISTS idx_va_inbound_leads_callback_at
  ON va_inbound_leads (callback_at);

CREATE INDEX IF NOT EXISTS idx_va_inbound_leads_created_at
  ON va_inbound_leads (created_at DESC);

ALTER TABLE va_inbound_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VA can select va_inbound_leads" ON va_inbound_leads;
CREATE POLICY "VA can select va_inbound_leads"
  ON va_inbound_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'va'
    )
  );

DROP POLICY IF EXISTS "VA can insert va_inbound_leads" ON va_inbound_leads;
CREATE POLICY "VA can insert va_inbound_leads"
  ON va_inbound_leads
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

DROP POLICY IF EXISTS "VA can update va_inbound_leads" ON va_inbound_leads;
CREATE POLICY "VA can update va_inbound_leads"
  ON va_inbound_leads
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

DROP POLICY IF EXISTS "VA can delete va_inbound_leads" ON va_inbound_leads;
CREATE POLICY "VA can delete va_inbound_leads"
  ON va_inbound_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'va'
    )
  );

DROP POLICY IF EXISTS "Admin can select va_inbound_leads" ON va_inbound_leads;
CREATE POLICY "Admin can select va_inbound_leads"
  ON va_inbound_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert va_inbound_leads" ON va_inbound_leads;
CREATE POLICY "Admin can insert va_inbound_leads"
  ON va_inbound_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update va_inbound_leads" ON va_inbound_leads;
CREATE POLICY "Admin can update va_inbound_leads"
  ON va_inbound_leads
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

DROP POLICY IF EXISTS "Admin can delete va_inbound_leads" ON va_inbound_leads;
CREATE POLICY "Admin can delete va_inbound_leads"
  ON va_inbound_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );
