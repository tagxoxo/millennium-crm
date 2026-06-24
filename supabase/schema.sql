-- Millennium CRM Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → your project → SQL Editor → New query

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- POLICIES TABLE
-- ============================================================
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  carrier TEXT NOT NULL CHECK (carrier IN (
    'trexis', 'progressive', 'gainsco', 'foremost', 'safeco',
    'national_general', 'bristol_west', 'geico',
    'liberty_mutual_bop', 'liberty_mutual_surety_bond',
    'tapco', 'cna', 'bruce_messier', 'mesa', 'acceptance_independent'
  )),
  premium NUMERIC(10, 2) NOT NULL DEFAULT 0,
  renewal_date DATE NOT NULL,
  stage TEXT NOT NULL DEFAULT 'upcoming' CHECK (stage IN ('upcoming', 'contacted', 'quoted', 'retained', 'lapsed')),
  spanish_speaker BOOLEAN NOT NULL DEFAULT false,
  commercial BOOLEAN NOT NULL DEFAULT false,
  term_months INTEGER NOT NULL DEFAULT 12 CHECK (term_months IN (6, 12)),
  phone TEXT,
  email TEXT,
  policy_number TEXT,
  client_since DATE,
  prior_carrier TEXT CHECK (prior_carrier IS NULL OR prior_carrier IN (
    'trexis', 'progressive', 'gainsco', 'foremost', 'safeco',
    'national_general', 'bristol_west', 'geico',
    'liberty_mutual_bop', 'liberty_mutual_surety_bond',
    'tapco', 'cna', 'bruce_messier', 'mesa', 'acceptance_independent'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_policies_stage ON policies(stage);
CREATE INDEX idx_policies_carrier ON policies(carrier);
CREATE INDEX idx_policies_renewal_date ON policies(renewal_date);
CREATE INDEX idx_policies_spanish_speaker ON policies(spanish_speaker);
CREATE INDEX idx_policies_commercial ON policies(commercial);
CREATE INDEX idx_policies_term_months ON policies(term_months);

-- ============================================================
-- CONTACT LOG TABLE
-- ============================================================
CREATE TABLE contact_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  contact_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('call', 'sms', 'whatsapp', 'email')),
  outcome TEXT,
  notes TEXT
);

CREATE INDEX idx_contact_log_policy_id ON contact_log(policy_id);
CREATE INDEX idx_contact_log_contact_date ON contact_log(contact_date DESC);

-- ============================================================
-- AUTOMATIONS TABLE
-- ============================================================
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('days_before_renewal', 'non_pay', 'post_retain', 'lapsed')),
  trigger_days INTEGER,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  template_text TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (allows your app to read/write data)
-- ============================================================
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anon users (adjust later for production)
CREATE POLICY "Allow all on policies" ON policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contact_log" ON contact_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on automations" ON automations FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DEFAULT AUTOMATIONS (5 pre-built)
-- ============================================================
INSERT INTO automations (name, trigger_type, trigger_days, channel, template_text, active) VALUES
(
  '30-Day WhatsApp Renewal Reminder (Spanish)',
  'days_before_renewal',
  30,
  'whatsapp',
  'Hola {{client_name}}, le recordamos que su póliza de seguro con {{carrier}} vence el {{renewal_date}}. Por favor contáctenos para renovar. Millennium Insurance - Clarksville, TN',
  true
),
(
  '7-Day WhatsApp Renewal Reminder (Spanish)',
  'days_before_renewal',
  7,
  'whatsapp',
  'Hola {{client_name}}, su póliza de seguro vence en 7 días ({{renewal_date}}). Llámenos hoy para evitar interrupciones en su cobertura. Millennium Insurance',
  true
),
(
  'Non-Pay Alert (English SMS)',
  'non_pay',
  NULL,
  'sms',
  'Hi {{client_name}}, this is Millennium Insurance. We noticed a payment issue on your {{carrier}} policy. Please call us at your earliest convenience to avoid a lapse in coverage.',
  true
),
(
  'Post-Retention Google Review Request (English SMS)',
  'post_retain',
  NULL,
  'sms',
  'Hi {{client_name}}, thank you for renewing your policy with Millennium Insurance! If you had a great experience, we would appreciate a Google review: {{google_review_link}}',
  true
),
(
  'Lapsed Client Reactivation (English SMS)',
  'lapsed',
  NULL,
  'sms',
  'Hi {{client_name}}, your {{carrier}} insurance policy has lapsed. Millennium Insurance can help you get reinstated quickly. Call us today for a quote!',
  true
);
