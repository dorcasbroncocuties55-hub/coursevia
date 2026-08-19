-- ========================================
-- Fix Role Mismatch Issue
-- ========================================
-- Use this if you created account as one role but show up as another

-- Step 1: Find your profile and check current role
-- Replace 'your-email@example.com' with your actual email
SELECT 
  user_id,
  email,
  full_name,
  role,
  onboarding_completed,
  created_at
FROM profiles
WHERE email = 'your-email@example.com';

-- Step 2: Fix the role (if it's wrong)
-- Uncomment the line for your correct role:

-- If you should be a COACH:
-- UPDATE profiles SET role = 'coach' WHERE email = 'your-email@example.com';

-- If you should be a THERAPIST:
-- UPDATE profiles SET role = 'therapist' WHERE email = 'your-email@example.com';

-- If you should be a CREATOR:
-- UPDATE profiles SET role = 'creator' WHERE email = 'your-email@example.com';

-- If you should be a LEARNER:
-- UPDATE profiles SET role = 'learner' WHERE email = 'your-email@example.com';

-- Step 3: Verify the fix
SELECT 
  email,
  role,
  full_name,
  'Role updated successfully!' as status
FROM profiles
WHERE email = 'your-email@example.com';

-- Step 4: Clear your browser cache and log out/in again
-- The dashboard will now show the correct portal

-- ========================================
-- Alternative: Fix by user_id
-- ========================================
-- If you know your user_id instead of email:

-- Find profiles by partial name:
-- SELECT user_id, email, full_name, role FROM profiles WHERE full_name ILIKE '%YourName%';

-- Then update by user_id:
-- UPDATE profiles SET role = 'coach' WHERE user_id = 'paste-user-id-here';
