-- Add Kentucky (KY) to client_state on clients and policies
-- Run: npm run db:apply supabase/add-kentucky-client-state.sql

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_state_check;
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_client_state_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_client_state_check
  CHECK (client_state IN ('TN', 'TX', 'MA', 'RI', 'KY'));

ALTER TABLE policies
  ADD CONSTRAINT policies_client_state_check
  CHECK (client_state IN ('TN', 'TX', 'MA', 'RI', 'KY'));
