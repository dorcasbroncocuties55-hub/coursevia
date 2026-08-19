-- ============================================================
-- COURT ROOM DISPUTE SYSTEM MIGRATION
-- Complete database schema for Judges Portal and Court Room functionality
-- Run this in Supabase SQL Editor after REFUND_SYSTEM_MIGRATION.sql
-- ============================================================

-- 1. Create judges table (separate from user_roles for isolation)
CREATE TABLE IF NOT EXISTS judges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  full_name       text NOT NULL,
  phone           text,
  specialization  text[] DEFAULT '{}', -- ['payment_disputes', 'booking_conflicts', 'content_issues']
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','inactive')),
  rank            text NOT NULL DEFAULT 'junior' CHECK (rank IN ('junior','senior','chief')),
  hire_date       timestamptz DEFAULT now(),
  last_login      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Create judge authentication sessions
CREATE TABLE IF NOT EXISTS judge_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id        uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  session_token   text UNIQUE NOT NULL,
  expires_at      timestamptz NOT NULL,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Create court cases table (extends refunds system)
CREATE TABLE IF NOT EXISTS court_cases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number     text UNIQUE NOT NULL, -- Auto-generated: CV-2024-001234
  refund_id       uuid NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  assigned_judge_id uuid REFERENCES judges(id) ON DELETE SET NULL,
  learner_id      uuid NOT NULL, -- From refunds.user_id
  provider_id     uuid NOT NULL, -- From booking or content
  booking_id      uuid, -- If dispute is about booking
  payment_id      uuid, -- From refunds.payment_id
  
  -- Case details
  dispute_type    text NOT NULL CHECK (dispute_type IN ('booking_quality', 'no_show_provider', 'no_show_learner', 'technical_issues', 'content_quality', 'payment_error', 'other')),
  priority_level  text NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'pending_evidence', 'under_review', 'resolved', 'closed', 'escalated')),
  
  -- Financial details
  disputed_amount numeric(10,2) NOT NULL DEFAULT 0,
  refund_amount   numeric(10,2), -- Final approved refund amount
  
  -- Timeline
  opened_at       timestamptz NOT NULL DEFAULT now(),
  assigned_at     timestamptz,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  
  -- Case metadata
  complexity_score integer DEFAULT 1 CHECK (complexity_score BETWEEN 1 AND 10),
  auto_assigned   boolean DEFAULT false,
  escalated_from  uuid REFERENCES court_cases(id), -- If escalated from another case
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. Create case participants (learner, provider, judge visibility)
CREATE TABLE IF NOT EXISTS case_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
  participant_id  uuid NOT NULL, -- user_id or judge_id
  participant_type text NOT NULL CHECK (participant_type IN ('learner', 'provider', 'judge')),
  role            text NOT NULL CHECK (role IN ('complainant', 'defendant', 'mediator', 'observer')),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  last_active     timestamptz DEFAULT now(),
  
  UNIQUE(case_id, participant_id, participant_type)
);

