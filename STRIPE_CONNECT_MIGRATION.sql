-- ══════════════════════════════════════════════════════════════════════════════
-- STRIPE CONNECT - DATABASE MIGRATION
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Add Stripe Connect columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account 
ON profiles(stripe_account_id) 
WHERE stripe_account_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Withdrawal Requests Table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  provider_role TEXT NOT NULL DEFAULT 'creator', -- 'creator', 'coach', 'therapist'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  stripe_transfer_id TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_user_status 
ON withdrawal_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_withdrawal_stripe_transfer 
ON withdrawal_requests(stripe_transfer_id) 
WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requested_at 
ON withdrawal_requests(requested_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Refunds Table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References (at least one required)
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  
  -- Parties involved
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_role TEXT NOT NULL DEFAULT 'creator', -- 'creator', 'coach', 'therapist'
  
  -- Refund details
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT NOT NULL,
  refund_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'partial'
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  stripe_refund_id TEXT,
  stripe_reversal_id TEXT, -- If we need to reverse a transfer
  
  -- Audit trail
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Additional info
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refunds_learner_status 
ON refunds(learner_id, status);

CREATE INDEX IF NOT EXISTS idx_refunds_provider_status 
ON refunds(provider_id, status);

CREATE INDEX IF NOT EXISTS idx_refunds_payment 
ON refunds(payment_id) 
WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refunds_booking 
ON refunds(booking_id) 
WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refunds_requested_at 
ON refunds(requested_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Update existing wallet_ledger to support reference IDs
-- ══════════════════════════════════════════════════════════════════════════════

-- Add reference_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_ledger' AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE wallet_ledger ADD COLUMN reference_id UUID;
    CREATE INDEX idx_wallet_ledger_reference ON wallet_ledger(reference_id) WHERE reference_id IS NOT NULL;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Row Level Security (RLS) Policies
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Withdrawal Requests Policies
CREATE POLICY "Users can view their own withdrawal requests"
ON withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests"
ON withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can see all withdrawals
CREATE POLICY "Admins can view all withdrawal requests"
ON withdrawal_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Refunds Policies
CREATE POLICY "Users can view refunds they're involved in"
ON refunds FOR SELECT
USING (
  auth.uid() = learner_id 
  OR auth.uid() = provider_id 
  OR auth.uid() = requested_by
);

CREATE POLICY "Authorized users can create refunds"
ON refunds FOR INSERT
WITH CHECK (
  auth.uid() = requested_by
  AND (
    auth.uid() = learner_id 
    OR auth.uid() = provider_id
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'support_agent')
    )
  )
);

-- Admins can see all refunds
CREATE POLICY "Admins can view all refunds"
ON refunds FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Helper Functions
-- ══════════════════════════════════════════════════════════════════════════════

-- Function to get user's withdrawal summary
CREATE OR REPLACE FUNCTION get_withdrawal_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_withdrawals', COALESCE(COUNT(*), 0),
    'total_amount', COALESCE(SUM(amount), 0),
    'completed_withdrawals', COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
    'completed_amount', COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0),
    'pending_withdrawals', COALESCE(SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END), 0),
    'pending_amount', COALESCE(SUM(CASE WHEN status IN ('pending', 'processing') THEN amount ELSE 0 END), 0),
    'last_withdrawal', MAX(requested_at)
  )
  INTO result
  FROM withdrawal_requests
  WHERE user_id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's refund summary
CREATE OR REPLACE FUNCTION get_refund_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'refunds_received', COALESCE(SUM(CASE WHEN learner_id = p_user_id THEN 1 ELSE 0 END), 0),
    'refunds_received_amount', COALESCE(SUM(CASE WHEN learner_id = p_user_id THEN amount ELSE 0 END), 0),
    'refunds_issued', COALESCE(SUM(CASE WHEN provider_id = p_user_id THEN 1 ELSE 0 END), 0),
    'refunds_issued_amount', COALESCE(SUM(CASE WHEN provider_id = p_user_id THEN amount ELSE 0 END), 0)
  )
  INTO result
  FROM refunds
  WHERE (learner_id = p_user_id OR provider_id = p_user_id)
  AND status = 'completed';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Triggers for updated_at
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at
BEFORE UPDATE ON refunds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE!
-- ══════════════════════════════════════════════════════════════════════════════

-- Verify tables exist
SELECT 'withdrawal_requests' as table_name, COUNT(*) as row_count FROM withdrawal_requests
UNION ALL
SELECT 'refunds', COUNT(*) FROM refunds;
