-- ============================================================
-- FIX: payout_requests table schema
-- Adds missing columns and fixes profiles relationship
-- Run this in Supabase SQL editor
-- ============================================================

-- Enable detailed error reporting
\set ON_ERROR_STOP on
\set VERBOSITY verbose

-- Create migration log table if it doesn't exist
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    execution_time_ms INTEGER
  );
  
  -- Log migration start
  INSERT INTO migration_log (migration_name, step_name, status)
  VALUES ('FIX_PAYOUT_REQUESTS_SCHEMA', 'migration_start', 'started');
  
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Migration log setup failed (continuing anyway): %', SQLERRM;
END $$;

-- Start transaction for atomic operations
BEGIN;

DO $$
DECLARE
  step_start_time TIMESTAMPTZ;
  step_end_time TIMESTAMPTZ;
  execution_time INTEGER;
BEGIN
  -- 1. Add missing columns to payout_requests (safe - only adds if missing)
  step_start_time := clock_timestamp();
  
  INSERT INTO migration_log (migration_name, step_name, status)
  VALUES ('FIX_PAYOUT_REQUESTS_SCHEMA', 'add_columns', 'started');
  
  RAISE NOTICE 'Step 1: Adding missing columns to payout_requests table...';
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS swift_code TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS routing_number TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS airwallex_transfer_id TEXT;

-- 2. Backfill reference for any existing rows that have none
UPDATE payout_requests
SET reference = 'wdr_legacy_' || id::text
WHERE reference IS NULL;

-- 3. Make reference NOT NULL after backfill
ALTER TABLE payout_requests ALTER COLUMN reference SET NOT NULL;

-- 4. Add unique index on reference
CREATE UNIQUE INDEX IF NOT EXISTS payout_requests_reference_idx ON payout_requests(reference);

-- 5. Fix the profiles foreign key relationship
--    payout_requests.user_id must reference auth.users, and profiles must have
--    a matching user_id column. The join in the admin query uses:
--    profiles ( full_name, email, role, avatar_url )
--    which requires payout_requests.user_id → profiles.user_id FK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payout_requests_user_id_profiles_fkey'
      AND table_name = 'payout_requests'
  ) THEN
    ALTER TABLE payout_requests
      ADD CONSTRAINT payout_requests_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add FK (may already exist or profiles uses different PK): %', SQLERRM;
END $$;

-- 6. Enable RLS if not already enabled
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- 7. Allow service role full access (used by backend)
DO $$
BEGIN
  DROP POLICY IF EXISTS "service_role_all_payout_requests" ON payout_requests;
  CREATE POLICY "service_role_all_payout_requests"
    ON payout_requests FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Policy creation skipped: %', SQLERRM;
END $$;

-- 8. Allow users to read their own payout requests
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_read_own_payout_requests" ON payout_requests;
  CREATE POLICY "users_read_own_payout_requests"
    ON payout_requests FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Policy creation skipped: %', SQLERRM;
END $$;

-- Verify columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payout_requests'
ORDER BY ordinal_position;
