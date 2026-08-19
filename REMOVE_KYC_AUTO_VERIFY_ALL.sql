-- ============================================================================
-- REMOVE KYC REQUIREMENTS & AUTO-VERIFY ALL PROVIDERS
-- Run this script to remove KYC requirements and make database loads instant
-- ============================================================================

-- 1. Auto-verify all providers (coaches, therapists, creators)
-- This removes the KYC bottleneck and makes the platform instant to use
UPDATE profiles 
SET 
  is_verified = true,
  kyc_status = 'approved',
  verified_at = COALESCE(verified_at, NOW()),
  updated_at = NOW()
WHERE role IN ('coach', 'therapist', 'creator') 
  AND (is_verified IS NULL OR is_verified = false);

-- 2. Complete onboarding for any incomplete profiles
-- This prevents users from getting stuck in onboarding loops
UPDATE profiles 
SET 
  onboarding_completed = true,
  updated_at = NOW()
WHERE onboarding_completed IS NULL OR onboarding_completed = false;

-- 3. Set default KYC status for all users
-- This ensures consistent state across all profiles
UPDATE profiles 
SET 
  kyc_status = CASE 
    WHEN role IN ('coach', 'therapist', 'creator') THEN 'approved'
    ELSE COALESCE(kyc_status, 'not_required')
  END,
  updated_at = NOW()
WHERE kyc_status IS NULL OR kyc_status = 'not_started';

-- 4. Make all provider profiles immediately available in directory
-- Remove any blocking statuses that prevent providers from appearing
UPDATE profiles 
SET 
  status = 'active'
WHERE role IN ('coach', 'therapist', 'creator') 
  AND (status IS NULL OR status != 'active');

-- ============================================================================
-- VERIFICATION QUERIES - Check the results
-- ============================================================================

-- Show profile completion status by role
SELECT 
  role,
  COUNT(*) as total_profiles,
  SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as completed_onboarding,
  SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified_profiles,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_profiles
FROM profiles
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

-- Show any remaining unverified providers (should be empty)
SELECT 
  user_id,
  full_name,
  role,
  onboarding_completed,
  is_verified,
  kyc_status,
  status,
  created_at
FROM profiles 
WHERE role IN ('coach', 'therapist', 'creator')
  AND (is_verified = false OR onboarding_completed = false OR status != 'active')
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
  '✅ KYC Requirements Removed Successfully!' as message,
  'All providers are now auto-verified' as status,
  'Database loads will be instant' as result;