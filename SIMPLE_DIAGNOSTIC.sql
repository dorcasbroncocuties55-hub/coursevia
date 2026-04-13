-- Simple Diagnostic - Just the essentials
-- Run this to see what tables exist and their record counts

-- Check what tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('countries', 'banking_countries', 'banks', 'user_bank_accounts')
ORDER BY table_name;

-- Check record counts for banking tables
SELECT 
    'banking_countries' as table_name,
    COUNT(*) as records
FROM banking_countries
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'banking_countries' AND table_schema = 'public')

UNION ALL

SELECT 
    'banks' as table_name,
    COUNT(*) as records  
FROM banks
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'banks' AND table_schema = 'public')

UNION ALL

SELECT 
    'user_bank_accounts' as table_name,
    COUNT(*) as records
FROM user_bank_accounts  
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_bank_accounts' AND table_schema = 'public');

-- Check if view exists
SELECT 'user_bank_accounts_detailed' as view_name, 'EXISTS' as status
FROM information_schema.views 
WHERE table_name = 'user_bank_accounts_detailed' AND table_schema = 'public'
UNION ALL
SELECT 'user_bank_accounts_detailed' as view_name, 'MISSING' as status
WHERE NOT EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_name = 'user_bank_accounts_detailed' AND table_schema = 'public'
);