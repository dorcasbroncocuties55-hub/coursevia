-- Verification Script - Run this to check if setup was successful
-- Copy and paste this into your Supabase SQL Editor after running QUICK_SETUP.sql

-- Check if all tables exist
SELECT 
    'countries' as table_name,
    COUNT(*) as record_count,
    'Table exists and has data' as status
FROM countries
WHERE is_active = true

UNION ALL

SELECT 
    'banks' as table_name,
    COUNT(*) as record_count,
    'Table exists and has data' as status
FROM banks
WHERE is_active = true

UNION ALL

SELECT 
    'user_bank_accounts' as table_name,
    COUNT(*) as record_count,
    'Table exists (empty is normal)' as status
FROM user_bank_accounts

UNION ALL

SELECT 
    'user_bank_accounts_detailed' as table_name,
    COUNT(*) as record_count,
    'View exists (empty is normal)' as status
FROM user_bank_accounts_detailed;

-- Test the helper functions
SELECT 'get_banks_by_country function test' as test_name,
       COUNT(*) as banks_found,
       'Should return banks for USA' as expected
FROM get_banks_by_country('USA');

-- Check if functions exist
SELECT 
    routine_name as function_name,
    'Function exists' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_banks_by_country', 'validate_bank_account', 'set_primary_bank_account')
ORDER BY routine_name;

-- Sample countries available
SELECT 'Sample Countries Available:' as info, 
       STRING_AGG(name || ' (' || code || ')', ', ' ORDER BY name) as countries
FROM (
    SELECT name, code 
    FROM countries 
    WHERE is_active = true 
    LIMIT 10
) sample_countries;

-- Sample banks available
SELECT 'Sample Banks Available:' as info,
       STRING_AGG(name || ' (' || country_code || ')', ', ' ORDER BY name) as banks
FROM (
    SELECT b.name, c.code as country_code
    FROM banks b
    JOIN countries c ON b.country_id = c.id
    WHERE b.is_active = true
    LIMIT 10
) sample_banks;