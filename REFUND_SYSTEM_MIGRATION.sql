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
