# 🚀 Enhanced Stripe Connect Integration Guide

## Files Created

1. **`backend/stripe-connect-enhanced.js`** - Complete Stripe Connect implementation
2. **`backend/stripe-connect-routes.js`** - Express routes for API endpoints  
3. **`INTEGRATION_GUIDE.md`** - This setup guide

---

## Integration Steps

### 1. Add Routes to Your Server

In `backend/server.js`, add this import and route registration:

```javascript
// Add this import at the top with other imports
import stripeConnectRoutes from "./stripe-connect-routes.js";

// Add this route registration with your other routes
app.use("/api/connect", stripeConnectRoutes);
```

### 2. Update Environment Variables

Add these to your `.env` file:

```bash
# Stripe Connect Settings
STRIPE_ACCOUNT_ID=acct_your_main_account_id
SUPPORT_EMAIL=support@coursevia.com  
SUPPORT_PHONE=+44 20 7946 0958

# Optional: For webhook signature verification
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 3. Update Platform Branding (One-time setup)

Run this once to configure your Stripe account branding:

```javascript
import { updatePlatformSettings } from "./stripe-connect-enhanced.js";

// Call this once during initial setup
await updatePlatformSettings();
```

---

## API Endpoints Available

### Account Setup & Management

**POST `/api/connect/setup`**
- Creates Express account + generates onboarding link
- Body: `{ email, userId, role, country?, businessInfo? }`
- Response: `{ success, accountId, onboardingUrl, isExisting }`

**GET `/api/connect/status/:userId`**  
- Gets current account verification status
- Response: `{ connected, payouts_enabled, requirements, etc. }`

**POST `/api/connect/refresh-link`**
- Generates new onboarding link (5-min expiry)
- Body: `{ userId, role }`
- Response: `{ onboardingUrl, expiresAt }`

**POST `/api/connect/dashboard-link`**
- Creates Stripe Express dashboard link
- Body: `{ userId }`
- Response: `{ dashboardUrl, expiresAt }`

**POST `/api/connect/webhook`**
- Handles Stripe webhook events
- Automatically updates database when accounts change status

---

## Frontend Implementation

### 1. Setup Payouts Button

```javascript
const setupPayouts = async () => {
  try {
    const response = await fetch('/api/connect/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        userId: user.id,
        role: user.role, // 'creator', 'coach', 'therapist'
        country: 'GB',   // Default to UK
        businessInfo: {
          businessName: "My Creator Business",
          description: "Professional services"
        }
      })
    });

    const result = await response.json();
    
    if (result.success && result.onboardingUrl) {
      // Redirect to Stripe onboarding
      window.location.href = result.onboardingUrl;
    } else {
      console.log("Account already exists");
    }
  } catch (error) {
    console.error("Setup failed:", error);
  }
};
```

### 2. Check Account Status

```javascript
const checkPayoutStatus = async (userId) => {
  const response = await fetch(`/api/connect/status/${userId}`);
  const status = await response.json();
  
  return {
    isConnected: status.connected,
    canReceivePayouts: status.payouts_enabled,
    needsInfo: status.requirements?.currently_due?.length > 0
  };
};
```

### 3. Success/Return URL Handlers

Create these frontend routes:

- **`/{role}/payouts/success`** - Show success message, redirect to dashboard
- **`/{role}/payouts/setup`** - Show setup page with "Complete Verification" button

---

## Database Schema (Already Added)

The following columns are added to your `profiles` table:

```sql
-- Stripe Connect columns (already in your DB)
stripe_account_id TEXT UNIQUE
stripe_onboarding_completed BOOLEAN DEFAULT false  
stripe_payouts_enabled BOOLEAN DEFAULT false
stripe_details_submitted BOOLEAN DEFAULT false
stripe_connect_status TEXT -- 'pending', 'active', 'restricted'
```

---

## Webhook Configuration

### 1. Create Webhook Endpoint in Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/connect/webhook`
3. Select events: `account.updated`, `account.application.deauthorized`
4. Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### 2. Events Handled

- **`account.updated`** - User completes verification, account status changes
- **`account.application.deauthorized`** - User disconnects account

---

## Workflow Example

### Complete User Flow:

1. **User clicks "Setup Payouts"**
   ```
   Frontend calls POST /api/connect/setup
   → Creates Express account
   → Returns onboarding URL
   → User redirected to Stripe
   ```

2. **User completes Stripe onboarding**
   ```
   Stripe collects: Identity, Tax info, Bank details
   → User redirected back to: /{role}/payouts/success
   → Account status: "Restricted" → "Enabled"
   ```

3. **Webhook updates status**  
   ```
   Stripe sends account.updated webhook
   → Backend updates database
   → stripe_payouts_enabled = true
   → User can now receive payouts
   ```

4. **User can access Express dashboard**
   ```
   Frontend calls POST /api/connect/dashboard-link
   → Returns Stripe dashboard URL
   → User manages account directly in Stripe
   ```

---

## Benefits of This Implementation

✅ **Automated Onboarding** - Users complete verification in Stripe's UI  
✅ **Real Bank Verification** - Stripe validates bank details  
✅ **Compliance Included** - KYC/AML handled by Stripe  
✅ **Status Sync** - Webhooks keep your database updated  
✅ **Professional Branding** - Coursevia branding in Express dashboard  
✅ **Global Support** - 40+ countries supported  
✅ **Production Ready** - Error handling, logging, validation  

---

## Testing

### 1. Test Account Creation
```bash
curl -X POST http://localhost:5000/api/connect/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userId":"user_123","role":"creator"}'
```

### 2. Test Status Check
```bash
curl http://localhost:5000/api/connect/status/user_123
```

### 3. Test with Stripe Test Data
Use Stripe's test verification data during onboarding to simulate different account states.

---

## Next Steps

1. Add routes to `server.js`
2. Update environment variables  
3. Run platform settings update (one-time)
4. Create webhook in Stripe Dashboard
5. Update frontend to use new endpoints
6. Test complete flow with test account

**Your enhanced Stripe Connect system is ready!** 🎉