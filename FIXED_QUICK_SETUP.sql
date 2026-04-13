-- Fixed Quick Banking System Setup (UUID Compatible)
-- Copy and paste this entire script into your Supabase SQL Editor and click "Run"

-- Check if countries table exists, if not create it with UUID
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'countries' AND table_schema = 'public') THEN
        CREATE TABLE countries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(3) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            phone_code VARCHAR(10),
            currency_code VARCHAR(3),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Check if banks table exists, if not create it with UUID reference
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'banks' AND table_schema = 'public') THEN
        CREATE TABLE banks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            code VARCHAR(20),
            swift_code VARCHAR(11),
            country_id UUID REFERENCES countries(id),
            supports_international BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Check if user_bank_accounts table exists, if not create it with UUID references
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_bank_accounts' AND table_schema = 'public') THEN
        CREATE TABLE user_bank_accounts (
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
            country_id UUID REFERENCES countries(id),
            is_primary BOOLEAN DEFAULT false,
            is_verified BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            verification_status VARCHAR(20) DEFAULT 'pending',
            verification_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Insert sample countries (using UUID)
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
('URY', 'Uruguay', '+598', 'UYU'),
('ECU', 'Ecuador', '+593', 'USD'),
('BOL', 'Bolivia', '+591', 'BOB'),
('PRY', 'Paraguay', '+595', 'PYG'),
('ESP', 'Spain', '+34', 'EUR'),
('ITA', 'Italy', '+39', 'EUR'),
('NLD', 'Netherlands', '+31', 'EUR'),
('BEL', 'Belgium', '+32', 'EUR'),
('CHE', 'Switzerland', '+41', 'CHF'),
('AUT', 'Austria', '+43', 'EUR'),
('SWE', 'Sweden', '+46', 'SEK'),
('NOR', 'Norway', '+47', 'NOK'),
('DNK', 'Denmark', '+45', 'DKK'),
('FIN', 'Finland', '+358', 'EUR'),
('POL', 'Poland', '+48', 'PLN'),
('CZE', 'Czech Republic', '+420', 'CZK'),
('HUN', 'Hungary', '+36', 'HUF'),
('ROU', 'Romania', '+40', 'RON'),
('BGR', 'Bulgaria', '+359', 'BGN'),
('HRV', 'Croatia', '+385', 'EUR'),
('SVN', 'Slovenia', '+386', 'EUR'),
('SVK', 'Slovakia', '+421', 'EUR'),
('EST', 'Estonia', '+372', 'EUR'),
('LVA', 'Latvia', '+371', 'EUR'),
('LTU', 'Lithuania', '+370', 'EUR'),
('GRC', 'Greece', '+30', 'EUR'),
('CYP', 'Cyprus', '+357', 'EUR'),
('MLT', 'Malta', '+356', 'EUR'),
('PRT', 'Portugal', '+351', 'EUR'),
('IRL', 'Ireland', '+353', 'EUR'),
('ISL', 'Iceland', '+354', 'ISK'),
('LUX', 'Luxembourg', '+352', 'EUR'),
('MCO', 'Monaco', '+377', 'EUR'),
('SMR', 'San Marino', '+378', 'EUR'),
('VAT', 'Vatican City', '+39', 'EUR'),
('AND', 'Andorra', '+376', 'EUR'),
('LIE', 'Liechtenstein', '+423', 'CHF'),
('RUS', 'Russia', '+7', 'RUB'),
('UKR', 'Ukraine', '+380', 'UAH'),
('BLR', 'Belarus', '+375', 'BYN'),
('MDA', 'Moldova', '+373', 'MDL'),
('GEO', 'Georgia', '+995', 'GEL'),
('ARM', 'Armenia', '+374', 'AMD'),
('AZE', 'Azerbaijan', '+994', 'AZN'),
('KAZ', 'Kazakhstan', '+7', 'KZT'),
('UZB', 'Uzbekistan', '+998', 'UZS'),
('KGZ', 'Kyrgyzstan', '+996', 'KGS'),
('TJK', 'Tajikistan', '+992', 'TJS'),
('TKM', 'Turkmenistan', '+993', 'TMT'),
('MNG', 'Mongolia', '+976', 'MNT'),
('KOR', 'South Korea', '+82', 'KRW'),
('PRK', 'North Korea', '+850', 'KPW'),
('THA', 'Thailand', '+66', 'THB'),
('VNM', 'Vietnam', '+84', 'VND'),
('LAO', 'Laos', '+856', 'LAK'),
('KHM', 'Cambodia', '+855', 'KHR'),
('MMR', 'Myanmar', '+95', 'MMK'),
('MYS', 'Malaysia', '+60', 'MYR'),
('SGP', 'Singapore', '+65', 'SGD'),
('IDN', 'Indonesia', '+62', 'IDR'),
('PHL', 'Philippines', '+63', 'PHP'),
('BRN', 'Brunei', '+673', 'BND'),
('TLS', 'East Timor', '+670', 'USD'),
('PNG', 'Papua New Guinea', '+675', 'PGK'),
('SLB', 'Solomon Islands', '+677', 'SBD'),
('VUT', 'Vanuatu', '+678', 'VUV'),
('NCL', 'New Caledonia', '+687', 'XPF'),
('FJI', 'Fiji', '+679', 'FJD'),
('TON', 'Tonga', '+676', 'TOP'),
('WSM', 'Samoa', '+685', 'WST'),
('KIR', 'Kiribati', '+686', 'AUD'),
('TUV', 'Tuvalu', '+688', 'AUD'),
('NRU', 'Nauru', '+674', 'AUD'),
('PLW', 'Palau', '+680', 'USD'),
('MHL', 'Marshall Islands', '+692', 'USD'),
('FSM', 'Micronesia', '+691', 'USD'),
('GUM', 'Guam', '+1671', 'USD'),
('ASM', 'American Samoa', '+1684', 'USD'),
('COK', 'Cook Islands', '+682', 'NZD'),
('NIU', 'Niue', '+683', 'NZD'),
('TKL', 'Tokelau', '+690', 'NZD'),
('NZL', 'New Zealand', '+64', 'NZD')
ON CONFLICT (code) DO NOTHING;

-- Insert sample banks (using UUID references)
INSERT INTO banks (name, code, swift_code, country_id, supports_international) VALUES
-- US Banks
('Chase Bank', 'CHASE', 'CHASUS33', (SELECT id FROM countries WHERE code = 'USA'), true),
('Bank of America', 'BOA', 'BOFAUS3N', (SELECT id FROM countries WHERE code = 'USA'), true),
('Wells Fargo', 'WF', 'WFBIUS6S', (SELECT id FROM countries WHERE code = 'USA'), true),
('Citibank', 'CITI', 'CITIUS33', (SELECT id FROM countries WHERE code = 'USA'), true),
('Goldman Sachs Bank', 'GS', 'GSAMUS33', (SELECT id FROM countries WHERE code = 'USA'), true),
('Morgan Stanley Bank', 'MS', 'MSBAUS33', (SELECT id FROM countries WHERE code = 'USA'), true),
('U.S. Bank', 'USB', 'USBKUS44', (SELECT id FROM countries WHERE code = 'USA'), true),
('PNC Bank', 'PNC', 'PNCCUS33', (SELECT id FROM countries WHERE code = 'USA'), true),
('Capital One', 'COF', 'HIBKUS44', (SELECT id FROM countries WHERE code = 'USA'), true),
('TD Bank', 'TD', 'NRTHUS33', (SELECT id FROM countries WHERE code = 'USA'), true),

-- UK Banks
('Barclays', 'BARC', 'BARCGB22', (SELECT id FROM countries WHERE code = 'GBR'), true),
('HSBC UK', 'HSBC', 'HBUKGB4B', (SELECT id FROM countries WHERE code = 'GBR'), true),
('Lloyds Bank', 'LLOYDS', 'LOYDGB21', (SELECT id FROM countries WHERE code = 'GBR'), true),
('NatWest', 'NATWEST', 'NWBKGB2L', (SELECT id FROM countries WHERE code = 'GBR'), true),
('Santander UK', 'SANTUK', 'ABBYGB2L', (SELECT id FROM countries WHERE code = 'GBR'), true),
('Standard Chartered', 'SC', 'SCBLGB2L', (SELECT id FROM countries WHERE code = 'GBR'), true),
('Metro Bank', 'METRO', 'MYMNGB2L', (SELECT id FROM countries WHERE code = 'GBR'), true),
('Monzo', 'MONZO', 'MONZGB2L', (SELECT id FROM countries WHERE code = 'GBR'), true),
('Starling Bank', 'STARLING', 'SRLGGB2L', (SELECT id FROM countries WHERE code = 'GBR'), true),
('Revolut', 'REVOLUT', 'REVOGB21', (SELECT id FROM countries WHERE code = 'GBR'), true),

-- Canadian Banks
('Royal Bank of Canada', 'RBC', 'ROYCCAT2', (SELECT id FROM countries WHERE code = 'CAN'), true),
('Toronto-Dominion Bank', 'TD', 'TDOMCATTTOR', (SELECT id FROM countries WHERE code = 'CAN'), true),
('Bank of Nova Scotia', 'BNS', 'NOSCCATT', (SELECT id FROM countries WHERE code = 'CAN'), true),
('Bank of Montreal', 'BMO', 'BOFMCAM2', (SELECT id FROM countries WHERE code = 'CAN'), true),
('Canadian Imperial Bank', 'CIBC', 'CIBCCATT', (SELECT id FROM countries WHERE code = 'CAN'), true),
('National Bank of Canada', 'NBC', 'BNDCCAMMINT', (SELECT id FROM countries WHERE code = 'CAN'), true),
('Desjardins Group', 'DESJARDINS', 'CCDQCAMM', (SELECT id FROM countries WHERE code = 'CAN'), true),

-- Australian Banks
('Commonwealth Bank', 'CBA', 'CTBAAU2S', (SELECT id FROM countries WHERE code = 'AUS'), true),
('Australia and New Zealand Banking Group', 'ANZ', 'ANZBAU3M', (SELECT id FROM countries WHERE code = 'AUS'), true),
('Westpac Banking Corporation', 'WBC', 'WPACAU2S', (SELECT id FROM countries WHERE code = 'AUS'), true),
('National Australia Bank', 'NAB', 'NATAAU33', (SELECT id FROM countries WHERE code = 'AUS'), true),
('Macquarie Bank', 'MBL', 'MACQAU2S', (SELECT id FROM countries WHERE code = 'AUS'), true),
('ING Australia', 'ING', 'INGBAU2S', (SELECT id FROM countries WHERE code = 'AUS'), true),

-- German Banks
('Deutsche Bank', 'DB', 'DEUTDEFF', (SELECT id FROM countries WHERE code = 'DEU'), true),
('Commerzbank', 'CBK', 'COBADEFF', (SELECT id FROM countries WHERE code = 'DEU'), true),
('DZ Bank', 'DZ', 'GENODEFF', (SELECT id FROM countries WHERE code = 'DEU'), true),
('KfW', 'KFW', 'KFWIDEFF', (SELECT id FROM countries WHERE code = 'DEU'), true),
('Sparkasse', 'SPARKASSE', 'BYLADEMMXXX', (SELECT id FROM countries WHERE code = 'DEU'), false),

-- French Banks
('BNP Paribas', 'BNP', 'BNPAFRPP', (SELECT id FROM countries WHERE code = 'FRA'), true),
('Crédit Agricole', 'CA', 'AGRIFRPP', (SELECT id FROM countries WHERE code = 'FRA'), true),
('Société Générale', 'SG', 'SOGEFRPP', (SELECT id FROM countries WHERE code = 'FRA'), true),
('Crédit Mutuel', 'CM', 'CMCIFR2A', (SELECT id FROM countries WHERE code = 'FRA'), true),
('La Banque Postale', 'LBP', 'PSSTFRPPXXX', (SELECT id FROM countries WHERE code = 'FRA'), true),

-- Japanese Banks
('Mitsubishi UFJ Financial Group', 'MUFG', 'BOTKJPJT', (SELECT id FROM countries WHERE code = 'JPN'), true),
('Sumitomo Mitsui Banking Corporation', 'SMBC', 'SMBCJPJT', (SELECT id FROM countries WHERE code = 'JPN'), true),
('Mizuho Bank', 'MIZUHO', 'MHCBJPJT', (SELECT id FROM countries WHERE code = 'JPN'), true),
('Japan Post Bank', 'JPB', 'JPPSJPJ1', (SELECT id FROM countries WHERE code = 'JPN'), true),

-- Chinese Banks
('Industrial and Commercial Bank of China', 'ICBC', 'ICBKCNBJ', (SELECT id FROM countries WHERE code = 'CHN'), true),
('China Construction Bank', 'CCB', 'PCBCCNBJ', (SELECT id FROM countries WHERE code = 'CHN'), true),
('Agricultural Bank of China', 'ABC', 'ABOCCNBJ', (SELECT id FROM countries WHERE code = 'CHN'), true),
('Bank of China', 'BOC', 'BKCHCNBJ', (SELECT id FROM countries WHERE code = 'CHN'), true),

-- Indian Banks
('State Bank of India', 'SBI', 'SBININBB', (SELECT id FROM countries WHERE code = 'IND'), true),
('HDFC Bank', 'HDFC', 'HDFCINBB', (SELECT id FROM countries WHERE code = 'IND'), true),
('ICICI Bank', 'ICICI', 'ICICINBB', (SELECT id FROM countries WHERE code = 'IND'), true),
('Axis Bank', 'AXIS', 'AXISINBB', (SELECT id FROM countries WHERE code = 'IND'), true),

-- Brazilian Banks
('Banco do Brasil', 'BB', 'BRASBRRJ', (SELECT id FROM countries WHERE code = 'BRA'), true),
('Itaú Unibanco', 'ITAU', 'ITAUBRSP', (SELECT id FROM countries WHERE code = 'BRA'), true),
('Bradesco', 'BRADESCO', 'BBDEBRSP', (SELECT id FROM countries WHERE code = 'BRA'), true),
('Santander Brasil', 'SANTBR', 'SANDBRRJ', (SELECT id FROM countries WHERE code = 'BRA'), true),

-- Nigerian Banks
('First Bank of Nigeria', 'FBN', 'FBNINGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('United Bank for Africa', 'UBA', 'UNAFNGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('Guaranty Trust Bank', 'GTB', 'GTBINGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('Access Bank', 'ACCESS', 'ABNGNGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('Zenith Bank', 'ZENITH', 'ZEIBNGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('First City Monument Bank', 'FCMB', 'FCMBNGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('Fidelity Bank', 'FIDELITY', 'FIDTNGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('Union Bank of Nigeria', 'UBN', 'UNIBNGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('Sterling Bank', 'STERLING', 'STBPNGLA', (SELECT id FROM countries WHERE code = 'NGA'), true),
('Wema Bank', 'WEMA', 'WEMANGLA', (SELECT id FROM countries WHERE code = 'NGA'), true)

ON CONFLICT DO NOTHING;

-- Create the detailed view (UUID compatible)
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

-- Create helper functions (UUID compatible)
CREATE OR REPLACE FUNCTION get_banks_by_country(country_code TEXT)
RETURNS TABLE(
    id UUID,
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
    p_bank_id UUID,
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
    p_account_id UUID
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Banking system setup completed successfully!';
    RAISE NOTICE 'Created/verified tables: countries, banks, user_bank_accounts';
    RAISE NOTICE 'Created view: user_bank_accounts_detailed';
    RAISE NOTICE 'Created functions: get_banks_by_country, validate_bank_account, set_primary_bank_account';
    RAISE NOTICE 'Inserted % countries and % banks', 
        (SELECT COUNT(*) FROM countries), 
        (SELECT COUNT(*) FROM banks);
END $$;