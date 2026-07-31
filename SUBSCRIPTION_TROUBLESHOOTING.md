# 🔧 Subscription Troubleshooting

## Issue: Nothing happens when clicking Subscribe

### Step 1: Check Backend is Running
```bash
cd backend
npm start
```

Backend should show:
```
Server running on http://192.168.119.66:5000
```

### Step 2: Check Browser Console
1. Open browser (F12)
2. Go to Console tab
3. Click "Subscribe" button
4. Look for these logs:

**Expected logs:**
```
Starting subscription: {email: "...", userId: "...", plan: "monthly"}
Calling initializeLearnerSubscription...
Subscription API call: {url: "...", ...}
Subscription API response status: 200
Subscription API response data: {authorization_url: "..."}
Redirecting to: https://...
```

**If you see errors:**

#### Error: "Failed to fetch"
- Backend is not running
- Start backend: `cd backend && npm start`

#### Error: "No checkout URL returned"
- Backend returned empty response
- Check backend console for errors

#### Error: "Subscription request failed"
- Backend returned error
- Check backend console for details

### Step 3: Test Backend Directly
Open browser and go to:
```
http://192.168.119.66:5000/api/subscription/plans
```

Should return:
```json
{
  "data": [
    {"code": "monthly", "name": "Monthly", ...},
    {"code": "yearly", "name": "Yearly", ...}
  ]
}
```

If this fails, backend is not running or has errors.

### Step 4: Check Environment Variables

**Frontend (.env):**
```
VITE_BACKEND_URL=http://192.168.119.66:5000
```

**Backend (backend/.env):**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
APP_URL=http://192.168.119.66:8080
```

### Step 5: Common Fixes

**1. Backend not running:**
```bash
cd backend
npm start
```

**2. Port already in use:**
```bash
# Kill process on port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Then restart
npm start
```

**3. Missing dependencies:**
```bash
cd backend
npm install
npm start
```

**4. Clear browser cache:**
- Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)

### Step 6: Test Subscription Flow

1. **Go to Pricing page:** `/pricing`
2. **Click "Choose monthly"** or "Choose yearly"
3. **Should redirect to:** `/dashboard/subscription?plan=monthly`
4. **Click "Subscribe"** button
5. **Check console** for logs
6. **Should redirect to** Stripe checkout page

### What Should Happen:

1. Click Subscribe
2. Loading spinner appears
3. Console shows API calls
4. Redirects to Stripe checkout
5. Complete payment
6. Redirects back to app
7. Subscription shows as "Active"

### Still Not Working?

**Check these:**
- [ ] Backend running on port 5000
- [ ] Frontend running on port 8080
- [ ] No console errors
- [ ] Environment variables set
- [ ] User is signed in
- [ ] User has "learner" role

**Get more details:**
1. Open browser console (F12)
2. Go to Network tab
3. Click Subscribe
4. Look for `/api/subscriptions/initialize` request
5. Check request/response details
6. Share error message

---

## Quick Test Commands:

```bash
# Test backend is running
curl http://192.168.119.66:5000/api/subscription/plans

# Test subscription endpoint
curl -X POST http://192.168.119.66:5000/api/subscriptions/initialize \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userId":"test-id","planId":"monthly"}'
```

Expected response:
```json
{
  "success": true,
  "authorization_url": "https://...",
  "reference": "..."
}
```
