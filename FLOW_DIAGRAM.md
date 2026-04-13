# 🔄 Didit KYC Integration Flow

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER STARTS KYC                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend: KYCPageDidit.tsx                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ User clicks "Start Verification"                                │ │
│  │ Calls: POST /api/kyc/didit/session                             │ │
│  │ Sends: { userId, email, fullName, role }                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend: server.js - Session Creation                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Creates Didit session with:                                     │ │
│  │ {                                                               │ │
│  │   vendor_data: userId,  ← IMPORTANT: User identifier           │ │
│  │   email: "...",                                                 │ │
│  │   full_name: "...",                                             │ │
│  │   callback_url: "http://.../api/kyc/didit/webhook"             │ │
│  │ }                                                               │ │
│  │                                                                 │ │
│  │ Returns: { verificationUrl, verificationId }                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend: Opens Didit Verification Window                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ window.open(verificationUrl, "_blank")                          │ │
│  │ User completes verification on Didit                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Didit: Processes Verification                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ - Scans ID document                                             │ │
│  │ - Performs liveness check                                       │ │
│  │ - Matches face to ID photo                                      │ │
│  │ - Makes decision: Approved/Rejected                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Didit: Sends Webhook                                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ POST http://192.168.119.66:5000/api/kyc/didit/webhook          │ │
│  │                                                                 │ │
│  │ Payload:                                                        │ │
│  │ {                                                               │ │
│  │   webhook_type: "status.updated",                              │ │
│  │   session_id: "a1b2c3d4-...",                                   │ │
│  │   vendor_data: "user-id-here", ← User identifier               │ │
│  │   status: "Approved",                                           │ │
│  │   decision: {                                                   │ │
│  │     status: "Approved",                                         │ │
│  │     id_verifications: [{                                        │ │
│  │       full_name: "John Doe",                                    │ │
│  │       date_of_birth: "1990-01-15",                              │ │
│  │       document_type: "Identity Card",                           │ │
│  │       nationality: "ESP",                                       │ │
│  │       ...                                                       │ │
│  │     }],                                                         │ │
│  │     liveness_checks: [...],                                     │ │
│  │     face_matches: [...]                                         │ │
│  │   }                                                             │ │
│  │ }                                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend: Webhook Handler                                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 1. Extract data:                                                │ │
│  │    - userId = payload.vendor_data                               │ │
│  │    - status = payload.decision.status                           │ │
│  │    - userDetails = payload.decision.id_verifications[0]         │ │
│  │                                                                 │ │
│  │ 2. Normalize status:                                            │ │
│  │    - "Approved" → "approved"                                    │ │
│  │    - "Rejected" → "rejected"                                    │ │
│  │    - "Pending" → "pending"                                      │ │
│  │                                                                 │ │
│  │ 3. Update profile:                                              │ │
│  │    - kyc_status = "approved"                                    │ │
│  │    - is_verified = true                                         │ │
│  │    - verified_name = "John Doe"                                 │ │
│  │    - verified_document_type = "Identity Card"                   │ │
│  │    - verified_nationality = "ESP"                               │ │
│  │                                                                 │ │
│  │ 4. Create verification_request record                           │ │
│  │                                                                 │ │
│  │ 5. Log event in provider_verification_events                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Database: Supabase                                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ profiles table:                                                 │ │
│  │   user_id: "user-id-here"                                       │ │
│  │   kyc_status: "approved"                                        │ │
│  │   kyc_provider: "didit"                                         │ │
│  │   is_verified: true                                             │ │
│  │   verified_at: "2024-01-15T10:30:00Z"                           │ │
│  │   verified_name: "John Doe"                                     │ │
│  │   verified_document_type: "Identity Card"                       │ │
│  │   verified_nationality: "ESP"                                   │ │
│  │                                                                 │ │
│  │ verification_requests table:                                    │ │
│  │   user_id: "user-id-here"                                       │ │
│  │   provider: "didit"                                             │ │
│  │   status: "approved"                                            │ │
│  │   inquiry_id: "a1b2c3d4-..."                                    │ │
│  │   decision_payload: { ... full webhook ... }                    │ │
│  │                                                                 │ │
│  │ provider_verification_events table:                             │ │
│  │   user_id: "user-id-here"                                       │ │
│  │   provider: "didit"                                             │ │
│  │   event_type: "status.updated"                                  │ │
│  │   payload: { ... full webhook ... }                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend: Dashboard Updates                                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ User refreshes or navigates back                                │ │
│  │                                                                 │ │
│  │ AuthContext fetches updated profile:                            │ │
│  │   SELECT kyc_status, is_verified FROM profiles                 │ │
│  │                                                                 │ │
│  │ Dashboard displays:                                             │ │
│  │   ✅ "Verified" badge                                           │ │
│  │   ✅ Green checkmark                                            │ │
│  │   ✅ "Your identity has been verified"                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Data Flow Points

### 1. User Identification
```
Frontend → Backend → Didit
  userId → vendor_data → vendor_data (in webhook)
```

### 2. Status Flow
```
Didit Decision → Webhook → Backend → Database → Frontend
  "Approved" → decision.status → normalized → kyc_status → "Verified"
```

