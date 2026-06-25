-- Update Non-Pay automation card: SMS → Email
UPDATE automations
SET
  name = 'Non-Pay Alert (Email)',
  channel = 'email',
  template_text = 'Hi {{client_name}}, this is Millennium Insurance. We noticed a payment issue on your {{carrier}} policy. Please call us at your earliest convenience to avoid a lapse in coverage.'
WHERE trigger_type = 'non_pay';
