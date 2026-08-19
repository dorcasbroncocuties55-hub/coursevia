DROP POLICY IF EXISTS "Public can read completed provider profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public read of completed profiles" ON profiles;
DROP POLICY IF EXISTS "public_read_completed_profiles" ON profiles;


CREATE POLICY "public_read_completed_profiles"
ON profiles
FOR SELECT
TO anon, authenticated
USING (
  onboarding_completed = true
  AND role IN ('coach', 'therapist', 'creator')
);

-- 3. Make sure RLS is enabled on profiles (it should already be)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

