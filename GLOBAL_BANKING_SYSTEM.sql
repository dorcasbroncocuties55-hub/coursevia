-- Global Banking System with All Countries
-- This SQL creates a comprehensive banking system supporting all countries

-- Countries table with all the countries you listed
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(10),
    currency_code VARCHAR(3),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert all countries
INSERT INTO countries (code, name, phone_code, currency_code) VALUES
-- A
('AFG', 'Afghanistan', '+93', 'AFN'),
('ALB', 'Albania', '+355', 'ALL'),
('DZA', 'Algeria', '+213', 'DZD'),
('AND', 'Andorra', '+376', 'EUR'),
('AGO', 'Angola', '+244', 'AOA'),
('ATG', 'Antigua and Barbuda', '+1268', 'XCD'),
('ARG', 'Argentina', '+54', 'ARS'),
('ARM', 'Armenia', '+374', 'AMD'),
('AUS', 'Australia', '+61', 'AUD'),
('AUT', 'Austria', '+43', 'EUR'),
('AZE', 'Azerbaijan', '+994', 'AZN'),

-- B
('BHS', 'Bahamas', '+1242', 'BSD'),
('BHR', 'Bahrain', '+973', 'BHD'),
('BGD', 'Bangladesh', '+880', 'BDT'),
('BRB', 'Barbados', '+1246', 'BBD'),
('BLR', 'Belarus', '+375', 'BYN'),
('BEL', 'Belgium', '+32', 'EUR'),
('BLZ', 'Belize', '+501', 'BZD'),
('BEN', 'Benin', '+229', 'XOF'),
('BOL', 'Bolivia', '+591', 'BOB'),
('BIH', 'Bosnia and Herzegovina', '+387', 'BAM'),
('BWA', 'Botswana', '+267', 'BWP'),
('BRA', 'Brazil', '+55', 'BRL'),
('BRN', 'Brunei', '+673', 'BND'),
('BGR', 'Bulgaria', '+359', 'BGN'),
('BFA', 'Burkina Faso', '+226', 'XOF'),
('BDI', 'Burundi', '+257', 'BIF'),

-- C
('CPV', 'Cabo Verde', '+238', 'CVE'),
('KHM', 'Cambodia', '+855', 'KHR'),
('CMR', 'Cameroon', '+237', 'XAF'),
('CAN', 'Canada', '+1', 'CAD'),
('CYM', 'Cayman Islands', '+1345', 'KYD'),
('CAF', 'Central African Republic', '+236', 'XAF'),
('TCD', 'Chad', '+235', 'XAF'),
('CHL', 'Chile', '+56', 'CLP'),
('CHN', 'China', '+86', 'CNY'),
('COL', 'Colombia', '+57', 'COP'),
('COM', 'Comoros', '+269', 'KMF'),
('COG', 'Congo', '+242', 'XAF'),
('COK', 'Cook Islands', '+682', 'NZD'),
('CRI', 'Costa Rica', '+506', 'CRC'),
('CIV', 'Cote d''Ivoire', '+225', 'XOF'),
('HRV', 'Croatia', '+385', 'EUR'),
('CUB', 'Cuba', '+53', 'CUP'),
('CYP', 'Cyprus', '+357', 'EUR'),
('CZE', 'Czechia', '+420', 'CZK'),

-- D
('COD', 'Democratic Republic of the Congo', '+243', 'CDF'),
('DNK', 'Denmark', '+45', 'DKK'),
('DJI', 'Djibouti', '+253', 'DJF'),
('DMA', 'Dominica', '+1767', 'XCD'),
('DOM', 'Dominican Republic', '+1809', 'DOP'),

-- E
('ECU', 'Ecuador', '+593', 'USD'),
('EGY', 'Egypt', '+20', 'EGP'),
('SLV', 'El Salvador', '+503', 'USD'),
('GNQ', 'Equatorial Guinea', '+240', 'XAF'),
('ERI', 'Eritrea', '+291', 'ERN'),
('EST', 'Estonia', '+372', 'EUR'),
('SWZ', 'Eswatini', '+268', 'SZL'),
('ETH', 'Ethiopia', '+251', 'ETB'),

