-- ============================================================
-- VA ACCESS — virtual assistant request queue + role on users
-- There is no profiles table; role lives on public.users.
-- ============================================================

-- Role for admin vs virtual assistant logins
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'va'));

-- Request queue submitted by VAs
CREATE TABLE IF NOT EXISTS va_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  caller_name TEXT NOT NULL,
  policy_number TEXT,
  phone_number TEXT,
  request_type TEXT NOT NULL CHECK (
    request_type IN (
      'add_vehicle',
      'remove_vehicle',
      'payment_question',
      'new_quote',
      'add_a_driver',
      'other'
    )
  ),
  language TEXT NOT NULL DEFAULT 'english' CHECK (language IN ('english', 'spanish')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent_to_agent', 'completed')
  ),
  completed_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users (id)
);

CREATE INDEX IF NOT EXISTS idx_va_requests_submitted_by ON va_requests (submitted_by);
CREATE INDEX IF NOT EXISTS idx_va_requests_status ON va_requests (status);
CREATE INDEX IF NOT EXISTS idx_va_requests_created_at ON va_requests (created_at DESC);

ALTER TABLE va_requests ENABLE ROW LEVEL SECURITY;

-- VA: insert/select only their own rows
DROP POLICY IF EXISTS "VA can select own va_requests" ON va_requests;
CREATE POLICY "VA can select own va_requests"
  ON va_requests
  FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'va'
    )
  );

DROP POLICY IF EXISTS "VA can insert own va_requests" ON va_requests;
CREATE POLICY "VA can insert own va_requests"
  ON va_requests
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

-- Admin: full access to every row
DROP POLICY IF EXISTS "Admin can select all va_requests" ON va_requests;
CREATE POLICY "Admin can select all va_requests"
  ON va_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert va_requests" ON va_requests;
CREATE POLICY "Admin can insert va_requests"
  ON va_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update va_requests" ON va_requests;
CREATE POLICY "Admin can update va_requests"
  ON va_requests
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

DROP POLICY IF EXISTS "Admin can delete va_requests" ON va_requests;
CREATE POLICY "Admin can delete va_requests"
  ON va_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );
