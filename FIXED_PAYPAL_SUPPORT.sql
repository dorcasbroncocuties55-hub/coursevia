-- Fixed PayPal Support Setup
-- This version properly handles the existing view

-- Add PayPal as a "bank" option
INSERT INTO banks (name, code, swift_code, country_name, supports_international) VALUES
('PayPal', 'PAYPAL', 'PAYPAL', 'Global', true),
('PayPal US', 'PAYPAL_US', 'PAYPAL_US', 'United States', true),
('PayPal UK', 'PAYPAL_UK', 'PAYPAL_UK', 'United Kingdom', true),
('PayPal Canada', 'PAYPAL_CA', 'PAYPAL_CA', 'Canada', true),
('PayPal Australia', 'PAYPAL_AU', 'PAYPAL_AU', 'Australia', true),
('PayPal Germany', 'PAYPAL_DE', 'PAYPAL_DE', 'Germany', true),
('PayPal France', 'PAYPAL_FR', 'PAYPAL_FR', 'France', true),
('PayPal Japan', 'PAYPAL_JP', 'PAYPAL_JP', 'Japan', true),
('PayPal India', 'PAYPAL_IN', 'PAYPAL_IN', 'India', true),
('PayPal Brazil', 'PAYPAL_BR', 'PAYPAL_BR', 'Brazil', true),
('PayPal Nigeria', 'PAYPAL_NG', 'PAYPAL_NG', 'Nigeria', true)
ON CONFLICT DO NOTHING;

-- Add new columns to user_bank_accounts table
DO $$
BEGIN
    -- Add account_subtype column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bank_accounts' AND column_name = 'account_subtype') THEN
        ALTER TABLE user_bank_accounts ADD COLUMN account_subtype VARCHAR(20) DEFAULT 'bank_account';
    END IF;
    
    -- Add paypal_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bank_accounts' AND column_name = 'paypal_email') THEN
        ALTER TABLE user_bank_accounts ADD COLUMN paypal_email VARCHAR(255);
    END IF;
    
    -- Add payout_method column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bank_accounts' AND column_name = 'payout_method') THEN
        ALTER TABLE user_bank_accounts ADD COLUMN payout_method VARCHAR(20) DEFAULT 'bank_transfer';
    END IF;
    
    RAISE NOTICE 'Added new columns to user_bank_accounts table';
END $$;

-- Drop and recreate the view with new columns
DROP VIEW IF EXISTS user_bank_accounts_detailed;

CREATE VIEW user_bank_accounts_detailed AS
SELECT 
    uba.id,
    uba.user_id,
    uba.account_holder_name,
    uba.account_number,
    uba.routing_number,
    uba.swift_code,
    uba.iban,
    uba.account_type,
    uba.account_subtype,
    uba.paypal_email,
    uba.payout_method,
    uba.currency,
    uba.is_primary,
    uba.is_verified,
    uba.is_active,
    uba.verification_status,
    uba.verification_date,
    uba.created_at,
    uba.updated_at,
    b.name as bank_name,
    b.code as bank_code,
    b.swift_code as bank_swift_code,
    b.supports_international,
    COALESCE(uba.country_name, b.country_name, 'Unknown') as country_name,
    '' as country_code,
    '' as country_phone_code,
    uba.currency as country_currency,
    -- PayPal specific fields
    CASE 
        WHEN b.code LIKE 'PAYPAL%' THEN true 
        ELSE false 
    END as is_paypal_account
FROM user_bank_accounts uba
JOIN banks b ON uba.bank_id = b.id;

-- Add PayPal email validation function
CREATE OR REPLACE FUNCTION validate_paypal_email(email TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic email validation for PayPal
    RETURN email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Update the bank account validation function to handle PayPal
CREATE OR REPLACE FUNCTION validate_bank_account(
    p_user_id UUID,
    p_bank_id UUID,
    p_account_number TEXT,
    p_account_holder_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    existing_count INTEGER;
    is_paypal BOOLEAN;
BEGIN
    -- Check if this is a PayPal bank
    SELECT (code LIKE 'PAYPAL%') INTO is_paypal 
    FROM banks WHERE id = p_bank_id;
    
    -- For PayPal, check if the email (stored in account_number) already exists
    IF is_paypal THEN
        SELECT COUNT(*) INTO existing_count
        FROM user_bank_accounts uba
        JOIN banks b ON uba.bank_id = b.id
        WHERE uba.user_id = p_user_id 
        AND b.code LIKE 'PAYPAL%'
        AND (uba.account_number = p_account_number OR uba.paypal_email = p_account_number)
        AND uba.is_active = true;
    ELSE
        -- Regular bank account validation
        SELECT COUNT(*) INTO existing_count
        FROM user_bank_accounts
        WHERE user_id = p_user_id 
        AND bank_id = p_bank_id 
        AND account_number = p_account_number
        AND is_active = true;
    END IF;
    
    RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Test the new view works
SELECT 'Testing new view' as test, COUNT(*) as records FROM user_bank_accounts_detailed;

-- Show results
SELECT 
    'PayPal Banks Added' as info,
    COUNT(*) as paypal_options
FROM banks 
WHERE code LIKE 'PAYPAL%';

-- Verify new columns exist
SELECT 
    'New Columns Added' as info,
    column_name
FROM information_schema.columns 
WHERE table_name = 'user_bank_accounts' 
AND column_name IN ('account_subtype', 'paypal_email', 'payout_method')
ORDER BY column_name;

-- Success message
DO $$
DECLARE
    paypal_count INTEGER;
    total_banks INTEGER;
    new_columns_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO paypal_count FROM banks WHERE code LIKE 'PAYPAL%';
    SELECT COUNT(*) INTO total_banks FROM banks;
    SELECT COUNT(*) INTO new_columns_count 
    FROM information_schema.columns 
    WHERE table_name = 'user_bank_accounts' 
    AND column_name IN ('account_subtype', 'paypal_email', 'payout_method');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ PAYPAL SUPPORT ADDED SUCCESSFULLY!';
    RAISE NOTICE '   - PayPal Options: %', paypal_count;
    RAISE NOTICE '   - Total Banks: %', total_banks;
    RAISE NOTICE '   - New Columns: %/3', new_columns_count;
    RAISE NOTICE '   - View: user_bank_accounts_detailed recreated';
    RAISE NOTICE '   - Functions: validate_paypal_email, validate_bank_account updated';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Users can now add PayPal accounts for withdrawals!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Frontend Integration:';
    RAISE NOTICE '   - PayPal accounts use email as account_number';
    RAISE NOTICE '   - Set account_subtype = "paypal" for PayPal accounts';
    RAISE NOTICE '   - Set payout_method = "paypal" for PayPal withdrawals';
    RAISE NOTICE '   - Use paypal_email field for storing PayPal email';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Refresh your app and test the PayPal integration!';
END $$;