-- F
('FJI', 'Fiji', '+679', 'FJD'),
('FIN', 'Finland', '+358', 'EUR'),
('FRA', 'France', '+33', 'EUR'),

-- G
('GAB', 'Gabon', '+241', 'XAF'),
('GMB', 'Gambia', '+220', 'GMD'),
('GEO', 'Georgia', '+995', 'GEL'),
('DEU', 'Germany', '+49', 'EUR'),
('GHA', 'Ghana', '+233', 'GHS'),
('GRC', 'Greece', '+30', 'EUR'),
('GRD', 'Grenada', '+1473', 'XCD'),
('GTM', 'Guatemala', '+502', 'GTQ'),
('GIN', 'Guinea', '+224', 'GNF'),
('GNB', 'Guinea-Bissau', '+245', 'XOF'),
('GUY', 'Guyana', '+592', 'GYD'),

-- H
('HTI', 'Haiti', '+509', 'HTG'),
('HND', 'Honduras', '+504', 'HNL'),
('HUN', 'Hungary', '+36', 'HUF'),

-- I
('ISL', 'Iceland', '+354', 'ISK'),
('IND', 'India', '+91', 'INR'),
('IDN', 'Indonesia', '+62', 'IDR'),
('IRN', 'Iran', '+98', 'IRR'),
('IRQ', 'Iraq', '+964', 'IQD'),
('IRL', 'Ireland', '+353', 'EUR'),
('ISR', 'Israel', '+972', 'ILS'),
('ITA', 'Italy', '+39', 'EUR'),

-- J
('JAM', 'Jamaica', '+1876', 'JMD'),
('JPN', 'Japan', '+81', 'JPY'),
('JOR', 'Jordan', '+962', 'JOD'),

-- K
('KAZ', 'Kazakhstan', '+7', 'KZT'),
('KEN', 'Kenya', '+254', 'KES'),
('KIR', 'Kiribati', '+686', 'AUD'),
('XKX', 'Kosovo', '+383', 'EUR'),
('KWT', 'Kuwait', '+965', 'KWD'),
('KGZ', 'Kyrgyzstan', '+996', 'KGS'),

-- L
('LAO', 'Laos', '+856', 'LAK'),
('LVA', 'Latvia', '+371', 'EUR'),
('LBN', 'Lebanon', '+961', 'LBP'),
('LSO', 'Lesotho', '+266', 'LSL'),
('LBR', 'Liberia', '+231', 'LRD'),
('LBY', 'Libya', '+218', 'LYD'),
('LIE', 'Liechtenstein', '+423', 'CHF'),
('LTU', 'Lithuania', '+370', 'EUR'),
('LUX', 'Luxembourg', '+352', 'EUR'),

-- M
('MDG', 'Madagascar', '+261', 'MGA'),
('MWI', 'Malawi', '+265', 'MWK'),
('MYS', 'Malaysia', '+60', 'MYR'),
('MDV', 'Maldives', '+960', 'MVR'),
('MLI', 'Mali', '+223', 'XOF'),
('MLT', 'Malta', '+356', 'EUR'),
('MHL', 'Marshall Islands', '+692', 'USD'),
('MRT', 'Mauritania', '+222', 'MRU'),
('MUS', 'Mauritius', '+230', 'MUR'),
('MEX', 'Mexico', '+52', 'MXN'),
('FSM', 'Micronesia', '+691', 'USD'),
('MDA', 'Moldova', '+373', 'MDL'),
('MCO', 'Monaco', '+377', 'EUR'),
('MNG', 'Mongolia', '+976', 'MNT'),
('MNE', 'Montenegro', '+382', 'EUR'),
('MAR', 'Morocco', '+212', 'MAD'),
('MOZ', 'Mozambique', '+258', 'MZN'),

-- N
('NAM', 'Namibia', '+264', 'NAD'),
('NRU', 'Nauru', '+674', 'AUD'),
('NPL', 'Nepal', '+977', 'NPR'),
('NLD', 'Netherlands', '+31', 'EUR'),
('NZL', 'New Zealand', '+64', 'NZD'),
('NIC', 'Nicaragua', '+505', 'NIO'),
('NER', 'Niger', '+227', 'XOF'),
('NGA', 'Nigeria', '+234', 'NGN'),
('NIU', 'Niue', '+683', 'NZD'),
('MKD', 'North Macedonia', '+389', 'MKD'),
('NOR', 'Norway', '+47', 'NOK'),

