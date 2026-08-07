-- ============================================================
-- FIX: Directory search slow/broken when logged in
-- Root cause: "profiles_select_own" policy only lets
--   authenticated users see THEIR OWN profile row.
--   The public policy doesn't apply when authenticated,
--   so the directory query returns 0 rows for logged-in users.
-- Fix: Replace the authenticated SELECT policy with one that
--   allows users to see their own profile AND all public
--   provider profiles (onboarding_completed = true).
-- ============================================================

-- Step 1: Drop conflicting policies
DROP POLICY IF EXISTS "profiles_select_own"    ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view provider profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public"  ON public.profiles;

-- Step 2: Single unified SELECT policy for authenticated users
-- They can see:
--   a) Their own profile (always)
--   b) Any completed provider profile (for directory browsing)
CREATE POLICY "authenticated_can_view_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR onboarding_completed = true
  );

-- Step 3: Public (anon) can view completed provider profiles
CREATE POLICY "public_can_view_provider_profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (onboarding_completed = true);

-- Step 4: Keep insert/update own only
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "authenticated_insert_own_profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
