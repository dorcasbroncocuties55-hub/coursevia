# Search Results Not Showing - Diagnosis & Fix

## Issue
Coaches, therapists, and creators are not showing in search results.

## Root Causes

### 1. No profiles with `onboarding_completed = true`
The search queries filter for:
```sql
WHERE onboarding_completed = true
```

If all profiles have `onboarding_completed = false` or `NULL`, nothing will show.

### 2. Wrong role in profiles table
Profiles might have the wrong role value (e.g., "learner" instead of "coach").

### 3. Empty profiles table
No coach/therapist/creator profiles exist yet.

## Diagnostic SQL Queries

Run these in your Supabase SQL Editor to check:

```sql
-- Check all profiles
SELECT 
  user_id,
  full_name,
  email,
  role,
  onboarding_completed,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 20;

-- Count profiles by role
SELECT 
  role,
  COUNT(*) as count,
  SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as completed_onboarding
FROM profiles
GROUP BY role;

-- Check coach profiles specifically
SELECT 
  user_id,
  full_name,
  role,
  onboarding_completed,
  is_verified,
  city,
  country
FROM profiles
WHERE role = 'coach' OR provider_type = 'coach'
LIMIT 10;

-- Check therapist profiles
SELECT 
  user_id,
  full_name,
  role,
  onboarding_completed,
  is_verified,
  city,
  country
FROM profiles
WHERE role = 'therapist' OR provider_type = 'therapist'
LIMIT 10;

-- Check creator profiles
SELECT 
  user_id,
  full_name,
  role,
  onboarding_completed,
  is_verified,
  city,
  country
FROM profiles
WHERE role = 'creator' OR provider_type = 'creator'
LIMIT 10;
```

## Fixes

### Fix 1: Mark existing profiles as onboarded (if they should be)

```sql
-- Mark all coach/therapist/creator profiles as onboarding completed
UPDATE profiles
SET onboarding_completed = true
WHERE role IN ('coach', 'therapist', 'creator')
  AND onboarding_completed IS NOT true;

-- Verify
SELECT role, COUNT(*) 
FROM profiles 
WHERE onboarding_completed = true 
GROUP BY role;
```

### Fix 2: Create test profiles (if none exist)

```sql
-- Create a test coach profile (use a real user_id from auth.users)
UPDATE profiles
SET 
  role = 'coach',
  onboarding_completed = true,
  full_name = 'John Doe',
  headline = 'Life Coach & Career Mentor',
  bio = 'Helping professionals achieve their goals',
  country = 'United States',
  city = 'New York',
  booking_price = 50,
  service_delivery_mode = 'both',
  is_verified = true
WHERE user_id = 'YOUR_USER_ID_HERE';
```

### Fix 3: Check if user completed onboarding but profile not updated

Sometimes the `user_metadata` has `onboarding_completed: true` but the profile table wasn't updated:

```sql
-- Find users with metadata onboarding_completed but profile not updated
-- (You'll need to check this in your auth logs or via Supabase dashboard)

-- Force sync from metadata
UPDATE profiles p
SET onboarding_completed = true
FROM auth.users u
WHERE p.user_id = u.id
  AND u.raw_user_meta_data->>'onboarding_completed' = 'true'
  AND p.onboarding_completed IS NOT true;
```

## Quick Test

1. **Go to Supabase SQL Editor**
2. **Run this query:**
```sql
SELECT COUNT(*) FROM profiles WHERE role IN ('coach', 'therapist', 'creator') AND onboarding_completed = true;
```

3. **If result is 0:**
   - No profiles to show
   - Run Fix 1 above

4. **If result is > 0:**
   - Profiles exist
   - Check frontend console for errors
   - Check if API calls are timing out

## Frontend Debugging

Open browser console and check for:
- `Failed to load creators/coaches/therapists:` errors
- Network tab showing 30s timeout on queries
- Empty array `[]` being returned from database

## Summary

**Most likely cause:** Profiles exist but `onboarding_completed = false` or `NULL`

**Quick fix:** Run Fix 1 SQL to mark all provider profiles as completed
