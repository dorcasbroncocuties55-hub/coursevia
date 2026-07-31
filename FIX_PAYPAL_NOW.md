# 🔧 Fix PayPal and Bank Account Errors

## 🐛 Errors Found

1. **400 error** - `bank_accounts` table missing `is_default` column
2. **406 error** - PayPal not in `banks` table
3. **Backend timeout** - Backend server not running

---

## ✅ Quick Fix (3 minutes)

### Step 1: Fix Database (2 minutes)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard)
2. Copy and paste the content from: `FIX_PAYPAL_AND_BANKS.sql`
3. Click **Run**
4. Wait for success message

**This will:**
- ✅ Add `is_default` column to bank_accounts
- ✅ Add PayPal to banks table
- ✅ Add other digital wallets (Stripe, Wise, Venmo, etc.)
- ✅ Fix all missing columns
- ✅ Set up proper RLS policies

### Step 2: Start Backend (1 minute)

```bash
cd backend
npm start
```

**You should see:**
```
✓ Server running on port 5000
```

### Step 3: Refresh Browser

```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

---

## 🎯 What Gets Fixed

### Database Tables

**banks table:**
- ✅ PayPal added
- ✅ Stripe added
- ✅ Wise (TransferWise) added
- ✅ Venmo added
- ✅ Cash App added
- ✅ Zelle added

**bank_accounts table:**
- ✅ `is_default` column added
- ✅ `is_primary` column added
- ✅ `account_holder_name` column added
- ✅ `bank_name` column added
- ✅ `metadata` JSONB column added
- ✅ `provider` column added
- ✅ All necessary columns present

### Backend
- ✅ Server running on port 5000
- ✅ API endpoints accessible
- ✅ Stripe Connect endpoints working

---

## 🧪 Test After Fix

### Test PayPal
1. Go to Bank Accounts page
2. Click "Add PayPal Account"
3. Should load without 406 error
4. Enter PayPal email
5. Should save successfully

### Test Bank Accounts
1. Go to Bank Accounts page
2. Should load without 400 error
3. Existing accounts should display
4. Can add new accounts

### Test Backend
1. Check browser console
2. No more connection timeout errors
3. API calls should succeed

---

## 🔍 Troubleshooting

### Still seeing 400 error?
**Check:**
1. SQL migration ran successfully
2. `is_default` column exists in bank_accounts
3. Browser cache cleared

### Still seeing 406 error?
**Check:**
1. PayPal exists in banks table:
   ```sql
   SELECT * FROM banks WHERE code = 'PAYPAL';
   ```
2. Should return one row

### Backend still timing out?
**Check:**
1. Backend is running: `cd backend && npm start`
2. Port 5000 is not blocked
3. Backend URL is correct in `.env`

---

## 📊 Verification Queries

After running the SQL, verify:

```sql
-- Check PayPal exists
SELECT name, code, bank_type 
FROM banks 
WHERE code = 'PAYPAL';

-- Check bank_accounts columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
AND column_name IN ('is_default', 'is_primary', 'metadata');

-- Check all digital wallets
SELECT name, code 
FROM banks 
WHERE bank_type = 'digital_wallet';
```

---

## 🎯 Summary

**Issues:**
- ❌ 400 error on bank_accounts
- ❌ 406 error on PayPal
- ❌ Backend not running

**Solutions:**
1. Run `FIX_PAYPAL_AND_BANKS.sql`
2. Start backend: `npm start`
3. Refresh browser

**Time:** 3 minutes
**Result:** PayPal and bank accounts work correctly

---

## ✅ Checklist

- [ ] Open Supabase SQL Editor
- [ ] Run `FIX_PAYPAL_AND_BANKS.sql`
- [ ] Verify success message
- [ ] Start backend server
- [ ] Refresh browser
- [ ] Test PayPal account addition
- [ ] Test bank account listing
- [ ] Verify no console errors

---

**Run the SQL and start the backend - all errors will be fixed!** 🎉
