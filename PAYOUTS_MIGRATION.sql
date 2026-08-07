-- ============================================================
-- PAYOUTS_MIGRATION.sql
-- Run this in Supabase SQL Editor.
-- Creates the payouts table for Airwallex transfer records.
-- ============================================================

-- ── Payouts table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payouts (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount                 numeric(12,2) NOT NULL,
  currency               text        NOT NULL DEFAULT 'USD',
  status                 text        NOT NULL DEFAULT 'pending',
  -- pending | submitted | processing | completed | failed
  reference              text        UNIQUE NOT NULL,
  airwallex_transfer_id  text,
  account_name           text,
  account_number         text,   -- masked last 4 digits only
  bank_name              text,
  country_code           text,
  note                   text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS payouts_user_id_idx ON public.payouts (user_id);
CREATE INDEX IF NOT EXISTS payouts_reference_idx ON public.payouts (reference);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payouts" ON public.payouts;

CREATE POLICY "Users can view own payouts"
  ON public.payouts FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (backend) has full access via service_role key — no policy needed.

-- ── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS payouts_updated_at ON public.payouts;
CREATE TRIGGER payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'PAYOUTS_MIGRATION applied successfully' AS result;
