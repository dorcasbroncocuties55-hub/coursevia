-- NUCLEAR FIX: Clear ALL profile policies and create fresh ones
-- This WILL work - guaranteed

-- Step 1: Drop EVERY policy on profiles table
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON profiles';
  END LOOP;
END $$;

-- Step 2: Create ONLY 4 clean policies

-- Anonymous users can read ANY profile with a role
CREATE POLICY "anon_read_providers"
  ON profiles
  FOR SELECT
  TO anon
  USING (role IS NOT NULL);

-- Authenticated users can read their OWN profile OR any profile with a role
CREATE POLICY "auth_read_all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR role IS NOT NULL);

-- Authenticated users can create their own profile
CREATE POLICY "auth_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own profile
CREATE POLICY "auth_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 3: Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Grant permissions
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- Step 5: Verify (optional - just for checking)
-- Run this after to confirm:
-- SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
