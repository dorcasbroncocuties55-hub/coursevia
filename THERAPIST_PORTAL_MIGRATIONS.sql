-- ==================================================================
-- THERAPIST PORTAL DATABASE MIGRATIONS
-- ==================================================================
-- Summary: Adds support for new therapist portal + removes old duplicates
-- Applied: Direct to Supabase via MCP tool
-- ==================================================================

-- ==================================================================
-- MIGRATION 1: Add New Therapist Portal Columns
-- ==================================================================
-- Adds columns needed for AddNewService page

ALTER TABLE therapist_services 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS icon_index INTEGER DEFAULT 0;

COMMENT ON COLUMN therapist_services.category IS 'Service category: individual, couples, family, group';
COMMENT ON COLUMN therapist_services.icon_index IS 'Icon index (0-6) for service card display';

-- ==================================================================
-- MIGRATION 2: Remove Duplicate Therapist Fields from Profiles
-- ==================================================================
-- These fields were incorrectly duplicated in profiles table
-- Therapist-specific data should ONLY exist in therapist_profiles

ALTER TABLE profiles 
  DROP COLUMN IF EXISTS professional_title CASCADE,
  DROP COLUMN IF EXISTS profile_headline CASCADE,
  DROP COLUMN IF EXISTS short_intro CASCADE,
  DROP COLUMN IF EXISTS available_for_new_appointments CASCADE,
  DROP COLUMN IF EXISTS services_offered CASCADE,
  DROP COLUMN IF EXISTS works_with CASCADE,
  DROP COLUMN IF EXISTS expertise_areas CASCADE,
  DROP COLUMN IF EXISTS service_areas CASCADE;

COMMENT ON TABLE profiles IS 'Base user profile - therapist-specific data now in therapist_profiles';

-- ==================================================================
-- VERIFICATION QUERIES
-- ==================================================================
-- Run these to verify the migrations

-- 1. Check therapist_services columns
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'therapist_services'
ORDER BY ordinal_position;

-- 2. Verify profiles no longer has duplicate therapist fields
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN (
    'professional_title', 
    'profile_headline', 
    'short_intro', 
    'available_for_new_appointments',
    'services_offered',
    'works_with',
    'expertise_areas',
    'service_areas'
  );
-- Should return 0 rows

-- 3. Check therapist_profiles still has all required fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'therapist_profiles'
  AND column_name IN (
    'professional_title',
    'profile_headline',
    'short_intro',
    'available_for_new_appointments',
    'services_offered',
    'works_with',
    'expertise_areas',
    'service_areas'
  )
ORDER BY column_name;
-- Should return 8 rows

-- ==================================================================
-- TABLE STRUCTURE SUMMARY
-- ==================================================================

/*
therapist_profiles (CORRECT - therapist-specific data)
  - id (UUID, PK)
  - user_id (UUID, FK to auth.users, UNIQUE)
  - professional_title
  - profile_headline
  - short_intro
  - about_text
  - approach_text
  - languages (array)
  - services_offered (array)
  - works_with (array)
  - expertise_areas (array)
  - qualifications (array)
  - service_areas (array)
  - organization_focus_areas (array)
  - service_delivery_mode (online/in_person/both)
  - office_address, office_city, office_country, office_postcode
  - public_contact_enabled
  - request_number_enabled
  - available_for_new_appointments
  - profile_completed
  - is_verified, is_active
  - created_at, updated_at
  + more...

therapist_services (CORRECT - services offered by therapists)
  - id (UUID, PK)
  - therapist_id (UUID, FK to profiles.user_id)
  - title
  - description
  - duration_minutes
  - price
  - currency
  - service_type
  - is_active
  - category ⭐ NEW
  - icon_index ⭐ NEW
  - availability_schedule (jsonb)
  - created_at, updated_at

profiles (CORRECT - now clean, no therapist duplicates)
  - user_id (UUID, PK, FK to auth.users)
  - email, full_name, avatar_url
  - role (app_role enum)
  - bio, phone, country, city
  - onboarding_completed, status
  - ❌ NO MORE: professional_title, profile_headline, short_intro, etc.
  - created_at, updated_at
*/

-- ==================================================================
-- SAMPLE DATA INSERT (for testing AddNewService page)
-- ==================================================================

-- First, get a therapist_profile_id
-- SELECT id FROM therapist_profiles WHERE user_id = '<your-therapist-user-id>';

-- Then insert test service
/*
INSERT INTO therapist_services (
  therapist_id,
  title,
  description,
  duration_minutes,
  price,
  is_active,
  category,
  icon_index
) VALUES (
  '<therapist_profile_id>',
  'Cognitive Behavioral Therapy (CBT)',
  'Evidence-based therapy sessions focused on identifying, understanding, and changing destructive or disturbing thought patterns.',
  50,
  120.00,
  true,
  'individual',
  0
);
*/

-- ==================================================================
-- ROLLBACK (if needed)
-- ==================================================================

/*
-- WARNING: Only run if you need to undo these changes

-- Rollback Migration 2
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS professional_title TEXT,
  ADD COLUMN IF NOT EXISTS profile_headline TEXT,
  ADD COLUMN IF NOT EXISTS short_intro TEXT,
  ADD COLUMN IF NOT EXISTS available_for_new_appointments BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS services_offered TEXT,
  ADD COLUMN IF NOT EXISTS works_with TEXT,
  ADD COLUMN IF NOT EXISTS expertise_areas TEXT,
  ADD COLUMN IF NOT EXISTS service_areas TEXT;

-- Rollback Migration 1
ALTER TABLE therapist_services 
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS icon_index;
*/
