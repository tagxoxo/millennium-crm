-- Daily saved VA metrics (one row per VA per calendar day, America/Chicago)
CREATE TABLE IF NOT EXISTS va_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  va_user_id UUID NOT NULL,
  va_email TEXT,
  tickets_submitted INTEGER NOT NULL DEFAULT 0,
  tickets_completed INTEGER NOT NULL DEFAULT 0,
  tickets_open_eod INTEGER NOT NULL DEFAULT 0,
  spanish_count INTEGER NOT NULL DEFAULT 0,
  english_count INTEGER NOT NULL DEFAULT 0,
  by_request_type JSONB NOT NULL DEFAULT '{}'::jsonb,
  by_carrier JSONB NOT NULL DEFAULT '{}'::jsonb,
  avg_complete_minutes NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (metric_date, va_user_id)
);

CREATE INDEX IF NOT EXISTS idx_va_daily_metrics_date
  ON va_daily_metrics (metric_date DESC);

ALTER TABLE va_daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on va_daily_metrics" ON va_daily_metrics;
CREATE POLICY "Allow all on va_daily_metrics"
  ON va_daily_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);
