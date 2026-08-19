# 🔄 Stripe Connect Flow - Complete Explanation

## Overview
This flow enables creators, coaches, and therapists on your Coursevia marketplace to receive real money payouts to their bank accounts through Stripe Connect Express accounts.

---

## 🎯 The Complete User Journey

### Phase 1: Initial Setup (User's First Time)

#### Step 1: User Clicks "Set up Payouts"
```
📱 Frontend: User clicks "Set up Payouts" button on their dashboard
   ↓
🔧 Action: Frontend calls POST /api/connect/setup
   ↓
📄 Request Body: {
     "email": "creator@example.com",
     "userId": "user_12345", 
     "role": "creator",
     "country": "GB",
     "businessInfo": {
       "businessName": "Creative Services Ltd",
       "description": "Professional video content creation"
     }
   }
```

#### Step 2: Backend Creates Stripe Express Account
```
⚙️ Backend Process:
   1. Check if user already has Stripe account
   2. If not, create new Stripe Express account with:
      - Type: "express" (Stripe-hosted onboarding)
      - Country: "GB" (United Kingdom)  
      - Email: User's email
      - Business profile with role-specific MCC code:
         • Creator: 7372 (Computer Programming Services)
         • Coach: 7299 (Miscellaneous Personal Services)  
         • Therapist: 8099 (Health Practitioners)
      - Metadata: Internal user ID, role tracking
   
   3. Save account ID to database:
      profiles.stripe_account_id = "acct_1A2B3C..."
      profiles.stripe_connect_status = "pending"
```

#### Step 3: Generate Onboarding Link (5-minute expiry)
```
🔗 Backend Creates Account Link:
   - return_url: "https://coursevia.com/creator/payouts/success"
   - refresh_url: "https://coursevia.com/creator/payouts/setup?retry=true"  
   - collect: "eventually_due" (all required info)
   - expires: 5 minutes from creation

📤 Response to Frontend: {
     "success": true,
     "accountId": "acct_1A2B3C...",
     "onboardingUrl": "https://connect.stripe.com/express/acct_1A2B...",
     "isExisting": false
   }
```

#### Step 4: Redirect to Stripe Onboarding
```
🌐 Frontend: window.location.href = onboardingUrl
   ↓
🏦 Stripe Hosted Page: User completes verification:
   
   Required Information:
   ✅ Personal Details (Name, DOB, Address)
   ✅ Business Information (if applicable)
   ✅ Tax Information (SSN/EIN, Tax ID)
   ✅ Identity Verification (Government ID upload)
   ✅ Bank Account Details (Account + Routing numbers)
   
   Stripe validates everything in real-time:
   • Identity verification with government databases
   • Bank account validation with banking networks
   • Address verification 
   • Tax ID validation
```

---

### Phase 2: Verification Process

#### Step 5: User Completes or Exits Stripe Form
```
✅ Success Path: User completes all required fields
   → Stripe redirects to: /creator/payouts/success?user_id=123&account_id=acct_1A2B3C
   
❌ Incomplete Path: User needs more info or exits
   → Stripe redirects to: /creator/payouts/setup?user_id=123&retry=true
   
⏰ Timeout Path: Link expires (5 minutes)
   → User must request new link
```

#### Step 6: Return URL Handling
```
🎉 Success Return (/creator/payouts/success):
   Frontend calls: POST /api/connect/status/user_123
   
   Backend checks account status:
   1. Retrieve account from Stripe
   2. Check: details_submitted, payouts_enabled
   3. Update local database status
   
   Possible States:
   • "pending" - Details submitted, under review
   • "active" - Fully verified, payouts enabled  
   • "restricted" - Need more information
```

#### Step 7: Stripe Reviews Account (Automatic)
```
🔍 Stripe Background Process:
   • Reviews submitted documents
   • Verifies identity with databases
   • Validates bank account
   • Performs risk assessment
   
⏱️ Timeline: Usually 2-7 business days
   • Simple cases: Few hours
   • Complex cases: Up to 7 days
   • Additional documents may be requested
```

---

### Phase 3: Account Status Updates (Webhooks)

#### Step 8: Stripe Sends Webhook When Status Changes
```
📡 Webhook Event: account.updated
   Stripe POST → https://coursevia.com/api/connect/webhook
   
   Event Data: {
     "type": "account.updated",
     "data": {
       "object": {
         "id": "acct_1A2B3C...",
         "payouts_enabled": true,      ← Changed from false!
         "details_submitted": true,
         "charges_enabled": true,
         "requirements": {
           "currently_due": [],        ← Was empty before  
           "past_due": []
         }
       }
     }
   }
```

#### Step 9: Backend Processes Webhook
```
⚙️ Webhook Handler Logic:
   1. Find user by stripe_account_id
   2. Compare old vs new status:
      - Was: payouts_enabled = false (Restricted)
      - Now: payouts_enabled = true (Enabled)
   
   3. Update database:
      profiles.stripe_payouts_enabled = true
      profiles.stripe_connect_status = "active"
      profiles.updated_at = NOW()
   
   4. Log the change:
      admin_logs.action = "stripe_account_enabled"
      admin_logs.details = {...status_change_info...}
   
   5. Optional: Send email notification to user
```

---

### Phase 4: Ongoing Usage

