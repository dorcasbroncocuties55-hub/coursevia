-- Fix PayPal Form and Add More Countries for Global Withdrawals
-- Fixed: swift_code values truncated to fit varchar(11) limit

-- Check current PayPal banks
SELECT 'Current PayPal banks:' as info, code, name FROM banks WHERE code LIKE 'PAYPAL%';

-- Add more countries for global withdrawal support
INSERT INTO banking_countries (code, name, phone_code, currency_code) VALUES
-- Europe
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
('GRC', 'Greece', '+30', 'EUR'),
('PRT', 'Portugal', '+351', 'EUR'),
('IRL', 'Ireland', '+353', 'EUR'),
-- Asia Pacific
('KOR', 'South Korea', '+82', 'KRW'),
('THA', 'Thailand', '+66', 'THB'),
('VNM', 'Vietnam', '+84', 'VND'),
('MYS', 'Malaysia', '+60', 'MYR'),
('SGP', 'Singapore', '+65', 'SGD'),
('IDN', 'Indonesia', '+62', 'IDR'),
('PHL', 'Philippines', '+63', 'PHP'),
('HKG', 'Hong Kong', '+852', 'HKD'),
('TWN', 'Taiwan', '+886', 'TWD'),
('NZL', 'New Zealand', '+64', 'NZD'),
-- Middle East & Africa
('ARE', 'United Arab Emirates', '+971', 'AED'),
('SAU', 'Saudi Arabia', '+966', 'SAR'),
('ISR', 'Israel', '+972', 'ILS'),
('TUR', 'Turkey', '+90', 'TRY'),
('ZAF', 'South Africa', '+27', 'ZAR'),
('KEN', 'Kenya', '+254', 'KES'),
('TZA', 'Tanzania', '+255', 'TZS'),
('RWA', 'Rwanda', '+250', 'RWF'),
('SEN', 'Senegal', '+221', 'XOF'),
('CIV', 'Ivory Coast', '+225', 'XOF'),
('CMR', 'Cameroon', '+237', 'XAF'),
-- Latin America
('MEX', 'Mexico', '+52', 'MXN'),
('ARG', 'Argentina', '+54', 'ARS'),
('CHL', 'Chile', '+56', 'CLP'),
('COL', 'Colombia', '+57', 'COP'),
('PER', 'Peru', '+51', 'PEN'),
('URY', 'Uruguay', '+598', 'UYU'),
('ECU', 'Ecuador', '+593', 'USD'),
('BOL', 'Bolivia', '+591', 'BOB'),
('PRY', 'Paraguay', '+595', 'PYG'),
('VEN', 'Venezuela', '+58', 'VES'),
('CRI', 'Costa Rica', '+506', 'CRC'),
('GTM', 'Guatemala', '+502', 'GTQ'),
('PAN', 'Panama', '+507', 'PAB'),
('DOM', 'Dominican Republic', '+1809', 'DOP'),
('JAM', 'Jamaica', '+1876', 'JMD'),
-- More African Countries
('DZA', 'Algeria', '+213', 'DZD'),
('MAR', 'Morocco', '+212', 'MAD'),
('TUN', 'Tunisia', '+216', 'TND'),
('LBY', 'Libya', '+218', 'LYD'),
('SDN', 'Sudan', '+249', 'SDG'),
('ETH', 'Ethiopia', '+251', 'ETB'),
('UGA', 'Uganda', '+256', 'UGX'),
('ZWE', 'Zimbabwe', '+263', 'ZWL'),
('BWA', 'Botswana', '+267', 'BWP'),
('NAM', 'Namibia', '+264', 'NAD'),
('ZMB', 'Zambia', '+260', 'ZMW'),
('MOZ', 'Mozambique', '+258', 'MZN'),
('MDG', 'Madagascar', '+261', 'MGA'),
('MUS', 'Mauritius', '+230', 'MUR'),
-- Caribbean & Others
('TTO', 'Trinidad and Tobago', '+1868', 'TTD'),
('BRB', 'Barbados', '+1246', 'BBD'),
('BHS', 'Bahamas', '+1242', 'BSD'),
('BMU', 'Bermuda', '+1441', 'BMD'),
('CYM', 'Cayman Islands', '+1345', 'KYD'),
('VGB', 'British Virgin Islands', '+1284', 'USD'),
-- Eastern Europe & Central Asia
('RUS', 'Russia', '+7', 'RUB'),
('UKR', 'Ukraine', '+380', 'UAH'),
('BLR', 'Belarus', '+375', 'BYN'),
('KAZ', 'Kazakhstan', '+7', 'KZT'),
('UZB', 'Uzbekistan', '+998', 'UZS'),
('GEO', 'Georgia', '+995', 'GEL'),
('ARM', 'Armenia', '+374', 'AMD'),
('AZE', 'Azerbaijan', '+994', 'AZN'),
-- Pacific
('FJI', 'Fiji', '+679', 'FJD'),
('PNG', 'Papua New Guinea', '+675', 'PGK'),
('VUT', 'Vanuatu', '+678', 'VUV'),
('SLB', 'Solomon Islands', '+677', 'SBD'),
('TON', 'Tonga', '+676', 'TOP'),
('WSM', 'Samoa', '+685', 'WST')
ON CONFLICT (code) DO NOTHING;

