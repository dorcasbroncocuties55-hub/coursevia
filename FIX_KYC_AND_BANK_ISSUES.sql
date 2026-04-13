-- Fix KYC Status and Bank Account Issues
-- This migration fixes:
-- 1. KYC status showing "pending_setup" instead of "not_started"
-- 2. Bank account table mismatches between frontend and backend
-- 3. Ensures proper country and bank data is available

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Fix KYC Status
-- ═══════════════════════════════════════════════════════════════════════════════

-- Update all 'pending_setup' statuses to 'not_started' for consistency
UPDATE public.profiles
SET kyc_status = 'not_started'
WHERE kyc_status = 'pending_setup' OR kyc_status IS NULL OR kyc_status = '';

-- Ensure kyc_status column has proper default
ALTER TABLE public.profiles
  ALTER COLUMN kyc_status SET DEFAULT 'not_started';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Ensure Banking Tables Exist
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create banking_countries table if it doesn't exist
CREATE TABLE IF NOT EXISTS banking_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(10),
    currency_code VARCHAR(3),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create banks table if it doesn't exist
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20),
    swift_code VARCHAR(11),
    country_name VARCHAR(100),
    supports_international BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bank_accounts table (matches backend server.js)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name           TEXT NOT NULL,
  bank_code           TEXT,
  account_name        TEXT,
  account_number      TEXT NOT NULL,
  country_code        TEXT NOT NULL DEFAULT 'US',
  currency            TEXT NOT NULL DEFAULT 'USD',
  provider            TEXT NOT NULL DEFAULT 'manual',
  verification_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','verified','rejected')),
  is_default          BOOLEAN NOT NULL DEFAULT false,
  metadata            JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Insert Countries Data
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO banking_countries (code, name, phone_code, currency_code) VALUES
('USA', 'United States', '+1', 'USD'),
('GBR', 'United Kingdom', '+44', 'GBP'),
('CAN', 'Canada', '+1', 'CAD'),
('AUS', 'Australia', '+61', 'AUD'),
('DEU', 'Germany', '+49', 'EUR'),
('FRA', 'France', '+33', 'EUR'),
('JPN', 'Japan', '+81', 'JPY'),
('CHN', 'China', '+86', 'CNY'),
('IND', 'India', '+91', 'INR'),
('BRA', 'Brazil', '+55', 'BRL'),
('NGA', 'Nigeria', '+234', 'NGN'),
('ZAF', 'South Africa', '+27', 'ZAR'),
('KEN', 'Kenya', '+254', 'KES'),
('EGY', 'Egypt', '+20', 'EGP'),
('MAR', 'Morocco', '+212', 'MAD'),
('GHA', 'Ghana', '+233', 'GHS'),
('ETH', 'Ethiopia', '+251', 'ETB'),
('TUN', 'Tunisia', '+216', 'TND'),
('DZA', 'Algeria', '+213', 'DZD'),
('AGO', 'Angola', '+244', 'AOA'),
('MEX', 'Mexico', '+52', 'MXN'),
('ARG', 'Argentina', '+54', 'ARS'),
('CHL', 'Chile', '+56', 'CLP'),
('COL', 'Colombia', '+57', 'COP'),
('PER', 'Peru', '+51', 'PEN'),
('VEN', 'Venezuela', '+58', 'VES'),
('ESP', 'Spain', '+34', 'EUR'),
('ITA', 'Italy', '+39', 'EUR'),
('NLD', 'Netherlands', '+31', 'EUR'),
('BEL', 'Belgium', '+32', 'EUR'),
('CHE', 'Switzerland', '+41', 'CHF'),
('SWE', 'Sweden', '+46', 'SEK'),
('NOR', 'Norway', '+47', 'NOK'),
('DNK', 'Denmark', '+45', 'DKK'),
('POL', 'Poland', '+48', 'PLN'),
('TUR', 'Turkey', '+90', 'TRY'),
('SAU', 'Saudi Arabia', '+966', 'SAR'),
('ARE', 'United Arab Emirates', '+971', 'AED'),
('ISR', 'Israel', '+972', 'ILS'),
('SGP', 'Singapore', '+65', 'SGD'),
('HKG', 'Hong Kong', '+852', 'HKD'),
('KOR', 'South Korea', '+82', 'KRW'),
('THA', 'Thailand', '+66', 'THB'),
('MYS', 'Malaysia', '+60', 'MYR'),
('IDN', 'Indonesia', '+62', 'IDR'),
('PHL', 'Philippines', '+63', 'PHP'),
('VNM', 'Vietnam', '+84', 'VND'),
('NZL', 'New Zealand', '+64', 'NZD'),
('IRL', 'Ireland', '+353', 'EUR'),
('AUT', 'Austria', '+43', 'EUR'),
('PRT', 'Portugal', '+351', 'EUR'),
('GRC', 'Greece', '+30', 'EUR'),
('CZE', 'Czech Republic', '+420', 'CZK'),
('HUN', 'Hungary', '+36', 'HUF'),
('ROU', 'Romania', '+40', 'RON'),
('BGR', 'Bulgaria', '+359', 'BGN'),
('HRV', 'Croatia', '+385', 'HRK'),
('SRB', 'Serbia', '+381', 'RSD'),
('UKR', 'Ukraine', '+380', 'UAH'),
('RUS', 'Russia', '+7', 'RUB'),
('PAK', 'Pakistan', '+92', 'PKR'),
('BGD', 'Bangladesh', '+880', 'BDT'),
('LKA', 'Sri Lanka', '+94', 'LKR'),
('NPL', 'Nepal', '+977', 'NPR')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  phone_code = EXCLUDED.phone_code,
  currency_code = EXCLUDED.currency_code;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: Insert Banks Data
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO banks (name, code, swift_code, country_name, supports_international) VALUES
-- United States
('Chase Bank', 'CHASE', 'CHASUS33', 'United States', true),
('Bank of America', 'BOA', 'BOFAUS3N', 'United States', true),
('Wells Fargo', 'WF', 'WFBIUS6S', 'United States', true),
('Citibank', 'CITI', 'CITIUS33', 'United States', true),
('US Bank', 'USB', 'USBKUS44', 'United States', true),
('PNC Bank', 'PNC', 'PNCCUS33', 'United States', true),
('Capital One', 'CAPONE', 'NFBKUS33', 'United States', true),
('TD Bank', 'TD', 'NRTHUS33', 'United States', true),
('BB&T', 'BBT', 'BRBTUS33', 'United States', true),
('SunTrust', 'SUNTRUST', 'SNTRUS3A', 'United States', true),