-- 5. Create dispute evidence table
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
  submitted_by    uuid NOT NULL, -- user_id or judge_id
  submitter_type  text NOT NULL CHECK (submitter_type IN ('learner', 'provider', 'judge')),
  
  -- Evidence details
  evidence_type   text NOT NULL CHECK (evidence_type IN ('text', 'document', 'image', 'video', 'audio', 'screenshot', 'system_log')),
  title           text NOT NULL,
  description     text,
  content         text, -- For text evidence
  file_url        text, -- For file uploads
  file_name       text,
  file_size       integer,
  file_type       text, -- MIME type
  
  -- Metadata
  is_public       boolean DEFAULT true, -- False for judge-only evidence
  evidence_weight text DEFAULT 'normal' CHECK (evidence_weight IN ('minor', 'normal', 'major', 'critical')),
  verified        boolean DEFAULT false, -- Judge verification
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 6. Create case messages (tri-party communication)
CREATE TABLE IF NOT EXISTS case_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL, -- user_id or judge_id
  sender_type     text NOT NULL CHECK (sender_type IN ('learner', 'provider', 'judge', 'system')),
  
  -- Message content
  message_type    text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'evidence', 'decision', 'system_update')),
  content         text NOT NULL,
  evidence_id     uuid REFERENCES dispute_evidence(id), -- If message includes evidence
  
  -- Visibility control
  visible_to      text[] DEFAULT '{}', -- ['learner', 'provider', 'judge'] or specific IDs
  is_internal     boolean DEFAULT false, -- Judge-only messages
  
  -- Message metadata
  edited_at       timestamptz,
  read_by         jsonb DEFAULT '{}', -- Track read status per participant
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 7. Create provider restrictions table
CREATE TABLE IF NOT EXISTS provider_restrictions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     uuid NOT NULL, 
  case_id         uuid NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
  restriction_type text NOT NULL CHECK (restriction_type IN ('full_lockout', 'booking_disabled', 'wallet_frozen', 'profile_hidden')),
  
  -- Mercy rule settings
  mercy_enabled   boolean DEFAULT true,
  mercy_window_minutes integer DEFAULT 30, -- Minutes before/after booking
  
  -- Status
  is_active       boolean DEFAULT true,
  activated_at    timestamptz NOT NULL DEFAULT now(),
  deactivated_at  timestamptz,
  
  -- Metadata
  applied_by      uuid REFERENCES judges(id), -- Judge who applied restriction
  reason          text,
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(provider_id, case_id, restriction_type)
);

-- 8. Create case assignments for judge workload management
CREATE TABLE IF NOT EXISTS judge_case_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id        uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  case_id         uuid NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
  assignment_type text NOT NULL CHECK (assignment_type IN ('auto', 'manual', 'escalated', 'reassigned')),
  assigned_by     uuid REFERENCES judges(id), -- Assigning judge (for manual assignments)
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  
  UNIQUE(case_id) -- One case, one assigned judge at a time
);

-- 9. Create judge activity log for accountability
CREATE TABLE IF NOT EXISTS judge_activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id        uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  case_id         uuid REFERENCES court_cases(id) ON DELETE SET NULL,
  
  -- Activity details
  activity_type   text NOT NULL CHECK (activity_type IN ('case_assigned', 'case_viewed', 'message_sent', 'evidence_reviewed', 'decision_made', 'case_escalated', 'case_transferred')),
  description     text NOT NULL,
  metadata        jsonb DEFAULT '{}',
  
  -- Context
  ip_address      text,
  user_agent      text,
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 10. Create judge collaboration messages table
CREATE TABLE IF NOT EXISTS judge_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  recipient_id    uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  case_id         uuid REFERENCES court_cases(id) ON DELETE SET NULL,
  
  -- Message details
  message_type    text NOT NULL CHECK (message_type IN ('consultation', 'escalation', 'general', 'case_transfer')),
  subject         text NOT NULL,
  content         text NOT NULL,
  priority        text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Status
  is_read         boolean DEFAULT false,
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS judges_email_idx ON judges(email);
CREATE INDEX IF NOT EXISTS judges_status_idx ON judges(status);
CREATE INDEX IF NOT EXISTS judge_sessions_token_idx ON judge_sessions(session_token);
CREATE INDEX IF NOT EXISTS judge_sessions_expires_idx ON judge_sessions(expires_at);

CREATE INDEX IF NOT EXISTS court_cases_number_idx ON court_cases(case_number);
CREATE INDEX IF NOT EXISTS court_cases_status_idx ON court_cases(status);
CREATE INDEX IF NOT EXISTS court_cases_judge_idx ON court_cases(assigned_judge_id);
CREATE INDEX IF NOT EXISTS court_cases_learner_idx ON court_cases(learner_id);
CREATE INDEX IF NOT EXISTS court_cases_provider_idx ON court_cases(provider_id);
CREATE INDEX IF NOT EXISTS court_cases_priority_idx ON court_cases(priority_level);
CREATE INDEX IF NOT EXISTS court_cases_opened_idx ON court_cases(opened_at DESC);

CREATE INDEX IF NOT EXISTS case_participants_case_idx ON case_participants(case_id);
CREATE INDEX IF NOT EXISTS case_participants_participant_idx ON case_participants(participant_id, participant_type);

