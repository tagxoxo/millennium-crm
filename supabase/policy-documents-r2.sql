-- Policy documents metadata (files stored in Cloudflare R2)

ALTER TABLE policies ADD COLUMN IF NOT EXISTS client_address TEXT;

CREATE TABLE IF NOT EXISTS policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_policy_documents_policy_id ON policy_documents(policy_id);

ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on policy_documents" ON policy_documents;
CREATE POLICY "Allow all on policy_documents" ON policy_documents FOR ALL USING (true) WITH CHECK (true);

-- Migrate legacy Supabase Storage columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'policy_documents' AND column_name = 'file_path'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'policy_documents' AND column_name = 'r2_key'
  ) THEN
    ALTER TABLE policy_documents ADD COLUMN r2_key TEXT;
    UPDATE policy_documents SET r2_key = file_path WHERE r2_key IS NULL;
    ALTER TABLE policy_documents ALTER COLUMN r2_key SET NOT NULL;
    ALTER TABLE policy_documents DROP COLUMN file_path;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'policy_documents' AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE policy_documents DROP COLUMN uploaded_by;
  END IF;
END $$;
