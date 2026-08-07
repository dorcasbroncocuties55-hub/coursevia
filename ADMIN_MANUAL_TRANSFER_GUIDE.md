# Admin Manual Transfer Processing Guide

## 📋 Overview
This guide shows you how to manually process transfer requests from coaches, therapists, and creators.

---

## 🔄 Transfer Processing Workflow

### Step 1: View Pending Transfers

**In Supabase SQL Editor:**

```sql
-- View all pending transfers
SELECT 
  t.id,
  t.reference,
  p.full_name,
  p.email,
  t.amount,
  t.currency,
  t.account_name,
  t.account_number,
  t.bank_name,
  t.country,
  t.created_at
FROM transfers t
JOIN profiles p ON t.user_id = p.user_id
WHERE t.status = 'pending'
ORDER BY t.created_at DESC;
```

**Output Example:**
```
id          | reference         | full_name    | email              | amount  | currency | account_name    | account_number | bank_name         | country | created_at
------------|-------------------|--------------|--------------------|---------| ---------|-----------------|----------------|-------------------|---------|--------------------
uuid-123... | TR1691234567ABC   | John Coach   | john@example.com   | 500.00  | USD      | John Doe        | 1234567890     | Bank of America   | US      | 2026-08-07 10:00:00
uuid-456... | TR1691234890DEF   | Jane Therapy | jane@example.com   | 250.00  | USD      | Jane Smith      | 0987654321     | Chase Bank        | US      | 2026-08-07 09:30:00
```

---

### Step 2: Process Bank Transfer

**Login to your business bank account** and create a new wire/ACH transfer:

#### Wire Transfer (Domestic US):
- **Recipient Name:** [account_name from database]
- **Account Number:** [account_number from database]
- **Bank Name:** [bank_name from database]
- **Amount:** [amount from database]
- **Memo/Reference:** [reference from database] ← **IMPORTANT: Include this!**

#### ACH Transfer (Domestic US):
- **Recipient Name:** [account_name]
- **Account Number:** [account_number]
- **Routing Number:** [you'll need to ask users for this in future]
- **Amount:** [amount]
- **Description:** [reference]

#### International (SWIFT):
- **Recipient Name:** [account_name]
- **Account Number or IBAN:** [account_number]
- **SWIFT/BIC Code:** [you'll need to ask users for this]
- **Bank Name:** [bank_name]
- **Amount:** [amount]
- **Reference:** [reference]

---

### Step 3: Mark Transfer as Completed

**After you've sent the bank transfer, update the database:**

```sql
-- Mark single transfer as completed
UPDATE transfers 
SET 
  status = 'completed',
  updated_at = NOW()
WHERE reference = 'TR1691234567ABC';
```

**Or update multiple at once:**

```sql
-- Mark multiple transfers as completed
UPDATE transfers 
SET 
  status = 'completed',
  updated_at = NOW()
WHERE reference IN (
  'TR1691234567ABC',
  'TR1691234890DEF',
  'TR1691235678GHI'
);
```

---

### Step 4: Verify Completion

```sql
-- Check completed transfers
SELECT 
  t.reference,
  p.full_name,
  t.amount,
  t.currency,
  t.status,
  t.created_at,
  t.updated_at
FROM transfers t
JOIN profiles p ON t.user_id = p.user_id
WHERE t.status = 'completed'
  AND t.updated_at > NOW() - INTERVAL '1 day'
ORDER BY t.updated_at DESC;
```

---

## 🚨 Handle Failed Transfers

If a transfer fails (wrong account number, closed account, etc.):

```sql
-- Mark transfer as failed
UPDATE transfers 
SET 
  status = 'failed',
  updated_at = NOW()
WHERE reference = 'TR1691234567ABC';

-- Return money to user's wallet
UPDATE wallets
SET 
  available_balance = available_balance + 500.00,
  balance = balance + 500.00,
  updated_at = NOW()
WHERE user_id = (
  SELECT user_id FROM transfers WHERE reference = 'TR1691234567ABC'
);

-- Log the refund
INSERT INTO wallet_transactions (wallet_id, amount, transaction_type, balance_after, description)
SELECT 
  w.id,
  500.00,
  'refund',
  w.available_balance,
  'Transfer failed - refunded (TR1691234567ABC)'
FROM wallets w
WHERE w.user_id = (
  SELECT user_id FROM transfers WHERE reference = 'TR1691234567ABC'
);
```

---

## 📊 Useful Queries

### Daily Transfer Report
```sql
-- Today's transfers summary
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  currency
FROM transfers
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY status, currency
ORDER BY status;
```

### Weekly Transfer Volume
```sql
-- Last 7 days transfers
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transfer_count,
  SUM(amount) as total_amount,
  currency
FROM transfers
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), currency
ORDER BY date DESC;
```

### User Transfer History
```sql
-- Get all transfers for a specific user
SELECT 
  t.reference,
  t.amount,
  t.currency,
  t.status,
  t.bank_name,
  t.created_at,
  t.updated_at
FROM transfers t
WHERE t.user_id = 'user-uuid-here'
ORDER BY t.created_at DESC;
```

### Pending Transfers by Amount
```sql
-- Pending transfers sorted by amount (process large ones first)
SELECT 
  t.reference,
  p.full_name,
  t.amount,
  t.currency,
  t.account_name,
  t.bank_name,
  t.created_at
FROM transfers t
JOIN profiles p ON t.user_id = p.user_id
WHERE t.status = 'pending'
ORDER BY t.amount DESC;
```

---

## ⏱️ Processing Timeline

| Transfer Type | Processing Time | Your Action |
|--------------|-----------------|-------------|
| **ACH (US)** | 3-5 business days | Send within 1 business day |
| **Wire (US)** | Same day or 1 day | Send within 1 business day |
| **International SWIFT** | 3-7 business days | Send within 1 business day |

---

## ✅ Best Practices

1. **Process transfers daily** (or set specific days like Monday/Thursday)
2. **Batch process** multiple transfers at once to save time
3. **Always include reference number** in bank transfer memo
4. **Update database immediately** after sending transfer
5. **Keep bank transfer receipts** for accounting
6. **Verify account details** before sending large amounts
7. **Check for duplicates** before processing

---

## 🔐 Security Checklist

Before processing:
- [ ] Verify user's wallet had sufficient balance
- [ ] Check transfer wasn't already processed
- [ ] Confirm bank details look legitimate (not obviously fake)
- [ ] For large amounts (>$5000), verify user identity
- [ ] Keep transfer reference for tracking

---

## 📧 Notify Users (Optional)

After processing, you can manually email users or add automated notifications later:

**Email Template:**
```
Subject: Transfer Completed - ${reference}

Hi ${full_name},

Your transfer request has been processed:
- Reference: ${reference}
- Amount: ${currency} ${amount}
- Bank: ${bank_name}
- Account: ***${last_4_digits}

The money should arrive in your account within 1-5 business days depending on your bank.

Thank you,
Coursevia Team
```

---

## 🚀 Future Automation

When ready to automate, switch to:
- **Stripe Connect** (2.9% fee, 1-2 day processing)
- **Wise Business API** (0.5-1.5% fee, 1-3 day processing)

For now, manual processing is fine for:
- Low volume (< 50 transfers/week)
- Testing phase
- MVP launch

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for errors
2. Verify wallet balances match transfer records
3. Review CREATE_TRANSFERS_TABLE.sql for schema
4. See PADDLE_PAYOUT_INTEGRATION.md for technical details

---

**Last Updated:** 2026-08-07
**Status:** ✅ Ready for manual processing
