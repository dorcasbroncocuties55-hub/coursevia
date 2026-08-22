-- Comprehensive fix for all user data issues
-- Run this in Supabase SQL Editor

-- 1. Create missing wallets for ALL users
INSERT INTO wallets (user_id, currency, balance, pending_balance, available_balance, created_at, updated_at)
SELECT 
    user_id,
    'USD' as currency,
    0 as balance,
    0 as pending_balance,
    0 as available_balance,
    NOW() as created_at,
    NOW() as updated_at
FROM profiles
WHERE user_id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Fix null or incorrect full_names (use email as fallback)
UPDATE profiles
SET 
    full_name = COALESCE(
        NULLIF(full_name, email),  -- If full_name equals email, treat as null
        split_part(email, '@', 1)   -- Use email username part
    ),
    updated_at = NOW()
WHERE full_name IS NULL 
   OR full_name = email
   OR full_name = '';

-- 3. Fix the specific user with wrong full_name (ajibolagbenga419@gmail.com)
UPDATE profiles
SET 
    full_name = split_part(email, '@', 1),
    updated_at = NOW()
WHERE email = 'ajibolagbenga419@gmail.com' 
  AND full_name = 'dorcasbroncocuties55@gmail.com';

-- 4. Set default values for other fields
UPDATE profiles
SET 
    onboarding_completed = COALESCE(onboarding_completed, false),
    is_verified = COALESCE(is_verified, false),
    updated_at = NOW()
WHERE onboarding_completed IS NULL 
   OR is_verified IS NULL;

-- 5. Verify the fixes
SELECT 
    user_id,
    email,
    full_name,
    role,
    onboarding_completed,
    CASE WHEN w.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_wallet,
    COALESCE(w.balance, 0) as wallet_balance
FROM profiles p
LEFT JOIN wallets w ON p.user_id = w.user_id
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. Show summary
SELECT 
    'Users fixed' as status,
    COUNT(*) as count
FROM profiles
WHERE full_name IS NOT NULL 
  AND full_name != email
  AND onboarding_completed IS NOT NULL;
