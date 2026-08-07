# Paddle Setup Guide — Coursevia

Paddle is the Merchant of Record for all card payments on Coursevia.
You need no CAC, no Stripe entity, no tax registration in any country —
Paddle handles all of that on your behalf.

---

## Step 1 — Paddle account

1. Sign up at https://vendors.paddle.com
2. Complete identity verification (takes ~10 minutes for most accounts)
3. Add your payout bank account — this is where Paddle sends your earnings
4. In **Checkout settings**, add `https://coursevia.site` as an approved domain

---

## Step 2 — Get your API credentials

Go to **Developer Tools → Authentication**:

| Key | Where | Used by |
|---|---|---|
| API Key (`pdl_live_apikey_...`) | Server | Already in `backend/.env` |
| Client-side Token (`live_...`) | Browser | Goes in root `.env` |
| Webhook Secret | Webhooks page | Goes in `backend/.env` |

Add to your root `.env`:
```env
VITE_PADDLE_CLIENT_TOKEN=live_your_client_token_here
VITE_PADDLE_ENV=production
```

Add to `backend/.env`:
```env
PADDLE_WEBHOOK_SECRET=pdl_ntf_your_webhook_secret_here
```

---

## Step 3 — Create the Wallet Top-Up product

In **Paddle Dashboard → Catalog → Products**:

1. Click **New product**
2. Name: `Wallet Top-Up`
3. Type: **One-time**
4. Under Prices, click **Add price**:
   - Amount: `$1.00` (minimum — users pick their own amount at checkout)
   - Billing: **One-time**
   - Name: `Wallet Top-Up`
5. Save and copy the **Price ID** — it looks like `pri_01abc...`

Add to root `.env`:
```env
VITE_PADDLE_TOPUP_PRICE_ID=pri_01your_price_id_here
```

> Note: Paddle doesn't natively support "pay what you want" on one-time prices.
> The $1 price is a placeholder — for variable amounts, upgrade to
> Paddle's "custom price" feature or create separate price IDs for each preset
> ($10, $25, $50, $100, $200, $500). See Step 3b below.

### Step 3b — Multiple preset prices (recommended)

Create a separate price for each top-up amount and store all IDs:

```env
VITE_PADDLE_PRICE_10=pri_01...
VITE_PADDLE_PRICE_25=pri_01...
VITE_PADDLE_PRICE_50=pri_01...
VITE_PADDLE_PRICE_100=pri_01...
VITE_PADDLE_PRICE_200=pri_01...
VITE_PADDLE_PRICE_500=pri_01...
```

Then update `PaddleTopUp.tsx` to map each preset amount to its price ID.

---

## Step 4 — Set up the webhook

In **Developer Tools → Notifications → New notification**:

- URL: `https://coursevia-backend.onrender.com/api/webhooks/paddle`
- Events to subscribe:
  - `transaction.completed`
  - `subscription.activated`
  - `subscription.updated`
  - `subscription.canceled`
- Save → copy the **Secret key** → paste into `backend/.env` as `PADDLE_WEBHOOK_SECRET`

---

## Step 5 — Run the SQL migration

Run `PADDLE_MIGRATION.sql` in your Supabase SQL Editor to create the
`paddle_events` table (used for idempotent webhook processing).

---

## Step 6 — Deploy and test

1. Rebuild the frontend: `npm run build`
2. Restart the backend
3. Open `/dashboard/wallet` as a learner
4. You should see the **"Top Up with Card"** section
5. Pick an amount and click **Top up** — Paddle overlay will open

### Safe live test (zero cost)

1. In Paddle dashboard → **Discounts**, create a new discount:
   - Type: **Percentage**
   - Amount: **100%**
   - Applies to: your Wallet Top-Up product
   - Usage limit: 1
2. Complete a real checkout with a real card and apply the discount code
3. Total will be $0.00 — Paddle still fires the webhook
4. Verify your wallet balance increased in Supabase
5. Archive the discount after testing

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Checkout overlay doesn't open | Check `VITE_PADDLE_CLIENT_TOKEN` is set and starts with `live_` |
| "Something went wrong" on checkout | Set a default payment link in Paddle dashboard → Checkout settings |
| Webhook not received | Check the URL in Paddle Notifications matches your deployed backend URL exactly |
| Wallet not credited | Check backend logs for `[Paddle Webhook]` entries; verify `PADDLE_WEBHOOK_SECRET` matches |
| Domain not approved | Add `coursevia.site` in Paddle → Checkout → Checkout domains |
