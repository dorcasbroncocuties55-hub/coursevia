-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================
-- This script adds missing columns to existing tables
-- Safe to run multiple times
-- ============================================================================

-- Add missing columns to courses table
DO $$ 
BEGIN
  -- Add category if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='category') THEN
    ALTER TABLE courses ADD COLUMN category TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='level') THEN
    ALTER TABLE courses ADD COLUMN level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='tags') THEN
    ALTER TABLE courses ADD COLUMN tags TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='short_description') THEN
    ALTER TABLE courses ADD COLUMN short_description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='preview_video_url') THEN
    ALTER TABLE courses ADD COLUMN preview_video_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='currency') THEN
    ALTER TABLE courses ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='is_free') THEN
    ALTER TABLE courses ADD COLUMN is_free BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='is_featured') THEN
    ALTER TABLE courses ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='meta_title') THEN
    ALTER TABLE courses ADD COLUMN meta_title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='meta_description') THEN
    ALTER TABLE courses ADD COLUMN meta_description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='meta_keywords') THEN
    ALTER TABLE courses ADD COLUMN meta_keywords TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='total_students') THEN
    ALTER TABLE courses ADD COLUMN total_students INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='total_lessons') THEN
    ALTER TABLE courses ADD COLUMN total_lessons INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='total_duration_minutes') THEN
    ALTER TABLE courses ADD COLUMN total_duration_minutes INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='requires_enrollment_approval') THEN
    ALTER TABLE courses ADD COLUMN requires_enrollment_approval BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='max_students') THEN
    ALTER TABLE courses ADD COLUMN max_students INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='certificate_enabled') THEN
    ALTER TABLE courses ADD COLUMN certificate_enabled BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='discussion_enabled') THEN
    ALTER TABLE courses ADD COLUMN discussion_enabled BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='published_at') THEN
    ALTER TABLE courses ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
END $$;

-- Now run the complete migration