-- O
('OMN', 'Oman', '+968', 'OMR'),

-- P
('PAK', 'Pakistan', '+92', 'PKR'),
('PLW', 'Palau', '+680', 'USD'),
('PAN', 'Panama', '+507', 'PAB'),
('PNG', 'Papua New Guinea', '+675', 'PGK'),
('PRY', 'Paraguay', '+595', 'PYG'),
('PER', 'Peru', '+51', 'PEN'),
('PHL', 'Philippines', '+63', 'PHP'),
('POL', 'Poland', '+48', 'PLN'),
('PRT', 'Portugal', '+351', 'EUR'),

-- Q
('QAT', 'Qatar', '+974', 'QAR'),

-- R
('KOR', 'Republic of Korea (South Korea)', '+82', 'KRW'),
('ROU', 'Romania', '+40', 'RON'),
('RUS', 'Russia', '+7', 'RUB'),
('RWA', 'Rwanda', '+250', 'RWF'),

-- S
('KNA', 'Saint Kitts and Nevis', '+1869', 'XCD'),
('LCA', 'Saint Lucia', '+1758', 'XCD'),
('VCT', 'Saint Vincent and the Grenadines', '+1784', 'XCD'),
('WSM', 'Samoa', '+685', 'WST'),
('SMR', 'San Marino', '+378', 'EUR'),
('STP', 'Sao Tome and Principe', '+239', 'STN'),
('SAU', 'Saudi Arabia', '+966', 'SAR'),
('SEN', 'Senegal', '+221', 'XOF'),
('SRB', 'Serbia', '+381', 'RSD'),
('SYC', 'Seychelles', '+248', 'SCR'),
('SLE', 'Sierra Leone', '+232', 'SLL'),
('SGP', 'Singapore', '+65', 'SGD'),
('SVK', 'Slovakia', '+421', 'EUR'),
('SVN', 'Slovenia', '+386', 'EUR'),
('SLB', 'Solomon Islands', '+677', 'SBD'),
('SOM', 'Somalia', '+252', 'SOS'),
('ZAF', 'South Africa', '+27', 'ZAR'),
('SSD', 'South Sudan', '+211', 'SSP'),
('ESP', 'Spain', '+34', 'EUR'),
('LKA', 'Sri Lanka', '+94', 'LKR'),
('SDN', 'Sudan', '+249', 'SDG'),
('SUR', 'Suriname', '+597', 'SRD'),
('SWE', 'Sweden', '+46', 'SEK'),
('CHE', 'Switzerland', '+41', 'CHF'),
('SYR', 'Syria', '+963', 'SYP'),

-- T
('TJK', 'Tajikistan', '+992', 'TJS'),
('TZA', 'Tanzania', '+255', 'TZS'),
('THA', 'Thailand', '+66', 'THB'),
('TLS', 'Timor-Leste', '+670', 'USD'),
('TGO', 'Togo', '+228', 'XOF'),
('TON', 'Tonga', '+676', 'TOP'),
('TTO', 'Trinidad and Tobago', '+1868', 'TTD'),
('TUN', 'Tunisia', '+216', 'TND'),
('TUR', 'Turkey', '+90', 'TRY'),
('TKM', 'Turkmenistan', '+993', 'TMT'),
('TUV', 'Tuvalu', '+688', 'AUD'),

-- U
('UGA', 'Uganda', '+256', 'UGX'),
('UKR', 'Ukraine', '+380', 'UAH'),
('ARE', 'United Arab Emirates', '+971', 'AED'),
('GBR', 'United Kingdom', '+44', 'GBP'),
('USA', 'United States', '+1', 'USD'),
('URY', 'Uruguay', '+598', 'UYU'),
('UZB', 'Uzbekistan', '+998', 'UZS'),

-- V
('VUT', 'Vanuatu', '+678', 'VUV'),
('VEN', 'Venezuela', '+58', 'VES'),
('VNM', 'Vietnam', '+84', 'VND'),

