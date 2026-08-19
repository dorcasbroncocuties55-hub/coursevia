-- ============================================================================
-- FIX ALL API ERRORS - Complete Database RLS and Permissions Fix
-- ============================================================================
-- This file fixes:
-- 1. 400 Bad Request on content_items POST
-- 2. 400 Bad Request on videos POST  
-- 3. RLS policies for all content-related tables
-- ============================================================================

-- ============================================================================
-- VIDEOS TABLE - RLS POLICIES
-- ============================================================================
ALTER TABLE IF EXISTS videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
DROP POLICY IF EXISTS "Public can read published videos" ON videos;
DROP POLICY IF EXISTS "Users can read own videos" ON videos;
DROP POLICY IF EXISTS "Creators can insert videos" ON videos;

-- Allow authenticated users to insert their own videos
CREATE POLICY "Creators can insert videos"
  ON videos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Allow users to update their own videos
CREATE POLICY "Users can update own videos"
  ON videos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete own videos"
  ON videos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Public can read published videos
CREATE POLICY "Public can read published videos"
  ON videos
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' OR 
    auth.uid() = creator_id
  );

-- ============================================================================
-- CONTENT_ITEMS TABLE - RLS POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'content_items') THEN
    ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can insert own content" ON content_items;
    DROP POLICY IF EXISTS "Users can update own content" ON content_items;
    DROP POLICY IF EXISTS "Users can delete own content" ON content_items;
    DROP POLICY IF EXISTS "Public can read published content" ON content_items;
    DROP POLICY IF EXISTS "Users can read own content" ON content_items;

    -- Users can insert their own content
    CREATE POLICY "Users can insert own content"
      ON content_items
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = owner_id);

    -- Users can update their own content
    CREATE POLICY "Users can update own content"
      ON content_items
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = owner_id);

    -- Users can delete their own content
    CREATE POLICY "Users can delete own content"
      ON content_items
      FOR DELETE
      TO authenticated
      USING (auth.uid() = owner_id);

    -- Public can read published content or own content
    CREATE POLICY "Public can read published content"
      ON content_items
      FOR SELECT
      TO anon, authenticated
      USING (
        is_published = true OR 
        auth.uid() = owner_id
      );
  END IF;
END $$;

-- ============================================================================
-- CONTENT_EPISODES TABLE - RLS POLICIES (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'content_episodes') THEN
    ALTER TABLE content_episodes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can insert own episodes" ON content_episodes;
    DROP POLICY IF EXISTS "Users can update own episodes" ON content_episodes;
    DROP POLICY IF EXISTS "Users can delete own episodes" ON content_episodes;
    DROP POLICY IF EXISTS "Public can read episodes" ON content_episodes;

    -- Users can insert episodes for their content
    CREATE POLICY "Users can insert own episodes"
      ON content_episodes
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM content_items
          WHERE content_items.id = content_episodes.content_id
          AND content_items.owner_id = auth.uid()
        )
      );

    -- Users can update episodes for their content
    CREATE POLICY "Users can update own episodes"
      ON content_episodes
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM content_items
          WHERE content_items.id = content_episodes.content_id
          AND content_items.owner_id = auth.uid()
        )
      );

    -- Users can delete episodes for their content
    CREATE POLICY "Users can delete own episodes"
      ON content_episodes
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM content_items
          WHERE content_items.id = content_episodes.content_id
          AND content_items.owner_id = auth.uid()
        )
      );

    -- Public can read episodes
    CREATE POLICY "Public can read episodes"
      ON content_episodes
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- GRANT TABLE PERMISSIONS
-- ============================================================================
GRANT SELECT ON videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON videos TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'content_items') THEN
    GRANT SELECT ON content_items TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON content_items TO authenticated;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'content_episodes') THEN
    GRANT SELECT ON content_episodes TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON content_episodes TO authenticated;
  END IF;
END $$;

-- ============================================================================
-- STORAGE BUCKET POLICIES (Manual Configuration Required)
-- ============================================================================
-- NOTE: Storage policies must be configured in Supabase Dashboard
-- Navigate to: Storage → Policies → videos bucket
--
-- Required policies for "videos" bucket:
--
-- 1. INSERT (Upload) Policy:
--    Name: Users can upload to own folder
--    Policy: bucket_id = 'videos' AND (storage.foldername(name))[1] = (auth.uid())::text
--
-- 2. SELECT (View) Policy:
--    Name: Users can view own videos
--    Policy: bucket_id = 'videos' AND (storage.foldername(name))[1] = (auth.uid())::text
--
-- 3. UPDATE Policy:
--    Name: Users can update own videos
--    Policy: bucket_id = 'videos' AND (storage.foldername(name))[1] = (auth.uid())::text
--
-- 4. DELETE Policy:
--    Name: Users can delete own videos
--    Policy: bucket_id = 'videos' AND (storage.foldername(name))[1] = (auth.uid())::text
--
-- For "thumbnails" bucket (if separate):
-- 1. INSERT: authenticated users
-- 2. SELECT: public (anon + authenticated)
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the policies are working:

-- Check videos table policies
-- SELECT * FROM pg_policies WHERE tablename = 'videos';

-- Check content_items table policies (if exists)
-- SELECT * FROM pg_policies WHERE tablename = 'content_items';

-- Check content_episodes table policies (if exists)
-- SELECT * FROM pg_policies WHERE tablename = 'content_episodes';

-- Test inserting a video (replace with actual authenticated user)
-- INSERT INTO videos (creator_id, title, description, status)
-- VALUES (auth.uid(), 'Test Video', 'Test Description', 'draft')
-- RETURNING id;