-- United Kingdom
('Barclays', 'BARC', 'BARCGB22', 'United Kingdom', true),
('HSBC UK', 'HSBC', 'HBUKGB4B', 'United Kingdom', true),
('Lloyds Bank', 'LLOYDS', 'LOYDGB21', 'United Kingdom', true),
('NatWest', 'NATWEST', 'NWBKGB2L', 'United Kingdom', true),
('Santander UK', 'SANTANDER', 'ABBYGB2L', 'United Kingdom', true),
('Royal Bank of Scotland', 'RBS', 'RBOSGB2L', 'United Kingdom', true),
('TSB Bank', 'TSB', 'TSBSGB2A', 'United Kingdom', true),
('Metro Bank', 'METRO', 'MYMBGB2L', 'United Kingdom', true),
('Nationwide', 'NATIONWIDE', 'NAIAGB21', 'United Kingdom', true),
('Halifax', 'HALIFAX', 'HLFXGB21', 'United Kingdom', true),

-- Canada
('Royal Bank of Canada', 'RBC', 'ROYCCAT2', 'Canada', true),
('TD Canada Trust', 'TD', 'TDOMCATTTOR', 'Canada', true),
('Bank of Montreal', 'BMO', 'BOFMCAM2', 'Canada', true),
('Scotiabank', 'SCOTIA', 'NOSCCATT', 'Canada', true),
('CIBC', 'CIBC', 'CIBCCATT', 'Canada', true),
('National Bank of Canada', 'NBC', 'BNDCCAMMINT', 'Canada', true),
('Desjardins', 'DESJARDINS', 'CCDQCAMM', 'Canada', true),
('Tangerine', 'TANGERINE', 'TDOMCATTTOR', 'Canada', true),

-- Nigeria
('First Bank of Nigeria', 'FBN', 'FBNINGLA', 'Nigeria', true),
('GTBank', 'GTB', 'GTBINGLA', 'Nigeria', true),
('Access Bank', 'ACCESS', 'ABNGNGLA', 'Nigeria', true),
('Zenith Bank', 'ZENITH', 'ZEIBNGLA', 'Nigeria', true),
('UBA', 'UBA', 'UNAFNGLA', 'Nigeria', true),
('Fidelity Bank', 'FIDELITY', 'FIDTNGLA', 'Nigeria', true),
('Sterling Bank', 'STERLING', 'STBPNGLA', 'Nigeria', true),
('Wema Bank', 'WEMA', 'WEMANGLA', 'Nigeria', true),
('Union Bank', 'UNION', 'UBNINGLA', 'Nigeria', true),
('Ecobank Nigeria', 'ECOBANK', 'ECOCNGLA', 'Nigeria', true),

