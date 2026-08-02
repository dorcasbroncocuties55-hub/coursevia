-- ============================================================
-- FIX complete_onboarding — cast p_role text → app_role enum
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop all overloads first
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'complete_onboarding'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END;
$$;

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
  v_user_id  uuid;
  v_role     app_role;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Cast text → app_role enum safely
  BEGIN
    v_role := p_role::app_role;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END;

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
    v_role, p_bio, p_phone, p_country, p_city,
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
    role                    = v_role,
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
  VALUES (v_user_id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create wallet if not exists
  INSERT INTO wallets (user_id, currency, balance, pending_balance, available_balance)
  VALUES (v_user_id, 'USD', 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

END;
$$;

GRANT EXECUTE ON FUNCTION complete_onboarding TO authenticated;

SELECT 'complete_onboarding fixed — app_role cast applied' AS result;
