# 🚀 START HERE - Complete Setup Guide

## ✅ What's Already Done:

1. **Didit Credentials Added** ✅
   - Client ID: `f47fa0de-109f-4c43-a158-2b9f6d1d8e38`
   - API Key: Configured in `backend/.env`
   - Webhook Secret: Configured

2. **Backend Updated** ✅
   - Didit KYC routes added to `backend/server.js`
   - Session creation includes `vendor_data` field for user identification
   - Webhook handler updated to parse actual Didit webhook structure:
     - Extracts `vendor_data` (userId)
     - Parses nested `decision` object
     - Extracts user details from `decision.id_verifications[0]`
     - Handles `webhook_type`, `session_id`, `status`
   - Environment variables configured

3. **Frontend Updated** ✅
   - AuthContext now fetches `kyc_status` and `is_verified`
   - Dashboard displays correct KYC status
   - New Didit KYC page created at `src/pages/dashboard/KYCPageDidit.tsx`
   - Backend URL configured: `http://192.168.119.66:5000`

4. **Database Fixes Ready** ✅
   - SQL migration file: `COMPLETE_FIX_ALL_ISSUES.sql`
   - Fixes KYC status, profiles, bank accounts

---

## 📋 What You Need to Do Now:

### Step 1: Run Database Migration (5 minutes)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Open `COMPLETE_FIX_ALL_ISSUES.sql` from your project
4. Copy and paste the entire content
5. Click **Run**
6. Wait for success message

**This fixes:**
- ✅ KYC status (changes 'pending_setup' to 'not_started')
- ✅ Profile table structure
- ✅ Bank accounts (60+ countries, 80+ banks)
- ✅ All RLS policies

---

### Step 2: Replace KYC Page (2 minutes)

**Option A: Quick Replace**
```bash
# Backup old page
mv src/pages/dashboard/KYCPage.tsx src/pages/dashboard/KYCPageOld.tsx

# Use Didit page
mv src/pages/dashboard/KYCPageDidit.tsx src/pages/dashboard/KYCPage.tsx
```

**Option B: Manual Update**
- Open `src/App.tsx`
- Find imports for `KYCPage`
- Change to import from `KYCPageDidit.tsx`

---

### Step 3: Restart Backend (1 minute)

```bash
cd backend
npm install  # if needed
npm start
```

**Check logs for:**
```
✓ Server running on port 5000
✓ Didit KYC configured
```

---

### Step 4: Configure Didit Webhook (3 minutes)

