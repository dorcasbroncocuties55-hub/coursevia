-- ============================================================
-- PAYOUT_REQUESTS_MIGRATION.sql
-- Run this in Supabase SQL Editor.
-- Creates the payout_requests table for the manual payout system.
-- No third-party platform — admin pays manually and marks as paid.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Amount and currency
  amount          numeric(12,2) NOT NULL,
  currency        text          NOT NULL DEFAULT 'USD',

  -- Status: pending | completed | rejected
  status          text          NOT NULL DEFAULT 'pending',

  -- Reference code shown to both provider and admin
  reference       text          UNIQUE NOT NULL,

  -- Bank details provided by the provider
  account_name    text          NOT NULL,
  account_number  text,
  bank_name       text          NOT NULL,
  bank_code       text,
  swift_code      text,
  iban            text,
  routing_number  text,
  country_code    text          NOT NULL DEFAULT 'NG',

  -- Notes
  note            text,           -- provider's optional note
  admin_note      text,           -- admin's approval/rejection reason

  -- Timestamps
  created_at      timestamptz   NOT NULL DEFAULT now(),
  processed_at    timestamptz,    -- when admin approved/rejected
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS payout_requests_user_id_idx   ON public.payout_requests (user_id);
CREATE INDEX IF NOT EXISTS payout_requests_status_idx    ON public.payout_requests (status);
CREATE INDEX IF NOT EXISTS payout_requests_reference_idx ON public.payout_requests (reference);
CREATE INDEX IF NOT EXISTS payout_requests_created_idx   ON public.payout_requests (created_at DESC);

-- ── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS payout_requests_updated_at ON public.payout_requests;
CREATE TRIGGER payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can view own payout requests"   ON public.payout_requests;
DROP POLICY IF EXISTS "Providers can insert own payout requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Admins can view all payout requests"      ON public.payout_requests;

-- Providers can only see their own requests
CREATE POLICY "Providers can view own payout requests"
  ON public.payout_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Providers can submit new requests (backend also does this via service role)
CREATE POLICY "Providers can insert own payout requests"
  ON public.payout_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can see everything (backend uses service role key which bypasses RLS)
-- If you want admin UI to query directly via anon/user key, add:
-- CREATE POLICY "Admins can view all payout requests"
--   ON public.payout_requests FOR SELECT
--   USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'PAYOUT_REQUESTS_MIGRATION applied successfully' AS result;
