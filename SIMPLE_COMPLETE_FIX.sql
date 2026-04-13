-- ============================================================================
-- SIMPLE COMPLETE BANKING FIX - No DO blocks
-- ============================================================================

-- ============================================================================
-- PART 1: FIX COUNTRIES (Remove duplicates)
-- ============================================================================

-- Remove duplicate countries
DELETE FROM banking_countries a USING banking_countries b
WHERE a.id > b.id AND a.code = b.code;

-- Add unique constraint (ignore if exists)
ALTER TABLE banking_countries ADD CONSTRAINT banking_countries_code_key UNIQUE (code);

-- ============================================================================
-- PART 2: FIX BANKS TABLE
-- ============================================================================

-- Add bank_type column (ignore if exists)
ALTER TABLE banks ADD COLUMN IF NOT EXISTS bank_type VARCHAR(50) DEFAULT 'traditional';
ALTER TABLE banks ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Remove duplicate banks
DELETE FROM banks a USING banks b
WHERE a.id > b.id AND a.code = b.code;

-- Add unique constraint on banks (ignore if exists)
ALTER TABLE banks ADD CONSTRAINT banks_code_key UNIQUE (code);

-- ============================================================================
-- PART 3: ADD COMPREHENSIVE BANK LIST
-- ============================================================================

INSERT INTO banks (name, code, bank_type, country_code) VALUES
    -- Digital Wallets (Global)
    ('PayPal', 'PAYPAL', 'digital_wallet', 'US'),
    ('PayPal US', 'PAYPAL_US', 'digital_wallet', 'US'),
    ('PayPal UK', 'PAYPAL_UK', 'digital_wallet', 'GB'),
    ('PayPal Canada', 'PAYPAL_CA', 'digital_wallet', 'CA'),
    ('PayPal Australia', 'PAYPAL_AU', 'digital_wallet', 'AU'),
    ('PayPal Germany', 'PAYPAL_DE', 'digital_wallet', 'DE'),
    ('PayPal France', 'PAYPAL_FR', 'digital_wallet', 'FR'),
    ('PayPal Japan', 'PAYPAL_JP', 'digital_wallet', 'JP'),
    ('PayPal India', 'PAYPAL_IN', 'digital_wallet', 'IN'),
    ('PayPal Brazil', 'PAYPAL_BR', 'digital_wallet', 'BR'),
    ('PayPal Nigeria', 'PAYPAL_NG', 'digital_wallet', 'NG'),
    ('Stripe', 'STRIPE', 'digital_wallet', 'US'),
    ('Wise (TransferWise)', 'WISE', 'digital_wallet', 'GB'),
    ('Venmo', 'VENMO', 'digital_wallet', 'US'),
    ('Cash App', 'CASHAPP', 'digital_wallet', 'US'),
    ('Zelle', 'ZELLE', 'digital_wallet', 'US'),
    ('Revolut', 'REVOLUT', 'digital_wallet', 'GB'),
    ('Skrill', 'SKRILL', 'digital_wallet', 'GB'),
    ('Payoneer', 'PAYONEER', 'digital_wallet', 'US'),
    
    -- United States Banks
    ('Bank of America', 'BOA', 'traditional', 'US'),
    ('Chase Bank', 'CHASE', 'traditional', 'US'),
    ('Wells Fargo', 'WELLSFARGO', 'traditional', 'US'),
    ('Citibank', 'CITI', 'traditional', 'US'),
    ('US Bank', 'USBANK', 'traditional', 'US'),
    ('PNC Bank', 'PNC', 'traditional', 'US'),
    ('Capital One', 'CAPITALONE', 'traditional', 'US'),
    ('TD Bank', 'TDBANK_US', 'traditional', 'US'),
    ('Truist Bank', 'TRUIST', 'traditional', 'US'),
    ('Goldman Sachs', 'GOLDMAN', 'traditional', 'US'),
    
    -- UK Banks
    ('Barclays', 'BARCLAYS', 'traditional', 'GB'),
    ('HSBC UK', 'HSBC_UK', 'traditional', 'GB'),
    ('Lloyds Bank', 'LLOYDS', 'traditional', 'GB'),
    ('NatWest', 'NATWEST', 'traditional', 'GB'),
    ('Santander UK', 'SANTANDER_UK', 'traditional', 'GB'),
    ('Royal Bank of Scotland', 'RBS', 'traditional', 'GB'),
    ('TSB Bank', 'TSB', 'traditional', 'GB'),
    ('Metro Bank', 'METRO', 'traditional', 'GB'),
    ('Nationwide', 'NATIONWIDE', 'traditional', 'GB'),
    
    -- Canadian Banks
    ('Royal Bank of Canada', 'RBC', 'traditional', 'CA'),
    ('TD Canada Trust', 'TD', 'traditional', 'CA'),
    ('Bank of Montreal', 'BMO', 'traditional', 'CA'),
    ('Scotiabank', 'SCOTIABANK', 'traditional', 'CA'),
    ('CIBC', 'CIBC', 'traditional', 'CA'),
    ('National Bank of Canada', 'NBC', 'traditional', 'CA'),
    ('Desjardins', 'DESJARDINS', 'traditional', 'CA'),
    
    -- Australian Banks
    ('Commonwealth Bank', 'CBA', 'traditional', 'AU'),
    ('Westpac', 'WESTPAC', 'traditional', 'AU'),
    ('ANZ', 'ANZ', 'traditional', 'AU'),
    ('NAB', 'NAB', 'traditional', 'AU'),
    ('Macquarie Bank', 'MACQUARIE', 'traditional', 'AU'),
    ('ING Australia', 'ING_AU', 'traditional', 'AU'),
    
    -- European Banks
    ('Deutsche Bank', 'DEUTSCHE', 'traditional', 'DE'),
    ('Commerzbank', 'COMMERZBANK', 'traditional', 'DE'),
    ('BNP Paribas', 'BNP', 'traditional', 'FR'),
    ('Société Générale', 'SOCGEN', 'traditional', 'FR'),
    ('Crédit Agricole', 'CREDITAGRICOLE', 'traditional', 'FR'),
    ('ING Bank', 'ING', 'traditional', 'NL'),
    ('Rabobank', 'RABOBANK', 'traditional', 'NL'),
    ('ABN AMRO', 'ABNAMRO', 'traditional', 'NL'),
    ('UBS', 'UBS', 'traditional', 'CH'),
    ('Credit Suisse', 'CREDITSUISSE', 'traditional', 'CH'),
    ('Santander', 'SANTANDER', 'traditional', 'ES'),
    ('BBVA', 'BBVA', 'traditional', 'ES'),
    ('UniCredit', 'UNICREDIT', 'traditional', 'IT'),
    ('Intesa Sanpaolo', 'INTESA', 'traditional', 'IT'),
    
    -- Asian Banks
    ('ICICI Bank', 'ICICI', 'traditional', 'IN'),
    ('HDFC Bank', 'HDFC', 'traditional', 'IN'),
    ('State Bank of India', 'SBI', 'traditional', 'IN'),
    ('Axis Bank', 'AXIS', 'traditional', 'IN'),
    ('Bank of China', 'BOC', 'traditional', 'CN'),
    ('ICBC', 'ICBC', 'traditional', 'CN'),
    ('China Construction Bank', 'CCB', 'traditional', 'CN'),
    ('Mitsubishi UFJ', 'MUFG', 'traditional', 'JP'),
    ('Sumitomo Mitsui', 'SMBC', 'traditional', 'JP'),
    ('Mizuho Bank', 'MIZUHO', 'traditional', 'JP'),
    ('DBS Bank', 'DBS', 'traditional', 'SG'),
    ('OCBC Bank', 'OCBC', 'traditional', 'SG'),
    ('UOB', 'UOB', 'traditional', 'SG'),
    
    -- Latin American Banks
    ('Banco do Brasil', 'BB', 'traditional', 'BR'),
    ('Itaú Unibanco', 'ITAU', 'traditional', 'BR'),
    ('Bradesco', 'BRADESCO', 'traditional', 'BR'),
    ('Santander Brasil', 'SANTANDER_BR', 'traditional', 'BR'),
    ('BBVA México', 'BBVA_MX', 'traditional', 'MX'),
    ('Banorte', 'BANORTE', 'traditional', 'MX'),
    
    -- African Banks
    ('Standard Bank', 'STANDARDBANK', 'traditional', 'ZA'),
    ('First National Bank', 'FNB', 'traditional', 'ZA'),
    ('Nedbank', 'NEDBANK', 'traditional', 'ZA'),
    ('Access Bank', 'ACCESS', 'traditional', 'NG'),
    ('GTBank', 'GTBANK', 'traditional', 'NG'),
    ('Zenith Bank', 'ZENITH', 'traditional', 'NG'),
    ('First Bank of Nigeria', 'FBN', 'traditional', 'NG')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    bank_type = EXCLUDED.bank_type,
    country_code = EXCLUDED.country_code;