CREATE INDEX IF NOT EXISTS dispute_evidence_case_idx ON dispute_evidence(case_id);
CREATE INDEX IF NOT EXISTS dispute_evidence_submitter_idx ON dispute_evidence(submitted_by, submitter_type);
CREATE INDEX IF NOT EXISTS dispute_evidence_type_idx ON dispute_evidence(evidence_type);

CREATE INDEX IF NOT EXISTS case_messages_case_idx ON case_messages(case_id);
CREATE INDEX IF NOT EXISTS case_messages_sender_idx ON case_messages(sender_id, sender_type);
CREATE INDEX IF NOT EXISTS case_messages_created_idx ON case_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS provider_restrictions_provider_idx ON provider_restrictions(provider_id);
CREATE INDEX IF NOT EXISTS provider_restrictions_case_idx ON provider_restrictions(case_id);
CREATE INDEX IF NOT EXISTS provider_restrictions_active_idx ON provider_restrictions(is_active);

CREATE INDEX IF NOT EXISTS judge_assignments_judge_idx ON judge_case_assignments(judge_id);
CREATE INDEX IF NOT EXISTS judge_assignments_case_idx ON judge_case_assignments(case_id);

CREATE INDEX IF NOT EXISTS judge_activity_judge_idx ON judge_activity_log(judge_id);
CREATE INDEX IF NOT EXISTS judge_activity_case_idx ON judge_activity_log(case_id);
CREATE INDEX IF NOT EXISTS judge_activity_created_idx ON judge_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS judge_messages_sender_idx ON judge_messages(sender_id);
CREATE INDEX IF NOT EXISTS judge_messages_recipient_idx ON judge_messages(recipient_id);
CREATE INDEX IF NOT EXISTS judge_messages_case_idx ON judge_messages(case_id);
CREATE INDEX IF NOT EXISTS judge_messages_created_idx ON judge_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS judge_messages_unread_idx ON judge_messages(recipient_id, is_read);

-- 12. Enable RLS (Row Level Security)
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_messages ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS Policies
-- Judges can see their own records
CREATE POLICY "Judges can view own profile" ON judges
  FOR SELECT USING (id = current_setting('app.current_judge_id')::uuid);

CREATE POLICY "Judges can update own profile" ON judges
  FOR UPDATE USING (id = current_setting('app.current_judge_id')::uuid);

-- Judge sessions (for authentication)
CREATE POLICY "Judges can view own sessions" ON judge_sessions
  FOR ALL USING (judge_id = current_setting('app.current_judge_id')::uuid);

-- Court cases - judges see assigned cases, participants see their cases
CREATE POLICY "Judges can view assigned cases" ON court_cases
  FOR SELECT USING (
    assigned_judge_id = current_setting('app.current_judge_id')::uuid OR
    EXISTS (
      SELECT 1 FROM case_participants 
      WHERE case_id = court_cases.id 
      AND participant_id = auth.uid() 
      AND participant_type IN ('learner', 'provider')
    )
  );

CREATE POLICY "Judges can update assigned cases" ON court_cases
  FOR UPDATE USING (assigned_judge_id = current_setting('app.current_judge_id')::uuid);

-- Case participants - see own participation
CREATE POLICY "View case participation" ON case_participants
  FOR SELECT USING (
    participant_id = auth.uid() OR 
    participant_id = current_setting('app.current_judge_id')::uuid
  );

-- Evidence - participants and assigned judge can see
CREATE POLICY "View case evidence" ON dispute_evidence
  FOR SELECT USING (
    submitted_by = auth.uid() OR
    submitted_by = current_setting('app.current_judge_id')::uuid OR
    EXISTS (
      SELECT 1 FROM case_participants cp
      JOIN court_cases cc ON cp.case_id = cc.id
      WHERE cp.case_id = dispute_evidence.case_id
      AND (cp.participant_id = auth.uid() OR cc.assigned_judge_id = current_setting('app.current_judge_id')::uuid)
    )
  );

-- Messages - participants and judge can see (unless internal)
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
      AND cc.assigned_judge_id = current_setting('app.current_judge_id')::uuid
    )
  );

