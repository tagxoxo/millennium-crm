-- Info tickets: caller only needs information written down for the agent.
ALTER TABLE va_requests DROP CONSTRAINT IF EXISTS va_requests_request_type_check;
ALTER TABLE va_requests ADD CONSTRAINT va_requests_request_type_check CHECK (
  request_type IN (
    'payment',
    'policy_change',
    'new_quote',
    'info',
    'add_vehicle',
    'remove_vehicle',
    'payment_question',
    'add_a_driver',
    'add_remove_driver',
    'other'
  )
);
