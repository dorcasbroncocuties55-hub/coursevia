# 🎯 Stripe Connect Setup Guide for Coursevia

Complete step-by-step guide to enable withdrawals and refunds for creators, coaches, and therapists.

---

## 📋 Prerequisites

- ✅ Active Stripe account
- ✅ Supabase project running
- ✅ Backend server deployed
- ✅ Admin access to Stripe Dashboard

---

## Part 1: Stripe Dashboard Setup (15 minutes)

### Step 1: Enable Stripe Connect

1. **Go to Stripe Dashboard**
   - Login at: https://dashboard.stripe.com

2. **Navigate to Connect**
   - Click **"More +"** in the left sidebar (if not visible)
   - Select **"Connect"**
   - Or go directly to: https://dashboard.stripe.com/connect/accounts/overview

3. **Accept Connect Terms** (if first time)
   - Stripe will ask you to accept Connect platform agreement
   - Click **"Get started"** or **"Accept and continue"**

4. **You're Ready!**
   - No additional Connect configuration needed
   - Express accounts work automatically once you start creating them via API

### Step 2: Understand Payout Timing

**Important**: With Express accounts, **Stripe automatically manages payout schedules**. You and your providers **cannot customize** this.

**Default Payout Schedule**:
- 🕐 **Standard**: 2-7 business days after transfer
- 📅 Exact timing depends on:
  - Provider's country
  - Bank processing times
  - Stripe's risk assessment
  - Account history

**You Cannot Control**:
- ❌ Daily/weekly/monthly schedules
- ❌ Instant payouts
- ❌ Custom timing per provider

**What You Can Do**:
- ✅ Transfer money anytime (via your API)
- ✅ Stripe handles the rest automatically
- ✅ Providers see estimated arrival during onboarding

This is actually **simpler** - you don't manage payout infrastructure!

### Step 3: Configure Platform Branding (Optional but Recommended)

1. **Go to Settings → Branding**
   - URL: https://dashboard.stripe.com/settings/branding

2. **Upload Your Platform Logo**:
   - Square image, 512x512px minimum
   - Shows during provider onboarding
   - Makes the experience feel branded to Coursevia

3. **Set Brand Color**:
   - Your primary brand color
   - Used in Connect onboarding UI

4. **Set Business Info** (Settings → Business Settings):
   - Business name: Coursevia
   - Support email: support@coursevia.com
   - Website: https://coursevia.com

**Why This Matters**: When providers complete onboarding, they'll see YOUR branding, not just generic Stripe branding.

### Step 4: Set Up Webhook Endpoint

1. **Go to Developers → Webhooks**
   - URL: https://dashboard.stripe.com/webhooks

2. **Click "+ Add endpoint"**

3. **Enter Endpoint URL**:
   ```
   https://your-backend-url.com/api/stripe-connect/webhook
   ```
   Replace `your-backend-url.com` with your actual backend URL

4. **Select Events to Listen To**:
   - ✅ `account.updated`
   - ✅ `transfer.created`
   - ✅ `transfer.failed`  
   - ✅ `payout.paid`
   - ✅ `payout.failed`

5. **Click "Add endpoint"**

6. **Copy Webhook Secret**:
   - Click "Reveal" next to signing secret
   - Copy the `whsec_...` key
   - Save it - you'll need it for `.env`

### Step 5: Get API Keys

1. **Go to Developers → API keys**
   - URL: https://dashboard.stripe.com/apikeys

2. **Get Your Keys**:
   - **Secret key**: Click "Reveal" and copy (starts with `sk_live_...` or `sk_test_...`)
   - **Publishable key**: Copy (starts with `pk_live_...` or `pk_test_...`)

3. **Save Both Keys** - you'll add them to `.env`

---

## Part 2: Backend Configuration (5 minutes)

### Step 6: Update Environment Variables

1. **Open** `backend/.env`

2. **Add These Variables**:
   ```bash
   # Stripe Keys (from Step 4)
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
   
   # Stripe Webhook Secret (from Step 3)
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   
   # Your App URL
   APP_URL=https://coursevia.com
   
   # Supabase (you should already have these)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Save the file**

### Step 7: Install Dependencies (if needed)

```bash
cd backend
npm install
```

### Step 8: Restart Your Backend Server

```bash
# If running locally
npm start

# If deployed on Railway/Render/Heroku
# Push to git and it will auto-deploy
git add .
git commit -m "Add Stripe Connect"
git push
```

---

## Part 3: Database Setup (5 minutes)

### Step 9: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in left sidebar

3. **Create New Query**
   - Click **"New query"**

4. **Copy Migration SQL**
   - Open `STRIPE_CONNECT_MIGRATION.sql`
   - Copy ALL the SQL code

5. **Paste and Run**
   - Paste into SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)

6. **Verify Success**
   - You should see: `withdrawal_requests`, `refunds` tables created
   - No errors in output

### Step 10: Verify Tables Were Created

Run this query to check:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('withdrawal_requests', 'refunds');
```

You should see both tables listed.

---

## Part 4: Testing (10 minutes)

### Step 11: Test Provider Onboarding

1. **Use Postman, Insomnia, or cURL**

2. **Setup Provider Account**:
   ```bash
   POST https://your-backend-url.com/api/stripe-connect/setup
   Content-Type: application/json
   
   {
     "userId": "user-uuid-here",
     "email": "creator@example.com",
     "country": "US",
     "roles": ["creator"]
   }
   ```

3. **Expected Response**:
   ```json
   {
     "success": true,
     "accountId": "acct_xxxxx",
     "needsOnboarding": true,
     "onboardingUrl": "https://connect.stripe.com/setup/..."
   }
   ```

