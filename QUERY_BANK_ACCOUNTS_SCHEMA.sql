-- Query to see the actual schema of user_bank_accounts table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_bank_accounts'
ORDER BY ordinal_position;
