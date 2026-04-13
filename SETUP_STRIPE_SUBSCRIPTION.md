# 🔧 Setup Stripe for Subscriptions

## Issue: Subscription not opening Stripe checkout

The backend is in **demo mode** because Stripe keys are not configured.

---

## Step 1: Get Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Sign up or log in
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

---

## Step 2: Add Keys to Backend

Edit `backend/.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Other settings
APP_URL=http://192.168.119.66:8080
CURRENCY=usd
MONTHLY_PLAN_PRICE=10
YEARLY_PLAN_PRICE=120
```

---

## Step 3: Add Publishable Key to Frontend

Edit `.env`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
VITE_BACKEND_URL=http://192.168.119.66:5000
```

---

## Step 4: Restart Backend

```bash
cd backend
npm start
```

You should see:
```
✓ Stripe initialized
Server running on http://192.168.119.66:5000
```

---

## Step 5: Test Subscription

1. Go to `/pricing`
2. Click "Choose monthly"
3. Click "Subscribe"
4. **Should now open Stripe checkout** ✅

---

## Test Cards (Stripe Test Mode)

Use these cards in Stripe checkout:

**Success:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Decline:**
- Card: `4000 0000 0000 0002`

**3D Secure:**
- Card: `4000 0027 6000 3184`

---

## Alternative: Use Demo Mode (No Stripe)

If you don't want to set up Stripe yet, the demo mode will:
1. Simulate payment
2. Redirect to callback page
3. Mark subscription as active

**Demo mode is already working** - it just doesn't open real Stripe checkout.

To use demo mode:
1. Click Subscribe
2. You'll see "Demo subscription checkout initialized"
3. It redirects to `/billing/subscription-callback?demo=1`
4. Subscription activates automatically

---

## Troubleshooting

### "Stripe not initialized"
- Check `STRIPE_SECRET_KEY` in `backend/.env`
- Make sure it starts with `sk_test_`
- Restart backend

### "Invalid API key"
- Copy key from Stripe dashboard
- Don't include quotes in .env file
- Check for extra spaces

### Still using demo mode
- Verify keys are in `backend/.env`
- Restart backend completely
- Check backend console for "Stripe initialized"

---

## What Happens After Setup:

**Before (Demo Mode):**
```
Click Subscribe → Redirects to /billing/subscription-callback?demo=1
```

**After (Real Stripe):**
```
Click Subscribe → Opens Stripe checkout → Complete payment → Redirects back
```

---

## Quick Check:

Run this in backend console after starting:
```javascript
console.log("Stripe configured:", !!stripe);
```

Should show: `Stripe configured: true`

If false, keys are not set correctly.
