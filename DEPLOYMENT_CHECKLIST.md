# Judge Portal Deployment Checklist

## 🗂️ Files Modified/Created

### Modified Files
- [x] `src/components/judge-portal/JudgeLogin.tsx` - Mobile responsive + button fixes
- [x] `src/components/judge-portal/JudgeSignup.tsx` - Mobile responsive + button fixes + schema fixes
- [x] `.env` - Created at project root (copied from backend/.env)

### New Files Created
- [x] `COURT_ROOM_FIX.sql` - Database RLS policy fixes
- [x] `JUDGES_TABLE_EXTENDED.sql` - Optional: Extended schema for all form fields
- [x] `JUDGE_PORTAL_FIXES.md` - Complete documentation
- [x] `JUDGE_PORTAL_UI_IMPROVEMENTS.md` - UI/UX changes documentation
- [x] `QUICK_FIX_SUMMARY.md` - Quick reference guide
- [x] `DEPLOYMENT_CHECKLIST.md` - This file

---

## 🔐 Database Setup (CRITICAL - DO FIRST!)

### Step 1: Run COURT_ROOM_FIX.sql
**Status**: ⏳ PENDING

**Action Required**:
1. Go to https://app.supabase.com/project/lpvcaukviteexnjzqqeo/sql
2. Copy contents of `COURT_ROOM_FIX.sql`
3. Paste into SQL Editor
4. Click "Run" button
5. Verify success message appears

**Why**: This fixes RLS policies to allow judge signup. Without this, you'll get 403/406 errors.

**Expected Result**: `Court Room RLS policies fixed successfully`

---

### Step 2: (Optional) Run JUDGES_TABLE_EXTENDED.sql
**Status**: ⏳ OPTIONAL

**Action Required**:
1. Only if you want to store ALL form fields (country, state, bar_number, etc.)
2. Copy contents of `JUDGES_TABLE_EXTENDED.sql`
3. Paste into SQL Editor
4. Click "Run"

**Why**: The current schema only stores: email, full_name, phone, specialization. This adds the other fields.

**If you run this**, uncomment the fields in `JudgeSignup.tsx` (lines 95-100).

**Expected Result**: `Judges table extended successfully`

---

## 💻 Local Development Testing

### Step 1: Start Development Server
```powershell
# If server is running, stop it first (Ctrl+C)

# Clear any cache
npm run dev
```

### Step 2: Test Login Page
- [ ] Navigate to: http://localhost:5173/judge-portal/login
- [ ] Check mobile view (F12 > Toggle device toolbar)
- [ ] Test desktop view
- [ ] Hover over all buttons - text should stay visible
- [ ] Try to click input fields - icons shouldn't block

### Step 3: Test Signup Page
- [ ] Navigate to: http://localhost:5173/judge-portal/signup
- [ ] Check mobile view (single column form)
- [ ] Check tablet view (two column form at 640px+)
- [ ] Check desktop view
- [ ] Fill out form with test data
- [ ] Submit (should work if you ran COURT_ROOM_FIX.sql)

---

## 🧪 Testing Scenarios

### Test Case 1: Judge Signup Flow
**Prerequisites**: COURT_ROOM_FIX.sql must be run

1. [ ] Go to /judge-portal/signup
2. [ ] Fill in required fields:
   - Email: test-judge@example.com
   - Full Name: Test Judge
   - Password: testpass123
   - Confirm Password: testpass123
3. [ ] (Optional) Fill other fields
4. [ ] Click "Submit Application"
5. [ ] Expected: Success toast, redirect to login page
6. [ ] Check Supabase > Table Editor > judges table
7. [ ] Verify new record exists with status='pending'

### Test Case 2: Judge Login Flow (After Approval)
**Prerequisites**: Judge must be approved (status='active')

1. [ ] Go to Supabase > Table Editor > judges
2. [ ] Find your test judge
3. [ ] Change status from 'pending' to 'active'
4. [ ] Go to /judge-portal/login
5. [ ] Enter email and password
6. [ ] Click "Sign In to Portal"
7. [ ] Expected: Redirect to /judge-portal/dashboard

### Test Case 3: Mobile Responsiveness
1. [ ] Open Chrome DevTools (F12)
2. [ ] Enable device toolbar (Ctrl+Shift+M)
3. [ ] Test on:
   - [ ] iPhone SE (375px) - Narrowest
   - [ ] iPhone 12 Pro (390px)
   - [ ] Pixel 5 (393px)
   - [ ] iPad Mini (768px) - Breakpoint
   - [ ] iPad Air (820px)
