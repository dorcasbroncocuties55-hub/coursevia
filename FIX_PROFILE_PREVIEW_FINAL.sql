-- FINAL FIX: Profile preview works whether logged in or logged out
-- Run this ONCE and the issue is solved permanently

-- ============================================================================
-- PROFILES TABLE - Allow viewing any profile with a role
-- ============================================================================

-- Drop ALL existing conflicting policies
DROP POLICY IF EXISTS "anon_read_completed_profiles" ON profiles;
DROP POLICY IF EXISTS "authenticated_read_profiles" ON profiles;
DROP POLICY IF EXISTS "public_read_completed_profiles" ON profiles;
DROP POLICY IF EXISTS "public_can_view_provider_profiles" ON profiles;
DROP POLICY IF EXISTS "authenticated_can_view_profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view provider profiles" ON profiles;

-- ANONYMOUS USERS: Can view ANY profile that has a role (coach/therapist/creator)
-- This allows public directory browsing and profile sharing
CREATE POLICY "anon_read_provider_profiles"
  ON profiles
  FOR SELECT
  TO anon
  USING (role IS NOT NULL);

-- AUTHENTICATED USERS: Can view their OWN profile OR any profile with a role
-- This ensures logged-in users can browse profiles AND edit their own
CREATE POLICY "authenticated_read_all_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR role IS NOT NULL);

-- AUTHENTICATED USERS: Can insert their own profile
DROP POLICY IF EXISTS "authenticated_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "authenticated_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- AUTHENTICATED USERS: Can update their own profile
DROP POLICY IF EXISTS "authenticated_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "authenticated_update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- COACH_PROFILES TABLE - Public read access
-- ============================================================================
DROP POLICY IF EXISTS "anon_read_coach_profiles" ON coach_profiles;
DROP POLICY IF EXISTS "authenticated_read_coach_profiles" ON coach_profiles;
DROP POLICY IF EXISTS "public_read_coach_profiles" ON coach_profiles;

CREATE POLICY "public_read_coach_profiles"
  ON coach_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- THERAPIST_PROFILES TABLE - Public read access
-- ============================================================================
DROP POLICY IF EXISTS "anon_read_therapist_profiles" ON therapist_profiles;
DROP POLICY IF EXISTS "authenticated_read_therapist_profiles" ON therapist_profiles;
DROP POLICY IF EXISTS "public_read_therapist_profiles" ON therapist_profiles;

CREATE POLICY "public_read_therapist_profiles"
  ON therapist_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================
GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON coach_profiles TO anon, authenticated;
GRANT SELECT ON therapist_profiles TO anon, authenticated;

-- ============================================================================
-- VERIFY: Test that policies work
-- ============================================================================
-- After running this, test:
-- 1. Logout → visit profile → should load ✓
-- 2. Login → visit profile → should load ✓
-- 3. Login → edit own profile → should save ✓
