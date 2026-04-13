-- ============================================================================
-- MANAGE COURSE CATEGORIES
-- ============================================================================

-- ── DELETE ALL CATEGORIES ──────────────────────────────────────────────────
-- TRUNCATE TABLE categories;

-- ── DELETE ONE CATEGORY ────────────────────────────────────────────────────
-- DELETE FROM categories WHERE name = 'Therapy';

-- ── ADD COURSE CATEGORIES ──────────────────────────────────────────────────
INSERT INTO categories (name, slug) VALUES
    ('Development',          'development'),
    ('Business',             'business'),
    ('Design',               'design'),
    ('Marketing',            'marketing'),
    ('Finance',              'finance'),
    ('Health & Wellness',    'health-wellness'),
    ('Technology',           'technology'),
    ('Personal Development', 'personal-development'),
    ('Photography',          'photography'),
    ('Music',                'music'),
    ('Language',             'language'),
    ('Data Science',         'data-science'),
    ('Cybersecurity',        'cybersecurity'),
    ('Cloud Computing',      'cloud-computing'),
    ('AI & Machine Learning','ai-machine-learning'),
    ('Entrepreneurship',     'entrepreneurship'),
    ('Leadership',           'leadership'),
    ('Communication',        'communication')
ON CONFLICT (slug) DO NOTHING;

-- ── VIEW ALL CATEGORIES ────────────────────────────────────────────────────
SELECT id, name, slug FROM categories ORDER BY name;

SELECT '✅ Categories ready!' as status;
