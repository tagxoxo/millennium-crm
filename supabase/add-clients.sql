-- Clients table + policy client_id + policy_type
-- Run: npm run db:apply supabase/add-clients.sql

-- ============================================================
-- CLIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  is_spanish_speaker BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON clients (full_name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients (phone);

-- ============================================================
-- POLICIES: client_id + policy_type
-- ============================================================
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS policy_type TEXT NOT NULL DEFAULT 'personal_auto'
  CHECK (policy_type IN (
    'personal_auto',
    'commercial_auto',
    'homeowners',
    'renters',
    'commercial_general_liability',
    'life',
    'other'
  ));

CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies (client_id);

-- Default policy_type from commercial flag for existing rows
UPDATE policies
SET policy_type = CASE WHEN commercial THEN 'commercial_auto' ELSE 'personal_auto' END
WHERE policy_type IS NULL OR policy_type = 'personal_auto'
  AND commercial = true;

-- ============================================================
-- DATA MIGRATION: group by email, link policies to clients
-- ============================================================

-- 1) Clients for policies with email (one client per unique email)
WITH ranked AS (
  SELECT
    id,
    client_name,
    email,
    phone,
    client_address,
    spanish_speaker,
    notes,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(email))
      ORDER BY created_at, id
    ) AS rn
  FROM policies
  WHERE email IS NOT NULL AND trim(email) <> ''
),
first_policies AS (
  SELECT * FROM ranked WHERE rn = 1
)
INSERT INTO clients (full_name, email, phone, address, is_spanish_speaker, notes)
SELECT
  fp.client_name,
  trim(fp.email),
  fp.phone,
  fp.client_address,
  fp.spanish_speaker,
  fp.notes
FROM first_policies fp
WHERE NOT EXISTS (
  SELECT 1 FROM clients c
  WHERE c.email IS NOT NULL
    AND lower(trim(c.email)) = lower(trim(fp.email))
);

-- 2) Link policies with email to their client
UPDATE policies p
SET client_id = c.id
FROM clients c
WHERE p.email IS NOT NULL
  AND trim(p.email) <> ''
  AND c.email IS NOT NULL
  AND lower(trim(p.email)) = lower(trim(c.email))
  AND p.client_id IS NULL;

-- 3) Policies without email — one client per policy
CREATE TEMP TABLE IF NOT EXISTS policy_client_map ON COMMIT DROP AS
SELECT id AS policy_id, gen_random_uuid() AS new_client_id
FROM policies
WHERE client_id IS NULL;

INSERT INTO clients (id, full_name, phone, address, is_spanish_speaker, notes)
SELECT pcm.new_client_id, p.client_name, p.phone, p.client_address, p.spanish_speaker, p.notes
FROM policy_client_map pcm
JOIN policies p ON p.id = pcm.policy_id;

UPDATE policies p
SET client_id = pcm.new_client_id
FROM policy_client_map pcm
WHERE p.id = pcm.policy_id
  AND p.client_id IS NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on clients" ON clients;
CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
