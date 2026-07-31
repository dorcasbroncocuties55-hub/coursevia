/**
 * Applies the migration directly to Supabase using the pg REST endpoint.
 * Requires SUPABASE_SERVICE_ROLE_KEY in backend/.env
 */
import { readFileSync } from "fs";
import { config } from "dotenv";

config({ path: "./backend/.env" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY.startsWith("replace")) {
  console.error("❌  SUPABASE_SERVICE_ROLE_KEY is not set in backend/.env");
  console.error("   Get it from: https://supabase.com/dashboard/project/lpvcaukviteexnjzqqeo/settings/api");
  console.error("   Then set it in backend/.env as SUPABASE_SERVICE_ROLE_KEY=eyJ...");
  process.exit(1);
}

const statements = [
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pending_balance   NUMERIC(12,2) DEFAULT 0`,
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_balance NUMERIC(12,2) DEFAULT 0`,
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now()`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0`,
  `ALTER TABLE refunds ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL`,
  `ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_id      UUID REFERENCES profiles(user_id) ON DELETE SET NULL`,
  `ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL`,
  `ALTER TABLE reports ADD COLUMN IF NOT EXISTS booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL`,
  `CREATE TABLE IF NOT EXISTS wallet_ledger (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id     UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount        NUMERIC(12,2) NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('credit','debit')),
    description   TEXT,
    balance_after NUMERIC(12,2),
    created_at    TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE OR REPLACE FUNCTION approve_refund(p_refund_id UUID)
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
  $$`,
];

const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
const endpoint   = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

console.log(`Applying migration to project: ${projectRef}\n`);

for (const sql of statements) {
  const label = sql.trim().slice(0, 60).replace(/\s+/g, " ");
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 42701 = column already exists — safe to ignore
      const code = body?.error?.code || body?.code || "";
      if (code === "42701" || body?.message?.includes("already exists")) {
        console.log(`  ⚠  Already exists (skipped): ${label}…`);
      } else {
        console.error(`  ✗  FAILED [${res.status}]: ${label}…`);
        console.error(`     ${JSON.stringify(body).slice(0, 200)}`);
      }
    } else {
      console.log(`  ✓  OK: ${label}…`);
    }
  } catch (e) {
    console.error(`  ✗  ERROR: ${label}…`, e.message);
  }
}

console.log("\nDone.");
