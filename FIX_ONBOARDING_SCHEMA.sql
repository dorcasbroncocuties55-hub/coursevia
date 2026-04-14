-- ============================================================
-- FIX ONBOARDING SCHEMA
-- Run this in Supabase SQL Editor
-- This adds all missing columns to the profiles table so
-- onboarding data saves correctly and completes properly.
-- ============================================================

-- ── 1. Add all missing columns to profiles ────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email                    text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name             text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city                     text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role                     text DEFAULT 'learner';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profession               text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience               text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certification            text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization_type      text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization_slug      text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS headline                 text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages                text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills                   text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_slug             text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learner_goal             text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learner_looking_forward  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name            text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_email           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_phone           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_website         text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address         text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_description     text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_delivery_mode    text DEFAULT 'online';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calendar_mode            text DEFAULT 'provider_calendar';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meeting_preference       text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS office_address           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_visible_after_booking boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified              boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status               text DEFAULT 'not_started';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider_type            text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type             text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status                   text DEFAULT 'active';

-- ── 2. Create or replace the complete_onboarding RPC ─────────────────────

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_role                    text,
  p_full_name               text DEFAULT NULL,
  p_display_name            text DEFAULT NULL,
  p_avatar_url              text DEFAULT NULL,
  p_email                   text DEFAULT NULL,
  p_phone                   text DEFAULT NULL,
  p_country                 text DEFAULT NULL,
  p_city                    text DEFAULT NULL,
  p_bio                     text DEFAULT NULL,
  p_profession              text DEFAULT NULL,
  p_experience              text DEFAULT NULL,
  p_certification           text DEFAULT NULL,
  p_specialization_type     text DEFAULT NULL,
  p_specialization_slug     text DEFAULT NULL,
  p_business_name           text DEFAULT NULL,
  p_business_email          text DEFAULT NULL,
  p_business_phone          text DEFAULT NULL,
  p_business_website        text DEFAULT NULL,
  p_business_address        text DEFAULT NULL,
  p_business_description    text DEFAULT NULL,
  p_learner_goal            text DEFAULT NULL,
  p_learner_looking_forward text DEFAULT NULL,
  p_profile_slug            text DEFAULT NULL,
  p_onboarding_completed    boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert the full profile
  INSERT INTO profiles (
    user_id, email, full_name, display_name, avatar_url,
    role, bio, phone, country, city,
    profession, experience, certification,
    specialization_type, specialization_slug,
    business_name, business_email, business_phone,
    business_website, business_address, business_description,
    learner_goal, learner_looking_forward,
    profile_slug, onboarding_completed,
    kyc_status, is_verified, status,
    created_at, updated_at
  ) VALUES (
    v_user_id, p_email, p_full_name, p_display_name, p_avatar_url,
    p_role, p_bio, p_phone, p_country, p_city,
    p_profession, p_experience, p_certification,
    p_specialization_type, p_specialization_slug,
    p_business_name, p_business_email, p_business_phone,
    p_business_website, p_business_address, p_business_description,
    p_learner_goal, p_learner_looking_forward,
    p_profile_slug, p_onboarding_completed,
    'not_started', false, 'active',
    now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email                   = COALESCE(p_email,                   profiles.email),
    full_name               = COALESCE(p_full_name,               profiles.full_name),
    display_name            = COALESCE(p_display_name,            profiles.display_name),
    avatar_url              = COALESCE(p_avatar_url,              profiles.avatar_url),
    role                    = p_role,
    bio                     = COALESCE(p_bio,                     profiles.bio),
    phone                   = COALESCE(p_phone,                   profiles.phone),
    country                 = COALESCE(p_country,                 profiles.country),
    city                    = COALESCE(p_city,                    profiles.city),
    profession              = COALESCE(p_profession,              profiles.profession),
    experience              = COALESCE(p_experience,              profiles.experience),
    certification           = COALESCE(p_certification,           profiles.certification),
    specialization_type     = COALESCE(p_specialization_type,     profiles.specialization_type),
    specialization_slug     = COALESCE(p_specialization_slug,     profiles.specialization_slug),
    business_name           = COALESCE(p_business_name,           profiles.business_name),
    business_email          = COALESCE(p_business_email,          profiles.business_email),
    business_phone          = COALESCE(p_business_phone,          profiles.business_phone),
    business_website        = COALESCE(p_business_website,        profiles.business_website),
    business_address        = COALESCE(p_business_address,        profiles.business_address),
    business_description    = COALESCE(p_business_description,    profiles.business_description),
    learner_goal            = COALESCE(p_learner_goal,            profiles.learner_goal),
    learner_looking_forward = COALESCE(p_learner_looking_forward, profiles.learner_looking_forward),
    profile_slug            = COALESCE(p_profile_slug,            profiles.profile_slug),
    onboarding_completed    = p_onboarding_completed,
    updated_at              = now();

  -- Ensure role exists in user_roles
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create wallet if not exists
  INSERT INTO wallets (user_id, currency, balance, pending_balance, available_balance)
  VALUES (v_user_id, 'USD', 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

END;
$$;

-- ── 3. Grant execute permission ───────────────────────────────────────────

GRANT EXECUTE ON FUNCTION complete_onboarding TO authenticated;

-- ── 4. Fix RLS on profiles ────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles"     ON profiles;

-- Users manage their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Public can view provider profiles (for directory pages)
CREATE POLICY "Public can view provider profiles"
  ON profiles FOR SELECT
  USING (
    role IN ('coach', 'therapist', 'creator')
    AND onboarding_completed = true
  );

-- ── 5. Fix RLS on user_roles ──────────────────────────────────────────────

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles"   ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role"  ON user_roles;

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role"
  ON user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 6. Fix RLS on wallets ─────────────────────────────────────────────────

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet"   ON wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE USING (auth.uid() = user_id);

-- ── 7. Verify ─────────────────────────────────────────────────────────────

SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Onboarding schema fix applied successfully' AS result;
