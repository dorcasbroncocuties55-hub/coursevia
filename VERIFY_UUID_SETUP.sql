-- UUID Setup Verification Script
-- Run this after FIXED_QUICK_SETUP.sql to verify everything works

-- Check table structures and data types
SELECT 
    'countries' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'countries' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
    'banks' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'banks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
    'user_bank_accounts' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_bank_accounts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check foreign key constraints are working
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('banks', 'user_bank_accounts')
AND tc.table_schema = 'public';

-- Test data counts
SELECT 
    'countries' as table_name,
    COUNT(*) as record_count,
    'Should have 100+ countries' as expected
FROM countries
WHERE is_active = true

UNION ALL

SELECT 
    'banks' as table_name,
    COUNT(*) as record_count,
    'Should have 60+ banks' as expected
FROM banks
WHERE is_active = true

UNION ALL

SELECT 
    'user_bank_accounts' as table_name,
    COUNT(*) as record_count,
    'Should be 0 (empty is normal)' as expected
FROM user_bank_accounts;

-- Test the view works
SELECT 
    'user_bank_accounts_detailed' as view_name,
    COUNT(*) as record_count,
    'Should be 0 (empty is normal)' as expected
FROM user_bank_accounts_detailed;

-- Test helper functions work
SELECT 
    'get_banks_by_country(USA)' as function_test,
    COUNT(*) as banks_found,
    'Should return 10 US banks' as expected
FROM get_banks_by_country('USA');

SELECT 
    'get_banks_by_country(GBR)' as function_test,
    COUNT(*) as banks_found,
    'Should return 10 UK banks' as expected
FROM get_banks_by_country('GBR');

SELECT 
    'get_banks_by_country(NGA)' as function_test,
    COUNT(*) as banks_found,
    'Should return 10 Nigerian banks' as expected
FROM get_banks_by_country('NGA');

-- Show sample data
SELECT 'Sample Countries:' as info, 
       STRING_AGG(name || ' (' || code || ', ' || currency_code || ')', ', ' ORDER BY name) as sample_data
FROM (
    SELECT name, code, currency_code
    FROM countries 
    WHERE is_active = true 
    ORDER BY name
    LIMIT 15
) sample_countries;

SELECT 'Sample Banks by Country:' as info,
       STRING_AGG(country_code || ': ' || bank_names, ' | ' ORDER BY country_code) as sample_data
FROM (
    SELECT 
        c.code as country_code,
        STRING_AGG(b.name, ', ' ORDER BY b.name) as bank_names
    FROM banks b
    JOIN countries c ON b.country_id = c.id
    WHERE b.is_active = true
    GROUP BY c.code
    ORDER BY c.code
    LIMIT 10
) sample_banks;

-- Final success check
DO $$
DECLARE
    country_count INTEGER;
    bank_count INTEGER;
    view_exists BOOLEAN;
    functions_exist INTEGER;
BEGIN
    SELECT COUNT(*) INTO country_count FROM countries WHERE is_active = true;
    SELECT COUNT(*) INTO bank_count FROM banks WHERE is_active = true;
    
    SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'user_bank_accounts_detailed' 
        AND table_schema = 'public'
    ) INTO view_exists;
    
    SELECT COUNT(*) INTO functions_exist 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('get_banks_by_country', 'validate_bank_account', 'set_primary_bank_account');
    
    IF country_count >= 100 AND bank_count >= 60 AND view_exists AND functions_exist = 3 THEN
        RAISE NOTICE '✅ SUCCESS: Banking system is fully set up and ready!';
        RAISE NOTICE '   - Countries: %', country_count;
        RAISE NOTICE '   - Banks: %', bank_count;
        RAISE NOTICE '   - View exists: %', view_exists;
        RAISE NOTICE '   - Functions: %/3', functions_exist;
        RAISE NOTICE '   - All UUID foreign keys are working correctly';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 You can now refresh your app and use the banking system!';
    ELSE
        RAISE NOTICE '❌ SETUP INCOMPLETE:';
        RAISE NOTICE '   - Countries: % (need 100+)', country_count;
        RAISE NOTICE '   - Banks: % (need 60+)', bank_count;
        RAISE NOTICE '   - View exists: %', view_exists;
        RAISE NOTICE '   - Functions: %/3', functions_exist;
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Please re-run FIXED_QUICK_SETUP.sql';
    END IF;
END $$;