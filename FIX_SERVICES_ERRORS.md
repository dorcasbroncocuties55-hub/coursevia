# 🔧 Fix Services and Bookings Errors

## 🐛 Errors Found

You're seeing these errors:
1. **404 on therapist_services** - Table doesn't exist
2. **400 on bookings** - Query syntax issues with provider_id/provider_user_id

---

## ✅ Solution

I've created a SQL migration to fix all these issues.

---

## 🚀 How to Fix (2 minutes)

### Step 1: Run SQL Migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Open the file: `FIX_SERVICES_AND_BOOKINGS.sql`
4. Copy all the content
5. Paste into SQL Editor
6. Click **Run**

### Step 2: Verify

After running, you should see:
```
✓ therapist_services table created
✓ coach_services table created
✓ bookings table updated
✓ Indexes created
✓ RLS policies set
✓ "Services and bookings tables fixed successfully!"
```

### Step 3: Refresh Your App

```bash
# Hard refresh browser
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

---

## 🎯 What This Fixes

### Creates Missing Tables
- ✅ `therapist_services` - For therapist service offerings
- ✅ `coach_services` - For coach service offerings

### Fixes Bookings Table
- ✅ Ensures both `provider_id` and `provider_user_id` columns exist
- ✅ Syncs data between the two columns
- ✅ Updates RLS policies to handle both fields

### Adds Proper Indexes
- ✅ Faster queries on therapist_id
- ✅ Faster queries on coach_id
- ✅ Faster queries on provider_id/provider_user_id
- ✅ Faster queries on learner_id

### Sets Up Security
- ✅ RLS policies for therapist_services
- ✅ RLS policies for coach_services
- ✅ Updated RLS policies for bookings
- ✅ Proper permissions for authenticated users

---

## 📊 Table Structures

### therapist_services
```sql
- id (UUID, primary key)
- therapist_id (UUID, references profiles)
- title (VARCHAR)
- description (TEXT)
- duration_minutes (INTEGER)
- price (DECIMAL)
- currency (VARCHAR)
- service_type (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### coach_services
```sql
- id (UUID, primary key)
- coach_id (UUID, references profiles)
- title (VARCHAR)
- description (TEXT)
- duration_minutes (INTEGER)
- price (DECIMAL)
- currency (VARCHAR)
- service_type (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### bookings (updated)
```sql
- ... existing columns ...
- provider_id (UUID)
- provider_user_id (UUID, references profiles)
- learner_id (UUID, references profiles)
- ... other columns ...
```

---

## 🧪 Test After Fix

### Test Therapist Services
1. Log in as therapist
2. Go to Services page
3. Should load without 404 errors
4. Try creating a service
5. Should save successfully

### Test Coach Services
1. Log in as coach
2. Go to Services page
3. Should load without 404 errors
4. Try creating a service
5. Should save successfully

### Test Bookings
1. Go to Bookings page
2. Should load without 400 errors
3. Bookings should display correctly
4. No console errors

---

## 🔍 Troubleshooting

### Still seeing 404 errors?
**Check:**
1. SQL migration ran successfully
2. Tables exist in Supabase dashboard
3. Browser cache cleared
4. Hard refresh done

### Still seeing 400 errors?
**Check:**
1. Bookings table has both provider_id and provider_user_id columns
2. RLS policies updated
3. Data synced between columns

### Services not showing?
**Check:**
1. User has correct role (therapist/coach)
2. RLS policies allow access
3. Services exist in database

---

## 📝 Summary

**Issue:** Missing tables and query errors
**Solution:** Run `FIX_SERVICES_AND_BOOKINGS.sql`
**Time:** 2 minutes
**Result:** All services and bookings work correctly

---

## ✅ Checklist

- [ ] Open Supabase SQL Editor
- [ ] Copy `FIX_SERVICES_AND_BOOKINGS.sql` content
- [ ] Paste and run in SQL Editor
- [ ] Verify success message
- [ ] Hard refresh browser
- [ ] Test services pages
- [ ] Test bookings pages
- [ ] Verify no console errors

---

**Run the SQL migration and all errors should be fixed!** 🎉
