-- =====================================================
-- COMPLETE THERAPIST PORTAL MIGRATION
-- This migration creates all necessary tables and columns 
-- for the therapist portal functionality
-- =====================================================

-- 1. THERAPIST PROFILES TABLE ENHANCEMENTS
-- =====================================================

-- Add therapy_category column to therapist_profiles table
ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS therapy_category VARCHAR(50) DEFAULT 'mental_health';

-- Add constraint to ensure valid categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_therapy_category'
    ) THEN
        ALTER TABLE therapist_profiles 
        ADD CONSTRAINT valid_therapy_category 
        CHECK (therapy_category IN (
            'mental_health',      -- Clinical psychology, psychiatry, licensed counseling (HIPAA required)
            'physical_therapy',   -- Physical rehabilitation therapy (HIPAA required)
            'occupational_therapy', -- Occupational therapy (HIPAA required)
            'speech_therapy',     -- Speech and language therapy (HIPAA required)
            'medical_therapy',    -- Other medical/clinical therapy (HIPAA required)
            'relationship_therapy', -- Marriage & family therapy (non-medical)
            'life_therapy',       -- Personal development therapy (non-medical)
            'career_therapy',     -- Professional development therapy (non-medical)
            'wellness_therapy',   -- General wellness therapy (non-medical)
            'general'             -- Default/unspecified category
        ));
    END IF;
END $$;

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_therapist_category ON therapist_profiles(therapy_category);

-- Add is_health_related computed field for easy HIPAA compliance checking
ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS is_health_related BOOLEAN 
GENERATED ALWAYS AS (
    therapy_category IN ('mental_health', 'physical_therapy', 'occupational_therapy', 'speech_therapy', 'medical_therapy')
) STORED;

-- Add additional therapist profile columns
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS certification TEXT;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) DEFAULT 0;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS service_delivery_mode VARCHAR(20) DEFAULT 'online';
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS availability_schedule JSONB;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_bookings": true, "email_messages": true, "email_reminders": true, "sms_bookings": false, "sms_reminders": false}';
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile_visible": true, "show_phone": false, "show_email": false, "allow_messages": true}';

-- Update existing therapist profiles to have a default category
UPDATE therapist_profiles 
SET therapy_category = 'mental_health' 
WHERE therapy_category IS NULL OR therapy_category = 'general';

-- 2. THERAPY CATEGORIES REFERENCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS therapy_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_hipaa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert therapy category options
INSERT INTO therapy_categories (id, name, description, requires_hipaa) VALUES
('mental_health', 'Mental Health Therapy', 'Clinical psychology, psychiatry, licensed mental health counseling', TRUE),
('physical_therapy', 'Physical Therapy', 'Physical rehabilitation and movement therapy', TRUE),
('occupational_therapy', 'Occupational Therapy', 'Daily living skills and occupational rehabilitation', TRUE),
('speech_therapy', 'Speech Therapy', 'Speech and language pathology therapy', TRUE),
('medical_therapy', 'Medical Therapy', 'Other medical or clinical therapy services', TRUE),
('relationship_therapy', 'Relationship Therapy', 'Marriage, family, and relationship counseling (non-medical)', FALSE),
('life_therapy', 'Life Therapy', 'Personal development and life coaching therapy', FALSE),
('career_therapy', 'Career Therapy', 'Professional development and career counseling', FALSE),
('wellness_therapy', 'Wellness Therapy', 'General wellness and lifestyle therapy', FALSE)
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
requires_hipaa = EXCLUDED.requires_hipaa;

-- 3. THERAPIST SERVICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS therapist_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 60, -- minutes
    price NUMERIC(10,2) DEFAULT 0,
    service_type VARCHAR(50) DEFAULT 'consultation',
    delivery_mode VARCHAR(20) DEFAULT 'online', -- 'online', 'in_person', 'both'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for therapist services
