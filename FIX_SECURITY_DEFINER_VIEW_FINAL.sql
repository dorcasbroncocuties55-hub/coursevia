-- ============================================================================
-- FIX SECURITY DEFINER VIEW - user_bank_accounts_detailed
-- ============================================================================
-- This fixes the critical security issue where the view bypasses RLS policies
-- Uses the ACTUAL column names from your user_bank_accounts table
-- ============================================================================

-- Step 1: Drop the insecure view
DROP VIEW IF EXISTS public.user_bank_accounts_detailed CASCADE;

-- Step 2: Create secure view with security_invoker = true
-- This makes the view run with CALLER's privileges (enforces RLS)
CREATE OR REPLACE VIEW public.user_bank_accounts_detailed
WITH (security_invoker = true)
AS
SELECT 
  -- Bank account details
  ba.id,
  ba.user_id,
  ba.bank_id,
  ba.account_holder_name,
  ba.account_number,
  ba.routing_number,
  ba.swift_code,
  ba.iban,
  ba.account_type,
  ba.currency,
  ba.country_name,
  ba.is_primary,
  ba.is_verified,
  ba.is_active,
  ba.verification_status,
  ba.verification_date,
  ba.created_at,
  ba.updated_at,
  ba.account_subtype,
  ba.paypal_email,
  ba.payout_method,
  -- User profile info
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

-- Revoke anonymous access (critical security measure)
REVOKE ALL ON user_bank_accounts FROM anon;
REVOKE ALL ON public.user_bank_accounts_detailed FROM anon;

-- ============================================================================
-- VERIFICATION QUERIES (run these after to verify it worked)
-- ============================================================================

-- Check the view is using security_invoker
-- SELECT viewname, definition 
-- FROM pg_views 
-- WHERE viewname = 'user_bank_accounts_detailed';

-- Check RLS policies are active
-- SELECT * FROM pg_policies WHERE tablename = 'user_bank_accounts';

-- Test as current user (should only see your own accounts)
-- SELECT * FROM user_bank_accounts_detailed;

-- ============================================================================

SELECT '✅ Security fix applied successfully! 
- View now uses security_invoker = true (enforces RLS)
- Users can only see their own bank accounts
- Admins can view all accounts
- Anonymous users blocked
' as message;