-- Add PayPal and international banks
-- NOTE: swift_code is varchar(11), so values are kept to 11 chars max
INSERT INTO banks (name, code, swift_code, country_name, supports_international) VALUES
('PayPal Global',              'PAYPAL',     'PAYPALGLBL',  'Global',                true),
('PayPal Europe',              'PAYPAL_EU',  'PAYPALEU',    'Europe',                true),
('PayPal Asia Pacific',        'PAYPAL_APAC','PAYPALAPAC',  'Asia Pacific',          true),
('PayPal Latin America',       'PAYPAL_LATM','PAYPALLAT',   'Latin America',         true),
('PayPal Middle East Africa',  'PAYPAL_MEA', 'PAYPALMEA',   'Middle East & Africa',  true),
('HSBC International',         'HSBC_INTL',  'HBUKGB4B',   'Global',                true),
('Citibank International',     'CITI_INTL',  'CITIUS33',    'Global',                true),
('Standard Chartered',         'STANCHART',  'SCBLGB2L',    'Global',                true),
('JPMorgan Chase Intl',        'JPMC_INTL',  'CHASUS33',    'Global',                true),
('Santander',                  'SANTANDER',  'BSCHESMM',    'Spain',                 true),
('UniCredit',                  'UNICREDIT',  'UNCRITMM',    'Italy',                 true),
('ING Bank',                   'ING',        'INGBNL2A',    'Netherlands',           true),
('Credit Suisse',              'CS',         'CRESCHZZ',    'Switzerland',           true),
('UBS',                        'UBS',        'UBSWCHZH',    'Switzerland',           true),
('DBS Bank',                   'DBS',        'DBSSSGSG',    'Singapore',             true),
('OCBC Bank',                  'OCBC',       'OCBCSGSG',    'Singapore',             true),
('Bank of Tokyo-MUFG',         'BTMU',       'BOTKJPJT',    'Japan',                 true),
('Sumitomo Mitsui',            'SMBC',       'SMBCJPJT',    'Japan',                 true),
('Emirates NBD',               'ENBD',       'EBILAEAD',    'United Arab Emirates',  true),
('Qatar National Bank',        'QNB',        'QNBKQAQA',    'Qatar',                 true),
('Saudi British Bank',         'SABB',       'SABBSARI',    'Saudi Arabia',          true),
('Standard Bank SA',           'SBSA',       'SBZAZAJJ',    'South Africa',          true),
('FirstRand Bank',             'FNB',        'FIRNZAJJ',    'South Africa',          true),
('Equity Bank Kenya',          'EQUITY',     'EQBLKENA',    'Kenya',                 true),
('KCB Bank',                   'KCB',        'KCBLKENX',    'Kenya',                 true),
('Santander Mexico',           'SANTMX',     'BMSXMXMM',    'Mexico',                true),
('BBVA Mexico',                'BBVAMX',     'BCMRMXMM',    'Mexico',                true),
('Banco de Chile',             'BCH',        'BCHICLRM',    'Chile',                 true),
('Bancolombia',                'BANCOL',     'COLOCOBM',    'Colombia',              true),
('Banco do Brasil Intl',       'BB_INTL',    'BRASBRRJ',    'Brazil',                true)
ON CONFLICT DO NOTHING;

-- Results
SELECT 'Total countries:' as info, COUNT(*) as count FROM banking_countries WHERE is_active = true;
SELECT 'Total banks:' as info, COUNT(*) as count FROM banks WHERE is_active = true;
SELECT 'PayPal options:' as info, COUNT(*) as count FROM banks WHERE code LIKE 'PAYPAL%';
SELECT 'PayPal Global bank:' as test, id, name, code FROM banks WHERE code = 'PAYPAL';