-- Y
('YEM', 'Yemen', '+967', 'YER'),

-- Z
('ZMB', 'Zambia', '+260', 'ZMW'),
('ZWE', 'Zimbabwe', '+263', 'ZWL')

ON CONFLICT (code) DO NOTHING;

-- Banks table with major banks for each country
CREATE TABLE IF NOT EXISTS banks (
    id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES countries(id),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20),
    swift_code VARCHAR(11),
    routing_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    supports_international BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert major banks for key countries
INSERT INTO banks (country_id, name, code, swift_code, supports_international) VALUES
-- United States
((SELECT id FROM countries WHERE code = 'USA'), 'JPMorgan Chase Bank', 'CHASE', 'CHASUS33', true),
((SELECT id FROM countries WHERE code = 'USA'), 'Bank of America', 'BOA', 'BOFAUS3N', true),
((SELECT id FROM countries WHERE code = 'USA'), 'Wells Fargo Bank', 'WF', 'WFBIUS6S', true),
((SELECT id FROM countries WHERE code = 'USA'), 'Citibank', 'CITI', 'CITIUS33', true),
((SELECT id FROM countries WHERE code = 'USA'), 'Goldman Sachs Bank', 'GS', 'GSSBUSNY', true),

-- United Kingdom
((SELECT id FROM countries WHERE code = 'GBR'), 'Barclays Bank', 'BARC', 'BARCGB22', true),
((SELECT id FROM countries WHERE code = 'GBR'), 'HSBC Bank', 'HSBC', 'HBUKGB4B', true),
((SELECT id FROM countries WHERE code = 'GBR'), 'Lloyds Bank', 'LLOY', 'LOYDGB2L', true),
((SELECT id FROM countries WHERE code = 'GBR'), 'Royal Bank of Scotland', 'RBS', 'RBOSGB2L', true),
((SELECT id FROM countries WHERE code = 'GBR'), 'Santander UK', 'SANT', 'ABBYGB2L', true),

-- Germany
((SELECT id FROM countries WHERE code = 'DEU'), 'Deutsche Bank', 'DB', 'DEUTDEFF', true),
((SELECT id FROM countries WHERE code = 'DEU'), 'Commerzbank', 'CBK', 'COBADEFF', true),
((SELECT id FROM countries WHERE code = 'DEU'), 'DZ Bank', 'DZ', 'GENODED1DZ', true),
((SELECT id FROM countries WHERE code = 'DEU'), 'KfW Bank', 'KFW', 'KFWIDEFF', true),

-- France
((SELECT id FROM countries WHERE code = 'FRA'), 'BNP Paribas', 'BNP', 'BNPAFRPP', true),
((SELECT id FROM countries WHERE code = 'FRA'), 'Crédit Agricole', 'CA', 'AGRIFRPP', true),
((SELECT id FROM countries WHERE code = 'FRA'), 'Société Générale', 'SG', 'SOGEFRPP', true),
((SELECT id FROM countries WHERE code = 'FRA'), 'Crédit Mutuel', 'CM', 'CMCIFRPP', true),

-- Japan
((SELECT id FROM countries WHERE code = 'JPN'), 'Mitsubishi UFJ Bank', 'MUFG', 'BOTKJPJT', true),
((SELECT id FROM countries WHERE code = 'JPN'), 'Sumitomo Mitsui Banking', 'SMBC', 'SMBCJPJT', true),
((SELECT id FROM countries WHERE code = 'JPN'), 'Mizuho Bank', 'MHBK', 'MHCBJPJT', true),

-- China
((SELECT id FROM countries WHERE code = 'CHN'), 'Industrial and Commercial Bank of China', 'ICBC', 'ICBKCNBJ', true),
((SELECT id FROM countries WHERE code = 'CHN'), 'China Construction Bank', 'CCB', 'PCBCCNBJ', true),
((SELECT id FROM countries WHERE code = 'CHN'), 'Agricultural Bank of China', 'ABC', 'ABOCCNBJ', true),
((SELECT id FROM countries WHERE code = 'CHN'), 'Bank of China', 'BOC', 'BKCHCNBJ', true),