1. Go to [Didit Dashboard](https://dashboard.didit.me)
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Enter webhook URL:
   ```
   http://192.168.119.66:5000/api/kyc/didit/webhook
   ```
   (Or your production URL)
5. Select events:
   - ✅ `status.updated`
   - ✅ `verification.completed`
   - ✅ `verification.approved`
   - ✅ `verification.rejected`
6. Click **Save**

---

### Step 5: Test Everything (5 minutes)

#### A. Test Backend
```bash
# Test Didit session creation
curl -X POST http://192.168.119.66:5000/api/kyc/didit/session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "therapist"
  }'
```

**Expected response:**
```json
{
  "provider": "didit",
  "verificationId": "...",
  "verificationUrl": "https://...",
  "clientId": "f47fa0de-109f-4c43-a158-2b9f6d1d8e38"
}
```

#### B. Test Frontend
1. **Hard refresh browser:** `Ctrl + Shift + R`
2. **Log out** completely
3. **Log back in**
4. Go to Dashboard
5. Check KYC status shows **"Not Started"** (not "Pending")
6. Click **"Complete KYC"** or **"Start Verification"**
7. Should open Didit verification window

#### C. Test Full Flow
1. Complete Didit verification
2. Check webhook logs in backend:
   ```
   Didit webhook received: {
     webhookType: 'status.updated',
     sessionId: '...',
     userId: '...',
     status: 'approved',
     userDetails: { full_name: '...', ... }
   }
   ```
3. Verify status updates in database:
   ```sql
   SELECT user_id, kyc_status, kyc_provider, is_verified, verified_name
   FROM profiles 
   WHERE kyc_provider = 'didit';
   ```
4. Dashboard should show **"Verified"** badge

---

## 🔍 Troubleshooting

### Issue: "Didit KYC is not configured"
**Fix:** Check `backend/.env` has all Didit variables, restart backend

### Issue: KYC still shows "Pending"
**Fix:** 
1. Run `COMPLETE_FIX_ALL_ISSUES.sql`
2. Hard refresh browser (`Ctrl + Shift + R`)
3. Log out and log back in

### Issue: Verification window doesn't open
**Fix:**
1. Check browser popup blocker
2. Check backend URL in `.env`: `VITE_BACKEND_URL=http://192.168.119.66:5000`
3. Check browser console (F12) for errors

### Issue: Webhook not working
**Fix:**
1. Check webhook URL in Didit dashboard
2. Make sure backend is publicly accessible (use ngrok if testing locally)
3. Check backend logs for webhook errors:
   ```bash
   cd backend
   npm start
   # Watch for "Didit webhook received:" messages
   ```

### Issue: "Missing required data" in webhook logs
**Fix:**
1. Verify `vendor_data` is included in session creation (already done)
2. Check webhook payload structure matches expected format
3. Check backend logs for the actual payload received

---

## 📊 Verification Checklist

- [ ] Database migration run successfully
- [ ] Backend restarted with Didit config
- [ ] KYC page replaced with Didit version
- [ ] Webhook configured in Didit dashboard
- [ ] Hard refresh browser done
- [ ] Logged out and back in
- [ ] Dashboard shows "Not Started" (not "Pending")
- [ ] Can click "Complete KYC" button
- [ ] Didit verification window opens
- [ ] Webhook receives events
- [ ] Status updates after verification
- [ ] Verified badge shows on profile

---

## 🎯 Quick Commands

**Start Backend:**
```bash
cd backend && npm start
```

**Start Frontend:**
```bash
npm run dev
```

**Check Backend Logs:**
```bash
# Look for:
# "Didit webhook received: { ... }"
# "Profile updated for user xxx: approved"
# "Didit session error: ..."
```

**Check Database:**
```sql
-- Check KYC status
SELECT user_id, kyc_status, kyc_provider, is_verified, verified_name
FROM profiles 
LIMIT 10;

-- Check verification requests
SELECT user_id, provider, status, created_at 
FROM verification_requests 
WHERE provider = 'didit'
ORDER BY created_at DESC;

-- Check verification events
SELECT user_id, event_type, created_at
FROM provider_verification_events
WHERE provider = 'didit'
ORDER BY created_at DESC;
```

---

## 📚 Documentation

- **Quick Start (3 min):** `QUICK_START.md` ⭐ START HERE
- **Complete Setup Guide:** `START_HERE.md` (this file)
- **Technical Details:** `DIDIT_INTEGRATION_COMPLETE.md`
- **Changes Summary:** `CHANGES_SUMMARY.md`
- **Didit Setup:** `DIDIT_SETUP_INSTRUCTIONS.md`
- **Integration Guide:** `DIDIT_KYC_INTEGRATION.md`
- **KYC Fix Summary:** `KYC_AND_BANK_FIX_SUMMARY.md`
- **Profile Fix:** `PROFILE_SAVE_FIX_SUMMARY.md`

---

## 🔧 Technical Details

### Webhook Structure
The backend now correctly parses Didit's webhook structure:
```javascript
{
  webhook_type: "status.updated",
  session_id: "...",
  vendor_data: "user-id-here", // Your userId
  status: "Approved",
  decision: {
    status: "Approved",
    id_verifications: [{
      full_name: "...",
      date_of_birth: "...",
      document_type: "...",
      // ... more fields
    }]
  }
}
```

### Session Creation
Sessions now include `vendor_data` field:
```javascript
{
  vendor_data: userId, // Used to identify user in webhook
  email: "...",
  full_name: "...",
  callback_url: "http://192.168.119.66:5000/api/kyc/didit/webhook"
}
```

---

## 🆘 Need Help?

1. Check backend logs for errors
2. Check browser console (F12)
3. Check Supabase logs
4. Review documentation files above
5. Test webhook with curl:
   ```bash
   curl -X POST http://192.168.119.66:5000/api/kyc/didit/webhook \
     -H "Content-Type: application/json" \
     -d @webhook-test.json
   ```

---

## ✨ After Everything Works

1. Test with a real user account
2. Monitor webhook events in Didit dashboard
3. Check verification success rate
4. Set up production webhook URL (use ngrok or deploy backend)
5. Update environment variables for production
6. Test all user roles (coach, therapist, creator, learner)

---

**Ready? Start with Step 1! 🚀**
