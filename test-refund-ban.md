# Refund-to-Ban Pipeline Test Plan

## Prerequisites
- Backend server running on http://localhost:5000
- Supabase tables: bookings, refunds, court_cases, provider_restrictions, profiles
- Test users: 1 learner, 1 therapist/coach

## Test Scenario

### 1. Setup Test Data
```sql
-- Create a test booking
INSERT INTO bookings (learner_id, coach_id, scheduled_at, price, status, service_title)
VALUES (
  '<learner_user_id>',
  '<coach_user_id>',
  NOW() + INTERVAL '2 days',
  75.00,
  'completed',
  'Therapy Session'
);
```

### 2. Test Refund Submission (Learner Side)

**Frontend Test:**
1. Login as learner
2. Navigate to `/dashboard/bookings`
3. Find a completed booking
4. Click "Request Refund" button
5. Select reason from dropdown
6. Submit refund request

**Expected Result:**
- RefundRequestModal shows success state
- Displays court case number
- Shows message: "The provider's portal has been restricted pending judge review"

**Backend Verification:**
```bash
# Check refund created
curl http://localhost:5000/api/refunds?user_id=<learner_id>

# Should return refund with status="escalated_to_court"
```

### 3. Test Court Room Escalation

**Verify court_cases table:**
```sql
SELECT * FROM court_cases 
WHERE provider_id = '<coach_user_id>' 
ORDER BY opened_at DESC LIMIT 1;
```

**Expected:**
- New court case created
- `dispute_type` = 'dispute'
- `status` = 'open'
- `case_number` generated (format: CR-YYYYMMDD-XXXX)
- `disputed_amount` matches booking price
- `learner_id` and `provider_id` populated

### 4. Test Provider Restriction

**Verify provider_restrictions table:**
```sql
SELECT * FROM provider_restrictions
WHERE provider_id = '<coach_user_id>'
AND is_active = true;
```

**Expected:**
- New restriction created
- `restriction_type` = 'court_case_pending'
- `is_active` = true
- `case_id` matches court case

### 5. Test Provider Portal Ban

**Frontend Test (Provider Side):**
1. Login as therapist/coach (the one who has the court case)
2. Navigate to `/therapist/dashboard` or `/coach/dashboard`

**Expected Result:**
- PortalRestrictionGuard intercepts
- Calls `/api/court/provider/restrictions/:userId`
- Receives `{ isRestricted: true, mercyWindow: { hasAccess: false }, judgeGrantedAccess: { hasAccess: false } }`
- CourtRoomLockdown component renders full-screen
- Shows court case details, live chat, evidence upload
- All dashboard pages blocked

**API Test:**
```bash
curl http://localhost:5000/api/court/provider/restrictions/<coach_user_id> \
  -H "x-user-id: <coach_user_id>"
```

**Expected JSON:**
```json
{
  "isRestricted": true,
  "caseDetails": {
    "caseNumber": "CR-20260821-0001",
    "disputeType": "dispute",
    "amount": 75.00,
    "status": "open"
  },
  "mercyWindow": {
    "hasAccess": false,
    "accessStart": null,
    "accessEnd": null
  },
  "judgeGrantedAccess": {
    "hasAccess": false,
    "expiresAt": null,
    "reason": null
  }
}
```

### 6. Test Mercy Window (Booking-based)

**Setup:**
- Create a new booking scheduled within 30 minutes
- Provider should have upcoming session

**Expected:**
- `/api/court/provider/restrictions/:userId` returns:
  - `mercyWindow.hasAccess: true`
  - `mercyWindow.accessEnd` = 30 min after booking
- PortalRestrictionGuard shows amber banner: "Mercy Window Active"
- Provider can access dashboard temporarily
- Countdown shows time remaining

### 7. Test Judge-Granted Access

**Setup via Judge Portal:**
1. Login as judge
2. Navigate to court case
3. Click "Grant Temporary Access"
4. Set duration (e.g., 2 hours) and reason

**Expected:**
- `/api/court/provider/restrictions/:userId` returns:
  - `judgeGrantedAccess.hasAccess: true`
  - `judgeGrantedAccess.expiresAt` = current time + duration
  - `judgeGrantedAccess.reason` = judge's reason
- PortalRestrictionGuard shows blue banner: "Judge has granted you temporary portal access"
- Provider can access dashboard temporarily

### 8. Test Case Resolution (Unban)

**Approved by Judge:**
```sql
UPDATE court_cases 
SET status = 'resolved', 
    ruling_outcome = 'learner_favor',
    resolved_at = NOW()
WHERE id = '<case_id>';

UPDATE provider_restrictions
SET is_active = false,
    lifted_at = NOW()
WHERE case_id = '<case_id>';
```

**Expected:**
- Provider portal access restored immediately
- No CourtRoomLockdown shown
- Provider can access all pages normally

## Edge Cases to Test

### A. Multiple Refund Requests (Same Provider)
- Should create separate court cases
- Provider remains banned until ALL cases resolved

### B. Refund Request Outside 7-Day Window
- Backend should reject with error
- No court case created
- Provider not banned

### C. Duplicate Refund for Same Booking
- Backend should reject (409 Conflict)
- "A refund request already exists for this booking"

### D. Payment Refund (Non-Booking)
- POST `/api/refunds/request-payment`
- Should also trigger court room escalation
- Provider lookup via payment metadata

## Success Criteria

✅ Learner can submit refund
✅ Backend creates court case automatically
✅ Provider restriction inserted
✅ Provider portal blocked on login
✅ CourtRoomLockdown shows with chat/evidence
✅ Mercy window works for upcoming bookings
✅ Judge can grant temporary access
✅ Portal access restored when case resolved

## Test Commands

```bash
# Start backend
cd backend
npm start

# In another terminal, start frontend
cd ..
npm run dev

# Run Postman collection tests (if available)
cd backend
npm run test:postman
```

## Database Cleanup After Testing

```sql
-- Remove test data
DELETE FROM court_cases WHERE case_number LIKE 'CR-TEST%';
DELETE FROM provider_restrictions WHERE provider_id = '<test_coach_id>';
DELETE FROM refunds WHERE user_id = '<test_learner_id>';
DELETE FROM bookings WHERE learner_id = '<test_learner_id>' OR coach_id = '<test_coach_id>';
```
