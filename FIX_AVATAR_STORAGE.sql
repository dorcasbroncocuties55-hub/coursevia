-- ============================================================
-- FIX AVATAR STORAGE
-- Run this in Supabase SQL Editor
-- Creates the avatars bucket and sets upload/read policies
-- ============================================================

-- 1. Create the avatars bucket if it doesn't exist (public = true so URLs work)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Drop existing policies so we start clean
DROP POLICY IF EXISTS "Authenticated users can upload avatars"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars"  ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars"                 ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar"             ON storage.objects;

-- 3. Allow any logged-in user to upload into their own folder (user_id/filename)
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Allow users to update/overwrite their own avatars
CREATE POLICY "Authenticated users can update avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Allow anyone (including unauthenticated) to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- 6. Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

SELECT 'Avatar storage policies applied successfully' AS result;
