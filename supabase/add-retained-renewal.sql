-- Retain flow: stamp when a policy was renewed, and allow a "renewed" contact log entry.
-- Run: npm run db:apply supabase/add-retained-renewal.sql

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS retained_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_policies_retained_at
  ON policies (retained_at)
  WHERE stage = 'retained';

ALTER TABLE contact_log DROP CONSTRAINT IF EXISTS contact_log_contact_type_check;

ALTER TABLE contact_log ADD CONSTRAINT contact_log_contact_type_check
  CHECK (contact_type IN (
    'call', 'sms', 'whatsapp', 'email',
    'non_pay_alert', 'non_pay_resolved',
    'renewal_reminder_45', 'manual_policy_review',
    'policy_review_response', 'welcome_email',
    'renewed'
  ));

NOTIFY pgrst, 'reload schema';