CREATE INDEX IF NOT EXISTS idx_therapist_services_therapist_id ON therapist_services(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_services_active ON therapist_services(is_active);

-- 4. BOOKINGS TABLE ENHANCEMENTS
-- =====================================================

-- Add missing columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS therapist_id UUID REFERENCES therapist_profiles(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS learner_id UUID REFERENCES profiles(user_id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES therapist_services(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_delivery_mode VARCHAR(20) DEFAULT 'online';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS location TEXT;

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_therapist_id ON bookings(therapist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_learner_id ON bookings(learner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Add constraint for valid booking status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_booking_status'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT valid_booking_status 
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'));
    END IF;
END $$;

-- 5. SESSION NOTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Clinical Information
    objectives TEXT,
    interventions TEXT,
    patient_response TEXT,
    homework_assigned TEXT,
    next_session_goals TEXT,
    
    -- Assessments
    mood_assessment VARCHAR(20) DEFAULT 'fair', -- 'poor', 'fair', 'good', 'excellent'
    progress_rating INTEGER DEFAULT 5, -- 1-10 scale
    risk_assessment VARCHAR(20) DEFAULT 'low', -- 'low', 'moderate', 'high'
    
    -- Additional Notes
    medications_discussed BOOLEAN DEFAULT false,
    crisis_plan_reviewed BOOLEAN DEFAULT false,
    confidentiality_concerns TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for session notes
CREATE INDEX IF NOT EXISTS idx_session_notes_booking_id ON session_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_therapist_id ON session_notes(therapist_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_patient_id ON session_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_session_date ON session_notes(session_date);

-- Add constraints for session notes
ALTER TABLE session_notes 
ADD CONSTRAINT IF NOT EXISTS valid_mood_assessment 
CHECK (mood_assessment IN ('poor', 'fair', 'good', 'excellent'));

ALTER TABLE session_notes 
ADD CONSTRAINT IF NOT EXISTS valid_progress_rating 
CHECK (progress_rating >= 1 AND progress_rating <= 10);

ALTER TABLE session_notes 
ADD CONSTRAINT IF NOT EXISTS valid_risk_assessment 
CHECK (risk_assessment IN ('low', 'moderate', 'high'));

-- 6. MESSAGES TABLE ENHANCEMENTS
-- =====================================================

-- Ensure messages table exists and has required columns
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT false,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Add constraint for valid message types
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_message_type'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT valid_message_type 
        CHECK (message_type IN ('text', 'appointment', 'document', 'system', 'custom_offer'));
    END IF;
END $$;

-- 7. WALLETS TABLE ENHANCEMENTS
-- =====================================================

-- Ensure wallets table has all required columns
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pending_balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Create index for wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- 8. WALLET TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'earning', 'payout', 'refund', 'fee'
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    description TEXT,
    reference_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for wallet transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- 9. PAYOUT REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payout_method JSONB, -- Store bank account or payment method details
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    transaction_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payout requests
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at ON payout_requests(requested_at);

-- 10. THERAPIST CATEGORY AUDIT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS therapist_category_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapist_profiles(id),
    old_category VARCHAR(50),
    new_category VARCHAR(50),
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for category changes
CREATE INDEX IF NOT EXISTS idx_therapist_category_changes_therapist_id ON therapist_category_changes(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_category_changes_created_at ON therapist_category_changes(created_at);

-- 11. PROFILES TABLE ENHANCEMENTS
-- =====================================================

-- Add missing columns to profiles table for therapist portal
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certification TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_delivery_mode VARCHAR(20) DEFAULT 'online';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_slug VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for profile slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_profile_slug ON profiles(profile_slug) WHERE profile_slug IS NOT NULL;

-- 12. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE therapy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_category_changes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Anyone can read therapy categories" ON therapy_categories FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Therapists can manage their own services" ON therapist_services 
FOR ALL USING (therapist_id IN (
    SELECT id FROM therapist_profiles WHERE user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Therapists can manage session notes for their patients" ON session_notes 
FOR ALL USING (therapist_id IN (
    SELECT id FROM therapist_profiles WHERE user_id = auth.uid()
) OR patient_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can view their own wallet transactions" ON wallet_transactions 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can manage their own payout requests" ON payout_requests 
FOR ALL USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Therapists can view their own category changes" ON therapist_category_changes 
FOR SELECT USING (therapist_id IN (
    SELECT id FROM therapist_profiles WHERE user_id = auth.uid()
));

-- 13. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to log category changes
CREATE OR REPLACE FUNCTION log_therapist_category_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.therapy_category IS DISTINCT FROM NEW.therapy_category THEN
        INSERT INTO therapist_category_changes (therapist_id, old_category, new_category, changed_by)
        VALUES (NEW.id, OLD.therapy_category, NEW.therapy_category, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for category change logging
DROP TRIGGER IF EXISTS therapist_category_change_log ON therapist_profiles;
CREATE TRIGGER therapist_category_change_log
    AFTER UPDATE ON therapist_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_therapist_category_change();

-- Function to update wallet balance after transactions
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE wallets 
        SET 
            available_balance = available_balance + 
                CASE 
                    WHEN NEW.transaction_type IN ('earning', 'refund') THEN NEW.amount
                    WHEN NEW.transaction_type IN ('payout', 'fee') THEN -NEW.amount
                    ELSE 0
                END,
            total_earnings = total_earnings + 
                CASE 
                    WHEN NEW.transaction_type = 'earning' THEN NEW.amount
                    ELSE 0
                END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.wallet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet balance updates
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON wallet_transactions;
CREATE TRIGGER update_wallet_balance_trigger
    AFTER INSERT OR UPDATE ON wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_therapist_services_updated_at ON therapist_services;
CREATE TRIGGER update_therapist_services_updated_at
    BEFORE UPDATE ON therapist_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_notes_updated_at ON session_notes;
CREATE TRIGGER update_session_notes_updated_at
    BEFORE UPDATE ON session_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 14. SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert sample therapist services for existing therapists
INSERT INTO therapist_services (therapist_id, service_name, description, duration, price, service_type, delivery_mode)
SELECT 
    id,
    'Individual Therapy Session',
    'One-on-one therapy session tailored to your specific needs',
    60,
    120.00,
    'therapy',
    'both'
FROM therapist_profiles
WHERE NOT EXISTS (
    SELECT 1 FROM therapist_services WHERE therapist_id = therapist_profiles.id
)
ON CONFLICT DO NOTHING;

-- Create wallets for users who don't have them
INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings)
SELECT 
    user_id,
    0,
    0,
    0
FROM profiles
WHERE role IN ('therapist', 'coach') 
AND user_id NOT IN (SELECT user_id FROM wallets WHERE user_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add helpful comments
COMMENT ON TABLE therapy_categories IS 'Reference table for different therapy categories and their HIPAA requirements';
COMMENT ON TABLE therapist_services IS 'Services offered by therapists including pricing and delivery modes';
COMMENT ON TABLE session_notes IS 'Clinical documentation for therapy sessions with HIPAA compliance features';
COMMENT ON TABLE wallet_transactions IS 'Financial transactions for therapist earnings and payouts';
COMMENT ON TABLE payout_requests IS 'Requests for withdrawing earnings from wallet';
COMMENT ON TABLE therapist_category_changes IS 'Audit trail for changes to therapist categories';

-- Create view for therapist dashboard statistics
CREATE OR REPLACE VIEW therapist_dashboard_stats AS
SELECT 
    tp.user_id,
    tp.id as therapist_id,
    COUNT(DISTINCT b.learner_id) as total_patients,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN DATE(b.scheduled_at) = CURRENT_DATE AND b.status = 'confirmed' THEN 1 END) as today_sessions,
    COALESCE(w.available_balance, 0) as wallet_balance,
    COUNT(CASE WHEN m.receiver_id = tp.user_id AND m.is_read = false THEN 1 END) as unread_messages
FROM therapist_profiles tp
LEFT JOIN bookings b ON b.therapist_id = tp.id
LEFT JOIN wallets w ON w.user_id = tp.user_id
LEFT JOIN messages m ON m.receiver_id = tp.user_id AND m.is_read = false
GROUP BY tp.user_id, tp.id, w.available_balance;

COMMENT ON VIEW therapist_dashboard_stats IS 'Dashboard statistics for therapist portal';

-- Grant necessary permissions
GRANT SELECT ON therapy_categories TO authenticated;
GRANT ALL ON therapist_services TO authenticated;
GRANT ALL ON session_notes TO authenticated;
GRANT SELECT ON wallet_transactions TO authenticated;
GRANT ALL ON payout_requests TO authenticated;
GRANT SELECT ON therapist_category_changes TO authenticated;
GRANT SELECT ON therapist_dashboard_stats TO authenticated;

-- Final success message
DO $$ 
BEGIN 
    RAISE NOTICE 'COMPLETE THERAPIST PORTAL MIGRATION APPLIED SUCCESSFULLY!';
    RAISE NOTICE 'Created/Updated tables: therapy_categories, therapist_services, session_notes, wallet_transactions, payout_requests, therapist_category_changes';
    RAISE NOTICE 'Enhanced tables: therapist_profiles, bookings, messages, wallets, profiles';
    RAISE NOTICE 'Added RLS policies, triggers, and functions for data integrity';
    RAISE NOTICE 'Created therapist_dashboard_stats view for analytics';
END $$;