-- ============================================================
-- LEADS TABLE — new business pipeline (separate from policies)
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'quoted', 'sold')),
  label TEXT,
  agent_initials TEXT NOT NULL DEFAULT 'JG',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on leads" ON leads;
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
