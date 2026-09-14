-- Add/remove driver request type + carrier on VA requests
ALTER TABLE va_requests DROP CONSTRAINT IF EXISTS va_requests_request_type_check;
ALTER TABLE va_requests ADD CONSTRAINT va_requests_request_type_check CHECK (
  request_type IN (
    'add_vehicle',
    'remove_vehicle',
    'payment_question',
    'new_quote',
    'add_a_driver',
    'add_remove_driver',
    'other'
  )
);

ALTER TABLE va_requests
  ADD COLUMN IF NOT EXISTS carrier TEXT;

ALTER TABLE va_requests DROP CONSTRAINT IF EXISTS va_requests_carrier_check;
ALTER TABLE va_requests ADD CONSTRAINT va_requests_carrier_check CHECK (
  carrier IS NULL OR carrier IN ('trexis', 'progressive', 'safeway')
);
