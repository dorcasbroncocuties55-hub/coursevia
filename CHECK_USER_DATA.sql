-- Check what data is missing for users

-- 1. Check profiles
SELECT 
    'Total profiles' as metric,
    COUNT(*) as count
FROM profiles

UNION ALL

-- 2. Check wallets
SELECT 
    'Total wallets' as metric,
    COUNT(*) as count
FROM wallets

UNION ALL

-- 3. Profiles without wallets
SELECT 
    'Profiles without wallets' as metric,
    COUNT(*) as count
FROM profiles p
LEFT JOIN wallets w ON p.user_id = w.user_id
WHERE w.user_id IS NULL

UNION ALL

-- 4. Profiles with incomplete onboarding
SELECT 
    'Incomplete onboarding' as metric,
    COUNT(*) as count
FROM profiles
WHERE onboarding_completed IS NULL OR onboarding_completed = false

UNION ALL

-- 5. Check bookings
SELECT 
    'Total bookings' as metric,
    COUNT(*) as count
FROM bookings

UNION ALL

-- 6. Check messages/conversations
SELECT 
    'Total messages' as metric,
    COUNT(*) as count
FROM messages;

-- Show sample user data (first 5 users)
SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.role,
    p.onboarding_completed,
    CASE WHEN w.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_wallet,
    w.balance as wallet_balance
FROM profiles p
LEFT JOIN wallets w ON p.user_id = w.user_id
ORDER BY p.created_at DESC
LIMIT 5;
