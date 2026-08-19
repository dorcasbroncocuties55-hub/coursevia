# Old Payout System - REMOVED ✅

The old manual payout system has been **completely removed** from the codebase and replaced with **Stripe Connect**.

## What Was Removed

### API Routes (Deleted from `backend/server.js`)
All the following routes have been **permanently deleted**:
- `GET /api/payouts/accounts` - Listed bank accounts
- `GET /api/payouts/withdrawals` - Listed withdrawal history
- `GET /api/payouts/capabilities` - Country/currency capabilities
- `GET /api/payouts/banks` - Bank directory lookup
- `POST /api/payouts/resolve-beneficiary` - Account name resolution
- `POST /api/payouts/send-verification` - Send verification code
- `POST /api/payouts/verify-beneficiary` - Verify bank account
- `DELETE /api/payouts/accounts/:id` - Delete bank account
- `POST /api/payouts/withdraw` - Create withdrawal request

### Code Dependencies Removed
- `import { getBanks } from "./bankData.js"` - Removed from imports
- In-memory storage variables (already removed):
  - `payoutAccountsMemory`
  - `payoutWithdrawalsMemory` 
  - `payoutVerificationCodes`

### Files That Can Be Archived (Optional)
These files are no longer used but kept for reference:
- `backend/bankData.js` - Bank directory data for manual verification

## Database Tables Preserved

The following tables still exist and contain **historical data only**:
- `bank_accounts` - Old bank account records
- `withdrawals` - Old withdrawal records

**Important:** Users will need to **re-onboard via Stripe Connect** to access the new withdrawal system. Historical bank accounts cannot be migrated automatically.

## New System: Stripe Connect

All payout functionality has been replaced with **Stripe Connect**:

### New API Routes (Active Now)
- `POST /api/connect/onboard` - Create Stripe Express account
- `GET /api/connect/status` - Check verification status
- `POST /api/connect/dashboard-link` - Access Stripe dashboard
- `POST /api/connect/payout` - Process withdrawal via Stripe
- `POST /api/webhooks/stripe-connect` - Handle Stripe webhooks

### Benefits
- ✅ Real bank verification (KYC/AML by Stripe)
- ✅ Automated payouts (2-7 days)
- ✅ Global coverage (40+ countries)
- ✅ Compliance included
- ✅ Full audit trail in Stripe Dashboard
- ✅ No manual processing needed

### Documentation
See **`STRIPE_CONNECT_SETUP_GUIDE.md`** for complete setup and migration instructions.

## Migration Status

✅ Old routes **removed** from `server.js`  
✅ Old imports **cleaned up**  
✅ New Stripe Connect routes **active**  
✅ Database schema created (`STRIPE_CONNECT_MIGRATION.sql`)  
⏳ **Next:** Run migration SQL + configure Stripe dashboard  

## Frontend Action Required

Frontend code using the old `/api/payouts/*` endpoints **will now fail**. Update to use the new `/api/connect/*` endpoints.

### Example Migration

**Old Flow (NO LONGER WORKS):**
```javascript
// 1. Add bank account
POST /api/payouts/send-verification
POST /api/payouts/verify-beneficiary

// 2. Request withdrawal
POST /api/payouts/withdraw
```

**New Flow (USE THIS):**
```javascript
// 1. Onboard with Stripe (one-time)
POST /api/connect/onboard
// Returns onboarding_url - redirect user to Stripe

// 2. Check if onboarding complete
GET /api/connect/status?user_id=xxx

// 3. Request withdrawal
POST /api/connect/payout
// Stripe handles bank verification + payout automatically
```

## For Developers

If you see errors about:
- `Cannot POST /api/payouts/*` - Routes removed, use `/api/connect/*`
- `payoutAccountsMemory is not defined` - Variable removed, use Stripe Connect
- `getBanks is not defined` - Import removed, Stripe handles bank selection

**Update your code immediately** to use Stripe Connect endpoints.

---

**Date Removed:** August 19, 2026  
**Replaced By:** Stripe Connect Express accounts  
**Reason:** Real bank verification, automated payouts, compliance, better UX  
**Breaking Change:** Yes - old endpoints no longer exist
