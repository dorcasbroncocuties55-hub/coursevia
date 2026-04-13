-- ============================================================
-- COURSEVIA ONBOARDING COMPLETE FIX
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ── 1. Ensure all required columns exist on profiles ────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name          text,
  ADD COLUMN IF NOT EXISTS phone                 text,
  ADD COLUMN IF NOT EXISTS country               text,
  ADD COLUMN IF NOT EXISTS city                  text,
  ADD COLUMN IF NOT EXISTS bio                   text,
  ADD COLUMN IF NOT EXISTS profession            text,
  ADD COLUMN IF NOT EXISTS experience            text,
  ADD COLUMN IF NOT EXISTS certification         text,
  ADD COLUMN IF NOT EXISTS specialization_type   text,
  ADD COLUMN IF NOT EXISTS specialization_slug   text,
  ADD COLUMN IF NOT EXISTS profile_slug          text,
  ADD COLUMN IF NOT EXISTS headline              text,
  ADD COLUMN IF NOT EXISTS languages             text[],
  ADD COLUMN IF NOT EXISTS skills                text[],
  ADD COLUMN IF NOT EXISTS service_delivery_mode text,
  ADD COLUMN IF NOT EXISTS calendar_mode         text,
  ADD COLUMN IF NOT EXISTS meeting_preference    text,
  ADD COLUMN IF NOT EXISTS office_address        text,
  ADD COLUMN IF NOT EXISTS phone_visible_after_booking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_status            text DEFAULT 'pending_setup',
  ADD COLUMN IF NOT EXISTS business_name         text,
  ADD COLUMN IF NOT EXISTS business_email        text,
  ADD COLUMN IF NOT EXISTS business_phone        text,
  ADD COLUMN IF NOT EXISTS business_website      text,
  ADD COLUMN IF NOT EXISTS business_address      text,
  ADD COLUMN IF NOT EXISTS business_description  text,
  ADD COLUMN IF NOT EXISTS learner_goal          text,
  ADD COLUMN IF NOT EXISTS learner_looking_forward text,
  ADD COLUMN IF NOT EXISTS onboarding_completed  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status                text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS provider_type         text,
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz DEFAULT now();

-- ── 2. Unique index on profile_slug ─────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS profiles_profile_slug_key
  ON public.profiles (profile_slug)
  WHERE profile_slug IS NOT NULL;

-- ── 3. Ensure user_roles table exists ───────────────────────

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ── 4. Ensure coach_profiles table exists ───────────────────

CREATE TABLE IF NOT EXISTS public.coach_profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline   text,
  skills     text[],
  languages  text[],
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- ── 5. Ensure therapist_profiles table exists ───────────────

CREATE TABLE IF NOT EXISTS public.therapist_profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline   text,
  skills     text[],
  languages  text[],
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- ── 6. Ensure categories table exists ───────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (slug)
);

-- ── 7. Drop and recreate complete_onboarding RPC ────────────

DROP FUNCTION IF EXISTS public.complete_onboarding(
  text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_role                    text,
  p_full_name               text DEFAULT NULL,
  p_display_name            text DEFAULT NULL,
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
  p_email                   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (
    user_id, email, full_name, display_name, phone, country, city,
    bio, profession, experience, certification,
    specialization_type, specialization_slug, profile_slug,
    business_name, business_email, business_phone, business_website,
    business_address, business_description,
    learner_goal, learner_looking_forward,
    role, provider_type, onboarding_completed, status, updated_at
  ) VALUES (
    v_user_id,
    COALESCE(p_email, ''),
    p_full_name,
    p_display_name,
    p_phone,
    p_country,
    p_city,
    p_bio,
    p_profession,
    p_experience,
    p_certification,
    p_specialization_type,
    p_specialization_slug,
    p_profile_slug,
    p_business_name,
    p_business_email,
    p_business_phone,
    p_business_website,
    p_business_address,
    p_business_description,
    p_learner_goal,
    p_learner_looking_forward,
    p_role,
    CASE WHEN p_role = 'learner' THEN NULL ELSE p_role END,
    true,
    'active',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email                   = COALESCE(EXCLUDED.email, profiles.email),
    full_name               = COALESCE(p_full_name, profiles.full_name),
    display_name            = COALESCE(p_display_name, profiles.display_name),
    phone                   = COALESCE(p_phone, profiles.phone),
    country                 = COALESCE(p_country, profiles.country),
    city                    = COALESCE(p_city, profiles.city),
    bio                     = COALESCE(p_bio, profiles.bio),
    profession              = COALESCE(p_profession, profiles.profession),
    experience              = COALESCE(p_experience, profiles.experience),
    certification           = COALESCE(p_certification, profiles.certification),
    specialization_type     = COALESCE(p_specialization_type, profiles.specialization_type),
    specialization_slug     = COALESCE(p_specialization_slug, profiles.specialization_slug),
    profile_slug            = COALESCE(p_profile_slug, profiles.profile_slug),
    business_name           = COALESCE(p_business_name, profiles.business_name),
    business_email          = COALESCE(p_business_email, profiles.business_email),
    business_phone          = COALESCE(p_business_phone, profiles.business_phone),
    business_website        = COALESCE(p_business_website, profiles.business_website),
    business_address        = COALESCE(p_business_address, profiles.business_address),
    business_description    = COALESCE(p_business_description, profiles.business_description),
    learner_goal            = COALESCE(p_learner_goal, profiles.learner_goal),
    learner_looking_forward = COALESCE(p_learner_looking_forward, profiles.learner_looking_forward),
    role                    = p_role,
    provider_type           = CASE WHEN p_role = 'learner' THEN NULL ELSE p_role END,
    onboarding_completed    = true,
    status                  = 'active',
    updated_at              = now();

  -- Upsert user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;

END;
$$;

-- ── 8. Grant execute permission ──────────────────────────────

GRANT EXECUTE ON FUNCTION public.complete_onboarding(
  text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text,
  text, text, text, text, text, text
) TO authenticated;

-- ── 9. RLS policies ──────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_profiles ENABLE ROW LEVEL SECURITY;

-- profiles: users can read all, write own
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- user_roles: users can read/write own
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
CREATE POLICY "user_roles_insert_own" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- coach_profiles: public read, own write
DROP POLICY IF EXISTS "coach_profiles_select_all" ON public.coach_profiles;
CREATE POLICY "coach_profiles_select_all" ON public.coach_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "coach_profiles_write_own" ON public.coach_profiles;
CREATE POLICY "coach_profiles_write_own" ON public.coach_profiles
  FOR ALL USING (auth.uid() = user_id);

-- therapist_profiles: public read, own write
DROP POLICY IF EXISTS "therapist_profiles_select_all" ON public.therapist_profiles;
CREATE POLICY "therapist_profiles_select_all" ON public.therapist_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "therapist_profiles_write_own" ON public.therapist_profiles;
CREATE POLICY "therapist_profiles_write_own" ON public.therapist_profiles
  FOR ALL USING (auth.uid() = user_id);

-- ── 10. Storage bucket for avatars ───────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_upload" ON storage.objects;
CREATE POLICY "avatars_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── DONE ─────────────────────────────────────────────────────
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run
