-- ============================================================================
-- SIMPLE FIX PAYMENT METHODS TABLE
-- ============================================================================

-- Drop the problematic trigger first (try both possible names)
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON payment_methods;
DROP FUNCTION IF EXISTS update_payment_methods_updated_at() CASCADE;

-- Add updated_at column if it doesn't exist
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns if they don't exist
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS checkout_source_id VARCHAR(255);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS card_brand VARCHAR(50);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS card_exp_month INTEGER;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS card_exp_year INTEGER;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS card_type VARCHAR(50);

-- Migrate existing data (simple UPDATE without trigger issues)
UPDATE payment_methods SET card_last4 = last4 WHERE card_last4 IS NULL AND last4 IS NOT NULL;
UPDATE payment_methods SET card_brand = brand WHERE card_brand IS NULL AND brand IS NOT NULL;
UPDATE payment_methods SET card_exp_month = exp_month WHERE card_exp_month IS NULL AND exp_month IS NOT NULL;
UPDATE payment_methods SET card_exp_year = exp_year WHERE card_exp_year IS NULL AND exp_year IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_methods_updated_at();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_checkout_source_id ON payment_methods(checkout_source_id);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON payment_methods;

-- Create RLS policies
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON payment_methods TO authenticated;

-- Create or replace function to set default payment method
CREATE OR REPLACE FUNCTION set_default_payment_method(
    p_user_id UUID,
    p_method_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Remove default from all user's payment methods
    UPDATE payment_methods
    SET is_default = false
    WHERE user_id = p_user_id;

    -- Set new default
    UPDATE payment_methods
    SET is_default = true
    WHERE id = p_method_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_default_payment_method(UUID, UUID) TO authenticated;

-- Verification
SELECT '=== VERIFICATION ===' as section;

SELECT 
    'Table columns:' as check_type,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as result
FROM information_schema.columns 
WHERE table_name = 'payment_methods';

SELECT 
    'RLS policies:' as check_type,
    COUNT(*)::text as result
FROM pg_policies 
WHERE tablename = 'payment_methods';

SELECT 
    'Existing records:' as check_type,
    COUNT(*)::text as result
FROM payment_methods;

SELECT '✅ Payment methods table fixed!' as status;
