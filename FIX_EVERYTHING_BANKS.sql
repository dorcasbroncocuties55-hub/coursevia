-- ============================================================================
-- FIX EVERYTHING - Banks, PayPal, Countries, and Bank Accounts
-- ============================================================================

-- ============================================================================
-- PART 1: FIX BANK_ACCOUNTS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add is_default column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'is_default'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;

    -- Add is_primary column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN is_primary BOOLEAN DEFAULT false;
    END IF;

    -- Add metadata column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add account_holder_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'account_holder_name'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN account_holder_name VARCHAR(255);
    END IF;

    -- Add bank_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'bank_name'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN bank_name VARCHAR(255);
    END IF;

    -- Add country_code column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'country_code'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN country_code VARCHAR(2);
    END IF;

    -- Add currency column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'currency'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
    END IF;

    -- Add provider column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'provider'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN provider VARCHAR(50);
    END IF;

    -- Add verification_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending';
    END IF;
END $$;

-- ============================================================================
-- PART 2: FIX BANKS TABLE
-- ============================================================================

-- Add bank_type column to banks
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'bank_type'
    ) THEN
        ALTER TABLE banks ADD COLUMN bank_type VARCHAR(50) DEFAULT 'traditional';
    END IF;
END $$;

-- Remove duplicate banks
DELETE FROM banks a USING banks b
WHERE a.id > b.id AND a.code = b.code;

-- Add unique constraint on code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'banks_code_key'
    ) THEN
        ALTER TABLE banks ADD CONSTRAINT banks_code_key UNIQUE (code);
    END IF;
END $$;

-- Add PayPal and digital wallets
INSERT INTO banks (name, code, bank_type)
SELECT 'PayPal', 'PAYPAL', 'digital_wallet'
WHERE NOT EXISTS (SELECT 1 FROM banks WHERE code = 'PAYPAL');

INSERT INTO banks (name, code, bank_type)
SELECT 'Stripe', 'STRIPE', 'digital_wallet'
WHERE NOT EXISTS (SELECT 1 FROM banks WHERE code = 'STRIPE');

INSERT INTO banks (name, code, bank_type)
SELECT 'Wise', 'WISE', 'digital_wallet'
WHERE NOT EXISTS (SELECT 1 FROM banks WHERE code = 'WISE');

INSERT INTO banks (name, code, bank_type)
SELECT 'Venmo', 'VENMO', 'digital_wallet'
WHERE NOT EXISTS (SELECT 1 FROM banks WHERE code = 'VENMO');

INSERT INTO banks (name, code, bank_type)
SELECT 'Cash App', 'CASHAPP', 'digital_wallet'
WHERE NOT EXISTS (SELECT 1 FROM banks WHERE code = 'CASHAPP');

INSERT INTO banks (name, code, bank_type)
SELECT 'Zelle', 'ZELLE', 'digital_wallet'
WHERE NOT EXISTS (SELECT 1 FROM banks WHERE code = 'ZELLE');

-- Update existing digital wallets
UPDATE banks 
SET bank_type = 'digital_wallet' 
WHERE code IN ('PAYPAL', 'STRIPE', 'WISE', 'VENMO', 'CASHAPP', 'ZELLE');

-- ============================================================================
-- PART 3: CREATE BANKING_COUNTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS banking_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) NOT NULL,
    name VARCHAR(255) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    phone_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove duplicates from banking_countries
DELETE FROM banking_countries a USING banking_countries b
WHERE a.id > b.id AND a.code = b.code;

-- Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'banking_countries_code_key'
    ) THEN
        ALTER TABLE banking_countries ADD CONSTRAINT banking_countries_code_key UNIQUE (code);
    END IF;
END $$;

