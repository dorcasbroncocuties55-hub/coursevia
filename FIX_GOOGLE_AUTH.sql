-- ============================================================
-- FIX GOOGLE AUTH - Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add missing columns to profiles if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_started';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_slug text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profession text;

-- 2. Create or replace the ensure_my_profile_and_role function
CREATE OR REPLACE FUNCTION ensure_my_profile_and_role(
  p_requested_role text DEFAULT 'learner'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_avatar_url text;
  v_role text;
  v_profile_exists boolean;
  v_role_exists boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user metadata from auth.users
  SELECT
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
  INTO v_email, v_full_name, v_avatar_url
  FROM auth.users u
  WHERE u.id = v_user_id;

  -- Determine role (use requested or default to learner)
  v_role := COALESCE(NULLIF(TRIM(p_requested_role), ''), 'learner');

  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = v_user_id) INTO v_profile_exists;

  IF v_profile_exists THEN
    -- Update existing profile with any missing data
    UPDATE profiles SET
      email = COALESCE(profiles.email, v_email),
      full_name = COALESCE(profiles.full_name, v_full_name),
      avatar_url = COALESCE(profiles.avatar_url, v_avatar_url),
      updated_at = now()
    WHERE user_id = v_user_id;
  ELSE
    -- Insert new profile
    INSERT INTO profiles (
      user_id, email, full_name, avatar_url,
      onboarding_completed, kyc_status, is_verified,
      created_at, updated_at
    ) VALUES (
      v_user_id, v_email, v_full_name, v_avatar_url,
      false, 'not_started', false,
      now(), now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = COALESCE(profiles.email, EXCLUDED.email),
      full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
      updated_at = now();
  END IF;

  -- Check if role exists
  SELECT EXISTS(
    SELECT 1 FROM user_roles WHERE user_id = v_user_id
  ) INTO v_role_exists;

  IF NOT v_role_exists THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, v_role::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_my_profile_and_role(text) TO authenticated;

-- 4. Make sure RLS allows users to insert/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Make sure RLS allows users to insert their own role
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role"
  ON user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Done!
SELECT 'Google Auth fix applied successfully' AS result;
