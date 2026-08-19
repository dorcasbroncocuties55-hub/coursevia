-- Fix RLS policies for tables showing 401 errors
-- These policies allow users to read their own data

-- ============================================================================
-- PROFILES TABLE (PUBLIC READ ACCESS)
-- ============================================================================
-- Drop all existing SELECT policies to avoid conflicts
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

-- Anonymous users can read any completed profile or any profile with a role
CREATE POLICY "anon_read_completed_profiles"
  ON profiles
  FOR SELECT
  TO anon
  USING (onboarding_completed = true OR role IS NOT NULL);

-- Authenticated users can read their own profile OR any profile with a role (provider)
CREATE POLICY "authenticated_read_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR onboarding_completed = true 
    OR role IS NOT NULL
  );

-- Drop and recreate INSERT/UPDATE policies
DROP POLICY IF EXISTS "authenticated_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "authenticated_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "authenticated_update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- COACH_PROFILES TABLE (PUBLIC READ ACCESS)
-- ============================================================================
DROP POLICY IF EXISTS "anon_read_coach_profiles" ON coach_profiles;
DROP POLICY IF EXISTS "authenticated_read_coach_profiles" ON coach_profiles;
DROP POLICY IF EXISTS "public_read_coach_profiles" ON coach_profiles;

CREATE POLICY "anon_read_coach_profiles"
  ON coach_profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "authenticated_read_coach_profiles"
  ON coach_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- THERAPIST_PROFILES TABLE (PUBLIC READ ACCESS)
-- ============================================================================
DROP POLICY IF EXISTS "anon_read_therapist_profiles" ON therapist_profiles;
DROP POLICY IF EXISTS "authenticated_read_therapist_profiles" ON therapist_profiles;
DROP POLICY IF EXISTS "public_read_therapist_profiles" ON therapist_profiles;

CREATE POLICY "anon_read_therapist_profiles"
  ON therapist_profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "authenticated_read_therapist_profiles"
  ON therapist_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- WALLETS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can read own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;

CREATE POLICY "Users can read own wallet"
  ON wallets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PAYMENT_METHODS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can read own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can read own payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update own payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment_methods" ON payment_methods;

CREATE POLICY "Users can read own payment_methods"
  ON payment_methods
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment_methods"
  ON payment_methods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment_methods"
  ON payment_methods
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment_methods"
  ON payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CONTENT_ACCESS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own content access" ON content_access;
DROP POLICY IF EXISTS "Users can read own content_access" ON content_access;

CREATE POLICY "Users can read own content_access"
  ON content_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view bookings as learner" ON bookings;
DROP POLICY IF EXISTS "Users can view bookings as provider" ON bookings;
DROP POLICY IF EXISTS "Learners can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Providers can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Learners can create bookings" ON bookings;
DROP POLICY IF EXISTS "Participants can update bookings" ON bookings;

-- Learners can read bookings where they are the learner
CREATE POLICY "Learners can read own bookings"
  ON bookings
  FOR SELECT
  USING (auth.uid() = learner_id);

-- Providers can read bookings where they are the provider
CREATE POLICY "Providers can read own bookings"
  ON bookings
  FOR SELECT
  USING (auth.uid() = provider_id);

-- Learners can insert bookings
CREATE POLICY "Learners can create bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = learner_id);

-- Both parties can update bookings
CREATE POLICY "Participants can update bookings"
  ON bookings
  FOR UPDATE
  USING (auth.uid() = learner_id OR auth.uid() = provider_id);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own payments as payer" ON payments;
DROP POLICY IF EXISTS "Users can view their own payments as payee" ON payments;
DROP POLICY IF EXISTS "Payers can read own payments" ON payments;
DROP POLICY IF EXISTS "Payees can read own payments" ON payments;
DROP POLICY IF EXISTS "Payees can read received payments" ON payments;

-- Payers can read their payments
CREATE POLICY "Payers can read own payments"
  ON payments
  FOR SELECT
  USING (auth.uid() = payer_id);

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================
-- Ensure RLS is enabled on all these tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================
-- Ensure authenticated and anon users have basic table access
GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON coach_profiles TO anon, authenticated;
GRANT SELECT ON therapist_profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;
GRANT SELECT ON content_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings TO authenticated;
GRANT SELECT ON payments TO authenticated;
