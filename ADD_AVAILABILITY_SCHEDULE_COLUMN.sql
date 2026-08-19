-- Add availability_schedule column to coach_services and therapist_services tables
-- This column stores weekly schedule data as JSON

-- Add to coach_services table
ALTER TABLE coach_services 
ADD COLUMN IF NOT EXISTS availability_schedule JSONB;

-- Add to therapist_services table  
ALTER TABLE therapist_services 
ADD COLUMN IF NOT EXISTS availability_schedule JSONB;

-- Add comments for documentation
COMMENT ON COLUMN coach_services.availability_schedule IS 'Weekly availability schedule as JSON object with day keys (monday, tuesday, etc.) containing {enabled: boolean, start: string, end: string}';

COMMENT ON COLUMN therapist_services.availability_schedule IS 'Weekly availability schedule as JSON object with day keys (monday, tuesday, etc.) containing {enabled: boolean, start: string, end: string}';

-- Example of the JSON structure:
-- {
--   "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
--   "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
--   "wednesday": {"enabled": false, "start": "", "end": ""},
--   "thursday": {"enabled": true, "start": "10:00", "end": "16:00"},
--   "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
--   "saturday": {"enabled": false, "start": "", "end": ""},
--   "sunday": {"enabled": false, "start": "", "end": ""}
-- }