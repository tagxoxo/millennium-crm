-- Policy document storage: bucket + metadata table + client_address on policies

ALTER TABLE policies ADD COLUMN IF NOT EXISTS client_address TEXT;

CREATE TABLE IF NOT EXISTS policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by TEXT NOT NULL DEFAULT 'staff',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_policy_documents_policy_id ON policy_documents(policy_id);

ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on policy_documents" ON policy_documents;
CREATE POLICY "Allow all on policy_documents" ON policy_documents FOR ALL USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'policy-documents',
  'policy-documents',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
