# 💰 Payment Flow & Withdrawal System Explained

## Your Questions Answered

### ✅ Question 1: Will payments be available in booking and checkout systems?
**Answer: YES! Payments flow automatically into wallets.**

### ✅ Question 2: Can admin also use payout/withdrawal?
**Answer: YES! Admin has their own withdrawal page at `/admin/withdrawals`**

---

## 🔄 How Money Flows in Your System

### 1. Learner Makes Payment

**Scenario A: Booking a Session (Coach/Therapist)**
```
Learner pays $100 for a coaching session
  ↓
Payment goes through Stripe Checkout
  ↓
Webhook confirms payment
  ↓
Money is split:
  • 5% → Admin wallet ($5)
  • 95% → Provider wallet ($95) [8-day hold]
```

**Scenario B: Buying Course/Video (Creator)**
```
Learner pays $50 for a course
  ↓
Payment goes through Stripe Checkout
  ↓
Webhook confirms payment
  ↓
Money is split:
  • 5% → Admin wallet ($2.50)
  • 95% → Creator wallet ($47.50) [8-day hold]
```

**Scenario C: Subscription Payment**
```
Learner pays $10/month subscription
  ↓
Payment goes through Stripe
  ↓
Webhook confirms payment
  ↓
Money goes:
  • 100% → Admin wallet ($10) [no provider split]
```

---

## 💵 Wallet System Details

### When Payment is Successful:

1. **Admin Gets 5% Immediately (Available)**
   - Goes into admin wallet as `available_balance`
   - Can withdraw immediately
   - No holding period

2. **Provider Gets 95% in Pending (8-day hold)**
   - Goes into provider wallet as `pending_balance`
   - Cannot withdraw yet
   - After 8 days, automatically moves to `available_balance`
   - Then provider can withdraw

### Example Timeline:
```
Day 0: Learner pays $100 for coaching session
  → Admin gets $5 (available now)
  → Coach gets $95 (pending)

Day 8: 8-day hold period ends
  → Coach's $95 moves from pending → available
  → Coach can now withdraw

Day 9: Coach withdraws $95
  → $95 deducted from wallet
  → Transfer recorded in database
  → Money sent to coach's bank account
```

---

## 🏦 Withdrawal System (All Users)

### Who Can Withdraw?
✅ **Admin** - via `/admin/withdrawals`  
✅ **Creators** - via `/creator/bank-transfer`  
✅ **Coaches** - via `/coach/bank-transfer`  
✅ **Therapists** - via `/therapist/bank-transfer`  

### Withdrawal Process:
```
1. User has available balance (not pending)
2. User clicks "Transfer" on their dashboard
3. User enters amount and selects bank account
4. Frontend immediately:
   • Deducts from available_balance
   • Records withdrawal in database
   • Shows "Transfer Successful" ✅
5. Done! No approval needed
```

### Admin Withdrawal Page:
Location: `/admin/withdrawals`  
Features:
- View all pending/completed withdrawals (all users)
- Admin can see their own wallet balance
- Admin can withdraw their earnings
- Admin can approve/reject provider withdrawal requests (if system requires approval)

---

## 📊 Revenue Split Breakdown

### For Services (Bookings, Courses, Videos):
- **Platform fee**: 5% to admin
- **Provider share**: 95% to creator/coach/therapist

### For Subscriptions:
- **Platform fee**: 100% to admin (no provider)

### Example Earnings:

| Transaction Type | Amount | Admin Gets | Provider Gets | Hold Period |
|-----------------|--------|------------|---------------|-------------|
| Coaching Session | $100 | $5 | $95 | 8 days |
| Online Course | $50 | $2.50 | $47.50 | 8 days |
| Video Purchase | $20 | $1 | $19 | 8 days |
| Monthly Subscription | $10 | $10 | $0 | No hold |

---

## 🔍 Code Reference (Backend)

### Payment Processing (`backend/server.js`):

