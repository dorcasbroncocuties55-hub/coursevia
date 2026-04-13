# Didit KYC Setup Instructions

## Quick Start Guide

Follow these steps to switch from Persona to Didit KYC:

### 1. Get Didit API Credentials

1. Sign up at [Didit Dashboard](https://dashboard.didit.me)
2. Create a new project
3. Copy your API Key and Client ID
4. Save them - you'll need them in the next step

### 2. Update Backend Environment Variables

Add to `backend/.env`:

```env
# Didit KYC
DIDIT_API_KEY=your_api_key_here
DIDIT_CLIENT_ID=your_client_id_here
DIDIT_BASE_URL=https://api.didit.me
```

### 3. Update Backend Code

**Option A: Replace Persona code (Recommended)**

In `backend/server.js`:

1. **Replace lines 25-29** (Persona config) with:
```javascript
// Didit KYC
const DIDIT_API_KEY = process.env.DIDIT_API_KEY || "";
const DIDIT_CLIENT_ID = process.env.DIDIT_CLIENT_ID || "";
const DIDIT_BASE_URL = process.env.DIDIT_BASE_URL || "https://api.didit.me";
```

2. **Replace the KYC routes** (around line 549) with the code from `backend/didit-kyc-routes.js`

**Option B: Keep both (for migration)**

Add Didit routes alongside Persona routes. This allows gradual migration.

### 4. Update Frontend

**Replace the KYC page:**

```bash
# Backup current KYC page
mv src/pages/dashboard/KYCPage.tsx src/pages/dashboard/KYCPageOld.tsx

# Use Didit KYC page
mv src/pages/dashboard/KYCPageDidit.tsx src/pages/dashboard/KYCPage.tsx
```

Or manually update the imports in `src/App.tsx` to use the Didit version.

### 5. Configure Webhook in Didit Dashboard

1. Go to [Didit Dashboard](https://dashboard.didit.me) → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/kyc/didit/webhook`
3. Select events:
   - `verification.completed`
   - `verification.approved`
   - `verification.rejected`
4. Save

### 6. Run Database Migration

Run `COMPLETE_FIX_ALL_ISSUES.sql` in Supabase SQL Editor to ensure:
- ✅ KYC status column exists
- ✅ Profile table has correct structure
- ✅ RLS policies are set up

### 7. Test the Integration

1. **Start backend:**
```bash
cd backend
npm start
```

2. **Start frontend:**
```bash
npm run dev
```

3. **Test flow:**
   - Log in as a therapist/coach
   - Go to Dashboard
   - Click "Complete KYC"
   - Should open Didit verification
   - Complete verification
   - Check status updates

### 8. Verify Everything Works

**Check backend logs:**
```bash
# Should see:
# "Didit webhook received: { eventType: '...', verificationId: '...', status: '...' }"
```

**Check database:**
```sql
SELECT user_id, kyc_status, kyc_provider, is_verified 
FROM profiles 
WHERE kyc_provider = 'didit';
```

**Check frontend:**
- Dashboard should show correct KYC status
- "Not Started" → "Under Review" → "Verified"

---

## Environment Variables Summary

### Backend (.env)
```env
# Required
DIDIT_API_KEY=your_api_key
DIDIT_CLIENT_ID=your_client_id

# Optional (defaults shown)
DIDIT_BASE_URL=https://api.didit.me
APP_URL=http://localhost:8080
```

### Frontend (.env)
```env
# Required
VITE_BACKEND_URL=http://localhost:5000

# Or for production
VITE_BACKEND_URL=https://your-api-domain.com
```

---

## API Endpoints

### Create Verification Session
```
POST /api/kyc/didit/session
Body: { userId, email, fullName, role }
Response: { verificationId, verificationUrl, clientId }
```

### Webhook (Didit calls this)
```
POST /api/kyc/didit/webhook
Body: { verification: { id, user_id, status }, event }
Response: { received: true, status }
```

### Check Status
```
GET /api/kyc/didit/status/:verificationId
Response: { verificationId, status, data }
```

---

## Troubleshooting

### "Didit KYC is not configured"
- Check `DIDIT_API_KEY` and `DIDIT_CLIENT_ID` in backend/.env
- Restart backend server

### Verification window doesn't open
- Check browser popup blocker
- Check backend URL is correct in frontend
- Check browser console for errors

### Status not updating
- Check webhook is configured in Didit dashboard
- Check backend logs for webhook errors
- Verify webhook URL is publicly accessible
- Check Supabase RLS policies

### "Failed to start verification"
- Check Didit API credentials are valid
- Check Didit API status: https://status.didit.me
- Check backend logs for API errors

---

## Production Checklist

- [ ] Didit API credentials added to production environment
- [ ] Webhook URL configured in Didit dashboard
- [ ] Backend deployed and publicly accessible
- [ ] Frontend environment variables updated
- [ ] Database migration run on production
- [ ] Test verification flow end-to-end
- [ ] Monitor webhook logs for errors
- [ ] Set up alerts for failed verifications

---

## Support

- **Didit Docs:** https://docs.didit.me
- **Didit Support:** support@didit.me
- **Didit Status:** https://status.didit.me
- **Didit Dashboard:** https://dashboard.didit.me

---

## Migration Notes

If migrating from Persona:

1. **Existing verifications:** Keep Persona data, it won't be affected
2. **New verifications:** Will use Didit automatically
3. **Database:** Both providers use same status values
4. **Gradual migration:** Can run both systems in parallel

---

## Next Steps

After setup:
1. Test with a real user account
2. Monitor webhook events in Didit dashboard
3. Check verification success rate
4. Set up error monitoring
5. Document your specific configuration

Good luck! 🚀
