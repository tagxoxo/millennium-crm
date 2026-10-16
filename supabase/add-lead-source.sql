-- Where a new client came from. Optional on older clients.
-- Applied automatically via Supabase MCP.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lead_source TEXT;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_lead_source_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_lead_source_check
  CHECK (
    lead_source IS NULL OR lead_source IN (
      'google',
      'right_choice_auto',
      'renegade_auto',
      'js_auto',
      'past_client',
      'referral',
      'walk_in',
      'other'
    )
  );
