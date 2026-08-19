-- ============================================================
-- FIX_AVATARS_NOW.sql
-- Single script to fix avatar display issues
-- Copy-paste this entire file into Supabase SQL Editor and run
-- ============================================================

-- Add avatar_url column if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Drop and recreate complete_onboarding function with avatar support
DROP FUNCTION IF EXISTS public.complete_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_role                    text,
  p_full_name               text      DEFAULT NULL,
  p_display_name            text      DEFAULT NULL,
  p_avatar_url              text      DEFAULT NULL,
  p_email                   text      DEFAULT NULL,
  p_phone                   text      DEFAULT NULL,
  p_country                 text      DEFAULT NULL,
  p_city                    text      DEFAULT NULL,
  p_bio                     text      DEFAULT NULL,
  p_headline                text      DEFAULT NULL,
  p_languages               text[]    DEFAULT NULL,
  p_profession              text      DEFAULT NULL,
  p_experience              text      DEFAULT NULL,
  p_certification           text      DEFAULT NULL,
  p_specialization_type     text      DEFAULT NULL,
  p_specialization_slug     text      DEFAULT NULL,
  p_services_offered        text      DEFAULT NULL,
  p_works_with              text      DEFAULT NULL,
  p_expertise_areas         text      DEFAULT NULL,
  p_service_areas           text      DEFAULT NULL,
  p_service_delivery_mode   text      DEFAULT NULL,
  p_calendar_mode           text      DEFAULT NULL,
  p_meeting_preference      text      DEFAULT NULL,
  p_office_address          text      DEFAULT NULL,
  p_enable_phone_release    boolean   DEFAULT true,
  p_business_name           text      DEFAULT NULL,
  p_business_email          text      DEFAULT NULL,
  p_business_phone          text      DEFAULT NULL,
  p_business_website        text      DEFAULT NULL,
  p_business_address        text      DEFAULT NULL,
  p_business_description    text      DEFAULT NULL,
  p_learner_goal            text      DEFAULT NULL,
  p_learner_looking_forward text      DEFAULT NULL,
  p_learner_interests       text      DEFAULT NULL,
  p_profile_slug            text      DEFAULT NULL,
  p_onboarding_completed    boolean   DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role    app_role;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  BEGIN
    v_role := p_role::app_role;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid role value: %', p_role;
  END;

  INSERT INTO public.profiles (
    user_id, email, full_name, display_name, avatar_url,
    role, account_type, bio, headline, languages,
    phone, country, city, profession, experience, certification,
    specialization_type, specialization_slug,
    services_offered, works_with, expertise_areas, service_areas,
    service_delivery_mode, calendar_mode, meeting_preference,
    office_address, enable_phone_release,
    business_name, business_email, business_phone,
    business_website, business_address, business_description,
    learner_goal, learner_looking_forward, learner_interests,
    profile_slug, onboarding_completed, kyc_status, is_verified, status,
    created_at, updated_at
  ) VALUES (
    v_user_id, p_email, p_full_name, p_display_name, p_avatar_url,
    v_role, p_role, p_bio, p_headline, p_languages,
    p_phone, p_country, p_city, p_profession, p_experience, p_certification,
    p_specialization_type, p_specialization_slug,
    p_services_offered, p_works_with, p_expertise_areas, p_service_areas,
    p_service_delivery_mode, p_calendar_mode, p_meeting_preference,
    p_office_address, p_enable_phone_release,
    p_business_name, p_business_email, p_business_phone,
    p_business_website, p_business_address, p_business_description,
    p_learner_goal, p_learner_looking_forward, p_learner_interests,
    p_profile_slug, p_onboarding_completed, 'not_started', false, 'active',
    now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email                   = COALESCE(p_email, profiles.email),
    full_name               = COALESCE(p_full_name, profiles.full_name),
    display_name            = COALESCE(p_display_name, profiles.display_name),
    avatar_url              = COALESCE(p_avatar_url, profiles.avatar_url),
    role                    = v_role,
    account_type            = p_role,
    bio                     = COALESCE(p_bio, profiles.bio),
    headline                = COALESCE(p_headline, profiles.headline),
    languages               = COALESCE(p_languages, profiles.languages),
    phone                   = COALESCE(p_phone, profiles.phone),
    country                 = COALESCE(p_country, profiles.country),
    city                    = COALESCE(p_city, profiles.city),
    profession              = COALESCE(p_profession, profiles.profession),
    experience              = COALESCE(p_experience, profiles.experience),
    certification           = COALESCE(p_certification, profiles.certification),
    specialization_type     = COALESCE(p_specialization_type, profiles.specialization_type),
    specialization_slug     = COALESCE(p_specialization_slug, profiles.specialization_slug),
    services_offered        = COALESCE(p_services_offered, profiles.services_offered),
    works_with              = COALESCE(p_works_with, profiles.works_with),
    expertise_areas         = COALESCE(p_expertise_areas, profiles.expertise_areas),
    service_areas           = COALESCE(p_service_areas, profiles.service_areas),
    service_delivery_mode   = COALESCE(p_service_delivery_mode, profiles.service_delivery_mode),
    calendar_mode           = COALESCE(p_calendar_mode, profiles.calendar_mode),
    meeting_preference      = COALESCE(p_meeting_preference, profiles.meeting_preference),
    office_address          = COALESCE(p_office_address, profiles.office_address),
    enable_phone_release    = COALESCE(p_enable_phone_release, profiles.enable_phone_release),
    business_name           = COALESCE(p_business_name, profiles.business_name),
    business_email          = COALESCE(p_business_email, profiles.business_email),
    business_phone          = COALESCE(p_business_phone, profiles.business_phone),
    business_website        = COALESCE(p_business_website, profiles.business_website),
    business_address        = COALESCE(p_business_address, profiles.business_address),
    business_description    = COALESCE(p_business_description, profiles.business_description),
    learner_goal            = COALESCE(p_learner_goal, profiles.learner_goal),
    learner_looking_forward = COALESCE(p_learner_looking_forward, profiles.learner_looking_forward),
    learner_interests       = COALESCE(p_learner_interests, profiles.learner_interests),
    profile_slug            = COALESCE(p_profile_slug, profiles.profile_slug),
    onboarding_completed    = p_onboarding_completed,
    updated_at              = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.wallets (user_id, currency, balance, pending_balance, available_balance)
  VALUES (v_user_id, 'USD', 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

-- Create profile policies
-- Authenticated users can read their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can insert their own profile
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Public can view completed provider profiles
CREATE POLICY "profiles_select_public"
ON public.profiles FOR SELECT
TO public
USING (
  role IN ('coach', 'therapist', 'creator')
  AND onboarding_completed = true
);

-- Note: Storage bucket and policies must be created via Supabase Dashboard
-- This SQL only fixes the database schema and profiles table
-- 
-- TO CREATE STORAGE BUCKET:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: avatars
-- 4. Public bucket: YES
-- 5. Click "Save"
-- 6. Click on "avatars" bucket → Policies tab
-- 7. Click "New Policy" → Create these 4 policies:
--
--    Policy 1 - INSERT (Upload):
--      Name: Authenticated users can upload avatars
--      Target roles: authenticated
--      Policy definition: bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
--
--    Policy 2 - SELECT (View):
--      Name: Anyone can view avatars  
--      Target roles: public
--      Policy definition: bucket_id = 'avatars'
--
--    Policy 3 - UPDATE:
--      Name: Users can update own avatar
--      Target roles: authenticated
--      Policy definition: bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
--
--    Policy 4 - DELETE:
--      Name: Users can delete own avatar
--      Target roles: authenticated
--      Policy definition: bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text

-- Verification
SELECT '✅ Database schema fixed' as status
UNION ALL
SELECT '✅ complete_onboarding function updated' as status
UNION ALL  
SELECT '✅ Profile RLS policies created' as status
UNION ALL
SELECT '⚠️ MANUAL STEP: Create avatars storage bucket in Supabase Dashboard (see comments above)' as status;
