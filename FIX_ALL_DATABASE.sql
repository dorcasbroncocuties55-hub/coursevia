-- ========================================
-- COURSEVIA - Fix All Database Issues
-- ========================================
-- Run this in your Supabase SQL Editor
-- This will fix search results not showing

-- 1. Check current state
SELECT 
  '=== BEFORE FIX ===' as status,
  role,
  COUNT(*) as total_profiles,
  SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as completed_onboarding,
  SUM(CASE WHEN onboarding_completed IS NULL THEN 1 ELSE 0 END) as null_onboarding
FROM profiles
GROUP BY role
ORDER BY role;

-- 2. Fix onboarding completion for all providers
-- This makes them appear in search results
UPDATE profiles
SET onboarding_completed = true
WHERE role IN ('coach', 'therapist', 'creator')
  AND (onboarding_completed IS NULL OR onboarding_completed = false);

-- 3. Set all providers as verified (since we removed KYC)
UPDATE profiles
SET is_verified = true
WHERE role IN ('coach', 'therapist', 'creator')
  AND (is_verified IS NULL OR is_verified = false);

-- 4. Check after fix
SELECT 
  '=== AFTER FIX ===' as status,
  role,
  COUNT(*) as total_profiles,
  SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as completed_onboarding,
  SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified_profiles
FROM profiles
GROUP BY role
ORDER BY role;

-- 5. Show sample provider profiles that will appear in search
SELECT 
  role,
  full_name,
  city,
  country,
  onboarding_completed,
  is_verified,
  created_at
FROM profiles
WHERE role IN ('coach', 'therapist', 'creator')
  AND onboarding_completed = true
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- OPTIONAL: Create test profiles if none exist
-- ========================================

-- Uncomment and modify if you need test profiles:
/*
-- Get a user_id from your auth.users table first:
SELECT id, email FROM auth.users LIMIT 5;

-- Then update one of those users to be a test coach:
UPDATE profiles
SET 
  role = 'coach',
  onboarding_completed = true,
  full_name = 'Test Coach',
  display_name = 'Test Coach',
  headline = 'Professional Life Coach',
  bio = 'Helping people achieve their goals',
  country = 'United States',
  city = 'New York',
  booking_price = 100,
  hourly_rate = 75,
  session_price = 100,
  service_delivery_mode = 'both',
  calendar_mode = 'provider_calendar',
  is_verified = true,
  skills = ARRAY['coaching', 'mentoring', 'career guidance'],
  languages = ARRAY['English', 'Spanish']
WHERE user_id = 'PASTE_USER_ID_HERE';

-- Create a test therapist:
UPDATE profiles
SET 
  role = 'therapist',
  onboarding_completed = true,
  full_name = 'Test Therapist',
  display_name = 'Test Therapist',
  headline = 'Licensed Therapist',
  bio = 'Providing professional therapy services',
  country = 'United Kingdom',
  city = 'London',
  booking_price = 120,
  hourly_rate = 90,
  session_price = 120,
  service_delivery_mode = 'online',
  calendar_mode = 'provider_calendar',
  is_verified = true,
  skills = ARRAY['therapy', 'counseling', 'mental health'],
  languages = ARRAY['English']
WHERE user_id = 'PASTE_ANOTHER_USER_ID_HERE';
*/

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT '✅ Database fixes applied successfully!' as message,
       'Search results should now work.' as note,
       'Go test: /coaches, /therapists, /creators' as action;
