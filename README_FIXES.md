# Coursevia Bug Fixes - Complete

## ✅ All Code Fixes Done

### Fixed Issues:
1. ✅ **Onboarding loop** - Users stay on dashboard after completing onboarding
2. ✅ **Payment page loading** - Added timeout (10s) and error handling with retry
3. ✅ **Mobile navigation** - Smooth scrolling on dashboard
4. ✅ **Search spinning** - All directories (coaches, therapists, creators, admin) have 10s timeout
5. ✅ **Learner wallet** - Navigation link added, accessible at `/dashboard/wallet`
6. ✅ **Top-up with Paddle** - Card payment only (Airwallex removed)

### Avatar Images & Profile Updates - Setup Required

**Issues Fixed:**
- ✅ Profile updates (coaches/therapists/creators can edit their profiles)
- ✅ Avatar uploads during onboarding
- ✅ Avatar display in directories
- ✅ RLS policies for profile access

**Two-Step Fix:**

**Step 1: Run SQL**
1. Open Supabase Dashboard → SQL Editor
2. Copy all content from `FIX_AVATARS_NOW.sql`
3. Paste and click "Run"

**Step 2: Create Storage Bucket (Manual)**
1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Name: `avatars`
4. **Public bucket: YES** ✓
5. Click **"Save"**
6. Click on **"avatars"** bucket → **"Policies"** tab
7. Create 4 policies using the template button:

   **Policy 1 - Upload:**
   - Operation: INSERT
   - Policy name: `Authenticated users can upload avatars`
   - Target roles: `authenticated`
   - USING expression: `(bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text)`

   **Policy 2 - View:**
   - Operation: SELECT  
   - Policy name: `Anyone can view avatars`
   - Target roles: `public`
   - USING expression: `bucket_id = 'avatars'`

   **Policy 3 - Update:**
   - Operation: UPDATE
   - Policy name: `Users can update own avatar`
   - Target roles: `authenticated`
   - USING expression: `(bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text)`

   **Policy 4 - Delete:**
   - Operation: DELETE
   - Policy name: `Users can delete own avatar`
   - Target roles: `authenticated`
   - USING expression: `(bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text)`

Done! Profile updates and avatars will work.

---

## Deploy

```bash
git add .
git commit -m "Fix: onboarding loop, payment page, mobile nav, search timeout, wallet top-up"
git push
```

Then run the SQL file in Supabase.

---

## Test After Deploy

1. **Onboarding** - Complete onboarding, click back → should stay on dashboard
2. **Payments** - Navigate to Payments page → loads within 10s or shows error
3. **Mobile** - Resize browser < 1024px → dashboard tabs scroll smoothly
4. **Search** - Search coaches/therapists/creators → loads within 10s
5. **Wallet** - Click Wallet → see balance and "Top Up with Card" button
6. **Top-up** - Click top-up, select amount → Paddle payment opens
7. **Avatars** - Create account with photo → check directory display (after SQL)
