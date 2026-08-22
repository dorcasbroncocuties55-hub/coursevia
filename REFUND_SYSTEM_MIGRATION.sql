-- ============================================================
-- REFUND SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create refunds table if it doesn't exist
CREATE TABLE IF NOT EXISTS refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  payment_id      uuid REFERENCES payments(id) ON DELETE SET NULL,
  booking_id      uuid,
  amount          numeric(10,2) NOT NULL DEFAULT 0,
  reason          text,
  reject_reason   text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','rejected')),
  payment_type    text,
  content_title   text,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Add missing columns if table already exists
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payment_id    uuid REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payment_type  text;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS content_title text;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS updated_at    timestamptz NOT NULL DEFAULT now();

-- 3. Indexes
CREATE INDEX IF NOT EXISTS refunds_user_id_idx    ON refunds(user_id);
CREATE INDEX IF NOT EXISTS refunds_status_idx     ON refunds(status);
CREATE INDEX IF NOT EXISTS refunds_payment_id_idx ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS refunds_created_at_idx ON refunds(created_at DESC);

-- 4. RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own refunds"   ON refunds;
DROP POLICY IF EXISTS "Users can insert own refunds" ON refunds;
DROP POLICY IF EXISTS "Admins can view all refunds"  ON refunds;
DROP POLICY IF EXISTS "Admins can update refunds"    ON refunds;

CREATE POLICY "Users can view own refunds"
  ON refunds FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own refunds"
  ON refunds FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can do everything (service role bypasses RLS anyway)
CREATE POLICY "Admins can view all refunds"
  ON refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update refunds"
  ON refunds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

SELECT 'Refund system migration applied successfully' AS result;

-- Add refund method tracking columns
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_method    text DEFAULT 'wallet_fallback';
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS stripe_refund_id text;

-- ============================================================
-- STRIPE PAYMENT INTEGRATION COLUMNS
-- Added for Learner Portal - Card-based payments
-- ============================================================

-- Add Stripe columns to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method_last4 text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method_brand text;

-- Add Stripe columns to payment_methods table (for saved cards)
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS fingerprint text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS payments_stripe_payment_intent_idx ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS payments_stripe_customer_idx ON public.payments(stripe_customer_id);
CREATE INDEX IF NOT EXISTS payment_methods_stripe_pm_idx ON public.payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS payment_methods_user_default_idx ON public.payment_methods(user_id, is_default DESC);
CREATE INDEX IF NOT EXISTS refunds_stripe_refund_idx ON public.refunds(stripe_refund_id);

SELECT 'Stripe payment integration columns added successfully' AS result;
