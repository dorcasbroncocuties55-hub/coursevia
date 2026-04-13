-- ============================================================================
-- SIMPLE PAYPAL FIX - No conflicts, just adds what's needed
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

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_accounts' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
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

-- 3. Add unique constraint on code if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'banks_code_key'
    ) THEN
        ALTER TABLE banks ADD CONSTRAINT banks_code_key UNIQUE (code);
    END IF;
END $$;

-- 4. Delete existing PayPal entry if it exists (to avoid duplicates)
DELETE FROM banks WHERE code = 'PAYPAL';

-- 5. Add PayPal
INSERT INTO banks (name, code, bank_type)
VALUES ('PayPal', 'PAYPAL', 'digital_wallet');

-- 6. Delete and add other digital wallets
DELETE FROM banks WHERE code IN ('STRIPE', 'WISE', 'VENMO', 'CASHAPP', 'ZELLE');

INSERT INTO banks (name, code, bank_type) VALUES
    ('Stripe', 'STRIPE', 'digital_wallet'),
    ('Wise', 'WISE', 'digital_wallet'),
    ('Venmo', 'VENMO', 'digital_wallet'),
    ('Cash App', 'CASHAPP', 'digital_wallet'),
    ('Zelle', 'ZELLE', 'digital_wallet');

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank_accounts(is_default);
CREATE INDEX IF NOT EXISTS idx_banks_code ON banks(code);

-- 8. Enable RLS on banks
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- 9. Allow everyone to view banks
DROP POLICY IF EXISTS "Anyone can view banks" ON banks;
CREATE POLICY "Anyone can view banks" ON banks
    FOR SELECT USING (true);

-- 10. Update bank_accounts RLS policies
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

-- 11. Grant permissions
GRANT ALL ON banks TO authenticated;
GRANT SELECT ON banks TO anon;
GRANT ALL ON bank_accounts TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check PayPal exists
SELECT 'PayPal check:' as check_type, name, code, bank_type 
FROM banks 
WHERE code = 'PAYPAL';

-- Check all digital wallets
SELECT 'Digital wallets:' as check_type, name, code 
FROM banks 
WHERE bank_type = 'digital_wallet'
ORDER BY name;

-- Check bank_accounts columns
SELECT 'Bank accounts columns:' as check_type, column_name 
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
AND column_name IN ('is_default', 'is_primary', 'metadata');

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ PayPal and bank accounts fixed successfully!' as status;
