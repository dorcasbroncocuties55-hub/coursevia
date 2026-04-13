-- ============================================================================
-- FIX PAYPAL AND BANK ACCOUNTS
-- ============================================================================

-- 1. Fix bank_accounts table - ensure is_default column exists
DO $$ 
BEGIN
    -- Add is_default if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'is_default'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;

    -- Add is_primary if it doesn't exist (some code uses this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN is_primary BOOLEAN DEFAULT false;
    END IF;

    -- Sync is_default with is_primary
    UPDATE bank_accounts 
    SET is_default = is_primary 
    WHERE is_default IS NULL AND is_primary IS NOT NULL;

    UPDATE bank_accounts 
    SET is_primary = is_default 
    WHERE is_primary IS NULL AND is_default IS NOT NULL;
END $$;

-- 2. Ensure banks table exists and has all necessary columns
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to banks table
DO $$ 
BEGIN
    -- Add country_code if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'country_code'
    ) THEN
        ALTER TABLE banks ADD COLUMN country_code VARCHAR(2);
    END IF;

    -- Add swift_code if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'swift_code'
    ) THEN
        ALTER TABLE banks ADD COLUMN swift_code VARCHAR(11);
    END IF;

    -- Add routing_number if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'routing_number'
    ) THEN
        ALTER TABLE banks ADD COLUMN routing_number VARCHAR(50);
    END IF;

    -- Add bank_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'bank_type'
    ) THEN
        ALTER TABLE banks ADD COLUMN bank_type VARCHAR(50) DEFAULT 'traditional';
    END IF;

    -- Add is_active if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE banks ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add logo_url if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE banks ADD COLUMN logo_url TEXT;
    END IF;
END $$;

-- 3. Add PayPal as a bank option
INSERT INTO banks (name, code, country_code, bank_type, is_active)
VALUES ('PayPal', 'PAYPAL', 'US', 'digital_wallet', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    bank_type = EXCLUDED.bank_type,
    is_active = EXCLUDED.is_active;

-- 4. Add other digital payment options
INSERT INTO banks (name, code, country_code, bank_type, is_active) VALUES
    ('Stripe', 'STRIPE', 'US', 'digital_wallet', true),
    ('Wise (TransferWise)', 'WISE', 'GB', 'digital_wallet', true),
    ('Venmo', 'VENMO', 'US', 'digital_wallet', true),
    ('Cash App', 'CASHAPP', 'US', 'digital_wallet', true),
    ('Zelle', 'ZELLE', 'US', 'digital_wallet', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    bank_type = EXCLUDED.bank_type,
    is_active = EXCLUDED.is_active;

-- 5. Ensure bank_accounts has all necessary columns
DO $$ 
BEGIN
    -- Add account_holder_name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'account_holder_name'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN account_holder_name VARCHAR(255);
    END IF;

    -- Add account_name if missing (alias for account_holder_name)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'account_name'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN account_name VARCHAR(255);
    END IF;

    -- Add bank_name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'bank_name'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN bank_name VARCHAR(255);
    END IF;

    -- Add bank_code if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'bank_code'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN bank_code VARCHAR(50);
    END IF;

    -- Add account_number if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'account_number'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN account_number VARCHAR(255);
    END IF;

    -- Add country_code if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'country_code'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN country_code VARCHAR(2);
    END IF;

    -- Add currency if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'currency'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
    END IF;

    -- Add metadata JSONB column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add verification_status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending';
    END IF;

    -- Add provider if missing (for PayPal, Stripe, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'provider'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN provider VARCHAR(50);
    END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank_accounts(is_default);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_code ON bank_accounts(bank_code);
CREATE INDEX IF NOT EXISTS idx_banks_code ON banks(code);
CREATE INDEX IF NOT EXISTS idx_banks_country_code ON banks(country_code);

-- 7. Enable RLS on banks table
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for banks (public read)
DROP POLICY IF EXISTS "Anyone can view banks" ON banks;
CREATE POLICY "Anyone can view banks" ON banks
    FOR SELECT USING (true);

-- 9. Update bank_accounts RLS policies
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

-- 10. Create updated_at trigger for banks
CREATE OR REPLACE FUNCTION update_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS banks_updated_at ON banks;
CREATE TRIGGER banks_updated_at
    BEFORE UPDATE ON banks
    FOR EACH ROW
    EXECUTE FUNCTION update_banks_updated_at();

-- 11. Grant permissions
GRANT ALL ON banks TO authenticated;
GRANT SELECT ON banks TO anon;
GRANT ALL ON bank_accounts TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if PayPal exists
SELECT name, code, bank_type, is_active 
FROM banks 
WHERE code = 'PAYPAL';

-- Check bank_accounts columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
AND column_name IN ('is_default', 'is_primary', 'account_holder_name', 'bank_name', 'metadata')
ORDER BY column_name;

-- Check all digital wallets
SELECT name, code, country_code, bank_type
FROM banks
WHERE bank_type = 'digital_wallet'
ORDER BY name;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'PayPal and bank accounts fixed successfully!' as status;
