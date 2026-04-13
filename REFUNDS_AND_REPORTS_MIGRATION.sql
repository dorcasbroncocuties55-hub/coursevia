-- ═══════════════════════════════════════════════════════════════════════════
-- COURSEVIA  –  Refunds, Reports, Wallet, Bank Accounts & Withdrawals
-- Safe to re-run. Run entire file in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 1: Wallet columns ────────────────────────────────────────────────────
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pending_balance   NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ   DEFAULT now();

-- ── Step 2: Price column on bookings ─────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0;

-- ── Step 3: Refunds ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','processed','rejected')),
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Step 4: Reports ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reason           TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','resolved','dismissed')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Step 5: Wallet ledger ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('credit','debit')),
  description   TEXT,
  balance_after NUMERIC(12,2),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Add released column and backfill in one atomic block
DO $$
BEGIN
  ALTER TABLE wallet_ledger ADD COLUMN IF NOT EXISTS released BOOLEAN NOT NULL DEFAULT false;
  UPDATE wallet_ledger SET released = true WHERE type = 'credit';
END;
$$;

-- ── Step 6: Bank accounts (name matches backend server.js) ───────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name           TEXT NOT NULL,
  bank_code           TEXT,
  account_name        TEXT,
  account_number      TEXT NOT NULL,
  country_code        TEXT NOT NULL DEFAULT 'US',
  currency            TEXT NOT NULL DEFAULT 'USD',
  provider            TEXT NOT NULL DEFAULT 'manual',
  verification_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','verified','rejected')),
  is_default          BOOLEAN NOT NULL DEFAULT false,
  metadata            JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Step 7: Withdrawals (name matches backend server.js) ─────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed','rejected')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Step 8: RLS ───────────────────────────────────────────────────────────────
ALTER TABLE refunds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own refunds"          ON refunds;
CREATE POLICY "Users see own refunds"
  ON refunds FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own refunds"       ON refunds;
CREATE POLICY "Users insert own refunds"
  ON refunds FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own reports"          ON reports;
CREATE POLICY "Users see own reports"
  ON reports FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users insert reports"           ON reports;
CREATE POLICY "Users insert reports"
  ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users see own ledger"           ON wallet_ledger;
CREATE POLICY "Users see own ledger"
  ON wallet_ledger FOR SELECT
  USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users see own bank accounts"    ON bank_accounts;
CREATE POLICY "Users see own bank accounts"
  ON bank_accounts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own bank accounts" ON bank_accounts;
CREATE POLICY "Users insert own bank accounts"
  ON bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own bank accounts" ON bank_accounts;
CREATE POLICY "Users update own bank accounts"
  ON bank_accounts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own bank accounts" ON bank_accounts;
CREATE POLICY "Users delete own bank accounts"
  ON bank_accounts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own withdrawals"      ON withdrawals;
CREATE POLICY "Users see own withdrawals"
  ON withdrawals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own withdrawals"   ON withdrawals;
CREATE POLICY "Users insert own withdrawals"
  ON withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Step 9: approve_refund RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION approve_refund(p_refund_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_refund  refunds%ROWTYPE;
  v_new_bal NUMERIC(12,2);
BEGIN
  SELECT * INTO v_refund FROM refunds WHERE id = p_refund_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found or not pending'; END IF;

  INSERT INTO wallets (user_id, currency, balance, pending_balance, available_balance)
    VALUES (v_refund.user_id, 'USD', 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE wallets
    SET available_balance = available_balance + v_refund.amount,
        balance           = balance + v_refund.amount,
        updated_at        = now()
    WHERE user_id = v_refund.user_id
    RETURNING available_balance INTO v_new_bal;

  INSERT INTO wallet_ledger (wallet_id, amount, type, description, balance_after, released)
    SELECT id, v_refund.amount, 'credit',
           'Refund for booking ' || COALESCE(v_refund.booking_id::text, p_refund_id::text),
           v_new_bal, true
    FROM wallets WHERE user_id = v_refund.user_id;

  UPDATE refunds SET status = 'processed', processed_at = now() WHERE id = p_refund_id;

  IF v_refund.booking_id IS NOT NULL THEN
    UPDATE bookings SET status = 'cancelled', updated_at = now()
      WHERE id = v_refund.booking_id AND status IN ('pending','confirmed');
  END IF;
END;
$$;

-- ── Step 10: release_pending_earnings ────────────────────────────────────────
-- Moves pending_balance → available_balance for entries older than 8 days.
-- Run manually:  SELECT release_pending_earnings();
-- To automate: Supabase Dashboard → Database → Extensions → enable pg_cron, then:
--   SELECT cron.schedule('release-pending','0 * * * *','SELECT release_pending_earnings();');

CREATE OR REPLACE FUNCTION release_pending_earnings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec         RECORD;
  move_amount NUMERIC(12,2);
BEGIN
  FOR rec IN
    SELECT wl.id AS ledger_id, wl.wallet_id, wl.amount
    FROM   wallet_ledger wl
    WHERE  wl.type     = 'credit'
      AND  wl.released = false
      AND  wl.created_at <= now() - INTERVAL '8 days'
  LOOP
    SELECT LEAST(rec.amount, GREATEST(0, pending_balance))
      INTO move_amount
      FROM wallets WHERE id = rec.wallet_id;

    IF move_amount > 0 THEN
      UPDATE wallets SET
        pending_balance   = GREATEST(0, pending_balance - move_amount),
        available_balance = available_balance + move_amount,
        updated_at        = now()
      WHERE id = rec.wallet_id;
    END IF;

    UPDATE wallet_ledger SET released = true WHERE id = rec.ledger_id;
  END LOOP;
END;
$$;
