-- Allow non_pay_alert in contact_log.contact_type
ALTER TABLE contact_log DROP CONSTRAINT IF EXISTS contact_log_contact_type_check;

ALTER TABLE contact_log ADD CONSTRAINT contact_log_contact_type_check
  CHECK (contact_type IN ('call', 'sms', 'whatsapp', 'email', 'non_pay_alert'));
