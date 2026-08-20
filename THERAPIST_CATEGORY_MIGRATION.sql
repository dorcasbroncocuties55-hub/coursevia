-- Add therapy_category column to therapist_profiles table
-- This determines if HIPAA compliance is required for messaging

ALTER TABLE therapist_profiles 
ADD COLUMN therapy_category VARCHAR(50) DEFAULT 'general';

-- Add constraint to ensure valid categories
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

-- Create index for faster category lookups
CREATE INDEX idx_therapist_category ON therapist_profiles(therapy_category);

-- Add is_health_related computed field for easy HIPAA compliance checking
ALTER TABLE therapist_profiles 
ADD COLUMN is_health_related BOOLEAN 
GENERATED ALWAYS AS (
    therapy_category IN ('mental_health', 'physical_therapy', 'occupational_therapy', 'speech_therapy', 'medical_therapy')
) STORED;

-- Update existing therapist profiles to have a default category
UPDATE therapist_profiles 
SET therapy_category = 'mental_health' 
WHERE therapy_category IS NULL OR therapy_category = 'general';

-- Create therapy category options reference table
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
('wellness_therapy', 'Wellness Therapy', 'General wellness and lifestyle therapy', FALSE);

-- Add audit trail for category changes (for compliance)
CREATE TABLE IF NOT EXISTS therapist_category_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapist_profiles(id),
    old_category VARCHAR(50),
    new_category VARCHAR(50),
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create RLS policies for therapy categories
ALTER TABLE therapy_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read therapy categories" ON therapy_categories FOR SELECT USING (true);

ALTER TABLE therapist_category_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Therapists can view their own category changes" ON therapist_category_changes 
FOR SELECT USING (therapist_id IN (
    SELECT id FROM therapist_profiles WHERE user_id = auth.uid()
));

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
CREATE TRIGGER therapist_category_change_log
    AFTER UPDATE ON therapist_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_therapist_category_change();