import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lpvcaukviteexnjzqqeo.supabase.co";
// Uses the anon key — DDL requires service role, so we'll use the REST SQL endpoint
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdmNhdWt2aXRlZXhuanpxcWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTQxNDgsImV4cCI6MjA4OTQ5MDE0OH0.rHd16T2wKEUxyu2IWME-faqW-ZlrW8fNCmFaTs1IiV8";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Test basic connectivity
const { data, error } = await supabase.from("wallets").select("id").limit(1);
if (error) {
  console.error("Connection error:", error.message);
} else {
  console.log("Connected to Supabase. Wallets table reachable.");
  console.log("Sample row:", data);
}

console.log("\nMigration SQL to run manually in Supabase SQL Editor:");
console.log("=".repeat(60));
const sql = `
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pending_balance   NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now();

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0;

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_id      UUID REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('credit','debit')),
  description   TEXT,
  balance_after NUMERIC(12,2),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION approve_refund(p_refund_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_refund refunds%ROWTYPE;
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
    WHERE user_id = v_refund.user_id;

  UPDATE refunds SET status = 'processed', processed_at = now() WHERE id = p_refund_id;

  IF v_refund.booking_id IS NOT NULL THEN
    UPDATE bookings SET status = 'cancelled', updated_at = now()
      WHERE id = v_refund.booking_id AND status IN ('pending','confirmed');
  END IF;
END;
$$;
`;
console.log(sql);