-- Provider restrictions - providers see their own, judges see all
CREATE POLICY "View provider restrictions" ON provider_restrictions
  FOR SELECT USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM court_cases cc
      WHERE cc.id = provider_restrictions.case_id
      AND cc.assigned_judge_id = current_setting('app.current_judge_id')::uuid
    )
  );

-- Judge assignments - judges see their own assignments
CREATE POLICY "View judge assignments" ON judge_case_assignments
  FOR SELECT USING (judge_id = current_setting('app.current_judge_id')::uuid);

-- Activity log - judges see their own activities
CREATE POLICY "View judge activities" ON judge_activity_log
  FOR SELECT USING (judge_id = current_setting('app.current_judge_id')::uuid);

-- Judge messages - judges see messages they sent or received
CREATE POLICY "View judge messages" ON judge_messages
  FOR SELECT USING (
    sender_id = current_setting('app.current_judge_id')::uuid OR 
    recipient_id = current_setting('app.current_judge_id')::uuid
  );

CREATE POLICY "Insert judge messages" ON judge_messages
  FOR INSERT WITH CHECK (sender_id = current_setting('app.current_judge_id')::uuid);

CREATE POLICY "Update judge messages" ON judge_messages
  FOR UPDATE USING (
    recipient_id = current_setting('app.current_judge_id')::uuid
  );

-- 14. Create utility functions

-- Generate case number
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS text AS $$
DECLARE
  year_part text := EXTRACT(YEAR FROM NOW())::text;
  sequence_part text;
  case_number text;
BEGIN
  -- Get next sequence number for this year
  WITH year_cases AS (
    SELECT COUNT(*) + 1 as next_num
    FROM court_cases 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  )
  SELECT LPAD(next_num::text, 6, '0') INTO sequence_part FROM year_cases;
  
  case_number := 'CV-' || year_part || '-' || sequence_part;
  
  RETURN case_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-assign judge based on workload and specialization
CREATE OR REPLACE FUNCTION auto_assign_judge(dispute_type_param text)
RETURNS uuid AS $$
DECLARE
  selected_judge_id uuid;
BEGIN
  -- Find judge with matching specialization and lowest current caseload
  WITH judge_workload AS (
    SELECT 
      j.id,
      j.specialization,
      COUNT(jca.case_id) as active_cases
    FROM judges j
    LEFT JOIN judge_case_assignments jca ON j.id = jca.judge_id
    LEFT JOIN court_cases cc ON jca.case_id = cc.id AND cc.status NOT IN ('resolved', 'closed')
    WHERE j.status = 'active'
    AND (
      j.specialization = '{}' OR -- General judges
      dispute_type_param = ANY(j.specialization) -- Specialized judges
    )
    GROUP BY j.id, j.specialization
    ORDER BY 
      CASE WHEN dispute_type_param = ANY(j.specialization) THEN 0 ELSE 1 END, -- Prefer specialists
      active_cases ASC, -- Then by workload
      RANDOM() -- Random tiebreaker
    LIMIT 1
  )
  SELECT id INTO selected_judge_id FROM judge_workload;
  
  RETURN selected_judge_id;
END;
$$ LANGUAGE plpgsql;

-- Create court case automatically when refund is requested
CREATE OR REPLACE FUNCTION create_court_case_for_refund()
RETURNS trigger AS $$
DECLARE
  provider_id_val uuid;
  case_id_val uuid;
  judge_id_val uuid;
