-- ============================================================================
-- FIX WITHDRAWALS TABLE
-- ============================================================================

-- Create withdrawals table if it doesn't exist
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    bank_account_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Enable RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can insert their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Admins can update withdrawals" ON withdrawals;

-- User policies
CREATE POLICY "Users can view their own withdrawals" ON withdrawals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawals" ON withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (admins can see and update all)
CREATE POLICY "Admins can view all withdrawals" ON withdrawals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update withdrawals" ON withdrawals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON withdrawals TO authenticated;

-- Also ensure wallets table has available_balance column
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(10,2) DEFAULT 0;

-- Sync available_balance with balance for existing wallets
UPDATE wallets SET available_balance = balance WHERE available_balance = 0 AND balance > 0;

SELECT '✅ Withdrawals table ready!' as status;
SELECT 'Total withdrawals:' as check_type, COUNT(*)::text as result FROM withdrawals;
