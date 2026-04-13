-- ============================================================================
-- FIX DUPLICATE COUNTRIES - Complete rebuild
-- ============================================================================

-- Delete ALL countries
TRUNCATE TABLE banking_countries;

-- Insert fresh list (no duplicates)
INSERT INTO banking_countries (code, name, currency_code, phone_code, is_active) VALUES
    ('US', 'United States', 'USD', '+1', true),
    ('GB', 'United Kingdom', 'GBP', '+44', true),
    ('CA', 'Canada', 'CAD', '+1', true),
    ('AU', 'Australia', 'AUD', '+61', true),
    ('DE', 'Germany', 'EUR', '+49', true),
    ('FR', 'France', 'EUR', '+33', true),
    ('IT', 'Italy', 'EUR', '+39', true),
    ('ES', 'Spain', 'EUR', '+34', true),
    ('NL', 'Netherlands', 'EUR', '+31', true),
    ('BE', 'Belgium', 'EUR', '+32', true),
    ('CH', 'Switzerland', 'CHF', '+41', true),
    ('SE', 'Sweden', 'SEK', '+46', true),
    ('NO', 'Norway', 'NOK', '+47', true),
    ('DK', 'Denmark', 'DKK', '+45', true),
    ('FI', 'Finland', 'EUR', '+358', true),
    ('IE', 'Ireland', 'EUR', '+353', true),
    ('AT', 'Austria', 'EUR', '+43', true),
    ('PT', 'Portugal', 'EUR', '+351', true),
    ('GR', 'Greece', 'EUR', '+30', true),
    ('PL', 'Poland', 'PLN', '+48', true),
    ('CZ', 'Czech Republic', 'CZK', '+420', true),
    ('HU', 'Hungary', 'HUF', '+36', true),
    ('RO', 'Romania', 'RON', '+40', true),
    ('BG', 'Bulgaria', 'BGN', '+359', true),
    ('HR', 'Croatia', 'EUR', '+385', true),
    ('SK', 'Slovakia', 'EUR', '+421', true),
    ('SI', 'Slovenia', 'EUR', '+386', true),
    ('LT', 'Lithuania', 'EUR', '+370', true),
    ('LV', 'Latvia', 'EUR', '+371', true),
    ('EE', 'Estonia', 'EUR', '+372', true),
    ('IS', 'Iceland', 'ISK', '+354', true),
    ('JP', 'Japan', 'JPY', '+81', true),
    ('CN', 'China', 'CNY', '+86', true),
    ('IN', 'India', 'INR', '+91', true),
    ('SG', 'Singapore', 'SGD', '+65', true),
    ('HK', 'Hong Kong', 'HKD', '+852', true),
    ('KR', 'South Korea', 'KRW', '+82', true),
    ('MY', 'Malaysia', 'MYR', '+60', true),
    ('TH', 'Thailand', 'THB', '+66', true),
    ('ID', 'Indonesia', 'IDR', '+62', true),
    ('PH', 'Philippines', 'PHP', '+63', true),
    ('VN', 'Vietnam', 'VND', '+84', true),
    ('TW', 'Taiwan', 'TWD', '+886', true),
    ('NZ', 'New Zealand', 'NZD', '+64', true),
    ('ZA', 'South Africa', 'ZAR', '+27', true),
    ('BR', 'Brazil', 'BRL', '+55', true),
    ('MX', 'Mexico', 'MXN', '+52', true),
    ('AR', 'Argentina', 'ARS', '+54', true),
    ('CL', 'Chile', 'CLP', '+56', true),
    ('CO', 'Colombia', 'COP', '+57', true),
    ('PE', 'Peru', 'PEN', '+51', true),
    ('VE', 'Venezuela', 'VES', '+58', true),
    ('EC', 'Ecuador', 'USD', '+593', true),
    ('UY', 'Uruguay', 'UYU', '+598', true),
    ('AE', 'United Arab Emirates', 'AED', '+971', true),
    ('SA', 'Saudi Arabia', 'SAR', '+966', true),
    ('IL', 'Israel', 'ILS', '+972', true),
    ('TR', 'Turkey', 'TRY', '+90', true),
    ('EG', 'Egypt', 'EGP', '+20', true),
    ('NG', 'Nigeria', 'NGN', '+234', true),
    ('KE', 'Kenya', 'KES', '+254', true),
    ('GH', 'Ghana', 'GHS', '+233', true),
    ('MA', 'Morocco', 'MAD', '+212', true),
    ('TN', 'Tunisia', 'TND', '+216', true),
    ('DZ', 'Algeria', 'DZD', '+213', true),
    ('RU', 'Russia', 'RUB', '+7', true),
    ('UA', 'Ukraine', 'UAH', '+380', true),
    ('BY', 'Belarus', 'BYN', '+375', true),
    ('KZ', 'Kazakhstan', 'KZT', '+7', true),
    ('PK', 'Pakistan', 'PKR', '+92', true),
    ('BD', 'Bangladesh', 'BDT', '+880', true),
    ('LK', 'Sri Lanka', 'LKR', '+94', true),
    ('NP', 'Nepal', 'NPR', '+977', true),
    ('MM', 'Myanmar', 'MMK', '+95', true);

-- Verify no duplicates
SELECT 
    'Total countries:' as check_type, 
    COUNT(*)::text as result 
FROM banking_countries;

SELECT 
    'Duplicate check:' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No duplicates'
        ELSE '❌ ' || COUNT(*)::text || ' duplicates found'
    END as result
FROM (
    SELECT code, COUNT(*) as cnt 
    FROM banking_countries 
    GROUP BY code 
    HAVING COUNT(*) > 1
) dups;

SELECT '✅ Countries fixed! No more duplicates.' as status;
