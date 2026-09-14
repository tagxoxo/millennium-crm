-- Optional caller email on VA tickets (under phone on the VA portal)
ALTER TABLE va_requests
  ADD COLUMN IF NOT EXISTS email TEXT;
