# Judge Portal Signup Issues - Fixes Applied

## Problems Identified

### 1. Network Connectivity (RESOLVED)
- **Issue**: `ERR_INTERNET_DISCONNECTED` and `ERR_NAME_NOT_RESOLVED`
- **Cause**: Internet connection was unstable
- **Status**: ✅ Connection is now working

### 2. Column Name Mismatch in judges Table (FIXED)
- **Issue**: Code was trying to insert `phone_number`, `country`, `state`, etc. but the schema only has `phone` and `specialization[]`
- **Fix Applied**: Updated `JudgeSignup.tsx` to match the actual schema:
  ```typescript
  // OLD (incorrect)
  phone_number: formData.phoneNumber || null,
  country: formData.country || null,
  state: formData.state || null,
  specialization: formData.specialization || null,
  bar_number: formData.barNumber || null,
  years_experience: formData.yearsExperience ? Number(formData.yearsExperience) : null,
  
  // NEW (correct)
  phone: formData.phoneNumber || null,
  specialization: formData.specialization ? [formData.specialization] : [],
  ```

### 3. RLS Policies Blocking Inserts (REQUIRES MIGRATION)
- **Issue**: Row Level Security policies were using `current_setting('app.current_judge_id')` which doesn't exist for regular auth users
- **Impact**: 
  - ❌ Cannot insert into `judges` table (403 Forbidden)
  - ❌ Cannot insert into `profiles` table (403 Forbidden)
  - ❌ Cannot query `judges` table (406 Not Acceptable)
- **Fix Created**: `COURT_ROOM_FIX.sql` migration file

### 4. Missing Accept Header (API Issue)
- **Issue**: 406 Not Acceptable when querying judges table
- **Cause**: Supabase RLS policies blocking the request OR missing proper headers
- **Fix**: Will be resolved by the RLS policy fixes in the migration

## Required Actions

### Step 1: Run the Database Migration

You need to run `COURT_ROOM_FIX.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Navigate to your project: `lpvcaukviteexnjzqqeo`
3. Go to SQL Editor
4. Copy and paste the contents of `COURT_ROOM_FIX.sql`
5. Click "Run"

This migration will:
- ✅ Allow public signup to judges table (with 'pending' status)
- ✅ Fix all RLS policies to use `auth.uid()` instead of `current_setting()`
- ✅ Allow users to create their own profiles
- ✅ Enable proper judge authentication and authorization

### Step 2: Restart Your Development Server

After running the migration:

```powershell
# Stop the current server (Ctrl+C if running)

# Restart the frontend
npm run dev
```

### Step 3: Clear Browser Cache

1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Expected Behavior After Fixes

1. ✅ Judge signup form should accept all data
2. ✅ Auth account creation should succeed
3. ✅ Judge profile should be created with `status='pending'`
4. ✅ No more 403 Forbidden errors
5. ✅ No more 406 Not Acceptable errors
6. ✅ No more 422 Unprocessable Content errors
7. ✅ Judges can log in after admin approval (status changed to 'active')

## Database Schema Reference

### judges Table (Actual Schema)
```sql
CREATE TABLE judges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  full_name       text NOT NULL,
  phone           text,  -- Note: NOT phone_number
  specialization  text[] DEFAULT '{}',  -- Note: Array, not single text
  status          text NOT NULL DEFAULT 'pending',
  rank            text NOT NULL DEFAULT 'junior',
  hire_date       timestamptz DEFAULT now(),
  last_login      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### Additional Fields (Not in Current Schema)
The form collects these fields but they are NOT stored in the database:
- ❌ country
- ❌ state  
- ❌ bar_number
- ❌ years_experience
- ❌ cases_handled
- ❌ success_rate
- ❌ avg_resolution_time

**Options:**
1. Remove these fields from the signup form
2. Add these columns to the judges table via migration

## Recommended: Extended Judges Table Migration

If you want to keep all the form fields, run this additional migration:

```sql
-- Add missing columns to judges table
ALTER TABLE judges 
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS bar_number text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS cases_handled integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_resolution_time numeric(10,2) DEFAULT 0;

-- Add index for bar_number lookups
CREATE INDEX IF NOT EXISTS judges_bar_number_idx ON judges(bar_number);
```

Then update the signup code to include all fields again:

```typescript
const { error: judgeError } = await supabase
  .from('judges')
  .insert({
    id: authData.user.id,
    email: formData.email,
    full_name: formData.fullName,
    phone: formData.phoneNumber || null,
    country: formData.country || null,
    state: formData.state || null,
    specialization: formData.specialization ? [formData.specialization] : [],
    bar_number: formData.barNumber || null,
    years_experience: formData.yearsExperience ? Number(formData.yearsExperience) : null,
    rank: 'junior',
    status: 'pending',
    cases_handled: 0,
    success_rate: 0,
    avg_resolution_time: 0
  });
```

## Testing Checklist

After applying fixes:

- [ ] Can access judge signup page
- [ ] Form accepts all input fields
- [ ] Submit button works without errors
- [ ] Auth account is created in Supabase Auth
- [ ] Judge record is created in judges table with status='pending'
- [ ] User is redirected to login page
- [ ] Toast notifications appear correctly
- [ ] Judge can login after admin approves (changes status to 'active')

## Admin Approval Process

To approve a pending judge:

1. Go to Supabase Dashboard > Table Editor > judges
2. Find the judge with status='pending'
3. Change status to 'active'
4. Judge can now log in and access the portal

Or create an admin interface to manage judge approvals.