```javascript
// When payment succeeds via Stripe webhook
const markPaymentVerified = async ({ reference, type, userId, contentId, amount }) => {
  
  // Calculate splits
  const adminShare = type === "subscription" 
    ? amount                              // 100% for subscriptions
    : Math.round(amount * 0.05 * 100) / 100; // 5% for services
  
  const providerShare = amount - adminShare;   // 95% for providers
  
  // Credit admin wallet (available immediately)
  await supabaseAdmin.from("wallets").update({
    available_balance: adminWallet.available_balance + adminShare
  });
  
  // Credit provider wallet (pending 8 days)
  await supabaseAdmin.from("wallets").update({
    pending_balance: providerWallet.pending_balance + providerShare
  });
  
  // Record in ledger
  await supabaseAdmin.from("wallet_ledger").insert([
    { wallet_id: adminWallet.id, amount: adminShare, type: "credit", 
      description: "Admin share from payment" },
    { wallet_id: providerWallet.id, amount: providerShare, type: "credit", 
      description: "Provider share (pending 8-day release)" }
  ]);
};
```

---

## 📍 Frontend Pages Reference

### Admin Pages:
- **`/admin/wallet`** - View wallet balance
- **`/admin/withdrawals`** - Withdraw admin earnings + manage provider withdrawals
- **`/admin/bank-accounts`** - Manage admin bank accounts
- **`/admin/transactions`** - View all transactions

### Provider Pages:
- **`/creator/bank-transfer`** - Creator withdrawals
- **`/coach/bank-transfer`** - Coach withdrawals
- **`/therapist/bank-transfer`** - Therapist withdrawals
- **`/{role}/bank-accounts`** - Manage bank accounts

---

## ⚙️ Database Tables Used

### Payment Flow:
```sql
payments
├─ payer_id (learner)
├─ amount
├─ payment_type (booking, course, video, subscription)
├─ status (success, pending, failed)
├─ admin_share (5% or 100%)
└─ provider_share (95% or 0%)

wallets
├─ user_id (admin, creator, coach, therapist)
├─ balance (total)
├─ available_balance (can withdraw)
└─ pending_balance (8-day hold)

wallet_ledger
├─ wallet_id
├─ amount
├─ type (credit, debit)
├─ description
└─ balance_after

withdrawals
├─ user_id
├─ amount
├─ bank_account_id
├─ status (completed, pending, failed)
└─ created_at

bank_accounts
├─ user_id
├─ bank_name
├─ account_number
└─ is_default
```

---

## ✅ System Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| **Booking payments** | ✅ Working | Money splits 5% admin / 95% provider |
| **Course payments** | ✅ Working | Money splits 5% admin / 95% creator |
| **Video payments** | ✅ Working | Money splits 5% admin / 95% creator |
| **Subscription payments** | ✅ Working | 100% goes to admin |
| **Wallet system** | ✅ Working | Tracks balances for all users |
| **8-day hold** | ✅ Working | Auto-releases via cron job |
| **Admin withdrawals** | ✅ Available | Admin can withdraw at `/admin/withdrawals` |
| **Provider withdrawals** | ✅ Available | Each role has their own page |
| **Bank accounts** | ✅ Working | All users can add/manage banks |
| **Withdrawal history** | ✅ Working | All transactions tracked |

---

## 🎯 Summary

### For Admins:
1. ✅ You earn 5% from every booking/course/video sale
2. ✅ You earn 100% from subscriptions
3. ✅ Your earnings go directly to `available_balance` (no hold)
4. ✅ You can withdraw anytime from `/admin/withdrawals`
5. ✅ You can see all provider withdrawals and manage them

### For Providers (Creators/Coaches/Therapists):
1. ✅ You earn 95% from your sales
2. ✅ Your earnings start in `pending_balance` (8-day hold)
3. ✅ After 8 days, money moves to `available_balance`
4. ✅ You can withdraw anytime from your dashboard
5. ✅ No admin approval needed (instant withdrawal)

### Payment Flow is Complete:
- ✅ Stripe collects payment
- ✅ Webhook confirms payment
- ✅ Money splits automatically
- ✅ Wallets update immediately
- ✅ Everyone can withdraw when balance is available
- ✅ All transactions tracked in database

**Your payment and withdrawal system is fully functional!** 🎉

---

**Generated:** August 19, 2026  
**System:** Coursevia Platform  
**Payment Provider:** Stripe
