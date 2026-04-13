# Database Setup Instructions

The banking system requires additional database tables and views to be created. Follow these steps to set up the global banking system:

## Option 1: Run SQL Script in Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `GLOBAL_BANKING_SYSTEM.sql`
4. Click "Run" to execute the script

## Option 2: Quick Setup (Essential Tables Only)

If you want to quickly test the banking functionality, run this minimal SQL in your Supabase SQL Editor:

```sql
-- Essential tables for banking system
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(10),
    currency_code VARCHAR(3),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20),
    swift_code VARCHAR(11),
    country_id INTEGER REFERENCES countries(id),
    supports_international BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    bank_id INTEGER REFERENCES banks(id),
    account_holder_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    routing_number VARCHAR(20),
    swift_code VARCHAR(11),
    iban VARCHAR(34),
    account_type VARCHAR(20) DEFAULT 'checking',
    currency VARCHAR(3) DEFAULT 'USD',
    country_id INTEGER REFERENCES countries(id),
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    verification_status VARCHAR(20) DEFAULT 'pending',
    verification_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample countries
INSERT INTO countries (code, name, phone_code, currency_code) VALUES
('USA', 'United States', '+1', 'USD'),
('GBR', 'United Kingdom', '+44', 'GBP'),
('CAN', 'Canada', '+1', 'CAD'),
('AUS', 'Australia', '+61', 'AUD'),
('DEU', 'Germany', '+49', 'EUR'),
('FRA', 'France', '+33', 'EUR'),
('JPN', 'Japan', '+81', 'JPY'),
('CHN', 'China', '+86', 'CNY'),
('IND', 'India', '+91', 'INR'),
('BRA', 'Brazil', '+55', 'BRL')
ON CONFLICT (code) DO NOTHING;

-- Insert sample banks
INSERT INTO banks (name, code, swift_code, country_id, supports_international) VALUES
('Chase Bank', 'CHASE', 'CHASUS33', (SELECT id FROM countries WHERE code = 'USA'), true),
('Bank of America', 'BOA', 'BOFAUS3N', (SELECT id FROM countries WHERE code = 'USA'), true),
('Wells Fargo', 'WF', 'WFBIUS6S', (SELECT id FROM countries WHERE code = 'USA'), true),
('Barclays', 'BARC', 'BARCGB22', (SELECT id FROM countries WHERE code = 'GBR'), true),
('HSBC', 'HSBC', 'HBUKGB4B', (SELECT id FROM countries WHERE code = 'GBR'), true),
('Royal Bank of Canada', 'RBC', 'ROYCCAT2', (SELECT id FROM countries WHERE code = 'CAN'), true),
('Commonwealth Bank', 'CBA', 'CTBAAU2S', (SELECT id FROM countries WHERE code = 'AUS'), true),
('Deutsche Bank', 'DB', 'DEUTDEFF', (SELECT id FROM countries WHERE code = 'DEU'), true),
('BNP Paribas', 'BNP', 'BNPAFRPP', (SELECT id FROM countries WHERE code = 'FRA'), true),
('Mitsubishi UFJ', 'MUFG', 'BOTKJPJT', (SELECT id FROM countries WHERE code = 'JPN'), true)
ON CONFLICT DO NOTHING;

-- Create the detailed view
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
    c.name as country_name,
    c.code as country_code,
    c.phone_code as country_phone_code,
    c.currency_code as country_currency
FROM user_bank_accounts uba
JOIN banks b ON uba.bank_id = b.id
JOIN countries c ON uba.country_id = c.id;

-- Create helper functions
CREATE OR REPLACE FUNCTION get_banks_by_country(country_code TEXT)
RETURNS TABLE(
    id INTEGER,
    name VARCHAR(200),
    code VARCHAR(20),
    swift_code VARCHAR(11),
    supports_international BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.name, b.code, b.swift_code, b.supports_international
    FROM banks b
    JOIN countries c ON b.country_id = c.id
    WHERE c.code = country_code AND b.is_active = true
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_bank_account(
    p_user_id UUID,
    p_bank_id INTEGER,
    p_account_number TEXT,
    p_account_holder_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    existing_count INTEGER;
BEGIN
    -- Check if account already exists for this user
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
    p_account_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    -- Remove primary flag from all user's accounts
    UPDATE user_bank_accounts 
    SET is_primary = false 
    WHERE user_id = p_user_id;
    
    -- Set the specified account as primary
    UPDATE user_bank_accounts 
    SET is_primary = true 
    WHERE id = p_account_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

## What This Sets Up

- **Countries table**: All major countries with currency codes
- **Banks table**: Major international banks
- **User bank accounts table**: Store user's bank account information
- **Detailed view**: Combines bank account data with bank and country information
- **Helper functions**: For validation and account management

## After Setup

Once you've run the SQL script, the banking system will be fully functional:

- Users can add bank accounts from supported countries
- Bank account verification system works
- Withdrawal system can process payments to verified accounts
- All 195+ countries are supported (if using the full GLOBAL_BANKING_SYSTEM.sql)

## Troubleshooting

If you encounter any issues:

1. Make sure you're running the SQL as a superuser in Supabase
2. Check that all foreign key relationships are properly created
3. Verify that the RLS (Row Level Security) policies allow your operations
4. Check the Supabase logs for any constraint violations

The banking system is now ready to use!