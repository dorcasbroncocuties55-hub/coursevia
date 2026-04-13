-- ============================================================================
-- FIX SERVICES AND BOOKINGS TABLES
-- ============================================================================

-- 1. Create therapist_services table if it doesn't exist
CREATE TABLE IF NOT EXISTS therapist_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    service_type VARCHAR(50) DEFAULT 'therapy',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create coach_services table if it doesn't exist
CREATE TABLE IF NOT EXISTS coach_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    service_type VARCHAR(50) DEFAULT 'coaching',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fix bookings table - ensure it has both provider_id and provider_user_id
DO $$ 
BEGIN
    -- Add provider_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'provider_user_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN provider_user_id UUID REFERENCES profiles(user_id);
    END IF;

    -- Add provider_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN provider_id UUID;
    END IF;

    -- Sync provider_user_id with provider_id if null
    UPDATE bookings 
    SET provider_user_id = provider_id 
    WHERE provider_user_id IS NULL AND provider_id IS NOT NULL;

    -- Sync provider_id with provider_user_id if null
    UPDATE bookings 
    SET provider_id = provider_user_id 
    WHERE provider_id IS NULL AND provider_user_id IS NOT NULL;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_therapist_services_therapist_id ON therapist_services(therapist_id);
CREATE INDEX IF NOT EXISTS idx_coach_services_coach_id ON coach_services(coach_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_user_id ON bookings(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_learner_id ON bookings(learner_id);

-- 5. Enable RLS on new tables
ALTER TABLE therapist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_services ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for therapist_services
DROP POLICY IF EXISTS "Therapists can view their own services" ON therapist_services;
CREATE POLICY "Therapists can view their own services" ON therapist_services
    FOR SELECT USING (
        auth.uid() = therapist_id 
        OR is_active = true
    );

DROP POLICY IF EXISTS "Therapists can insert their own services" ON therapist_services;
CREATE POLICY "Therapists can insert their own services" ON therapist_services
    FOR INSERT WITH CHECK (auth.uid() = therapist_id);

DROP POLICY IF EXISTS "Therapists can update their own services" ON therapist_services;
CREATE POLICY "Therapists can update their own services" ON therapist_services
    FOR UPDATE USING (auth.uid() = therapist_id);

DROP POLICY IF EXISTS "Therapists can delete their own services" ON therapist_services;
CREATE POLICY "Therapists can delete their own services" ON therapist_services
    FOR DELETE USING (auth.uid() = therapist_id);

DROP POLICY IF EXISTS "Anyone can view therapist services" ON therapist_services;
CREATE POLICY "Anyone can view therapist services" ON therapist_services
    FOR SELECT USING (true);

-- 7. Create RLS policies for coach_services
DROP POLICY IF EXISTS "Coaches can view their own services" ON coach_services;
CREATE POLICY "Coaches can view their own services" ON coach_services
    FOR SELECT USING (
        auth.uid() = coach_id 
        OR is_active = true
    );

DROP POLICY IF EXISTS "Coaches can insert their own services" ON coach_services;
CREATE POLICY "Coaches can insert their own services" ON coach_services
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can update their own services" ON coach_services;
CREATE POLICY "Coaches can update their own services" ON coach_services
    FOR UPDATE USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can delete their own services" ON coach_services;
CREATE POLICY "Coaches can delete their own services" ON coach_services
    FOR DELETE USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Anyone can view coach services" ON coach_services;
CREATE POLICY "Anyone can view coach services" ON coach_services
    FOR SELECT USING (true);

-- 8. Update bookings RLS policies to handle both provider_id and provider_user_id
DROP POLICY IF EXISTS "Providers can view their bookings" ON bookings;
CREATE POLICY "Providers can view their bookings" ON bookings
    FOR SELECT USING (
        auth.uid() = provider_id 
        OR auth.uid() = provider_user_id
        OR auth.uid() = learner_id
    );

DROP POLICY IF EXISTS "Learners can view their bookings" ON bookings;
CREATE POLICY "Learners can view their bookings" ON bookings
    FOR SELECT USING (auth.uid() = learner_id);

DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = learner_id);

DROP POLICY IF EXISTS "Providers can update their bookings" ON bookings;
CREATE POLICY "Providers can update their bookings" ON bookings
    FOR UPDATE USING (
        auth.uid() = provider_id 
        OR auth.uid() = provider_user_id
    );

-- 9. Create updated_at trigger for therapist_services
CREATE OR REPLACE FUNCTION update_therapist_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS therapist_services_updated_at ON therapist_services;
CREATE TRIGGER therapist_services_updated_at
    BEFORE UPDATE ON therapist_services
    FOR EACH ROW
    EXECUTE FUNCTION update_therapist_services_updated_at();

-- 10. Create updated_at trigger for coach_services
CREATE OR REPLACE FUNCTION update_coach_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coach_services_updated_at ON coach_services;
CREATE TRIGGER coach_services_updated_at
    BEFORE UPDATE ON coach_services
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_services_updated_at();

-- 11. Grant permissions
GRANT ALL ON therapist_services TO authenticated;
GRANT ALL ON coach_services TO authenticated;
GRANT SELECT ON therapist_services TO anon;
GRANT SELECT ON coach_services TO anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if tables exist
SELECT 
    'therapist_services' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'therapist_services'
    ) as exists;

SELECT 
    'coach_services' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'coach_services'
    ) as exists;

-- Check bookings columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('provider_id', 'provider_user_id', 'learner_id')
ORDER BY column_name;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Services and bookings tables fixed successfully!' as status;