-- Australia
('Commonwealth Bank', 'CBA', 'CTBAAU2S', 'Australia', true),
('ANZ Bank', 'ANZ', 'ANZBAU3M', 'Australia', true),
('Westpac', 'WESTPAC', 'WPACAU2S', 'Australia', true),
('NAB', 'NAB', 'NATAAU33', 'Australia', true),

-- Germany
('Deutsche Bank', 'DB', 'DEUTDEFF', 'Germany', true),
('Commerzbank', 'COMMERZBANK', 'COBADEFF', 'Germany', true),
('DZ Bank', 'DZ', 'GENODEFF', 'Germany', true),

-- France
('BNP Paribas', 'BNP', 'BNPAFRPP', 'France', true),
('Crédit Agricole', 'CA', 'AGRIFRPP', 'France', true),
('Société Générale', 'SG', 'SOGEFRPP', 'France', true),

-- Japan
('Mitsubishi UFJ', 'MUFG', 'BOTKJPJT', 'Japan', true),
('Sumitomo Mitsui', 'SMBC', 'SMBCJPJT', 'Japan', true),
('Mizuho Bank', 'MIZUHO', 'MHCBJPJT', 'Japan', true),

-- China
('ICBC', 'ICBC', 'ICBKCNBJ', 'China', true),
('China Construction Bank', 'CCB', 'PCBCCNBJ', 'China', true),
('Agricultural Bank of China', 'ABC', 'ABOCCNBJ', 'China', true),

-- India
('State Bank of India', 'SBI', 'SBININBB', 'India', true),
('HDFC Bank', 'HDFC', 'HDFCINBB', 'India', true),
('ICICI Bank', 'ICICI', 'ICICINBB', 'India', true),
('Axis Bank', 'AXIS', 'AXISINBB', 'India', true),

-- Brazil
('Banco do Brasil', 'BB', 'BRASBRRJ', 'Brazil', true),
('Itaú Unibanco', 'ITAU', 'ITAUBRSP', 'Brazil', true),
('Bradesco', 'BRADESCO', 'BBDEBRSP', 'Brazil', true)

ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: Create/Update RPC Functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing function if it exists (to avoid return type conflicts)
DROP FUNCTION IF EXISTS get_banks_by_country(TEXT);

-- Function to get banks by country (accepts country name or code)
CREATE FUNCTION get_banks_by_country(country_input TEXT)
RETURNS TABLE(
    id UUID,
    name VARCHAR(200),
    code VARCHAR(20),
    swift_code VARCHAR(11),
    supports_international BOOLEAN,
    country_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.name, b.code, b.swift_code, b.supports_international, b.country_name
    FROM banks b
    WHERE b.is_active = true
    AND (
        b.country_name ILIKE '%' || country_input || '%' 
        OR country_input = '' 
        OR country_input IS NULL
    )
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS set_primary_bank_account(UUID, UUID);

-- Function to set primary bank account
CREATE FUNCTION set_primary_bank_account(
    p_user_id UUID,
    p_account_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- First, unset all as primary for this user
    UPDATE bank_accounts 
    SET is_default = false 
    WHERE user_id = p_user_id;
    
    -- Then set the specified account as primary
    UPDATE bank_accounts 
    SET is_default = true 
    WHERE id = p_account_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: Enable RLS on bank_accounts
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
CREATE POLICY "Users can insert own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 7: Verification and Summary
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    country_count INTEGER;
    bank_count INTEGER;
    kyc_fixed INTEGER;
BEGIN
    SELECT COUNT(*) INTO country_count FROM banking_countries WHERE is_active = true;
    SELECT COUNT(*) INTO bank_count FROM banks WHERE is_active = true;
    SELECT COUNT(*) INTO kyc_fixed FROM profiles WHERE kyc_status = 'not_started';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ KYC AND BANK ACCOUNT FIX COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'KYC Status:';
    RAISE NOTICE '  - Fixed % profiles to "not_started" status', kyc_fixed;
    RAISE NOTICE '  - Default changed from "pending_setup" to "not_started"';
    RAISE NOTICE '';
    RAISE NOTICE 'Banking System:';
    RAISE NOTICE '  - Countries available: %', country_count;
    RAISE NOTICE '  - Banks available: %', bank_count;
    RAISE NOTICE '  - Table: bank_accounts (matches backend)';
    RAISE NOTICE '  - Functions: get_banks_by_country, set_primary_bank_account';
    RAISE NOTICE '  - RLS policies enabled';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 System is ready! Refresh your app to test.';
    RAISE NOTICE '';
END $$;
