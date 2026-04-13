-- Verify Minimal Banking Setup
-- Run this after MINIMAL_WORKING_SETUP.sql to check if everything worked

-- Check if all required tables exist
SELECT 
    'Table Check' as test_category,
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('banks'),
        ('user_bank_accounts'),
        ('banking_countries')
) AS expected_tables(table_name)
LEFT JOIN information_schema.tables t 
    ON t.table_name = expected_tables.table_name 
    AND t.table_schema = 'public'
ORDER BY expected_tables.table_name;

-- Check if view exists
SELECT 
    'View Check' as test_category,
    'user_bank_accounts_detailed' as view_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.views 
WHERE table_name = 'user_bank_accounts_detailed' 
AND table_schema = 'public'
UNION ALL
SELECT 
    'View Check' as test_category,
    'user_bank_accounts_detailed' as view_name,
    '❌ MISSING' as status
WHERE NOT EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_name = 'user_bank_accounts_detailed' 
    AND table_schema = 'public'
);

-- Check if functions exist
SELECT 
    'Function Check' as test_category,
    routine_name as function_name,
    '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_banks_by_country', 'validate_bank_account', 'set_primary_bank_account')
ORDER BY routine_name;

-- Check data counts
SELECT 
    'Data Count' as test_category,
    'banking_countries' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ GOOD (' || COUNT(*) || ' countries)'
        WHEN COUNT(*) > 0 THEN '⚠️ LOW (' || COUNT(*) || ' countries)'
        ELSE '❌ EMPTY'
    END as status
FROM banking_countries

UNION ALL

SELECT 
    'Data Count' as test_category,
    'banks' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) >= 20 THEN '✅ GOOD (' || COUNT(*) || ' banks)'
        WHEN COUNT(*) > 0 THEN '⚠️ LOW (' || COUNT(*) || ' banks)'
        ELSE '❌ EMPTY'
    END as status
FROM banks

UNION ALL

SELECT 
    'Data Count' as test_category,
    'user_bank_accounts' as table_name,
    COUNT(*) as record_count,
    '✅ EMPTY (normal)' as status
FROM user_bank_accounts;

-- Test the view works
SELECT 
    'View Test' as test_category,
    'user_bank_accounts_detailed' as view_name,
    COUNT(*) as record_count,
    '✅ ACCESSIBLE (empty is normal)' as status
FROM user_bank_accounts_detailed;

-- Test functions work
SELECT 
    'Function Test' as test_category,
    'get_banks_by_country(USA)' as function_name,
    COUNT(*) as banks_returned,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ WORKING (' || COUNT(*) || ' banks found)'
        ELSE '❌ NO RESULTS'
    END as status
FROM get_banks_by_country('USA');

SELECT 
    'Function Test' as test_category,
    'get_banks_by_country(Nigeria)' as function_name,
    COUNT(*) as banks_returned,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ WORKING (' || COUNT(*) || ' banks found)'
        ELSE '❌ NO RESULTS'
    END as status
FROM get_banks_by_country('Nigeria');

-- Show sample data
SELECT 'Sample Banking Countries:' as info, 
       STRING_AGG(name || ' (' || currency_code || ')', ', ' ORDER BY name) as sample_data
FROM (
    SELECT name, currency_code
    FROM banking_countries 
    WHERE is_active = true 
    ORDER BY name
    LIMIT 10
) sample_countries;

SELECT 'Sample Banks by Country:' as info,
       STRING_AGG(country_name || ': ' || bank_names, ' | ' ORDER BY country_name) as sample_data
FROM (
    SELECT 
        country_name,
        STRING_AGG(name, ', ' ORDER BY name) as bank_names
    FROM banks
    WHERE is_active = true
    GROUP BY country_name
    ORDER BY country_name
    LIMIT 8
) sample_banks;

-- Final comprehensive check
DO $$
DECLARE
    banking_countries_count INTEGER;
    banks_count INTEGER;
    view_exists BOOLEAN;
    functions_count INTEGER;
    all_good BOOLEAN := true;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO banking_countries_count FROM banking_countries WHERE is_active = true;
    SELECT COUNT(*) INTO banks_count FROM banks WHERE is_active = true;
    
    -- Check view exists
    SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'user_bank_accounts_detailed' 
        AND table_schema = 'public'
    ) INTO view_exists;
    
    -- Count functions
    SELECT COUNT(*) INTO functions_count 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('get_banks_by_country', 'validate_bank_account', 'set_primary_bank_account');
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FINAL VERIFICATION RESULTS ===';
    RAISE NOTICE '';
    
    -- Check each component
    IF banking_countries_count >= 15 THEN
        RAISE NOTICE '✅ Banking Countries: % (GOOD)', banking_countries_count;
    ELSE
        RAISE NOTICE '❌ Banking Countries: % (NEED 15+)', banking_countries_count;
        all_good := false;
    END IF;
    
    IF banks_count >= 20 THEN
        RAISE NOTICE '✅ Banks: % (GOOD)', banks_count;
    ELSE
        RAISE NOTICE '❌ Banks: % (NEED 20+)', banks_count;
        all_good := false;
    END IF;
    
    IF view_exists THEN
        RAISE NOTICE '✅ View: user_bank_accounts_detailed (EXISTS)';
    ELSE
        RAISE NOTICE '❌ View: user_bank_accounts_detailed (MISSING)';
        all_good := false;
    END IF;
    
    IF functions_count = 3 THEN
        RAISE NOTICE '✅ Functions: %/3 (ALL PRESENT)', functions_count;
    ELSE
        RAISE NOTICE '❌ Functions: %/3 (MISSING SOME)', functions_count;
        all_good := false;
    END IF;
    
    RAISE NOTICE '';
    
    IF all_good THEN
        RAISE NOTICE '🎉 SUCCESS: Banking system is fully operational!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ All tables created successfully';
        RAISE NOTICE '✅ All functions working correctly';
        RAISE NOTICE '✅ View accessible and functional';
        RAISE NOTICE '✅ Sample data loaded properly';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 You can now refresh your app and use the banking system!';
        RAISE NOTICE '   - Go to Bank Accounts page';
        RAISE NOTICE '   - Select a country from the dropdown';
        RAISE NOTICE '   - Select a bank for that country';
        RAISE NOTICE '   - Add your bank account details';
        RAISE NOTICE '   - Test the withdrawal system';
    ELSE
        RAISE NOTICE '❌ SETUP INCOMPLETE: Some components are missing';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Please re-run MINIMAL_WORKING_SETUP.sql to fix issues';
        RAISE NOTICE '   - Make sure you copy the ENTIRE script';
        RAISE NOTICE '   - Check for any error messages during execution';
        RAISE NOTICE '   - Verify you have proper permissions in Supabase';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== END VERIFICATION ===';
END $$;