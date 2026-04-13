-- ============================================================================
-- FIX SERVICES TABLES - Coach and Therapist services
-- ============================================================================

-- ============================================================================
-- 1. COACH SERVICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS coach_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_services_coach_id ON coach_services(coach_id);

ALTER TABLE coach_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active coach services" ON coach_services;
DROP POLICY IF EXISTS "Coaches can manage their own services" ON coach_services;
DROP POLICY IF EXISTS "Coaches can insert services" ON coach_services;
DROP POLICY IF EXISTS "Coaches can update services" ON coach_services;
DROP POLICY IF EXISTS "Coaches can delete services" ON coach_services;

CREATE POLICY "Anyone can view active coach services" ON coach_services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Coaches can insert services" ON coach_services
    FOR INSERT WITH CHECK (
        coach_id IN (
            SELECT id FROM coach_profiles WHERE user_id = auth.uid()
        ) OR coach_id = auth.uid()
    );

CREATE POLICY "Coaches can update services" ON coach_services
    FOR UPDATE USING (
        coach_id IN (
            SELECT id FROM coach_profiles WHERE user_id = auth.uid()
        ) OR coach_id = auth.uid()
    );

CREATE POLICY "Coaches can delete services" ON coach_services
    FOR DELETE USING (
        coach_id IN (
            SELECT id FROM coach_profiles WHERE user_id = auth.uid()
        ) OR coach_id = auth.uid()
    );

GRANT ALL ON coach_services TO authenticated;
GRANT SELECT ON coach_services TO anon;

-- ============================================================================
-- 2. THERAPIST SERVICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS therapist_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapist_services_therapist_id ON therapist_services(therapist_id);

ALTER TABLE therapist_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active therapist services" ON therapist_services;
DROP POLICY IF EXISTS "Therapists can insert services" ON therapist_services;
DROP POLICY IF EXISTS "Therapists can update services" ON therapist_services;
DROP POLICY IF EXISTS "Therapists can delete services" ON therapist_services;

CREATE POLICY "Anyone can view active therapist services" ON therapist_services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Therapists can insert services" ON therapist_services
    FOR INSERT WITH CHECK (
        therapist_id IN (
            SELECT id FROM therapist_profiles WHERE user_id = auth.uid()
        ) OR therapist_id = auth.uid()
    );

CREATE POLICY "Therapists can update services" ON therapist_services
    FOR UPDATE USING (
        therapist_id IN (
            SELECT id FROM therapist_profiles WHERE user_id = auth.uid()
        ) OR therapist_id = auth.uid()
    );

CREATE POLICY "Therapists can delete services" ON therapist_services
    FOR DELETE USING (
        therapist_id IN (
            SELECT id FROM therapist_profiles WHERE user_id = auth.uid()
        ) OR therapist_id = auth.uid()
    );

GRANT ALL ON therapist_services TO authenticated;
GRANT SELECT ON therapist_services TO anon;

-- ============================================================================
-- 3. ENSURE COACH_PROFILES AND THERAPIST_PROFILES EXIST
-- ============================================================================
CREATE TABLE IF NOT EXISTS coach_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view coach profiles" ON coach_profiles;
DROP POLICY IF EXISTS "Coaches can manage their profile" ON coach_profiles;
CREATE POLICY "Anyone can view coach profiles" ON coach_profiles FOR SELECT USING (true);
CREATE POLICY "Coaches can manage their profile" ON coach_profiles FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON coach_profiles TO authenticated;
GRANT SELECT ON coach_profiles TO anon;

CREATE TABLE IF NOT EXISTS therapist_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view therapist profiles" ON therapist_profiles;
DROP POLICY IF EXISTS "Therapists can manage their profile" ON therapist_profiles;
CREATE POLICY "Anyone can view therapist profiles" ON therapist_profiles FOR SELECT USING (true);
CREATE POLICY "Therapists can manage their profile" ON therapist_profiles FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON therapist_profiles TO authenticated;
GRANT SELECT ON therapist_profiles TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'coach_services:' as table_name, COUNT(*)::text as rows FROM coach_services;
SELECT 'therapist_services:' as table_name, COUNT(*)::text as rows FROM therapist_services;
SELECT 'coach_profiles:' as table_name, COUNT(*)::text as rows FROM coach_profiles;
SELECT 'therapist_profiles:' as table_name, COUNT(*)::text as rows FROM therapist_profiles;

SELECT '✅ Services tables ready!' as status;
