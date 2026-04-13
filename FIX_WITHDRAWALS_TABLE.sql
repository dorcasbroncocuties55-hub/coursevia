-- Fix withdrawals table + wallet_ledger — safe to run multiple times

-- Drop old FK on withdrawals.bank_account_id if it exists (may point to wrong table)
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_bank_account_id_fkey;
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS fk_withdrawals_bank_account;

-- Ensure bank_account_id is UUID type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'bank_account_id'
  ) THEN
    ALTER TABLE withdrawals ALTER COLUMN bank_account_id TYPE UUID USING bank_account_id::UUID;
  END IF;
END $$;

-- Add wallet_ledger.released column if missing
ALTER TABLE wallet_ledger ADD COLUMN IF NOT EXISTS released BOOLEAN NOT NULL DEFAULT false;

-- Index for fast release queries
DROP INDEX IF EXISTS idx_wallet_ledger_release;
CREATE INDEX idx_wallet_ledger_release
  ON wallet_ledger(type, released, created_at)
  WHERE released = false;

SELECT 'withdrawals table fixed' as status;
SELECT 'wallet_ledger.released column ready' as status;
