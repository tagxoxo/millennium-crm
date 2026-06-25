-- Allow welcome_email in contact_log.contact_type
-- Run: npm run db:apply supabase/add-welcome-email-contact-type.sql

ALTER TABLE contact_log DROP CONSTRAINT IF EXISTS contact_log_contact_type_check;

ALTER TABLE contact_log ADD CONSTRAINT contact_log_contact_type_check
  CHECK (contact_type IN (
    'call', 'sms', 'whatsapp', 'email',
    'non_pay_alert', 'non_pay_resolved',
    'renewal_reminder_45', 'manual_policy_review',
    'policy_review_response', 'welcome_email'
  ));
