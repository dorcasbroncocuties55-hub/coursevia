/**
 * Applies schema migration via Supabase's pg REST endpoint.
 * Uses the publishable key from .env (works for DDL via the management API).
 */
import { config } from "dotenv";
config({ path: "./.env" });

const SUPABASE_URL = "https://lpvcaukviteexnjzqqeo.supabase.co";
const PUBLISHABLE   = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const ANON_KEY      = process.env.VITE_SUPABASE_ANON_KEY || "";

// Try to run each statement via the Supabase SQL REST endpoint
// This requires the service role key — if not available, we print instructions
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit','debit')),
    description TEXT,
    balance_after NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
];

// Try via the Supabase pg endpoint (needs service role)
async function tryViaManagementApi(sql, key) {
  const projectRef = "lpvcaukviteexnjzqqeo";
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// Try via the Supabase REST rpc endpoint
async function tryViaRpc(sql, key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_sql`, {
    method: "POST",
    headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

console.log("Attempting migration via Supabase REST API...\n");

let anyFailed = false;
for (const sql of statements) {
  const label = sql.trim().slice(0, 70).replace(/\s+/g, " ");
  
  // Try with publishable key first, then anon
  for (const key of [PUBLISHABLE, ANON_KEY]) {
    if (!key) continue;
    const { status, body } = await tryViaManagementApi(sql, key);
    if (status === 200 || status === 201) {
      console.log(`  ✓  ${label}…`);
      break;
    }
    const msg = JSON.stringify(body).slice(0, 150);
    if (msg.includes("already exists") || msg.includes("42701")) {
      console.log(`  ⚠  Already exists: ${label}…`);
      break;
    }
    // If 401/403, key doesn't have permission — expected with anon key
    if (status === 401 || status === 403) {
      anyFailed = true;
      break;
    }
  }
}

if (anyFailed) {
  console.log("\n" + "=".repeat(70));
  console.log("⚠  Could not auto-apply migration (service role key needed for DDL).");
  console.log("=".repeat(70));
  console.log("\nPlease do ONE of the following:\n");
  console.log("OPTION A — Set your service role key (recommended):");
  console.log("  1. Go to: https://supabase.com/dashboard/project/lpvcaukviteexnjzqqeo/settings/api");
  console.log("  2. Copy the 'service_role' key (starts with eyJ...)");
  console.log("  3. Open backend/.env and replace 'replace_with_service_role_key' with it");
  console.log("  4. Run: node scripts/apply-migration.mjs\n");
  console.log("OPTION B — Run SQL manually in Supabase SQL Editor:");
  console.log("  1. Go to: https://supabase.com/dashboard/project/lpvcaukviteexnjzqqeo/sql/new");
  console.log("  2. Paste and run the contents of: REFUNDS_AND_REPORTS_MIGRATION.sql\n");
} else {
  console.log("\n✓ Migration applied successfully.");
}
