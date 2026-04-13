# 🚀 QUICK FIX GUIDE

## Step 1: Run the SQL Fix
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste **ALL** content from `FIX_EVERYTHING_BANKS.sql`
3. Click "Run" button
4. Wait for success message: ✅ EVERYTHING FIXED!

## Step 2: Start Backend Server
```bash
cd backend
npm start
```

Backend should start on: `http://192.168.119.66:5000`

## Step 3: Refresh Browser
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or just close and reopen browser

## Step 4: Test
1. Go to Bank Accounts page in your dashboard
2. Click "Add Bank" button
3. **Country dropdown should now show 40+ countries** ✅
4. Select a country → Banks should load
5. Fill form and save

## What This Fixes:
✅ Removes duplicate banks (CHASE duplicates)
✅ Adds PayPal and digital wallets (Stripe, Wise, Venmo, Cash App, Zelle)
✅ Creates `banking_countries` table with 40+ countries
✅ Fixes `bank_accounts` table (adds is_default, is_primary, metadata, etc.)
✅ Sets up all permissions and RLS policies
✅ Creates all necessary indexes

## If You Get Errors:
- Copy the error message
- Tell me what happened
- I'll create a simpler fix

---

**The file to run: `FIX_EVERYTHING_BANKS.sql`**
