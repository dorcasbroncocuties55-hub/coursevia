-- ============================================================================
-- FIX SECURITY DEFINER VIEW - user_bank_accounts_detailed
-- ============================================================================
-- This fixes a critical security issue where the view bypasses RLS policies
-- because it uses SECURITY DEFINER (runs with owner's privileges)
-- 
-- Security Issue: The view allows users to potentially see other users' bank
-- account data because RLS policies are not properly enforced.
--
-- Solution: Recreate the view with security_invoker = true (Postgres 15+)
-- This makes the view run with the CALLER's privileges, so RLS applies correctly.
-- ============================================================================

-- First, ensure the user_bank_accounts table exists with correct schema
CREATE TABLE IF NOT EXISTS user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_holder_name TEXT, -- Name on the account
  account_number TEXT NOT NULL,
  account_type TEXT, -- e.g., 'checking', 'savings'
  bank_name TEXT NOT NULL,
  bank_code TEXT, -- SWIFT, BIC, or routing number
  country TEXT,
  currency TEXT DEFAULT 'USD',
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);

-- Drop the existing insecure view
DROP VIEW IF EXISTS public.user_bank_accounts_detailed CASCADE;

-- Recreate the view with SECURITY INVOKER (Postgres 15+)
-- This ensures RLS policies are properly enforced
CREATE OR REPLACE VIEW public.user_bank_accounts_detailed
WITH (security_invoker = true)
AS
SELECT 
  ba.id,
  ba.user_id,
  ba.account_holder_name,
  ba.account_number,
  ba.account_type,
  ba.bank_name,
  ba.bank_code,
  ba.country,
  ba.currency,
  ba.is_default,
  ba.is_verified,
  ba.created_at,
  ba.updated_at,
  p.full_name as user_full_name,
  p.email as user_email
FROM 
  user_bank_accounts ba
  LEFT JOIN profiles p ON p.user_id = ba.user_id;

-- Alternative for Postgres 14 and below (if security_invoker is not available)
-- Uncomment this block if you get an error about security_invoker
-- 
-- CREATE OR REPLACE VIEW public.user_bank_accounts_detailed
-- AS
-- SELECT 
--   ba.id,
--   ba.user_id,
--   ba.account_holder_name,
--   ba.account_number,
--   ba.account_type,
--   ba.bank_name,
--   ba.bank_code,
--   ba.country,
--   ba.currency,
--   ba.is_default,
--   ba.is_verified,
--   ba.created_at,
--   ba.updated_at,
--   p.full_name as user_full_name,
--   p.email as user_email
-- FROM 
--   user_bank_accounts ba
--   LEFT JOIN profiles p ON p.user_id = ba.user_id
-- WHERE 
--   ba.user_id = auth.uid(); -- Enforce user can only see their own accounts

-- Ensure RLS is enabled on the underlying table
ALTER TABLE IF EXISTS user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Admins can view all bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON user_bank_accounts;

-- Create proper RLS policies for user_bank_accounts table
-- Users can only view their own bank accounts
CREATE POLICY "Users can view own bank accounts"
  ON user_bank_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only insert their own bank accounts
CREATE POLICY "Users can insert own bank accounts"
  ON user_bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own bank accounts
CREATE POLICY "Users can update own bank accounts"
  ON user_bank_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own bank accounts
CREATE POLICY "Users can delete own bank accounts"
  ON user_bank_accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all bank accounts
CREATE POLICY "Admins can view all bank accounts"
  ON user_bank_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can manage all bank accounts
CREATE POLICY "Admins can manage all bank accounts"
  ON user_bank_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant appropriate permissions
GRANT SELECT ON user_bank_accounts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_bank_accounts TO authenticated;
GRANT SELECT ON public.user_bank_accounts_detailed TO authenticated;

-- Revoke any public access (anon users should not see bank accounts)
REVOKE ALL ON user_bank_accounts FROM anon;
REVOKE ALL ON public.user_bank_accounts_detailed FROM anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fix worked:

-- 1. Check if view is using security_invoker
-- SELECT
--   viewname,
--   viewowner,
--   definition
-- FROM pg_views
-- WHERE viewname = 'user_bank_accounts_detailed';

-- 2. Check RLS policies on the table
-- SELECT * FROM pg_policies WHERE tablename = 'user_bank_accounts';

-- 3. Test as a user (replace with actual user ID)
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "USER_ID_HERE"}';
-- SELECT * FROM user_bank_accounts_detailed;
-- RESET ROLE;

-- ============================================================================
-- SECURITY TESTING
-- ============================================================================
-- After applying this fix, test the following scenarios:

-- Test 1: User can see their own bank accounts
--   - Login as a regular user
--   - Query: SELECT * FROM user_bank_accounts_detailed;
--   - Expected: Only see your own accounts

-- Test 2: User CANNOT see other users' bank accounts
--   - Login as a regular user
--   - Query: SELECT * FROM user_bank_accounts_detailed WHERE user_id != auth.uid();
--   - Expected: No results (or only your own accounts)

-- Test 3: Anon users CANNOT see any bank accounts
--   - Make request without authentication
--   - Query: SELECT * FROM user_bank_accounts_detailed;
--   - Expected: 0 rows or permission denied

-- Test 4: Admin can see all bank accounts
--   - Login as admin user
--   - Query: SELECT * FROM user_bank_accounts_detailed;
--   - Expected: See all users' accounts

-- ============================================================================
-- EXPLANATION: Why this matters
-- ============================================================================
--
-- BEFORE FIX (SECURITY DEFINER):
-- - View runs with OWNER's privileges (bypasses RLS)
-- - User A could potentially see User B's bank accounts
-- - Data leak risk: sensitive banking information exposed
--
-- AFTER FIX (SECURITY INVOKER):
-- - View runs with CALLER's privileges (enforces RLS)
-- - User A can ONLY see User A's bank accounts
-- - RLS policies properly enforced at query time
-- - Secure: each user isolated to their own data
--
-- ============================================================================

SELECT '✅ Security fix applied successfully! View recreated with proper security settings.' as message;
