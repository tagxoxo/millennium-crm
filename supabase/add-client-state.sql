-- Client home state (TN default; TX, MA, RI when tagged)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_state TEXT NOT NULL DEFAULT 'TN'
  CHECK (client_state IN ('TN', 'TX', 'MA', 'RI'));

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS client_state TEXT NOT NULL DEFAULT 'TN'
  CHECK (client_state IN ('TN', 'TX', 'MA', 'RI'));

UPDATE clients SET client_state = 'TN' WHERE client_state IS NULL;
UPDATE policies SET client_state = 'TN' WHERE client_state IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_client_state ON clients(client_state);
CREATE INDEX IF NOT EXISTS idx_policies_client_state ON policies(client_state);
