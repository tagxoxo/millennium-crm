-- Acquired-book Trexis renewals that land in the new code once a month.
-- Kept separate from policies so they are never counted as new business.
-- Run: npm run db:apply supabase/add-trexis-book-renewals.sql

CREATE TABLE IF NOT EXISTS trexis_book_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key TEXT NOT NULL CHECK (month_key ~ '^\d{4}-\d{2}$'),
  policy_number TEXT NOT NULL,
  renewal_date DATE NOT NULL,
  insured_name TEXT NOT NULL,
  monthly_premium NUMERIC(12, 2) NOT NULL,
  commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.15,
  commission_amount NUMERIC(12, 2) NOT NULL,
  annual_written_premium NUMERIC(12, 2) NOT NULL,
  paid_in_full BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (month_key, policy_number)
);

CREATE INDEX IF NOT EXISTS idx_trexis_book_renewals_month
  ON trexis_book_renewals (month_key);

ALTER TABLE trexis_book_renewals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on trexis_book_renewals" ON trexis_book_renewals;
CREATE POLICY "Allow all on trexis_book_renewals"
  ON trexis_book_renewals
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO trexis_book_renewals (
  month_key,
  policy_number,
  renewal_date,
  insured_name,
  monthly_premium,
  commission_rate,
  commission_amount,
  annual_written_premium,
  paid_in_full
) VALUES
  ('2026-09', '11-41-027647959', '2026-09-18', 'Lori Shirk', 81.73, 0.15, 12.25, 980.76, false),
  ('2026-09', '11-41-027819198', '2026-09-20', 'Ana Alonso Mondragon', 216.26, 0.15, 32.44, 2595.12, false),
  ('2026-09', '11-41-038290347', '2026-09-22', 'Francisco Marez Sanchez', 110.99, 0.15, 16.65, 1331.88, false),
  ('2026-09', '11-41-027866108', '2026-09-23', 'Adolfo Sixto Serrano', 327.47, 0.15, 49.12, 3929.64, false),
  ('2026-09', '11-41-021100537', '2026-09-24', 'Denise Gilliam', 81.40, 0.15, 12.21, 976.80, false),
  ('2026-09', '11-41-038392157', '2026-09-24', 'Jeffrey A. Hicks', 120.01, 0.15, 18.00, 1440.12, false),
  ('2026-09', '11-41-002561734', '2026-09-25', 'Floriberta Calva Chavez', 168.63, 0.15, 25.30, 2023.56, false),
  ('2026-09', '11-41-014859717', '2026-09-25', 'Maria Arreola Perez', 457.00, 0.15, 68.55, 457.00, true),
  ('2026-09', '11-41-032305207', '2026-09-29', 'Uriel Ramos', 938.00, 0.15, 140.70, 938.00, true),
  ('2026-09', '11-41-028293227', '2026-09-30', 'Edward Johnson', 116.18, 0.15, 17.43, 1394.16, false)
ON CONFLICT (month_key, policy_number) DO NOTHING;
