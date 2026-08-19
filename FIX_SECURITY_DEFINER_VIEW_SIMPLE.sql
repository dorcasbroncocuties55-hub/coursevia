-- ============================================================================
-- FIX SECURITY DEFINER VIEW - Simple Version
-- ============================================================================
-- This fixes the security issue by recreating the view with security_invoker
-- Uses only the columns that actually exist in your table
-- ============================================================================

-- Step 1: Drop the insecure view
DROP VIEW IF EXISTS public.user_bank_accounts_detailed CASCADE;

-- Step 2: Create secure view with security_invoker = true
-- Using SELECT * to include all existing columns
CREATE OR REPLACE VIEW public.user_bank_accounts_detailed
WITH (security_invoker = true)
AS
SELECT 
  ba.*,
  p.full_name as user_full_name,
  p.email as user_email
FROM 
  user_bank_accounts ba
  LEFT JOIN profiles p ON p.user_id = ba.user_id;

-- Step 3: Enable RLS on the table
ALTER TABLE user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Admins can view all bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON user_bank_accounts;

-- Step 5: Create RLS policies
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

-- Step 6: Grant permissions
GRANT SELECT ON user_bank_accounts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_bank_accounts TO authenticated;
GRANT SELECT ON public.user_bank_accounts_detailed TO authenticated;

-- Revoke anonymous access
REVOKE ALL ON user_bank_accounts FROM anon;
REVOKE ALL ON public.user_bank_accounts_detailed FROM anon;

-- Success message
SELECT '✅ Security fix applied! View now uses security_invoker and RLS is enforced.' as message;