4. [ ] Verify:
   - [ ] No horizontal scroll
   - [ ] Text is readable
   - [ ] Buttons are easy to tap
   - [ ] Form fields are comfortable

### Test Case 4: Button Hover Issue
1. [ ] On desktop, hover over "Apply for Judge Portal Access" button
2. [ ] Expected: Button darkens, text remains visible and white
3. [ ] Hover over "Submit Application" button
4. [ ] Expected: Same behavior - text stays visible

---

## 🚀 Production Deployment

### Pre-Deployment
- [ ] Run COURT_ROOM_FIX.sql on production Supabase
- [ ] (Optional) Run JUDGES_TABLE_EXTENDED.sql if desired
- [ ] Test locally one more time
- [ ] Commit all changes to git
- [ ] Create backup of current production (if possible)

### Deployment Commands
```powershell
# Build production bundle
npm run build

# Test the production build locally
npm run preview

# Deploy to your hosting (Railway/Netlify/Vercel/etc.)
# Follow your specific deployment process
```

### Post-Deployment Verification
- [ ] Visit production URL /judge-portal/login
- [ ] Check browser console for errors (F12)
- [ ] Test signup with real email
- [ ] Verify email confirmation works
- [ ] Check mobile view on actual phone
- [ ] Test all button hovers

---

## 🐛 Troubleshooting

### Issue: 403 Forbidden on signup
**Cause**: COURT_ROOM_FIX.sql not run on database

**Fix**: 
1. Run COURT_ROOM_FIX.sql in Supabase SQL Editor
2. Wait 5-10 seconds for policies to propagate
3. Try signup again

### Issue: Column does not exist errors
**Cause**: Using extended fields without running JUDGES_TABLE_EXTENDED.sql

**Fix Option 1**: Run JUDGES_TABLE_EXTENDED.sql
**Fix Option 2**: Keep the commented code commented in JudgeSignup.tsx

### Issue: Button text still disappearing
**Cause**: Browser cache

**Fix**:
1. Hard refresh: Ctrl+Shift+R or Ctrl+F5
2. Clear cache: Ctrl+Shift+Delete
3. Try incognito mode

### Issue: Mobile view looks wrong
**Cause**: Old CSS cached

**Fix**:
1. Clear browser cache
2. Rebuild: `npm run build`
3. Check if Tailwind is properly configured

### Issue: Can't login after signup
**Cause**: Judge status is 'pending', not 'active'

**Fix**:
1. Go to Supabase > judges table
2. Change status from 'pending' to 'active'
3. Try login again

---

## 📊 Environment Variables

### Required in .env (project root)
```env
VITE_SUPABASE_URL=https://lpvcaukviteexnjzqqeo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_BACKEND_URL=https://coursevia-backend.onrender.com
```

### Check
- [ ] .env exists at project root
- [ ] All VITE_ variables are present
- [ ] Supabase URL matches your project

---

## 📝 Admin Tasks

### Create First Admin Judge (For Testing)
```sql
-- Run in Supabase SQL Editor
INSERT INTO judges (
  email,
  full_name,
  phone,
  specialization,
  status,
  rank
) VALUES (
  'admin@coursevia.com',
  'Admin Judge',
  '+1234567890',
  ARRAY['payment_disputes', 'booking_conflicts', 'content_issues'],
  'active',
  'chief'
) ON CONFLICT (email) DO UPDATE SET status = 'active';
```

Then create auth account:
1. Go to Supabase > Authentication > Users
2. Click "Add user"
3. Email: admin@coursevia.com
4. Password: (choose secure password)
5. Auto Confirm: Yes

---

## ✅ Final Checklist

Before marking complete:
- [ ] COURT_ROOM_FIX.sql run on database
- [ ] Local testing passed all test cases
- [ ] Mobile responsiveness verified
- [ ] Button hover issue fixed
- [ ] Production database updated (if deploying)
- [ ] Production site tested
- [ ] Documentation reviewed
- [ ] Team notified of changes

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review JUDGE_PORTAL_FIXES.md for detailed info
3. Check browser console for specific error messages
4. Verify database migrations ran successfully
5. Test in incognito mode to rule out cache issues

---

## 🎉 Success Criteria

You're done when:
- ✅ Judges can sign up without errors
- ✅ Button text stays visible on all devices
- ✅ Forms are easy to use on mobile
- ✅ No 403/406/422 errors
- ✅ Login works after admin approval
- ✅ All touch targets are at least 44px
- ✅ No horizontal scrolling on mobile
