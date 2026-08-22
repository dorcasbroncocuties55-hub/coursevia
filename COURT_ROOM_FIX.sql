-- ============================================================
-- COURT ROOM DISPUTE SYSTEM - RLS POLICY FIXES
-- This fixes the RLS policies for the judges table to allow signup
-- Run this AFTER COURT_ROOM_MIGRATION.sql
-- ============================================================

-- Drop existing restrictive policies on judges table
DROP POLICY IF EXISTS "Judges can view own profile" ON judges;
DROP POLICY IF EXISTS "Judges can update own profile" ON judges;

-- Create new policies that allow signup and proper access

-- 1. Allow public to insert judges (for signup) - these will be 'pending' status
CREATE POLICY "Allow public judge signup" ON judges
  FOR INSERT 
  WITH CHECK (status = 'pending');

-- 2. Judges can view their own profile (using auth.uid())
CREATE POLICY "Judges can view own profile" ON judges
  FOR SELECT 
  USING (id = auth.uid());

-- 3. Judges can update their own profile (using auth.uid())
CREATE POLICY "Judges can update own profile" ON judges
  FOR UPDATE 
  USING (id = auth.uid());

-- 4. Allow admins to view all judges (you'll need to add admin check)
CREATE POLICY "Admins can view all judges" ON judges
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- 5. Allow admins to update any judge (for approval/status changes)
CREATE POLICY "Admins can update judges" ON judges
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Fix profiles RLS to allow judge profile creation
-- Drop overly restrictive profile policies if they exist
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update court_cases policies to work with auth.uid() instead of current_setting
DROP POLICY IF EXISTS "Judges can view assigned cases" ON court_cases;
DROP POLICY IF EXISTS "Judges can update assigned cases" ON court_cases;

CREATE POLICY "Judges can view assigned cases" ON court_cases
  FOR SELECT USING (
    assigned_judge_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM case_participants 
      WHERE case_id = court_cases.id 
      AND participant_id = auth.uid() 
      AND participant_type IN ('learner', 'provider')
    )
  );

CREATE POLICY "Judges can update assigned cases" ON court_cases
  FOR UPDATE USING (assigned_judge_id = auth.uid());

-- Fix judge_sessions policies
DROP POLICY IF EXISTS "Judges can view own sessions" ON judge_sessions;

CREATE POLICY "Judges can view own sessions" ON judge_sessions
  FOR ALL USING (judge_id = auth.uid());

-- Fix case_participants policy
DROP POLICY IF EXISTS "View case participation" ON case_participants;

CREATE POLICY "View case participation" ON case_participants
  FOR SELECT USING (participant_id = auth.uid());

-- Fix evidence policy
DROP POLICY IF EXISTS "View case evidence" ON dispute_evidence;

CREATE POLICY "View case evidence" ON dispute_evidence
  FOR SELECT USING (
    submitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM case_participants cp
      JOIN court_cases cc ON cp.case_id = cc.id
      WHERE cp.case_id = dispute_evidence.case_id
      AND (cp.participant_id = auth.uid() OR cc.assigned_judge_id = auth.uid())
    )
  );

-- Fix messages policy
DROP POLICY IF EXISTS "View case messages" ON case_messages;

CREATE POLICY "View case messages" ON case_messages
  FOR SELECT USING (
    (NOT is_internal AND EXISTS (
      SELECT 1 FROM case_participants cp
      WHERE cp.case_id = case_messages.case_id
      AND cp.participant_id = auth.uid()
    )) OR
    EXISTS (
      SELECT 1 FROM court_cases cc
      WHERE cc.id = case_messages.case_id
      AND cc.assigned_judge_id = auth.uid()
    )
  );

-- Fix restrictions policy
DROP POLICY IF EXISTS "View provider restrictions" ON provider_restrictions;

CREATE POLICY "View provider restrictions" ON provider_restrictions
  FOR SELECT USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM court_cases cc
      WHERE cc.id = provider_restrictions.case_id
      AND cc.assigned_judge_id = auth.uid()
    )
  );

-- Fix assignments policy
DROP POLICY IF EXISTS "View judge assignments" ON judge_case_assignments;

CREATE POLICY "View judge assignments" ON judge_case_assignments
  FOR SELECT USING (judge_id = auth.uid());

-- Fix activity log policy
DROP POLICY IF EXISTS "View judge activities" ON judge_activity_log;

CREATE POLICY "View judge activities" ON judge_activity_log
  FOR SELECT USING (judge_id = auth.uid());

-- Fix judge messages policies
DROP POLICY IF EXISTS "View judge messages" ON judge_messages;
DROP POLICY IF EXISTS "Insert judge messages" ON judge_messages;
DROP POLICY IF EXISTS "Update judge messages" ON judge_messages;

CREATE POLICY "View judge messages" ON judge_messages
  FOR SELECT USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid()
  );

CREATE POLICY "Insert judge messages" ON judge_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Update judge messages" ON judge_messages
  FOR UPDATE USING (recipient_id = auth.uid());

SELECT 'Court Room RLS policies fixed successfully' AS result;