4. **Visit Onboarding URL**:
   - Copy the `onboardingUrl` from response
   - Open in browser
   - Complete Stripe onboarding form
   - Use test data (Stripe will recognize test mode)

### Step 12: Test Withdrawal Request

1. **Check Status First**:
   ```bash
   GET https://your-backend-url.com/api/stripe-connect/status/user-uuid-here
   ```

2. **Request Withdrawal** (after onboarding complete):
   ```bash
   POST https://your-backend-url.com/api/stripe-connect/withdraw
   Content-Type: application/json
   
   {
     "userId": "user-uuid-here",
     "amount": 50,
     "role": "creator"
   }
   ```

3. **Expected Response**:
   ```json
   {
     "success": true,
     "withdrawalId": "uuid",
     "transferId": "tr_xxxxx",
     "amount": 50,
     "estimatedArrival": "2-7 business days"
   }
   ```

### Step 13: Test Refund

```bash
POST https://your-backend-url.com/api/stripe-connect/refund
Content-Type: application/json

{
  "learnerId": "learner-uuid",
  "providerId": "provider-uuid",
  "providerRole": "creator",
  "amount": 20,
  "reason": "Customer not satisfied",
  "refundType": "full",
  "requestedBy": "admin-uuid"
}
```

---

## Part 5: Production Checklist

### Before Going Live:

- [ ] **Switch to Live Mode in Stripe**
  - Toggle from "Test mode" to "Live mode" in Stripe Dashboard
  - Get **live** API keys (`sk_live_...`, `pk_live_...`)
  - Update `.env` with live keys

- [ ] **Update Webhook**
  - Create new webhook for live mode
  - Use same endpoint URL
  - Get new webhook secret
  - Update `STRIPE_WEBHOOK_SECRET` in `.env`

- [ ] **Test with Real Bank Account**
  - Complete onboarding with your own account
  - Make small test withdrawal ($5)
  - Verify it arrives in bank account

- [ ] **Set Minimum Withdrawal**
  - Adjust in code if needed (currently $20)
  - File: `stripe-connect.js` line ~195

- [ ] **Configure Payout Schedule**
  - ~~In Stripe Dashboard → Connect → Settings~~ **NOT NEEDED!**
  - Stripe automatically handles this for Express accounts
  - Payouts arrive 2-7 business days after transfer

- [ ] **Review Fees**
  - Stripe Connect: FREE for same-currency transfers
  - Payout to bank: $0.25 per payout
  - Currency conversion: 1-2% (if applicable)

- [ ] **Set Up Monitoring**
  - Enable email notifications in Stripe
  - Set up failed payout alerts
  - Monitor withdrawal requests daily

---

## 🌍 Multi-Country Support

### Supported Countries (Stripe Connect):
- United States, Canada
- United Kingdom, Ireland
- European Union (27 countries)
- Australia, New Zealand
- Japan, Singapore, Hong Kong
- **Limited**: South Africa

### For Unsupported Countries:

Add alternative payout methods:
- PayPal (global)
- Wise/TransferWise (180+ countries)
- Payoneer (200+ countries)
- Mobile Money (M-Pesa, etc.)
- Bank transfer via local processors

---

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe-connect/setup` | POST | Create Connect account |
| `/api/stripe-connect/status/:userId` | GET | Check account status |
| `/api/stripe-connect/withdraw` | POST | Request withdrawal |
| `/api/stripe-connect/withdrawals/:userId` | GET | Get withdrawal history |
| `/api/stripe-connect/refund` | POST | Process refund |
| `/api/stripe-connect/refunds/:userId` | GET | Get refund history |
| `/api/stripe-connect/webhook` | POST | Stripe webhooks |

---

## 🔐 Security Best Practices

1. **Never expose secret keys in frontend**
2. **Always validate user ownership** before processing
3. **Use RLS policies** (already configured in migration)
4. **Log all financial transactions**
5. **Set rate limits** on withdrawal endpoints
6. **Verify webhook signatures** (already implemented)
7. **Use HTTPS only** for all API calls

---

## 🐛 Troubleshooting

### "Stripe not configured" Error
- **Fix**: Check `STRIPE_SECRET_KEY` in `.env`
- Restart backend server after updating

### "Please complete withdrawal setup first"
- **Fix**: User needs to complete Stripe onboarding
- Send them the `onboardingUrl` from setup endpoint

### "Insufficient balance"
- **Fix**: User doesn't have enough in wallet
- Check `wallets` table for their balance

### Webhook not receiving events
- **Fix**: Verify webhook URL is correct in Stripe Dashboard
- Check webhook secret matches `.env`
- Ensure server is publicly accessible (not localhost)

### Transfer failed
- **Fix**: Check provider's bank details
- Verify account passed verification
- Check Stripe Dashboard for specific error

---

## 💰 Fee Structure

```
User Top-up: $100
├─ Stripe fee: $3.20 (2.9% + $0.30)
└─ User wallet: $100

Course Sale: $50
├─ Platform fee: $5 (10%)
├─ Creator gets: $45
└─ No payment fee (already paid at top-up)

Creator Withdrawal: $45
├─ Stripe transfer: FREE
├─ Stripe payout: $0.25
└─ Creator receives: $44.75 (2-7 days)
```

---

## 🎉 You're Done!

Your Stripe Connect integration is now live! Creators, coaches, and therapists can:
- ✅ Connect their bank accounts
- ✅ Withdraw earnings
- ✅ Receive refunds

Need help? Check:
- Stripe Connect Docs: https://stripe.com/docs/connect
- Coursevia Support: support@coursevia.com

---

**Last Updated**: 2024
**Version**: 1.0.0
