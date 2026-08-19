-- Drop all existing SELECT policies on profiles (safe to run multiple times)
DROP POLICY IF EXISTS "anon_read_completed_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "public_read_completed_profiles" ON public.profiles;
DROP POLICY IF EXISTS "public_can_view_provider_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_can_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can read completed provider profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read of completed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view provider profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Anon users can read any completed profile (coaches, therapists, creators)
CREATE POLICY "anon_read_completed_profiles"
  ON public.profiles FOR SELECT TO anon
  USING (onboarding_completed = true);

-- Authenticated users can read their own profile OR any completed profile
CREATE POLICY "authenticated_read_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR onboarding_completed = true);

-- Authenticated users can only insert/update their own profile
CREATE POLICY "authenticated_insert_own_profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_update_own_profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Make sure RLS is on
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verify: list all policies
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

-- Verify: count creators
SELECT count(*) AS creator_count FROM profiles
WHERE onboarding_completed = true AND (role = 'creator' OR account_type = 'creator');
