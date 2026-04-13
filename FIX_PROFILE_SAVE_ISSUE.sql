-- Fix Profile Save Issue
-- This ensures profiles table has proper RLS policies and structure

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Verify profiles table structure
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ensure key columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Enable RLS and create policies
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Allow everyone to read all profiles (for directory, etc.)
CREATE POLICY "profiles_select_all" 
  ON public.profiles
  FOR SELECT 
  USING (true);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own" 
  ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" 
  ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own profile (optional)
CREATE POLICY "profiles_delete_own" 
  ON public.profiles
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Create trigger to update updated_at timestamp
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Create trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: Verification
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    policy_count INTEGER;
    column_count INTEGER;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    -- Count required columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('full_name', 'bio', 'phone', 'country', 'avatar_url', 'updated_at');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ PROFILE SAVE FIX COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Profiles Table:';
    RAISE NOTICE '  - RLS enabled: YES';
    RAISE NOTICE '  - Policies created: %', policy_count;
    RAISE NOTICE '  - Required columns: % / 6', column_count;
    RAISE NOTICE '  - Trigger: update_profiles_updated_at';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies:';
    RAISE NOTICE '  - profiles_select_all (SELECT for everyone)';
    RAISE NOTICE '  - profiles_insert_own (INSERT for own profile)';
    RAISE NOTICE '  - profiles_update_own (UPDATE for own profile)';
    RAISE NOTICE '  - profiles_delete_own (DELETE for own profile)';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Profile updates should now work correctly!';
    RAISE NOTICE '';
END $$;

-- Test query (commented out - uncomment to test)
-- SELECT 
--     'Test: Can current user update their profile?' as test,
--     CASE 
--         WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
--         ELSE 'User is NOT authenticated'
--     END as auth_status;
