-- DEBUG: Check if profile data exists and is correct
-- Run this in Supabase SQL Editor after completing onboarding

-- 1. Check if your profile exists
SELECT 
  user_id,
  email,
  full_name,
  display_name,
  avatar_url,
  role,
  onboarding_completed,
  created_at,
  updated_at
FROM profiles
WHERE email LIKE '%@%'  -- Replace with: WHERE email = 'your-email@example.com'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if complete_onboarding function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'complete_onboarding';

-- 3. Check if avatar_url column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('avatar_url', 'full_name', 'display_name');

-- 4. Check avatars storage bucket
SELECT id, name, public
FROM storage.buckets
WHERE name = 'avatars';

-- If any of these return empty results, that's your problem:
-- - Query 1 empty → Profile not created during onboarding
-- - Query 2 empty → complete_onboarding function not deployed
-- - Query 3 missing columns → FIX_AVATARS_NOW.sql not run completely
-- - Query 4 empty → avatars bucket not created
