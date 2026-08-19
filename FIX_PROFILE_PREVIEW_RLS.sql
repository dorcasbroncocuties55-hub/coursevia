
-- Drop all existing SELECT policies (safe — we recreate them below)
DROP POLICY IF EXISTS "anon_read_completed_profiles"          ON public.profiles;
DROP POLICY IF EXISTS "authenticated_read_profiles"           ON public.profiles;
DROP POLICY IF EXISTS "public_read_completed_profiles"        ON public.profiles;
DROP POLICY IF EXISTS "public_can_view_provider_profiles"     ON public.profiles;
DROP POLICY IF EXISTS "authenticated_can_view_profiles"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own"                   ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles"              ON public.profiles;
DROP POLICY IF EXISTS "Public can view provider profiles"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public"                ON public.profiles;

-- Anon: read any completed profile
CREATE POLICY "anon_read_completed_profiles"
  ON public.profiles FOR SELECT TO anon
  USING (onboarding_completed = true);

-- Authenticated: read own profile OR any completed profile
-- This is what was missing — logged-in users couldn't see other profiles
CREATE POLICY "authenticated_read_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR onboarding_completed = true);

-- ── 2. Fix coach_profiles table RLS ──────────────────────────────────────────

ALTER TABLE IF EXISTS public.coach_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_coach_profiles"          ON public.coach_profiles;
DROP POLICY IF EXISTS "authenticated_read_coach_profiles" ON public.coach_profiles;
DROP POLICY IF EXISTS "public_read_coach_profiles"        ON public.coach_profiles;

-- Anyone can read coach profiles (needed for directory + profile preview)
-- Anon: read any completed profile
CREATE POLICY "anon_read_completed_profiles"
  ON public.profiles FOR SELECT TO anon
  USING (onboarding_completed = true);

-- Authenticated: read own profile OR any completed profile
-- This is what was missing — logged-in users couldn't see other profiles
CREATE POLICY "authenticated_read_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR onboarding_completed = true);

-- Authenticated: insert own profile
DROP POLICY IF EXISTS "authenticated_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"              ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"     ON public.profiles;
CREATE POLICY "authenticated_insert_own_profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated: update own profile (REQUIRED for profile settings to save)
DROP POLICY IF EXISTS "authenticated_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"              ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.profiles;
CREATE POLICY "authenticated_update_own_profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);ch_profiles;
CREATE POLICY "coach_update_own_profile"
  ON public.coach_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Fix therapist_profiles table RLS ──────────────────────────────────────

ALTER TABLE IF EXISTS public.therapist_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_therapist_profiles"          ON public.therapist_profiles;
DROP POLICY IF EXISTS "authenticated_read_therapist_profiles" ON public.therapist_profiles;
DROP POLICY IF EXISTS "public_read_therapist_profiles"        ON public.therapist_profiles;

CREATE POLICY "anon_read_therapist_profiles"
  ON public.therapist_profiles FOR SELECT TO anon
  USING (true);

CREATE POLICY "authenticated_read_therapist_profiles"
  ON public.therapist_profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "therapist_update_own_profile" ON public.therapist_profiles;
CREATE POLICY "therapist_update_own_profile"
  ON public.therapist_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Fix coach_services / therapist_services RLS ───────────────────────────

ALTER TABLE IF EXISTS public.coach_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_coach_services" ON public.coach_services;
CREATE POLICY "public_read_coach_services"
  ON public.coach_services FOR SELECT TO anon, authenticated
  USING (is_active = true);

ALTER TABLE IF EXISTS public.therapist_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_therapist_services" ON public.therapist_services;
CREATE POLICY "public_read_therapist_services"
  ON public.therapist_services FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- ── 5. Create storage buckets for video uploads ───────────────────────────────
-- Run these if the buckets don't exist yet. Safe to run even if they already do.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('videos',     'videos',     false, 524288000, ARRAY['video/mp4','video/quicktime','video/x-msvideo','video/x-matroska','video/webm'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('thumbnails', 'thumbnails', true,  5242880,   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',    'avatars',    true,  5242880,   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── 6. Storage bucket policies ────────────────────────────────────────────────

-- avatars: public read, authenticated upload own folder
DROP POLICY IF EXISTS "avatars_public_read"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert"        ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update"        ON storage.objects;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- thumbnails: public read, authenticated upload own folder
DROP POLICY IF EXISTS "thumbnails_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_auth_insert"     ON storage.objects;

CREATE POLICY "thumbnails_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'thumbnails');

CREATE POLICY "thumbnails_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

-- videos: private (signed URLs only), authenticated upload own folder
DROP POLICY IF EXISTS "videos_auth_insert"         ON storage.objects;
DROP POLICY IF EXISTS "videos_auth_select"         ON storage.objects;

CREATE POLICY "videos_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = 'content'
    AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "videos_auth_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos');

-- ── 7. Verify ─────────────────────────────────────────────────────────────────

SELECT policyname, tablename, roles, cmd
FROM pg_policies
WHERE tablename IN ('profiles','coach_profiles','therapist_profiles','coach_services','therapist_services')
ORDER BY tablename, policyname;

SELECT id, name, public FROM storage.buckets WHERE id IN ('videos','thumbnails','avatars');
