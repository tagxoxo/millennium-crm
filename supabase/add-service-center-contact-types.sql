-- Service Center: new contact types + delivery status
-- Run: npm run db:apply supabase/add-service-center-contact-types.sql

ALTER TABLE contact_log DROP CONSTRAINT IF EXISTS contact_log_contact_type_check;

ALTER TABLE contact_log ADD CONSTRAINT contact_log_contact_type_check
  CHECK (contact_type IN (
    'call', 'sms', 'whatsapp', 'email',
    'non_pay_alert', 'non_pay_resolved',
    'renewal_reminder_45', 'manual_policy_review',
    'policy_review_response'
  ));

ALTER TABLE contact_log
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent'
  CHECK (status IN ('sent', 'failed', 'pending'));

UPDATE contact_log SET status = 'sent' WHERE status IS NULL;
