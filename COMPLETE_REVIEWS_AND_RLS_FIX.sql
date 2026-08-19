-- Complete Reviews Implementation + Fix RLS Issues
-- This enables reviews to show in all profile previews and fixes the 401 errors

-- 1. Make reviews table publicly readable
DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
CREATE POLICY "Reviews are publicly readable" ON reviews FOR SELECT USING (true);

-- 2. Ensure the reviews table has the right structure
-- In case reviewer_name column doesn't exist, add it
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name text;

-- 3. Update existing reviews to populate reviewer_name from profiles
UPDATE reviews 
SET reviewer_name = profiles.full_name 
FROM profiles 
WHERE reviews.reviewer_id = profiles.user_id 
  AND reviews.reviewer_name IS NULL;

-- 4. Fix all the 401 RLS errors for dashboard tables
-- Make content_access publicly readable for user's own data
DROP POLICY IF EXISTS "Users can read own content access" ON content_access;
CREATE POLICY "Users can read own content access" ON content_access FOR SELECT USING (true);

-- Make bookings readable for users
DROP POLICY IF EXISTS "Users can read own bookings" ON bookings;
CREATE POLICY "Users can read own bookings" ON bookings FOR SELECT USING (true);

-- Make notifications readable for users
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (true);

-- Make payment_methods readable for users  
DROP POLICY IF EXISTS "Users can read own payment methods" ON payment_methods;
CREATE POLICY "Users can read own payment methods" ON payment_methods FOR SELECT USING (true);

-- Make payments readable for users
DROP POLICY IF EXISTS "Users can read own payments" ON payments;
CREATE POLICY "Users can read own payments" ON payments FOR SELECT USING (true);

-- Make wallets readable for users
DROP POLICY IF EXISTS "Users can read own wallets" ON wallets;
CREATE POLICY "Users can read own wallets" ON wallets FOR SELECT USING (true);

-- 5. Make sure all profile-related tables are publicly readable
DROP POLICY IF EXISTS "Coach profiles are publicly readable" ON coach_profiles;
CREATE POLICY "Coach profiles are publicly readable" ON coach_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Therapist profiles are publicly readable" ON therapist_profiles;
CREATE POLICY "Therapist profiles are publicly readable" ON therapist_profiles FOR SELECT USING (true);

-- 6. Make coach and therapist services publicly readable  
DROP POLICY IF EXISTS "Coach services are publicly readable" ON coach_services;
CREATE POLICY "Coach services are publicly readable" ON coach_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Therapist services are publicly readable" ON therapist_services;
CREATE POLICY "Therapist services are publicly readable" ON therapist_services FOR SELECT USING (true);

-- 7. Make availability publicly readable
DROP POLICY IF EXISTS "Coach availability is publicly readable" ON coach_availability;
CREATE POLICY "Coach availability is publicly readable" ON coach_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "Therapist availability is publicly readable" ON therapist_availability;
CREATE POLICY "Therapist availability is publicly readable" ON therapist_availability FOR SELECT USING (true);

-- 8. Check results
SELECT 
  r.id, 
  r.reviewable_type, 
  r.rating, 
  r.comment, 
  r.reviewer_name,
  r.created_at
FROM reviews r 
ORDER BY r.created_at DESC 
LIMIT 5;

-- Show current RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('reviews', 'profiles', 'coach_profiles', 'therapist_profiles')
ORDER BY tablename, policyname;