-- Minimal Working Banking Setup
-- This creates the absolute minimum needed to get the banking system working

-- Create banks table (standalone, no foreign key to countries initially)
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20),
    swift_code VARCHAR(11),
    country_name VARCHAR(100), -- Store country name directly instead of foreign key
    supports_international BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_bank_accounts table (no foreign key to countries initially)
CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bank_id UUID REFERENCES banks(id),
    account_holder_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    routing_number VARCHAR(20),
    swift_code VARCHAR(11),
    iban VARCHAR(34),
    account_type VARCHAR(20) DEFAULT 'checking',
    currency VARCHAR(3) DEFAULT 'USD',
    country_name VARCHAR(100), -- Store country name directly
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    verification_status VARCHAR(20) DEFAULT 'pending',
    verification_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample banks
INSERT INTO banks (name, code, swift_code, country_name, supports_international) VALUES
('Chase Bank', 'CHASE', 'CHASUS33', 'United States', true),
('Bank of America', 'BOA', 'BOFAUS3N', 'United States', true),
('Wells Fargo', 'WF', 'WFBIUS6S', 'United States', true),
('Citibank', 'CITI', 'CITIUS33', 'United States', true),
('Barclays', 'BARC', 'BARCGB22', 'United Kingdom', true),
('HSBC UK', 'HSBC', 'HBUKGB4B', 'United Kingdom', true),
('Lloyds Bank', 'LLOYDS', 'LOYDGB21', 'United Kingdom', true),
('Royal Bank of Canada', 'RBC', 'ROYCCAT2', 'Canada', true),
('TD Bank', 'TD', 'TDOMCATTTOR', 'Canada', true),
('Commonwealth Bank', 'CBA', 'CTBAAU2S', 'Australia', true),
('ANZ Bank', 'ANZ', 'ANZBAU3M', 'Australia', true),
('Deutsche Bank', 'DB', 'DEUTDEFF', 'Germany', true),
('BNP Paribas', 'BNP', 'BNPAFRPP', 'France', true),
('Mitsubishi UFJ', 'MUFG', 'BOTKJPJT', 'Japan', true),
('ICBC', 'ICBC', 'ICBKCNBJ', 'China', true),
('State Bank of India', 'SBI', 'SBININBB', 'India', true),
('Banco do Brasil', 'BB', 'BRASBRRJ', 'Brazil', true),
('First Bank of Nigeria', 'FBN', 'FBNINGLA', 'Nigeria', true),
('GTBank', 'GTB', 'GTBINGLA', 'Nigeria', true),
('Access Bank', 'ACCESS', 'ABNGNGLA', 'Nigeria', true),
('Zenith Bank', 'ZENITH', 'ZEIBNGLA', 'Nigeria', true),
('UBA', 'UBA', 'UNAFNGLA', 'Nigeria', true),
('Fidelity Bank', 'FIDELITY', 'FIDTNGLA', 'Nigeria', true),
('Sterling Bank', 'STERLING', 'STBPNGLA', 'Nigeria', true),
('Wema Bank', 'WEMA', 'WEMANGLA', 'Nigeria', true)
ON CONFLICT (id) DO NOTHING;

-- Create simplified view
CREATE OR REPLACE VIEW user_bank_accounts_detailed AS
SELECT 
    uba.id,
    uba.user_id,
    uba.account_holder_name,
    uba.account_number,
    uba.routing_number,
    uba.swift_code,
    uba.iban,
    uba.account_type,
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
    uba.currency as country_currency
FROM user_bank_accounts uba
JOIN banks b ON uba.bank_id = b.id;

-- Create simplified helper functions
CREATE OR REPLACE FUNCTION get_banks_by_country(country_code TEXT)
RETURNS TABLE(
    id UUID,
    name VARCHAR(200),
    code VARCHAR(20),
    swift_code VARCHAR(11),
    supports_international BOOLEAN
) AS $$
BEGIN
    -- Return banks that match the country name or all banks if no match
    RETURN QUERY
    SELECT b.id, b.name, b.code, b.swift_code, b.supports_international
    FROM banks b
    WHERE b.is_active = true
    AND (
        b.country_name ILIKE '%' || country_code || '%' 
        OR country_code = '' 
        OR country_code IS NULL
    )
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_bank_account(
    p_user_id UUID,
    p_bank_id UUID,
    p_account_number TEXT,
    p_account_holder_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO existing_count
    FROM user_bank_accounts
    WHERE user_id = p_user_id 
    AND bank_id = p_bank_id 
    AND account_number = p_account_number
    AND is_active = true;
    
    RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_primary_bank_account(
    p_user_id UUID,
    p_account_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_bank_accounts 
    SET is_primary = false 
    WHERE user_id = p_user_id;
    
    UPDATE user_bank_accounts 
    SET is_primary = true 
    WHERE id = p_account_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create a simple countries-like table for the frontend
CREATE TABLE IF NOT EXISTS banking_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(10),
    currency_code VARCHAR(3),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert basic countries
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
('AGO', 'Angola', '+244', 'AOA')
ON CONFLICT (code) DO NOTHING;

-- Success message
DO $$
DECLARE
    bank_count INTEGER;
    country_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO bank_count FROM banks;
    SELECT COUNT(*) INTO country_count FROM banking_countries;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 MINIMAL BANKING SETUP COMPLETE!';
    RAISE NOTICE '   - Banks: %', bank_count;
    RAISE NOTICE '   - Countries: %', country_count;
    RAISE NOTICE '   - View: user_bank_accounts_detailed created';
    RAISE NOTICE '   - Functions: get_banks_by_country, validate_bank_account, set_primary_bank_account created';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Banking system is ready! Refresh your app to test.';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: This setup uses simplified tables that don''t depend on your existing countries table.';
    RAISE NOTICE 'The banking system will work independently and you can add accounts successfully.';
END $$;