BEGIN
  -- Get provider_id from booking or payment
  IF NEW.booking_id IS NOT NULL THEN
    SELECT provider_id INTO provider_id_val 
    FROM bookings 
    WHERE id = NEW.booking_id;
  ELSE
    -- Try to get provider from payment content
    SELECT 
      CASE 
        WHEN p.payment_type = 'booking' THEN b.provider_id
        WHEN p.payment_type IN ('course', 'video') THEN ci.owner_id
        ELSE NULL
      END INTO provider_id_val
    FROM payments p
    LEFT JOIN bookings b ON p.admin_notes LIKE '%content_id:' || b.id || '%'
    LEFT JOIN content_items ci ON p.admin_notes LIKE '%content_id:' || ci.id || '%'
    WHERE p.id = NEW.payment_id;
  END IF;

  -- Skip if no provider found (shouldn't happen for valid disputes)
  IF provider_id_val IS NULL THEN
    RETURN NEW;
  END IF;

  -- Auto-assign judge based on dispute type (default to 'other' for now)
  judge_id_val := auto_assign_judge('other');

  -- Create court case
  INSERT INTO court_cases (
    case_number,
    refund_id,
    assigned_judge_id,
    learner_id,
    provider_id,
    booking_id,
    payment_id,
    dispute_type,
    disputed_amount,
    status,
    auto_assigned,
    complexity_score
  ) VALUES (
    generate_case_number(),
    NEW.id,
    judge_id_val,
    NEW.user_id,
    provider_id_val,
    NEW.booking_id,
    NEW.payment_id,
    'other', -- Will be updated by judge
    NEW.amount,
    'open',
    true,
    CASE 
      WHEN NEW.amount > 100 THEN 3
      WHEN NEW.amount > 50 THEN 2
      ELSE 1
    END
  ) RETURNING id INTO case_id_val;

  -- Create case participants
  INSERT INTO case_participants (case_id, participant_id, participant_type, role) VALUES
    (case_id_val, NEW.user_id, 'learner', 'complainant'),
    (case_id_val, provider_id_val, 'provider', 'defendant');
    
  -- Add judge as participant if assigned
  IF judge_id_val IS NOT NULL THEN
    INSERT INTO case_participants (case_id, participant_id, participant_type, role) VALUES
      (case_id_val, judge_id_val, 'judge', 'mediator');
      
    -- Create judge assignment record
    INSERT INTO judge_case_assignments (judge_id, case_id, assignment_type) VALUES
      (judge_id_val, case_id_val, 'auto');
  END IF;

  -- Apply provider restrictions
  INSERT INTO provider_restrictions (provider_id, case_id, restriction_type, reason) VALUES
    (provider_id_val, case_id_val, 'booking_disabled', 'Automatic restriction due to dispute case');

  -- Create initial system message
  INSERT INTO case_messages (case_id, sender_type, message_type, content) VALUES
    (case_id_val, 'system', 'system_update', 'Court case opened automatically for refund request. Judge assigned: ' || COALESCE((SELECT full_name FROM judges WHERE id = judge_id_val), 'Unassigned'));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create court cases
DROP TRIGGER IF EXISTS create_court_case_trigger ON refunds;
CREATE TRIGGER create_court_case_trigger
  AFTER INSERT ON refunds
  FOR EACH ROW EXECUTE FUNCTION create_court_case_for_refund();

-- 14. Insert sample judges for testing
INSERT INTO judges (email, full_name, specialization, status, rank) VALUES
  ('chief.judge@coursevia.com', 'Chief Justice Sarah Chen', '{"payment_disputes","booking_conflicts","content_issues"}', 'active', 'chief'),
  ('senior.judge1@coursevia.com', 'Judge Michael Rodriguez', '{"payment_disputes","booking_conflicts"}', 'active', 'senior'),
  ('judge1@coursevia.com', 'Judge Emily Thompson', '{"booking_conflicts"}', 'active', 'junior'),
  ('judge2@coursevia.com', 'Judge David Kim', '{"content_issues","payment_disputes"}', 'active', 'junior')
ON CONFLICT (email) DO NOTHING;

-- 16. Update refunds table to link with court cases
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS court_case_id uuid REFERENCES court_cases(id) ON DELETE SET NULL;

-- Function to update refunds with court case reference
CREATE OR REPLACE FUNCTION link_refund_to_court_case()
RETURNS trigger AS $$
BEGIN
  UPDATE refunds 
  SET court_case_id = NEW.id 
  WHERE id = NEW.refund_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to link refunds and court cases
DROP TRIGGER IF EXISTS link_refund_court_case_trigger ON court_cases;
CREATE TRIGGER link_refund_court_case_trigger
  AFTER INSERT ON court_cases
  FOR EACH ROW EXECUTE FUNCTION link_refund_to_court_case();

SELECT 'Court Room system migration applied successfully' AS result;