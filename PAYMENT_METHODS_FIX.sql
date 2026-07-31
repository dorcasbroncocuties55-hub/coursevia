-- =============================================================================
-- Payment Methods Table — Full Setup
-- Run this in your Supabase SQL editor
-- Safe to run multiple times (idempotent)
-- =============================================================================

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         text        NOT NULL DEFAULT 'checkout',
  method_type      text        NOT NULL DEFAULT 'card',
  brand            text,
  last4            text,
  exp_month        integer,
  exp_year         integer,
  cardholder_name  text,
  is_default       boolean     NOT NULL DEFAULT false,
  -- Checkout.com tokenization fields
  checkout_instrument_id  text,
  checkout_customer_id    text,
  fingerprint             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. Add any missing columns to existing table
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS provider                text        DEFAULT 'checkout',
  ADD COLUMN IF NOT EXISTS method_type             text        DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS brand                   text,
  ADD COLUMN IF NOT EXISTS last4                   text,
  ADD COLUMN IF NOT EXISTS exp_month               integer,
  ADD COLUMN IF NOT EXISTS exp_year                integer,
  ADD COLUMN IF NOT EXISTS cardholder_name         text,
  ADD COLUMN IF NOT EXISTS is_default              boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkout_instrument_id  text,
  ADD COLUMN IF NOT EXISTS checkout_customer_id    text,
  ADD COLUMN IF NOT EXISTS fingerprint             text;

-- 3. Fix provider default
ALTER TABLE public.payment_methods
  ALTER COLUMN provider SET DEFAULT 'checkout';

UPDATE public.payment_methods
SET provider = 'checkout'
WHERE provider = 'paystack' OR provider IS NULL;

-- 4. Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy — users can only see and manage their own cards
DROP POLICY IF EXISTS "Users manage own payment methods" ON public.payment_methods;
CREATE POLICY "Users manage own payment methods"
  ON public.payment_methods
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Index for fast default card lookup
CREATE INDEX IF NOT EXISTS payment_methods_user_default_idx
  ON public.payment_methods (user_id, is_default DESC);

-- 7. Trigger: enforce only one default card per user
CREATE OR REPLACE FUNCTION public.enforce_single_default_payment_method()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_payment_method ON public.payment_methods;
CREATE TRIGGER trg_single_default_payment_method
  AFTER INSERT OR UPDATE OF is_default ON public.payment_methods
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_payment_method();

-- 8. RPC: get default card for a user (used at checkout)
CREATE OR REPLACE FUNCTION public.get_default_payment_method(p_user_id uuid)
RETURNS TABLE (
  id                     uuid,
  brand                  text,
  last4                  text,
  exp_month              integer,
  exp_year               integer,
  cardholder_name        text,
  checkout_instrument_id text,
  checkout_customer_id   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, brand, last4, exp_month, exp_year, cardholder_name,
         checkout_instrument_id, checkout_customer_id
  FROM public.payment_methods
  WHERE user_id = p_user_id
    AND is_default = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_default_payment_method(uuid) TO authenticated;

-- Done
DO $$
BEGIN
  RAISE NOTICE '✓ payment_methods table ready';
  RAISE NOTICE '✓ RLS enabled — users see only their own cards';
  RAISE NOTICE '✓ Single default card trigger ready';
  RAISE NOTICE '✓ get_default_payment_method() RPC ready';
END;
$$;
