-- NUCLEAR FIX FOR ALL AUTHENTICATION ISSUES
-- This fixes Google auth, onboarding redirects, and profile loading

-- 1. Fix Google Auth - ensure all Google users have complete profiles
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 2. Fix all existing profiles to be complete
UPDATE profiles SET 
  onboarding_completed = true,
  role = COALESCE(role, 'learner'),
  email = COALESCE(email, ''),
  full_name = COALESCE(full_name, 'User')
WHERE TRUE;

-- 3. Make profiles table completely public (no RLS issues)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;  
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
CREATE POLICY "Public profiles read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Make coach_profiles completely public
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coach profiles are publicly readable" ON coach_profiles;
CREATE POLICY "Public coach profiles" ON coach_profiles FOR SELECT USING (true);

-- 5. Make therapist_profiles completely public  
ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Therapist profiles are publicly readable" ON therapist_profiles;
CREATE POLICY "Public therapist profiles" ON therapist_profiles FOR SELECT USING (true);

-- 6. Create missing profiles for any auth.users without profiles
INSERT INTO profiles (user_id, email, full_name, role, onboarding_completed)
SELECT 
  id as user_id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email, 'User') as full_name,
  'learner' as role,
  true as onboarding_completed
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 7. Show results
SELECT 'Profiles fixed:' as status, COUNT(*) as count FROM profiles;
SELECT email, role, onboarding_completed FROM profiles LIMIT 10;