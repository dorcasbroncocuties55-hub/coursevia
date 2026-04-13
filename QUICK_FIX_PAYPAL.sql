-- ============================================================================
-- QUICK FIX - Add PayPal and Fix Bank Accounts (Simple Version)
-- ============================================================================

-- 1. Fix bank_accounts table - add is_default column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'is_default'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN is_primary BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Add bank_type column to banks if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'bank_type'
    ) THEN
        ALTER TABLE banks ADD COLUMN bank_type VARCHAR(50) DEFAULT 'traditional';
    END IF;
END $$;

-- 3. Add PayPal to banks table (simple version)
INSERT INTO banks (name, code, bank_type)
VALUES ('PayPal', 'PAYPAL', 'digital_wallet')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    bank_type = EXCLUDED.bank_type;

-- 4. Add other digital payment options (simple version)
INSERT INTO banks (name, code, bank_type) VALUES
    ('Stripe', 'STRIPE', 'digital_wallet'),
    ('Wise', 'WISE', 'digital_wallet'),
    ('Venmo', 'VENMO', 'digital_wallet'),
    ('Cash App', 'CASHAPP', 'digital_wallet'),
    ('Zelle', 'ZELLE', 'digital_wallet')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    bank_type = EXCLUDED.bank_type;

-- 5. Add metadata column to bank_accounts if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank_accounts(is_default);
CREATE INDEX IF NOT EXISTS idx_banks_code ON banks(code);

-- 7. Enable RLS on banks
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- 8. Allow everyone to view banks
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

-- 10. Grant permissions
GRANT ALL ON banks TO authenticated;
GRANT SELECT ON banks TO anon;
GRANT ALL ON bank_accounts TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check PayPal exists
SELECT name, code, bank_type 
FROM banks 
WHERE code = 'PAYPAL';

-- Check bank_accounts has is_default
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
AND column_name IN ('is_default', 'is_primary', 'metadata');

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'PayPal and bank accounts fixed!' as status;
