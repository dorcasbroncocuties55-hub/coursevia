# Didit KYC Integration Guide

## Overview
This guide explains how to integrate Didit KYC verification into your application, replacing the existing Persona integration.

## Step 1: Update Backend Environment Variables

Add these to your `backend/.env` file:

```env
# Didit KYC Configuration
DIDIT_API_KEY=your_didit_api_key_here
DIDIT_CLIENT_ID=your_didit_client_id_here
DIDIT_BASE_URL=https://api.didit.me
```

## Step 2: Update Backend Server

Replace the Persona configuration in `backend/server.js` (lines 25-29) with:

```javascript
// Didit KYC
const DIDIT_API_KEY = process.env.DIDIT_API_KEY || "";
const DIDIT_CLIENT_ID = process.env.DIDIT_CLIENT_ID || "";
const DIDIT_BASE_URL = process.env.DIDIT_BASE_URL || "https://api.didit.me";
```

## Step 3: Replace KYC Endpoints

Replace the Persona KYC endpoints (around line 549) with the Didit endpoints.

See `backend/didit-kyc-routes.js` for the complete implementation.

## Step 4: Update Frontend KYC Page

The KYC page (`src/pages/dashboard/KYCPage.tsx`) needs to be updated to use Didit instead of the manual form.

See `src/pages/dashboard/KYCPageDidit.tsx` for the complete implementation.

## Step 5: Configure Didit Webhook

1. Log in to your Didit dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://your-domain.com/api/kyc/didit/webhook`
4. Select events: `verification.completed`, `verification.approved`, `verification.rejected`
5. Save the webhook

## Step 6: Test the Integration

### Test Flow:
1. User clicks "Complete KYC" on dashboard
2. Frontend calls `/api/kyc/didit/session`
3. Backend creates Didit verification session
4. User is redirected to Didit verification flow
5. User completes verification
6. Didit sends webhook to `/api/kyc/didit/webhook`
7. Backend updates profile with KYC status
8. User sees "Verified" badge on dashboard

### Test Endpoints:

**Create Session:**
```bash
curl -X POST http://localhost:5000/api/kyc/didit/session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id-here",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "therapist"
  }'
```

**Check Status:**
```bash
curl http://localhost:5000/api/kyc/didit/status/verification-id-here
```

## Didit API Documentation

- **Base URL:** https://api.didit.me
- **Docs:** https://docs.didit.me
- **Dashboard:** https://dashboard.didit.me

## Status Mapping

| Didit Status | Our Status | Description |
|--------------|------------|-------------|
| `approved`, `verified`, `completed` | `approved` | KYC passed |
| `rejected`, `declined`, `failed` | `rejected` | KYC failed |
| `pending`, `in_progress`, `processing` | `pending` | Under review |

## Database Schema

The integration uses these tables:
- `profiles` - Stores `kyc_status`, `kyc_provider`, `kyc_inquiry_id`
- `verification_requests` - Stores verification attempts
- `provider_verification_events` - Logs all webhook events

## Troubleshooting

### Issue: "Didit KYC is not configured"
**Solution:** Check that `DIDIT_API_KEY` and `DIDIT_CLIENT_ID` are set in backend/.env

### Issue: Webhook not receiving events
**Solution:** 
1. Check webhook URL is correct in Didit dashboard
2. Ensure your server is publicly accessible
3. Check backend logs for webhook errors

### Issue: Status not updating after verification
**Solution:**
1. Check Supabase logs for RPC errors
2. Verify `profiles` table has `kyc_status` column
3. Check webhook payload in `provider_verification_events` table

## Migration from Persona

If you're migrating from Persona:

1. **Keep existing data:** Verification requests with `provider = 'persona'` will remain
2. **New verifications:** Will use `provider = 'didit'`
3. **Status compatibility:** Both use the same status values (`not_started`, `pending`, `approved`, `rejected`)

## Security Notes

- ✅ API keys are stored in environment variables
- ✅ Webhook events are logged for audit
- ✅ User data is encrypted in transit
- ✅ RLS policies protect user data
- ⚠️ Consider adding webhook signature verification for production

## Support

- Didit Support: support@didit.me
- Didit Docs: https://docs.didit.me
- Didit Status: https://status.didit.me
