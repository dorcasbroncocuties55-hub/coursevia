-- ============================================================
-- REVIEWS TABLE — Full Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ensure reviews table has needed columns
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS reviewer_name text,
  ADD COLUMN IF NOT EXISTS reviewable_type text,
  ADD COLUMN IF NOT EXISTS reviewable_id uuid;

-- 2. Unique constraint so one user can leave one review per provider/content
-- (used by upsert in ReviewModal)
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_reviewer_reviewable_unique;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_reviewer_reviewable_unique
  UNIQUE (reviewer_id, reviewable_id, reviewable_type);

-- 3. Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies
DROP POLICY IF EXISTS "reviews_select_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_update_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_policy" ON reviews;

-- 5. SELECT: public — anyone can read reviews
CREATE POLICY "reviews_select_policy" ON reviews
  FOR SELECT USING (true);

-- 6. INSERT: only authenticated users (purchase check handled in app layer)
CREATE POLICY "reviews_insert_policy" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- 7. UPDATE: only own reviews
CREATE POLICY "reviews_update_policy" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- 8. DELETE: own review or admin
CREATE POLICY "reviews_delete_policy" ON reviews
  FOR DELETE USING (
    auth.uid() = reviewer_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- 9. Grants
GRANT SELECT ON reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reviews TO authenticated;

-- 10. Verify
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'reviews';