-- Canada
((SELECT id FROM countries WHERE code = 'CAN'), 'Royal Bank of Canada', 'RBC', 'ROYCCAT2', true),
((SELECT id FROM countries WHERE code = 'CAN'), 'Toronto-Dominion Bank', 'TD', 'TDOMCATTTOR', true),
((SELECT id FROM countries WHERE code = 'CAN'), 'Bank of Nova Scotia', 'BNS', 'NOSCCATT', true),
((SELECT id FROM countries WHERE code = 'CAN'), 'Bank of Montreal', 'BMO', 'BOFMCAM2', true),

-- Australia
((SELECT id FROM countries WHERE code = 'AUS'), 'Commonwealth Bank', 'CBA', 'CTBAAU2S', true),
((SELECT id FROM countries WHERE code = 'AUS'), 'Australia and New Zealand Banking Group', 'ANZ', 'ANZBAU3M', true),
((SELECT id FROM countries WHERE code = 'AUS'), 'Westpac Banking Corporation', 'WBC', 'WPACAU2S', true),
((SELECT id FROM countries WHERE code = 'AUS'), 'National Australia Bank', 'NAB', 'NATAAU33', true),

-- India
((SELECT id FROM countries WHERE code = 'IND'), 'State Bank of India', 'SBI', 'SBININBB', true),
((SELECT id FROM countries WHERE code = 'IND'), 'HDFC Bank', 'HDFC', 'HDFCINBB', true),
((SELECT id FROM countries WHERE code = 'IND'), 'ICICI Bank', 'ICICI', 'ICICINBB', true),
((SELECT id FROM countries WHERE code = 'IND'), 'Punjab National Bank', 'PNB', 'PUNBINBB', true),

-- Nigeria
((SELECT id FROM countries WHERE code = 'NGA'), 'First Bank of Nigeria', 'FBN', 'FBNINGLA', true),
((SELECT id FROM countries WHERE code = 'NGA'), 'United Bank for Africa', 'UBA', 'UNAFNGLA', true),
((SELECT id FROM countries WHERE code = 'NGA'), 'Guaranty Trust Bank', 'GTB', 'GTBINGLA', true),
((SELECT id FROM countries WHERE code = 'NGA'), 'Access Bank', 'ACCESS', 'ABNGNGLA', true),
((SELECT id FROM countries WHERE code = 'NGA'), 'Zenith Bank', 'ZENITH', 'ZEIBNGLA', true),

-- South Africa
((SELECT id FROM countries WHERE code = 'ZAF'), 'Standard Bank', 'SB', 'SBZAZAJJ', true),
((SELECT id FROM countries WHERE code = 'ZAF'), 'FirstRand Bank', 'FNB', 'FIRNZAJJ', true),
((SELECT id FROM countries WHERE code = 'ZAF'), 'ABSA Bank', 'ABSA', 'ABSAZAJJ', true),
((SELECT id FROM countries WHERE code = 'ZAF'), 'Nedbank', 'NED', 'NEDSZAJJ', true),

-- Brazil
((SELECT id FROM countries WHERE code = 'BRA'), 'Banco do Brasil', 'BB', 'BRASBRRJ', true),
((SELECT id FROM countries WHERE code = 'BRA'), 'Itaú Unibanco', 'ITAU', 'ITAUBRSP', true),
((SELECT id FROM countries WHERE code = 'BRA'), 'Bradesco', 'BRAD', 'BBDEBRSP', true),
((SELECT id FROM countries WHERE code = 'BRA'), 'Santander Brasil', 'SANT', 'BSCHBRSP', true),

-- Add more banks for other major countries as needed
-- Switzerland
((SELECT id FROM countries WHERE code = 'CHE'), 'UBS', 'UBS', 'UBSWCHZH', true),
((SELECT id FROM countries WHERE code = 'CHE'), 'Credit Suisse', 'CS', 'CRESCHZZ', true),

-- Netherlands
((SELECT id FROM countries WHERE code = 'NLD'), 'ING Bank', 'ING', 'INGBNL2A', true),
((SELECT id FROM countries WHERE code = 'NLD'), 'ABN AMRO Bank', 'ABN', 'ABNANL2A', true),

