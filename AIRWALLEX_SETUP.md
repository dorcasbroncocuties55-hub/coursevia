# Airwallex Setup Guide — Coursevia Wallet Top-Up

This guide walks you through connecting Airwallex to the Coursevia backend so learners can fund their wallets via bank transfer.

---

## What Airwallex Does Here

Learners get a unique virtual bank account number (like a real IBAN or routing number). They transfer money from their personal bank to that account. Airwallex detects the transfer and fires a webhook to your backend, which automatically credits the learner's Coursevia wallet.

No card is needed. No Stripe involved. The learner just does a regular bank transfer.

---

## Step 1 — Create an Airwallex Account

1. Go to [https://www.airwallex.com](https://www.airwallex.com) and sign up for a business account.
2. Complete KYB (Know Your Business) verification — required before the API is enabled.
3. Once approved, open the **Airwallex Dashboard** at [https://www.airwallex.com/app](https://www.airwallex.com/app).

> For development/testing you can use the **Airwallex Demo environment** at  
> [https://demo.airwallex.com](https://demo.airwallex.com) — no real money involved.

---

## Step 2 — Get Your API Credentials

1. In the Airwallex Dashboard, go to **Developer** → **API Keys**.
2. Click **Generate New Key** (or use an existing one).
3. Copy both values:
   - **Client ID** — looks like `JUf...`
   - **API Key** — looks like `31e...` (only shown once; store it securely)

---

## Step 3 — Set Up a Webhook

Airwallex must call your backend when money arrives in a virtual account.

1. In the Dashboard go to **Developer** → **Webhooks**.
2. Click **Add endpoint**.
3. Set the URL to:
   ```
   https://your-backend-domain.com/api/webhooks/airwallex
   ```
   For local development use a tunnel like [ngrok](https://ngrok.com):
   ```
   ngrok http 4000
   # then use: https://abc123.ngrok.io/api/webhooks/airwallex
   ```
4. Select these events:
   - `virtual_account.payment_received`
   - `transfer.received` (if available)
5. Save and copy the **Webhook Secret**.

---

## Step 4 — Add Keys to backend/.env

Open `backend/.env` and replace the placeholder values:

```env
# Airwallex
AIRWALLEX_CLIENT_ID=your_client_id_here
AIRWALLEX_API_KEY=your_api_key_here
AIRWALLEX_WEBHOOK_SECRET=your_webhook_secret_here

# Use "demo" for testing, "production" for live
AIRWALLEX_ENV=demo
```

> The `AIRWALLEX_ENV` variable controls which API base URL is used:
> - `demo` → `https://api-demo.airwallex.com`
> - `production` → `https://api.airwallex.com`

---

## Step 5 — Run the Database Migration

The virtual account feature needs two extra tables. Run this in your **Supabase SQL Editor**:

```sql
-- Virtual accounts (one per learner per currency)
CREATE TABLE IF NOT EXISTS public.virtual_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  airwallex_id    text NOT NULL,
  account_number  text,
  routing_number  text,
  iban            text,
  bic             text,
  bank_name       text,
  account_name    text,
  currency        text NOT NULL DEFAULT 'USD',
  country_code    text NOT NULL DEFAULT 'US',
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Wallet top-up history
CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  virtual_account_id  uuid REFERENCES public.virtual_accounts(id),
  airwallex_event_id  text UNIQUE,
  amount              numeric(12,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'USD',
  sender_name         text,
  sender_bank         text,
  reference           text,
  status              text NOT NULL DEFAULT 'completed',
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.virtual_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topups     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own virtual accounts"
  ON public.virtual_accounts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own topups"
  ON public.wallet_topups FOR SELECT USING (auth.uid() = user_id);

-- Service role (backend) needs full access — granted via service role key automatically
```

---

## Step 6 — Restart the Backend

```powershell
cd backend
npm start
```

If you see this in the logs, the keys are working:

```
[AW] Airwallex client initialised (demo)
```

---

## Step 7 — Test the Flow

1. Open the app and go to **Wallet** as a learner.
2. The "Your Bank Account" section should load and show a **Create USD Account** button.
3. Click it — Airwallex will provision a unique virtual account.
4. In the **Airwallex Demo Dashboard**, use the "Simulate incoming transfer" feature to send a test payment to that account.
5. Your backend webhook will fire and the learner's wallet balance will increase automatically.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Bank account service unavailable — Airwallex not configured" | Keys are still placeholder values | Complete Step 4 |
| "Could not reach the backend" | Backend server not running | `cd backend && npm start` |
| Webhook never fires | Wrong URL or events not selected | Re-check Step 3 |
| Balance doesn't increase after transfer | Webhook secret mismatch | Re-copy secret from Airwallex dashboard into `AIRWALLEX_WEBHOOK_SECRET` |
| 401 on API calls | Wrong Client ID or API Key | Re-generate keys in Airwallex dashboard |
| Account creation returns 400 | Currency not supported in your region | Try a different currency or contact Airwallex support |

---

## Supported Currencies

| Currency | Country | Notes |
|---|---|---|
| USD | US | ACH routing + account number |
| GBP | GB | Sort code + account number |
| EUR | DE | IBAN + BIC |
| AUD | AU | BSB + account number |
| CAD | CA | Transit + account number |
| SGD | SG | Bank code + account number |
| HKD | HK | Bank code + account number |
| JPY | JP | Bank + branch + account number |

Currency availability depends on your Airwallex account region and plan.

---

## Going Live (Production)

1. Change `AIRWALLEX_ENV=production` in `backend/.env`.
2. Use production API keys (re-generate them in the live Airwallex dashboard).
3. Update your webhook URL to your real production backend URL.
4. Ensure your Airwallex account has completed full KYB and is approved for virtual accounts in the currencies you want to offer.
