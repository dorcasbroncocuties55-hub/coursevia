-- FORCE FIX KYC STATUS
-- This will forcefully update your KYC status to the correct value

-- Step 1: Update YOUR current user's KYC status to 'not_started'
UPDATE profiles
SET 
    kyc_status = 'not_started',
    is_verified = false,
    updated_at = now()
WHERE user_id = auth.uid()
AND (kyc_status IS NULL OR kyc_status = 'pending_setup' OR kyc_status = '');

-- Step 2: Update ALL users with invalid KYC statuses
UPDATE profiles
SET 
    kyc_status = 'not_started',
    updated_at = now()
WHERE kyc_status IS NULL 
   OR kyc_status = '' 
   OR kyc_status = 'pending_setup';

-- Step 3: Ensure default is correct
ALTER TABLE profiles
  ALTER COLUMN kyc_status SET DEFAULT 'not_started';

-- Step 4: Verify the fix
SELECT 
    'Your KYC Status:' as info,
    kyc_status,
    is_verified,
    full_name
FROM profiles
WHERE user_id = auth.uid();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ KYC STATUS FORCE FIX COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Your KYC status has been reset to "not_started"';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Hard refresh your browser (Ctrl+Shift+R)';
    RAISE NOTICE '2. Log out and log back in';
    RAISE NOTICE '3. Check dashboard - should show "Not Started"';
    RAISE NOTICE '';
END $$;