-- Spain
((SELECT id FROM countries WHERE code = 'ESP'), 'Banco Santander', 'SAN', 'BSCHESMM', true),
((SELECT id FROM countries WHERE code = 'ESP'), 'Banco Bilbao Vizcaya Argentaria', 'BBVA', 'BBVAESMM', true),

-- Italy
((SELECT id FROM countries WHERE code = 'ITA'), 'UniCredit', 'UCG', 'UNCRITMM', true),
((SELECT id FROM countries WHERE code = 'ITA'), 'Intesa Sanpaolo', 'ISP', 'BCITITMM', true)

ON CONFLICT DO NOTHING;

-- User bank accounts table
CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    bank_id INTEGER REFERENCES banks(id),
    account_holder_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    routing_number VARCHAR(50),
    swift_code VARCHAR(11),
    iban VARCHAR(34),
    account_type VARCHAR(20) DEFAULT 'checking', -- checking, savings, business
    currency VARCHAR(3) NOT NULL,
    country_id INTEGER REFERENCES countries(id),
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    verification_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, account_number, bank_id)
);

-- Bank account verification documents
CREATE TABLE IF NOT EXISTS bank_verification_documents (
    id SERIAL PRIMARY KEY,
    bank_account_id INTEGER REFERENCES user_bank_accounts(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- bank_statement, void_check, letter
    document_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' -- pending, approved, rejected
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);
CREATE INDEX IF NOT EXISTS idx_banks_country_id ON banks(country_id);
CREATE INDEX IF NOT EXISTS idx_banks_swift_code ON banks(swift_code);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_bank_id ON user_bank_accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_country_id ON user_bank_accounts(country_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_is_primary ON user_bank_accounts(is_primary);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_verification_status ON user_bank_accounts(verification_status);

-- Function to get banks by country
CREATE OR REPLACE FUNCTION get_banks_by_country(country_code VARCHAR(3))
RETURNS TABLE (
    bank_id INTEGER,
    bank_name VARCHAR(200),
    bank_code VARCHAR(20),
    swift_code VARCHAR(11),
    supports_international BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.code,
        b.swift_code,
        b.supports_international
    FROM banks b
    JOIN countries c ON b.country_id = c.id
    WHERE c.code = country_code AND b.is_active = true
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

-- Function to validate bank account
CREATE OR REPLACE FUNCTION validate_bank_account(
    p_user_id UUID,
    p_bank_id INTEGER,
    p_account_number VARCHAR(100),
    p_account_holder_name VARCHAR(200)
)
RETURNS BOOLEAN AS $$
DECLARE
    account_exists BOOLEAN := false;
BEGIN
    -- Check if account already exists for this user
    SELECT EXISTS(
        SELECT 1 FROM user_bank_accounts 
        WHERE user_id = p_user_id 
        AND bank_id = p_bank_id 
        AND account_number = p_account_number
    ) INTO account_exists;
    
    -- Return false if account already exists
    IF account_exists THEN
        RETURN false;
    END IF;
    
    -- Additional validation logic can be added here
    -- For now, just check basic requirements
    IF LENGTH(p_account_number) < 5 OR LENGTH(p_account_holder_name) < 2 THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to set primary bank account
CREATE OR REPLACE FUNCTION set_primary_bank_account(
    p_user_id UUID,
    p_account_id INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    -- First, unset all primary accounts for this user
    UPDATE user_bank_accounts 
    SET is_primary = false 
    WHERE user_id = p_user_id;
    
    -- Then set the specified account as primary
    UPDATE user_bank_accounts 
    SET is_primary = true 
    WHERE id = p_account_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- View for user bank accounts with bank and country details
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

-- Sample data for testing (optional)
-- You can uncomment this to add some test data
/*
INSERT INTO user_bank_accounts (user_id, bank_id, account_holder_name, account_number, currency, country_id) VALUES
('00000000-0000-0000-0000-000000000001', 1, 'John Doe', '1234567890', 'USD', (SELECT id FROM countries WHERE code = 'USA')),
('00000000-0000-0000-0000-000000000001', 5, 'John Doe', '0987654321', 'USD', (SELECT id FROM countries WHERE code = 'USA'));
*/