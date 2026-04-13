# 🚀 QUICK START - Didit KYC Integration

## ⚡ 3-Minute Setup

### 1️⃣ Run Database Migration (1 min)
```sql
-- Open Supabase SQL Editor and run:
-- File: COMPLETE_FIX_ALL_ISSUES.sql
```

### 2️⃣ Replace KYC Page (30 sec)
```bash
mv src/pages/dashboard/KYCPage.tsx src/pages/dashboard/KYCPageOld.tsx
mv src/pages/dashboard/KYCPageDidit.tsx src/pages/dashboard/KYCPage.tsx
```

### 3️⃣ Restart Backend (30 sec)
```bash
cd backend && npm start
```

### 4️⃣ Configure Webhook (1 min)
1. Go to [Didit Dashboard](https://dashboard.didit.me)
2. Add webhook: `http://192.168.119.66:5000/api/kyc/didit/webhook`
3. Select events: `status.updated`

---

## ✅ Test It Works

### Quick Test
1. Hard refresh browser: `Ctrl + Shift + R`
2. Log out and log back in
3. Go to Dashboard → KYC
4. Should show "Not Started" (not "Pending")
5. Click "Start Verification"
6. Didit window should open

### Full Test
1. Complete verification on Didit
2. Check backend logs:
   ```
   Didit webhook received: { ... }
   Profile updated for user xxx: approved
   ```
3. Dashboard should show "Verified" badge

---

## 🔍 Quick Debug

### Backend not starting?
```bash
cd backend
cat .env | grep DIDIT
# Should show all 4 DIDIT variables
```

### Webhook not working?
```bash
# Check backend logs
cd backend
npm start
# Watch for "Didit webhook received:"
```

### Status still "Pending"?
```sql
-- Check database
SELECT user_id, kyc_status, kyc_provider 
FROM profiles 
WHERE user_id = 'your-user-id';
```

---

## 📋 Checklist

- [ ] Database migration run
- [ ] KYC page replaced
- [ ] Backend restarted
- [ ] Webhook configured
- [ ] Browser hard refreshed
- [ ] Logged out and back in
- [ ] Status shows "Not Started"
- [ ] Verification window opens
- [ ] Webhook logs appear
- [ ] Status updates to "Verified"

---

## 🆘 Still Having Issues?

Read the full guide: `START_HERE.md`

Or check: `DIDIT_INTEGRATION_COMPLETE.md`

---

**That's it! You're ready to go! 🎉**
