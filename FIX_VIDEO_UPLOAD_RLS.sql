-- Fix RLS policies for video upload functionality
-- This ensures creators/coaches/therapists can upload videos

-- ============================================================================
-- VIDEOS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
DROP POLICY IF EXISTS "Public can read published videos" ON videos;
DROP POLICY IF EXISTS "Users can read own videos" ON videos;

-- Users can insert their own videos
CREATE POLICY "Users can insert own videos"
  ON videos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own videos
CREATE POLICY "Users can update own videos"
  ON videos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Users can delete their own videos
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
  USING (status = 'published');

-- ============================================================================
-- CONTENT_ITEMS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert own content" ON content_items;
DROP POLICY IF EXISTS "Users can update own content" ON content_items;
DROP POLICY IF EXISTS "Users can delete own content" ON content_items;
DROP POLICY IF EXISTS "Public can read published content" ON content_items;

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

-- Public can read published content
CREATE POLICY "Public can read published content"
  ON content_items
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- ============================================================================
-- CONTENT_EPISODES TABLE
-- ============================================================================
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

-- Public can read episodes (for preview/purchased content)
CREATE POLICY "Public can read episodes"
  ON content_episodes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_episodes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON videos TO authenticated;
GRANT SELECT ON content_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON content_items TO authenticated;
GRANT SELECT ON content_episodes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON content_episodes TO authenticated;

-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================
-- Note: Storage bucket policies need to be set in Supabase Dashboard → Storage
-- 
-- For "videos" bucket:
-- 1. Upload (INSERT): authenticated users can upload to their own folder
--    bucket_id = 'videos' AND (storage.foldername(name))[1] = (auth.uid())::text
--
-- 2. View (SELECT): authenticated users can view their own videos
--    bucket_id = 'videos' AND (storage.foldername(name))[1] = (auth.uid())::text
--
-- 3. Update/Delete: authenticated users can manage their own videos
--    bucket_id = 'videos' AND (storage.foldername(name))[1] = (auth.uid())::text
--
-- For "thumbnails" bucket (if separate):
-- 1. Upload: authenticated users can upload
-- 2. View: public access for all thumbnails
