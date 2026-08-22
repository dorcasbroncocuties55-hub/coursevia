-- Fix missing user data for existing users
-- This ensures all users have wallet records and complete profiles

-- 1. Create missing wallets for all users
INSERT INTO wallets (user_id, currency, balance, pending_balance, available_balance, created_at, updated_at)
SELECT 
    p.user_id,
    'USD' as currency,
    0 as balance,
    0 as pending_balance,
    0 as available_balance,
    NOW() as created_at,
    NOW() as updated_at
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM wallets w WHERE w.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Ensure all profiles have complete data (set defaults for null values)
UPDATE profiles
SET 
    full_name = COALESCE(full_name, email),
    onboarding_completed = COALESCE(onboarding_completed, false),
    is_verified = COALESCE(is_verified, false),
    updated_at = NOW()
WHERE full_name IS NULL 
   OR onboarding_completed IS NULL 
   OR is_verified IS NULL;

-- 3. Verify the fixes
SELECT 
    'Profiles without wallets' as check_name,
    COUNT(*) as count
FROM profiles p
LEFT JOIN wallets w ON p.user_id = w.user_id
WHERE w.user_id IS NULL

UNION ALL

SELECT 
    'Profiles with incomplete data' as check_name,
    COUNT(*) as count
FROM profiles
WHERE full_name IS NULL 
   OR onboarding_completed IS NULL 
   OR is_verified IS NULL;
