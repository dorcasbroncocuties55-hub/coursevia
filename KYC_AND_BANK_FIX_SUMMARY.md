# KYC and Bank Account Issues - Fixed

## Issues Identified and Resolved

### 1. KYC Status Showing "Pending" When Not Started ✅

**Problem:**
- Database was setting `kyc_status = 'pending_setup'` by default
- Frontend expected `'not_started'` | `'pending'` | `'approved'` | `'rejected'`
- The form condition `kycStatus !== "approved" && kycStatus !== "pending"` failed when status was `'pending_setup'`

**Solution:**
- Updated `KYCPage.tsx` to normalize all non-standard statuses to `'not_started'`
- SQL migration updates all `'pending_setup'` values to `'not_started'` in database
- Changed default value from `'pending_setup'` to `'not_started'`

**Files Changed:**
- `src/pages/dashboard/KYCPage.tsx` - Added proper status normalization logic
- `FIX_KYC_AND_BANK_ISSUES.sql` - Database migration to fix existing data

---

### 2. Bank Account Page Problems ✅

**Problem:**
- Frontend queried `user_bank_accounts_detailed` view (didn't exist)
- Fallback used `user_bank_accounts` table
- Backend used `bank_accounts` table
- Three different table names causing confusion and errors

**Solution:**
- Updated frontend to use `bank_accounts` table (matches backend)
- Fixed field mapping:
  - `is_default` ↔ `is_primary`
  - `account_name` ↔ `account_holder_name`
  - `country_code` ↔ `country_name`
  - Routing/SWIFT/IBAN stored in `metadata` JSONB field
- Changed delete from soft-delete to hard delete
- Kept fallback to `user_bank_accounts` for backwards compatibility

**Files Changed:**
- `src/components/banking/BankAccountForm.tsx` - Updated all database queries

---

### 3. Country and Bank Selection Not Working ✅

**Problem:**
- Bank select was using `bank.id` as value but should use `bank.name`
- `get_banks_by_country` RPC function might not exist
- No proper error handling

**Solution:**
- Changed bank select to use `bank.name` as value (matches database structure)
- Added proper error logging in `loadBanks` function
- SQL migration creates/updates `get_banks_by_country` function
- Added 60+ countries and 80+ banks to database
- Auto-fills SWIFT code from selected bank

**Files Changed:**
- `src/components/banking/BankAccountForm.tsx` - Fixed bank selection logic
- `FIX_KYC_AND_BANK_ISSUES.sql` - Ensures RPC function exists

---

## How to Apply the Fix

### Step 1: Run the SQL Migration

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `FIX_KYC_AND_BANK_ISSUES.sql`
4. Click "Run"
5. Verify you see the success message with counts

### Step 2: Refresh Your Application

1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear any cached data if needed
3. Test the KYC page - should show "Not started" status
4. Test the Bank Accounts page - should load countries and banks

---

## What the Migration Does

### KYC Fixes:
- ✅ Updates all `'pending_setup'` statuses to `'not_started'`
- ✅ Changes default value to `'not_started'`
- ✅ Ensures consistent status values across the system

### Banking System Setup:
- ✅ Creates `banking_countries` table with 60+ countries
- ✅ Creates `banks` table with 80+ major banks worldwide
- ✅ Creates `bank_accounts` table (matches backend structure)
- ✅ Inserts country data (USA, UK, Canada, Nigeria, etc.)
- ✅ Inserts bank data for each country
- ✅ Creates `get_banks_by_country()` RPC function
- ✅ Creates `set_primary_bank_account()` RPC function
- ✅ Enables Row Level Security (RLS) policies
- ✅ Allows users to view/insert/update/delete their own accounts only

---

## Expected Behavior After Fix

### KYC Page:
1. New users see "Not started" badge
2. Form is visible and ready to submit
3. After submission, status changes to "Under review" (pending)
4. Admin can approve/reject
5. Status updates to "Verified" or "Rejected"

### Bank Accounts Page:
1. User selects country from dropdown (60+ countries)
2. Banks load automatically for selected country
3. User selects bank from dropdown
4. SWIFT code auto-fills if available
5. User enters account details
6. Account is saved to `bank_accounts` table
7. First account is automatically set as primary
8. User can add multiple accounts
9. User can set any account as primary
10. User can delete accounts

---

## Database Schema

### bank_accounts Table Structure:
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- bank_name: TEXT (bank name)
- bank_code: TEXT (bank code)
- account_name: TEXT (account holder name)
- account_number: TEXT (account number)
- country_code: TEXT (country code like 'USA', 'NGA')
- currency: TEXT (currency code like 'USD', 'NGN')
- provider: TEXT ('manual', 'stripe', 'paypal')
- verification_status: TEXT ('pending', 'verified', 'rejected')
- is_default: BOOLEAN (primary account flag)
- metadata: JSONB (routing_number, swift_code, iban, account_type, bank_id)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

---

## Testing Checklist

### KYC Page:
- [ ] Navigate to KYC page
- [ ] Verify status shows "Not started" (not "Pending")
- [ ] Verify form is visible
- [ ] Fill out form and submit
- [ ] Verify status changes to "Under review"

### Bank Accounts Page:
- [ ] Navigate to Bank Accounts page
- [ ] Click "Add Bank" button
- [ ] Select a country (e.g., "United States")
- [ ] Verify banks load in dropdown
- [ ] Select a bank (e.g., "Chase Bank")
- [ ] Verify SWIFT code auto-fills
- [ ] Enter account holder name
- [ ] Enter account number
- [ ] Submit form
- [ ] Verify account appears in list
- [ ] Verify first account is marked as "Primary"
- [ ] Add second account
- [ ] Click "Set primary" on second account
- [ ] Verify primary badge moves
- [ ] Delete an account
- [ ] Verify account is removed

---

## Troubleshooting

### If KYC still shows "Pending":
1. Check browser console for errors
2. Verify SQL migration ran successfully
3. Check `profiles` table: `SELECT kyc_status FROM profiles;`
4. Should see `'not_started'`, `'pending'`, `'approved'`, or `'rejected'`

### If Bank Accounts page shows "Banking system not set up":
1. Verify `banking_countries` table exists
2. Verify `banks` table exists
3. Verify `bank_accounts` table exists
4. Run: `SELECT COUNT(*) FROM banking_countries;` (should be 60+)
5. Run: `SELECT COUNT(*) FROM banks;` (should be 80+)

### If banks don't load when selecting country:
1. Check browser console for RPC errors
2. Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'get_banks_by_country';`
3. Test function: `SELECT * FROM get_banks_by_country('United States');`
4. Should return 10+ banks

### If you get permission errors:
1. Verify RLS policies are enabled
2. Check you're logged in
3. Verify `auth.uid()` matches your user ID
4. Check policies: `SELECT * FROM pg_policies WHERE tablename = 'bank_accounts';`

---

## Additional Notes

- The system now supports 60+ countries and 80+ banks
- Banks are filtered by country name (case-insensitive)
- SWIFT codes are automatically populated when available
- Routing numbers, IBAN, and other details are stored in metadata
- The system is fully compatible with the backend server.js
- All changes are backwards compatible with existing data
