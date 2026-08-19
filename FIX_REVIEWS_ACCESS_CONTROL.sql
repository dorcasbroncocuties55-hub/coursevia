-- Fix Reviews Access Control
-- Reviews should only be visible/writable by users who have purchased/booked the service

-- ============================================================================
-- REVIEWS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "reviews_select_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_update_policy" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_policy" ON reviews;

-- ============================================================================
-- SELECT Policy: Anyone can read reviews (public)
-- This is correct - reviews are meant to be public
-- ============================================================================
CREATE POLICY "reviews_select_policy" ON reviews
  FOR SELECT
  USING (true);

-- ============================================================================
-- INSERT Policy: Only users who have purchased/booked can leave reviews
-- ============================================================================
CREATE POLICY "reviews_insert_policy" ON reviews
  FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() = reviewer_id
    AND
    -- User must have a completed booking/purchase with this provider
    (
      -- Check for completed bookings (for coaches/therapists)
      (reviewable_type IN ('coach', 'therapist') AND EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.provider_id = reviews.reviewable_id
          AND bookings.learner_id = auth.uid()
          AND bookings.status = 'completed'
      ))
      OR
      -- Check for course purchases (for creators/courses)
      (reviewable_type = 'course' AND EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.course_id = reviews.reviewable_id
          AND enrollments.user_id = auth.uid()
      ))
      OR
      -- Check for video purchases (for creators/videos)
      (reviewable_type = 'video' AND EXISTS (
        SELECT 1 FROM payments
        WHERE payments.content_id = reviews.reviewable_id
          AND payments.payer_id = auth.uid()
          AND payments.payment_type = 'video'
          AND payments.status = 'success'
      ))
      OR
      -- Check for general creator purchases
      (reviewable_type = 'creator' AND EXISTS (
        SELECT 1 FROM payments
        WHERE payments.provider_id = reviews.reviewable_id
          AND payments.payer_id = auth.uid()
          AND payments.status = 'success'
      ))
    )
  );

-- ============================================================================
-- UPDATE Policy: Users can only update their own reviews
-- ============================================================================
CREATE POLICY "reviews_update_policy" ON reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================================
-- DELETE Policy: Users can delete their own reviews OR admins can delete any
-- ============================================================================
CREATE POLICY "reviews_delete_policy" ON reviews
  FOR DELETE
  USING (
    auth.uid() = reviewer_id
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON reviews TO anon, authenticated;
GRANT INSERT ON reviews TO authenticated;
GRANT UPDATE ON reviews TO authenticated;
GRANT DELETE ON reviews TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test 1: Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'reviews';
-- Expected: rowsecurity = true

-- Test 2: List all policies on reviews table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'reviews';
-- Expected: 4 policies (select, insert, update, delete)

-- Test 3: Sample query to check review access (run as authenticated user)
-- SELECT * FROM reviews WHERE reviewable_type = 'coach' LIMIT 5;
-- Expected: Should return reviews for coaches

-- Test 4: Try to insert a review without purchase (should fail)
-- INSERT INTO reviews (reviewer_id, reviewable_id, reviewable_type, rating, comment)
-- VALUES (auth.uid(), 'some-provider-id', 'coach', 5, 'Great coach!');
-- Expected: Should fail if user hasn't booked this coach

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. SELECT is public - anyone can read reviews (correct for social proof)
-- 2. INSERT requires purchase/booking verification
-- 3. UPDATE/DELETE restricted to review owner or admin
-- 4. This prevents fake reviews and maintains trust
-- 5. Reviews are tied to actual transactions in the system

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To remove these policies:
-- DROP POLICY IF EXISTS "reviews_select_policy" ON reviews;
-- DROP POLICY IF EXISTS "reviews_insert_policy" ON reviews;
-- DROP POLICY IF EXISTS "reviews_update_policy" ON reviews;
-- DROP POLICY IF EXISTS "reviews_delete_policy" ON reviews;
-- ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
