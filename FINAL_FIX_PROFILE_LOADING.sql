-- FINAL COMPREHENSIVE PROFILE FIX
-- This will make profiles work for both logged in and logged out users

-- 1. Make profiles table publicly readable
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (true);

-- 2. Make coach profiles publicly readable  
DROP POLICY IF EXISTS "Coach profiles are publicly readable" ON coach_profiles;
CREATE POLICY "Coach profiles are publicly readable" ON coach_profiles FOR SELECT USING (true);

-- 3. Make therapist profiles publicly readable
DROP POLICY IF EXISTS "Therapist profiles are publicly readable" ON therapist_profiles;
CREATE POLICY "Therapist profiles are publicly readable" ON therapist_profiles FOR SELECT USING (true);

-- 4. Make services publicly readable
DROP POLICY IF EXISTS "Services are publicly readable" ON coach_services;
CREATE POLICY "Services are publicly readable" ON coach_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Services are publicly readable" ON therapist_services;
CREATE POLICY "Services are publicly readable" ON therapist_services FOR SELECT USING (true);

-- 5. Make availability publicly readable
DROP POLICY IF EXISTS "Availability is publicly readable" ON coach_availability;
CREATE POLICY "Availability is publicly readable" ON coach_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "Availability is publicly readable" ON therapist_availability;
CREATE POLICY "Availability is publicly readable" ON therapist_availability FOR SELECT USING (true);

-- This makes ALL profile pages work without authentication issues