#### Step 10: User Can Now Receive Payouts
```
💰 When learner pays for course/session:
   
   Payment Split (automatic):
   • 5% → Platform (Admin wallet)
   • 95% → Provider (Creator wallet)
   
   Provider Payout Options:
   1. Manual withdrawal via dashboard
   2. Automatic Stripe Connect transfer (if enabled)
```

#### Step 11: Express Dashboard Access
```
🎛️ User clicks "Manage Payouts":
   Frontend calls: POST /api/connect/dashboard-link
   
   Backend creates Stripe login link:
   • Valid for 1 hour
   • Direct access to Express dashboard
   • User can update bank info, view transactions
```

---

## 📊 Database Status Tracking

### Profiles Table Changes:
```sql
-- Initial state (new user)
stripe_account_id: NULL
stripe_connect_status: NULL
stripe_payouts_enabled: false

-- After account creation  
stripe_account_id: "acct_1A2B3C..."
stripe_connect_status: "pending"
stripe_payouts_enabled: false

-- After onboarding completion
stripe_account_id: "acct_1A2B3C..."  
stripe_connect_status: "pending"
stripe_payouts_enabled: false
stripe_onboarding_completed: true
stripe_details_submitted: true

-- After Stripe approval (via webhook)
stripe_account_id: "acct_1A2B3C..."
stripe_connect_status: "active"  ← Status change!
stripe_payouts_enabled: true     ← Can receive money!
```

---

## 🔄 Error Scenarios & Recovery

### Scenario 1: User Abandons Onboarding
```
Problem: User closes Stripe page without completing
Status: stripe_connect_status = "pending", payouts_enabled = false

Recovery:
1. User clicks "Complete Setup" on dashboard
2. Frontend calls POST /api/connect/refresh-link  
3. New 5-minute onboarding link generated
4. User redirected to complete verification
```

### Scenario 2: Additional Information Required
```
Problem: Stripe requests more documents
Webhook: account.updated with requirements.currently_due = ["document"]

User Experience:
1. Status shows "Under Review - Additional Info Needed"
2. User clicks "Complete Verification" 
3. Redirected to Stripe with specific requirements
4. After submission, webhook updates status again
```

### Scenario 3: Account Rejected
```
Problem: Stripe rejects account (rare)
Status: payouts_enabled = false, requirements.disabled_reason exists

Recovery Options:
1. User provides additional documentation
2. User creates new account (if eligible)
3. Manual review process through Stripe support
```

---

## 🎨 Branding & User Experience

### Stripe Express Dashboard Appearance:
```
🌈 Your Coursevia Branding Applied:
• Primary Color: #10B981 (your emerald green)
• Company Name: "Coursevia"  
• Logo: Your platform logos
• Statement Descriptor: "COURSEVIA EARNINGS"

User sees consistent branding throughout:
• Onboarding flow matches your platform colors
• Express dashboard feels like part of Coursevia
• Bank statements show "COURSEVIA EARNINGS"
```

---

## ⚡ Technical Implementation Notes

### Frontend Integration Points:
```javascript
// 1. Setup button click
const handleSetupPayouts = async () => {
  const response = await fetch('/api/connect/setup', {
    method: 'POST',
    body: JSON.stringify({ email, userId, role, country: 'GB' })
  });
  const { onboardingUrl } = await response.json();
  window.location.href = onboardingUrl;
};

// 2. Status checking  
const checkPayoutStatus = async () => {
  const response = await fetch(`/api/connect/status/${userId}`);
  const status = await response.json();
  return status.payouts_enabled; // true = can receive money
};

// 3. Dashboard access
const openStripeDashboard = async () => {
  const response = await fetch('/api/connect/dashboard-link', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
  const { dashboardUrl } = await response.json();
  window.open(dashboardUrl, '_blank');
};
```

### Backend Security Measures:
```javascript
// Webhook signature verification
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body, 
  signature, 
  process.env.STRIPE_WEBHOOK_SECRET
);

// Input validation
const validation = validateVendorData({ email, userId, role });
if (!validation.isValid) {
  return res.status(400).json({ errors: validation.errors });
}

// Database integrity
await supabase.from('profiles')
  .update({ stripe_account_id: accountId })
  .eq('user_id', userId)
  .eq('stripe_account_id', null); // Prevent overwrites
```

---

## 🚀 Benefits of This Flow

### For Users (Creators/Coaches/Therapists):
✅ **Simple Setup** - One-click starts the process  
✅ **Professional UI** - Stripe's polished onboarding experience  
✅ **Real Verification** - Actual bank account validation  
✅ **Fast Payouts** - 2-7 days to bank account  
✅ **Dashboard Access** - Manage everything directly in Stripe  
✅ **Global Support** - Works in 40+ countries  

### For Platform (Coursevia):
✅ **Compliance Handled** - Stripe manages KYC/AML  
✅ **Reduced Support** - Users manage their own accounts  
✅ **Real Money Movement** - Actual bank transfers  
✅ **Status Automation** - Webhooks keep database in sync  
✅ **Branded Experience** - Maintains platform consistency  
✅ **Scalable** - No manual verification processes  

---

## 📈 Success Metrics

### Key Performance Indicators:
- **Onboarding Completion Rate**: % of users who complete Stripe verification
- **Time to First Payout**: Days from signup to first withdrawal  
- **Support Ticket Reduction**: Fewer banking/payout related issues
- **Provider Satisfaction**: Ratings for payout experience
- **Platform Revenue**: Commission from successful transactions

---

This flow transforms your marketplace from a manual payout system to a fully automated, compliant, and professional payment infrastructure! 🎉