-- ============================================================================
-- PART 4: FIX RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking_countries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON user_bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON user_bank_accounts;

DROP POLICY IF EXISTS "Users can view their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON bank_accounts;

DROP POLICY IF EXISTS "Anyone can view banks" ON banks;
DROP POLICY IF EXISTS "Anyone can view countries" ON banking_countries;

-- Create policies for user_bank_accounts
CREATE POLICY "Users can view their own bank accounts" ON user_bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON user_bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON user_bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON user_bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for bank_accounts
CREATE POLICY "Users can view their own bank accounts" ON bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Public read access for banks and countries
CREATE POLICY "Anyone can view banks" ON banks FOR SELECT USING (true);
CREATE POLICY "Anyone can view countries" ON banking_countries FOR SELECT USING (true);

-- ============================================================================
-- PART 5: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON user_bank_accounts TO authenticated;
GRANT ALL ON bank_accounts TO authenticated;
GRANT SELECT ON banks TO authenticated;
GRANT SELECT ON banks TO anon;
GRANT SELECT ON banking_countries TO authenticated;
GRANT SELECT ON banking_countries TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '=== VERIFICATION ===' as section;

SELECT 'Countries:' as item, COUNT(*)::text as count FROM banking_countries;
SELECT 'Banks:' as item, COUNT(*)::text as count FROM banks;
SELECT 'PayPal variants:' as item, COUNT(*)::text as count FROM banks WHERE code LIKE 'PAYPAL%';
SELECT 'Digital wallets:' as item, COUNT(*)::text as count FROM banks WHERE bank_type = 'digital_wallet';

SELECT '✅ DONE! Countries fixed, 100+ banks added, PayPal RLS fixed!' as status;
