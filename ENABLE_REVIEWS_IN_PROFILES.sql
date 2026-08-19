-- Enable reviews to show in all profile previews

-- Make reviews table publicly readable
DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
CREATE POLICY "Reviews are publicly readable" ON reviews FOR SELECT USING (true);

-- Also ensure the reviews table has the right structure
-- In case reviewer_name column doesn't exist, add it
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name text;

-- Update existing reviews to populate reviewer_name from profiles
UPDATE reviews 
SET reviewer_name = profiles.full_name 
FROM profiles 
WHERE reviews.reviewer_id = profiles.user_id 
  AND reviews.reviewer_name IS NULL;

-- Check results
SELECT 
  r.id, 
  r.reviewable_type, 
  r.rating, 
  r.comment, 
  r.reviewer_name,
  r.created_at
FROM reviews r 
ORDER BY r.created_at DESC 
LIMIT 5;