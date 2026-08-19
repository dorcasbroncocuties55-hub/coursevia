import fetch from "node-fetch";
import fs from "fs";

const BASE = "http://localhost:5000";
const results = [];

async function test(label, method, path, body) {
  try {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, opts);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    const ok = r.status < 400;
    results.push({ label, status: r.status, ok, body: json });
    console.log(`${ok ? "✅" : "❌"} [${r.status}] ${label}`);
    if (!ok) console.log(`     → ${JSON.stringify(json).slice(0, 200)}`);
  } catch (e) {
    results.push({ label, status: "ERR", ok: false, body: e.message });
    console.log(`💥 [ERR] ${label}`);
    console.log(`     → ${e.message}`);
  }
}

// ─── GET endpoints ───────────────────────────────────────────────────────────
await test("GET /api/subscription/plans",          "GET",  "/api/subscription/plans");
await test("GET /api/subscriptions/current",       "GET",  "/api/subscriptions/current?user_id=12345678-1234-5678-9012-123456789012");
await test("GET /api/payouts/accounts",            "GET",  "/api/payouts/accounts?user_id=12345678-1234-5678-9012-123456789012");
await test("GET /api/payouts/banks",               "GET",  "/api/payouts/banks?country=NG");
await test("GET /api/payouts/capabilities",        "GET",  "/api/payouts/capabilities?country=US&currency=USD");
await test("GET /api/payouts/withdrawals",         "GET",  "/api/payouts/withdrawals?user_id=12345678-1234-5678-9012-123456789012");
await test("GET /api/payouts/history",             "GET",  "/api/payouts/history?user_id=12345678-1234-5678-9012-123456789012");
await test("GET /api/wallet/:id",                  "GET",  "/api/wallet/12345678-1234-5678-9012-123456789012");
await test("GET /api/wallet/balance/:id",          "GET",  "/api/wallet/balance/12345678-1234-5678-9012-123456789012");
await test("GET /api/wallet/transactions/:id",     "GET",  "/api/wallet/transactions/12345678-1234-5678-9012-123456789012");
await test("GET /api/checkout/config",             "GET",  "/api/checkout/config");
await test("GET /api/admin/payouts",               "GET",  "/api/admin/payouts");

// ─── POST endpoints ──────────────────────────────────────────────────────────
await test("POST /api/subscriptions/initialize",   "POST", "/api/subscriptions/initialize",
  { email: "test@example.com", userId: "12345678-1234-5678-9012-123456789012", planId: "monthly" });

await test("POST /api/checkout/initialize",        "POST", "/api/checkout/initialize",
  { email: "t@t.com", user_id: "12345678-1234-5678-9012-123456789012", type: "booking", amount: 50, content_id: "booking-123", content_title: "Test" });

await test("POST /api/wallet/topup",               "POST", "/api/wallet/topup",
  { user_id: "12345678-1234-5678-9012-123456789012", email: "t@t.com", amount: 50, currency: "USD" });

await test("POST /api/wallet/pay",                 "POST", "/api/wallet/pay",
  { user_id: "12345678-1234-5678-9012-123456789012", email: "t@t.com", type: "course", amount: 25, content_id: "c1", content_title: "Test Course" });

await test("POST /api/payouts/request",            "POST", "/api/payouts/request",
  { user_id: "12345678-1234-5678-9012-123456789012", amount: 10, currency: "USD", account_name: "John Doe", account_number: "0123456789", bank_name: "GTBank", bank_code: "058", country_code: "NG" });

await test("POST /api/notifications/booking-confirmation", "POST", "/api/notifications/booking-confirmation",
  { booking_id: "b1", learner_email: "learner@test.com", provider_email: "provider@test.com", learner_name: "Alice", provider_name: "Bob", scheduled_at: new Date().toISOString(), service_title: "Test Session", service_mode: "online", learner_id: "12345678-1234-5678-9012-123456789012", provider_id: "12345678-1234-5678-9012-123456789013" });

await test("POST /api/ai/chat",                    "POST", "/api/ai/chat",
  { message: "hello" });

// ─── Summary ─────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;

console.log("\n══════════════════════════════════════════");
console.log(`  RESULTS: ${passed} passed  |  ${failed} failed`);
console.log("══════════════════════════════════════════");

if (failed > 0) {
  console.log("\n❌ FAILING ENDPOINTS:");
  results.filter(r => !r.ok).forEach(r => {
    console.log(`  [${r.status}] ${r.label}`);
    console.log(`        ${JSON.stringify(r.body).slice(0, 300)}`);
  });
}

fs.writeFileSync("api-test-results.json", JSON.stringify(results, null, 2));
console.log("\nFull results saved to api-test-results.json");
