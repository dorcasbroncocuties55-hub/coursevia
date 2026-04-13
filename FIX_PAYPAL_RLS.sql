-- ============================================================================
-- FIX PAYPAL RLS POLICY - Allow users to insert into user_bank_accounts
-- ============================================================================

-- Enable RLS on user_bank_accounts
ALTER TABLE user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON user_bank_accounts;

-- Create comprehensive RLS policies for user_bank_accounts
CREATE POLICY "Users can view their own bank accounts" ON user_bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON user_bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON user_bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON user_bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_bank_accounts TO authenticated;

-- Also ensure banks table is accessible
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view banks" ON banks;
CREATE POLICY "Anyone can view banks" ON banks FOR SELECT USING (true);
GRANT SELECT ON banks TO authenticated;
GRANT SELECT ON banks TO anon;

-- Add PayPal banks if they don't exist
INSERT INTO banks (name, code, bank_type) VALUES
    ('PayPal', 'PAYPAL', 'digital_wallet'),
    ('PayPal US', 'PAYPAL_US', 'digital_wallet'),
    ('PayPal UK', 'PAYPAL_UK', 'digital_wallet'),
    ('PayPal Canada', 'PAYPAL_CA', 'digital_wallet'),
    ('PayPal Australia', 'PAYPAL_AU', 'digital_wallet'),
    ('PayPal Germany', 'PAYPAL_DE', 'digital_wallet'),
    ('PayPal France', 'PAYPAL_FR', 'digital_wallet'),
    ('PayPal Japan', 'PAYPAL_JP', 'digital_wallet'),
    ('PayPal India', 'PAYPAL_IN', 'digital_wallet'),
    ('PayPal Brazil', 'PAYPAL_BR', 'digital_wallet'),
    ('PayPal Nigeria', 'PAYPAL_NG', 'digital_wallet')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '=== RLS POLICIES ===' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_bank_accounts'
ORDER BY policyname;

SELECT '=== PAYPAL BANKS ===' as section;

SELECT name, code, bank_type 
FROM banks 
WHERE code LIKE 'PAYPAL%'
ORDER BY code;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ PayPal RLS policies fixed! You can now add PayPal accounts.' as status;
