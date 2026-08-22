-- ============================================================
-- JUDGES TABLE EXTENDED SCHEMA (OPTIONAL)
-- Adds additional columns to match the signup form fields
-- Run this AFTER COURT_ROOM_FIX.sql if you want to keep all form fields
-- ============================================================

-- Add missing columns to judges table
ALTER TABLE judges 
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS bar_number text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS cases_handled integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_resolution_time numeric(10,2) DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS judges_bar_number_idx ON judges(bar_number) WHERE bar_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS judges_country_idx ON judges(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS judges_state_idx ON judges(state) WHERE state IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN judges.country IS 'Country of residence/practice';
COMMENT ON COLUMN judges.state IS 'State or province of practice';
COMMENT ON COLUMN judges.bar_number IS 'Bar association registration number';
COMMENT ON COLUMN judges.years_experience IS 'Years of legal experience';
COMMENT ON COLUMN judges.cases_handled IS 'Total number of cases handled on platform';
COMMENT ON COLUMN judges.success_rate IS 'Success rate percentage (0-100)';
COMMENT ON COLUMN judges.avg_resolution_time IS 'Average case resolution time in days';

SELECT 'Judges table extended successfully' AS result;
