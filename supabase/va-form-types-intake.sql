-- Form request types: payment, policy_change, new_quote
-- Keep older types so existing tickets still load.
ALTER TABLE va_requests DROP CONSTRAINT IF EXISTS va_requests_request_type_check;
ALTER TABLE va_requests ADD CONSTRAINT va_requests_request_type_check CHECK (
  request_type IN (
    'payment',
    'policy_change',
    'new_quote',
    'add_vehicle',
    'remove_vehicle',
    'payment_question',
    'add_a_driver',
    'add_remove_driver',
    'other'
  )
);

ALTER TABLE va_requests
  ADD COLUMN IF NOT EXISTS intake JSONB NOT NULL DEFAULT '[]'::jsonb;