-- Insert countries
INSERT INTO banking_countries (code, name, currency_code, phone_code, is_active) VALUES
    ('US', 'United States', 'USD', '+1', true),
    ('GB', 'United Kingdom', 'GBP', '+44', true),
    ('CA', 'Canada', 'CAD', '+1', true),
    ('AU', 'Australia', 'AUD', '+61', true),
    ('DE', 'Germany', 'EUR', '+49', true),
    ('FR', 'France', 'EUR', '+33', true),
    ('IT', 'Italy', 'EUR', '+39', true),
    ('ES', 'Spain', 'EUR', '+34', true),
    ('NL', 'Netherlands', 'EUR', '+31', true),
    ('BE', 'Belgium', 'EUR', '+32', true),
    ('CH', 'Switzerland', 'CHF', '+41', true),
    ('SE', 'Sweden', 'SEK', '+46', true),
    ('NO', 'Norway', 'NOK', '+47', true),
    ('DK', 'Denmark', 'DKK', '+45', true),
    ('FI', 'Finland', 'EUR', '+358', true),
    ('IE', 'Ireland', 'EUR', '+353', true),
    ('AT', 'Austria', 'EUR', '+43', true),
    ('PT', 'Portugal', 'EUR', '+351', true),
    ('GR', 'Greece', 'EUR', '+30', true),
    ('PL', 'Poland', 'PLN', '+48', true),
    ('JP', 'Japan', 'JPY', '+81', true),
    ('CN', 'China', 'CNY', '+86', true),
    ('IN', 'India', 'INR', '+91', true),
    ('SG', 'Singapore', 'SGD', '+65', true),
    ('HK', 'Hong Kong', 'HKD', '+852', true),
    ('KR', 'South Korea', 'KRW', '+82', true),
    ('MY', 'Malaysia', 'MYR', '+60', true),
    ('TH', 'Thailand', 'THB', '+66', true),
    ('ID', 'Indonesia', 'IDR', '+62', true),
    ('PH', 'Philippines', 'PHP', '+63', true),
    ('VN', 'Vietnam', 'VND', '+84', true),
    ('NZ', 'New Zealand', 'NZD', '+64', true),
    ('ZA', 'South Africa', 'ZAR', '+27', true),
    ('BR', 'Brazil', 'BRL', '+55', true),
    ('MX', 'Mexico', 'MXN', '+52', true),
    ('AE', 'United Arab Emirates', 'AED', '+971', true),
    ('SA', 'Saudi Arabia', 'SAR', '+966', true),
    ('IL', 'Israel', 'ILS', '+972', true),
    ('TR', 'Turkey', 'TRY', '+90', true),
    ('NG', 'Nigeria', 'NGN', '+234', true),
    ('KE', 'Kenya', 'KES', '+254', true),
    ('GH', 'Ghana', 'GHS', '+233', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    currency_code = EXCLUDED.currency_code,
    phone_code = EXCLUDED.phone_code,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PART 4: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank_accounts(is_default);
CREATE INDEX IF NOT EXISTS idx_banks_code ON banks(code);
CREATE INDEX IF NOT EXISTS idx_banking_countries_code ON banking_countries(code);
CREATE INDEX IF NOT EXISTS idx_banking_countries_is_active ON banking_countries(is_active);

-- ============================================================================
-- PART 5: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Banks table
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view banks" ON banks;
CREATE POLICY "Anyone can view banks" ON banks FOR SELECT USING (true);

-- Banking countries table
ALTER TABLE banking_countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view countries" ON banking_countries;
CREATE POLICY "Anyone can view countries" ON banking_countries FOR SELECT USING (true);

-- Bank accounts table
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON bank_accounts;
CREATE POLICY "Users can view their own bank accounts" ON bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON bank_accounts;
CREATE POLICY "Users can insert their own bank accounts" ON bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bank accounts" ON bank_accounts;
CREATE POLICY "Users can update their own bank accounts" ON bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON bank_accounts;
CREATE POLICY "Users can delete their own bank accounts" ON bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 6: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON banks TO authenticated;
GRANT SELECT ON banks TO anon;
GRANT SELECT ON banking_countries TO authenticated;
GRANT SELECT ON banking_countries TO anon;
GRANT ALL ON bank_accounts TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '=== VERIFICATION RESULTS ===' as section;

SELECT 'PayPal exists:' as check_type, 
       EXISTS(SELECT 1 FROM banks WHERE code = 'PAYPAL') as result;

SELECT 'Total banks:' as check_type, 
       COUNT(*)::text as result 
FROM banks;

SELECT 'Total countries:' as check_type, 
       COUNT(*)::text as result 
FROM banking_countries WHERE is_active = true;

SELECT 'Bank accounts columns:' as check_type,
       string_agg(column_name, ', ') as result
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
AND column_name IN ('is_default', 'is_primary', 'metadata', 'country_code');

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ EVERYTHING FIXED! Banks, PayPal, Countries, and Bank Accounts are ready!' as status;