### 3. User Details Flow
```
ID Document → Didit → Webhook → Backend → Database
  Scanned → Extracted → decision.id_verifications → Stored → verified_name
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Error Scenarios                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Session Creation Fails                                           │
│     ├─ Didit API error                                               │
│     ├─ Invalid credentials                                           │
│     └─ Network error                                                 │
│     → Frontend shows error toast                                     │
│     → User can retry                                                 │
│                                                                      │
│  2. Verification Rejected                                            │
│     ├─ Document not clear                                            │
│     ├─ Face doesn't match                                            │
│     └─ Liveness check failed                                         │
│     → Webhook: status = "rejected"                                   │
│     → Database: kyc_status = "rejected"                              │
│     → Frontend: Shows rejection reason                               │
│     → User can retry                                                 │
│                                                                      │
│  3. Webhook Not Received                                             │
│     ├─ Backend not running                                           │
│     ├─ Webhook URL incorrect                                         │
│     └─ Network issue                                                 │
│     → Status stays "pending"                                         │
│     → User can check status manually                                 │
│     → Admin can trigger webhook retry                                │
│                                                                      │
│  4. User Not Found                                                   │
│     ├─ vendor_data doesn't match any user                            │
│     └─ User deleted after starting verification                      │
│     → Webhook logs warning                                           │
│     → Returns 200 (to prevent retries)                               │
│     → Admin notified                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Timing Diagram

```
Time    Frontend              Backend               Didit              Database
─────────────────────────────────────────────────────────────────────────────
0s      Click "Start"
        │
1s      │ POST /session ────→ Create session
        │                     │
2s      │                     │ POST /verifications ─→ Create
        │                     │                        │
3s      │                     │ ←─────────────────────┘ Session ID
        │                     │
4s      │ ←─────────────────┘ Return URL
        │
5s      Open window ────────────────────────────────→ Show form
        │                                              │
        │                                              │ User fills
        │                                              │ Takes photo
        │                                              │ Scans ID
        │                                              │
30s     │                                              │ Processing...
        │                                              │
45s     │                                              │ Decision made
        │                                              │
46s     │                     ←─────────────────────── POST webhook
        │                     │
47s     │                     Parse webhook
        │                     Extract data
        │                     │
48s     │                     │ UPDATE profiles ─────→ Update
        │                     │                        │
49s     │                     │ ←─────────────────────┘ Success
        │                     │
50s     │                     Return 200 ────────────→ Webhook OK
        │
60s     Refresh page
        │
61s     │ GET profile ──────→ Fetch profile
        │                     │
62s     │                     │ SELECT * ────────────→ Query
        │                     │                        │
63s     │                     │ ←─────────────────────┘ Data
        │                     │
64s     │ ←─────────────────┘ Return profile
        │
65s     Show "Verified" ✅
```

---

## Database Schema Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  profiles                                                            │
├─────────────────────────────────────────────────────────────────────┤
│  user_id (PK)                                                        │
│  kyc_status              ← Updated by webhook                        │
│  kyc_provider            ← Set to "didit"                            │
│  kyc_inquiry_id          ← Set to session_id                         │
│  is_verified             ← Set to true if approved                   │
│  verified_at             ← Timestamp of approval                     │
│  verified_name           ← From id_verifications.full_name           │
│  verified_document_type  ← From id_verifications.document_type       │
│  verified_nationality    ← From id_verifications.nationality         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ References
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  verification_requests                                               │
├─────────────────────────────────────────────────────────────────────┤
│  id (PK)                                                             │
│  user_id (FK) ───────────────────┐                                  │
│  provider                         │                                  │
│  inquiry_id                       │                                  │
│  status                           │                                  │
│  decision_payload (JSONB)         │                                  │
│  reviewed_at                      │                                  │
└───────────────────────────────────┼──────────────────────────────────┘
                                    │
                                    │ References
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  provider_verification_events                                        │
├─────────────────────────────────────────────────────────────────────┤
│  id (PK)                                                             │
│  user_id (FK)                                                        │
│  provider                                                            │
│  inquiry_id                                                          │
│  event_type                                                          │
│  payload (JSONB)                                                     │
│  created_at                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Configuration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Environment Variables                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  backend/.env                                                        │
│  ├─ DIDIT_CLIENT_ID ──────────────┐                                 │
│  ├─ DIDIT_API_KEY ────────────────┼─→ Used in session creation      │
│  ├─ DIDIT_BASE_URL ───────────────┘                                 │
│  └─ DIDIT_WEBHOOK_SECRET ─────────→ Used to verify webhooks         │
│                                                                      │
│  .env (root)                                                         │
│  └─ VITE_BACKEND_URL ─────────────→ Used by frontend                │
│                                                                      │
│  Didit Dashboard                                                     │
│  ├─ Webhook URL ──────────────────→ Points to backend               │
│  └─ Events ───────────────────────→ status.updated                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Success Flow Summary

```
1. User clicks "Start Verification"
   ↓
2. Backend creates Didit session with vendor_data
   ↓
3. User completes verification on Didit
   ↓
4. Didit sends webhook with decision object
   ↓
5. Backend parses webhook and extracts data
   ↓
6. Database updated with KYC status and verified info
   ↓
7. Frontend shows "Verified" badge
   ↓
8. ✅ SUCCESS!
```

---

## Quick Reference

### Session Creation
```javascript
POST /api/kyc/didit/session
Body: { userId, email, fullName, role }
Returns: { verificationUrl, verificationId }
```

### Webhook
```javascript
POST /api/kyc/didit/webhook
Body: { vendor_data, decision: { status, id_verifications } }
Returns: { received: true, status }
```

### Status Check
```sql
SELECT kyc_status, is_verified, verified_name 
FROM profiles 
WHERE user_id = 'xxx';
```

---

**This flow is now fully implemented and ready to test! 🚀**
