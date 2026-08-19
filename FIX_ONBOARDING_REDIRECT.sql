-- Fix login redirecting to onboarding
-- Set all users as onboarded so they go to dashboard instead

UPDATE profiles 
SET onboarding_completed = true 
WHERE onboarding_completed IS NULL OR onboarding_completed = false;

-- Also ensure role is set properly for all users
UPDATE profiles 
SET role = COALESCE(role, 'learner') 
WHERE role IS NULL;

-- Check results
SELECT email, role, onboarding_completed FROM profiles;