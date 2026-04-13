# 🔓 Fix 403 Permission Error - Quick Fix

## 🎯 Issue

You're seeing:
```
403 Forbidden on therapist_services
```

This means the table exists but RLS policies are blocking access.

---

## ✅ Quick Fix (1 minute)

### Run This SQL

1. Open [Supabase SQL Editor](https://supabase.com/dashboard)
2. Copy and paste this:

```sql
-- Fix therapist_services permissions
DROP POLICY IF EXISTS "Anyone can view therapist services" ON therapist_services;
CREATE POLICY "Anyone can view therapist services" ON therapist_services
    FOR SELECT USING (true);

-- Fix coach_services permissions
DROP POLICY IF EXISTS "Anyone can view coach services" ON coach_services;
CREATE POLICY "Anyone can view coach services" ON coach_services
    FOR SELECT USING (true);
```

3. Click **Run**
4. Hard refresh browser: `Ctrl + Shift + R`

---

## 🎯 What This Does

**Before:** Only therapists could view their own services (too restrictive)
**After:** Anyone can view services (correct for public marketplace)

**Security:**
- ✅ Anyone can VIEW services (needed for public pages)
- ✅ Only owners can CREATE services
- ✅ Only owners can UPDATE services
- ✅ Only owners can DELETE services

---

## 🧪 Test

After running the SQL:
1. Hard refresh browser
2. Go to Services page
3. Should load without 403 errors
4. Services should display

---

## 📁 Alternative

If you prefer, run the complete file:
- **File:** `FIX_403_PERMISSIONS.sql`
- Contains the same fix plus verification queries

---

**Status:** ✅ Ready to fix
**Time:** 1 minute
**Action:** Run SQL above and refresh browser
