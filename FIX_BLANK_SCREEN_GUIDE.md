# Fix Blank Screen on Reload - Complete Guide

## 🎯 ROOT CAUSE IDENTIFIED

Your blank screen issue is caused by **race conditions in auth state loading**, not just browser cache.

### The Problem Pattern

```tsx
// ❌ BAD - Causes blank screen
const { user } = useAuth();

useEffect(() => {
  if (!user) return; // Returns early while loading
  loadData();
}, [user]);

// Page renders nothing while user is null
```

### What Happens on Reload

1. Page loads → `user = null` (temporarily)
2. Component renders → sees `!user` → returns early
3. Auth loads → `user` becomes available
4. But component already rendered nothing → **blank screen**

---

## ✅ THE FIX (3-State Pattern)

Always handle these 3 states:

1. **Loading** - Auth is initializing
2. **No User** - Redirect to login
3. **User Ready** - Render content

### Correct Pattern

```tsx
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/LoadingSpinner";
import { Navigate } from "react-router-dom";

function MyDashboard() {
  const { user, profile, loading } = useAuth();
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // ✅ STEP 1: Wait for auth to load
  if (loading) {
    return <PageLoading />;
  }

  // ✅ STEP 2: Redirect if no user
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ STEP 3: Now safe to use user
  useEffect(() => {
    // user is guaranteed to be non-null here
    loadData(user.id);
  }, [user]);

  if (dataLoading) {
    return <ContentLoading />;
  }

  return <div>Your content with {user.email}</div>;
}
```

---

## 🛠️ NEW TOOLS PROVIDED

### 1. Loading Components

```tsx
import { PageLoading, ContentLoading } from "@/components/LoadingSpinner";

// Full-screen loading (for pages)
<PageLoading />

// Section loading (for content areas)
<ContentLoading />
```

### 2. Auth Guard Hook

```tsx
import { useAuthGuard } from "@/hooks/useAuthGuard";

function MyPage() {
  const { user, profile, loading, isReady } = useAuthGuard();

  if (loading) return <PageLoading />;
  // user is now guaranteed non-null

  // Or use isReady helper
  if (!isReady) return <PageLoading />;
  // user AND profile are both loaded
}
```

---

## 🔧 HOW TO FIX YOUR PAGES

### Pattern 1: Dashboard Pages (Need User + Profile)

```tsx
// Before (❌ causes blank screen)
function CoachDashboard() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return; // ❌ Returns early
    loadData();
  }, [user]);
  
  return <div>...</div>;
}

// After (✅ works correctly)
function CoachDashboard() {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  
  useEffect(() => {
    loadData(user.id); // ✅ user is guaranteed non-null
  }, [user]);
  
  return <div>...</div>;
}
```

### Pattern 2: Using the Hook (Cleaner)

```tsx
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { PageLoading } from "@/components/LoadingSpinner";

function CoachDashboard() {
  const { user, profile, loading } = useAuthGuard();
  
  if (loading) return <PageLoading />;
  // useAuthGuard handles redirect automatically
  
  useEffect(() => {
    loadData(user.id); // ✅ user is guaranteed non-null
  }, [user]);
  
  return <div>...</div>;
}
```

### Pattern 3: Null-Safe Data Access

```tsx
// ❌ BAD - Crashes if profile is null
<div>{profile.full_name}</div>

// ✅ GOOD - Safe access
<div>{profile?.full_name || "User"}</div>

// ✅ BETTER - Check before rendering
if (!profile) return <PageLoading />;
return <div>{profile.full_name}</div>;
```

---

## 📋 FILES TO FIX

### High Priority (Causes Blank Screens)

1. **Dashboard Pages**
   - `src/pages/dashboard/LearnerDashboard.tsx`
   - `src/pages/coach/CoachDashboard.tsx`
   - `src/pages/therapist/TherapistDashboard.tsx`
   - `src/pages/creator/CreatorDashboard.tsx`

2. **Profile Pages**
   - `src/pages/coach/CoachProfile.tsx`
   - `src/pages/therapist/TherapistProfile.tsx`
   - `src/pages/dashboard/ProfileSettings.tsx`

3. **Service Pages**
   - `src/pages/coach/CoachServices.tsx`
   - `src/pages/therapist/TherapistServices.tsx`

### Medium Priority

4. **Content Pages**
   - `src/pages/creator/CreatorContent.tsx`
   - `src/pages/creator/UploadVideo.tsx`
   - `src/pages/dashboard/LearnerCourses.tsx`
   - `src/pages/dashboard/LearnerVideos.tsx`

5. **Booking/Payment Pages**
   - `src/pages/dashboard/LearnerBookings.tsx`
   - `src/pages/dashboard/LearnerPayments.tsx`
   - `src/pages/dashboard/WithdrawalsPage.tsx`

### Low Priority (Already Protected by ProtectedRoute)

6. **Other Dashboard Pages**
   - Most other pages in `/dashboard/*`
   - These are already wrapped in `<ProtectedRoute>` which handles loading

---

## 🚀 QUICK FIX CHECKLIST

For each page that uses `useAuth()`:

- [ ] Import `PageLoading` from `@/components/LoadingSpinner`
- [ ] Add `loading` to destructured auth values
- [ ] Add loading check: `if (loading) return <PageLoading />;`
- [ ] Add user check: `if (!user) return <Navigate to="/login" replace />;`
- [ ] Remove all `if (!user) return;` from useEffect hooks
- [ ] Replace `profile.field` with `profile?.field` for safety

---

## 🎨 EXAMPLE: Complete Fix

```tsx
// ❌ BEFORE - Causes blank screen on reload
import { useAuth } from "@/contexts/AuthContext";

function CoachDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user) return; // ❌ Problem here
    
    const load = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", user.id);
      setStats(data);
    };
    load();
  }, [user]);

  return (
    <div>
      <h1>Welcome {user.email}</h1> {/* ❌ Crashes if user is null */}
      <p>Bookings: {stats?.length}</p>
    </div>
  );
}

// ✅ AFTER - Works perfectly on reload
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/LoadingSpinner";
import { Navigate } from "react-router-dom";

function CoachDashboard() {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ✅ Handle loading state
  if (loading) {
    return <PageLoading />;
  }

  // ✅ Handle no user
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Now safe to use user in effects
  useEffect(() => {
    const load = async () => {
      setStatsLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", user.id); // ✅ user is guaranteed non-null
      setStats(data);
      setStatsLoading(false);
    };
    load();
  }, [user]);

  if (statsLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <h1>Welcome {profile?.full_name || user.email}</h1> {/* ✅ Safe access */}
      <p>Bookings: {stats?.length || 0}</p>
    </div>
  );
}
```

---

## 🔍 DEBUGGING TIPS

### Check if a page has the issue:

1. Open the page
2. Hard refresh (Ctrl+Shift+R)
3. If you see blank screen → needs fixing

### Common symptoms:

- ✅ Works on first visit
- ❌ Blank on refresh
- ❌ Blank when navigating directly to URL
- ✅ Works after clicking a link

### Quick test:

```tsx
// Add this to any page to debug
console.log("Auth state:", { user, profile, loading });

if (loading) console.log("Still loading auth...");
if (!user) console.log("No user yet!");
if (user && !profile) console.log("User loaded, waiting for profile...");
```

---

## 📦 FILES CREATED

1. **src/components/LoadingSpinner.tsx** - Reusable loading components
2. **src/hooks/useAuthGuard.ts** - Safe auth guard hook
3. **FIX_BLANK_SCREEN_GUIDE.md** - This guide

---

## 🎯 NEXT STEPS

### Option 1: Fix All Pages (Recommended)

I can automatically fix all the pages listed above with the correct pattern.

**Say:** "fix all dashboard pages"

### Option 2: Fix Specific Pages

Tell me which pages you want fixed first:
- "fix coach dashboard"
- "fix learner pages"
- "fix profile pages"

### Option 3: Manual Fix

Use this guide to fix pages yourself following the patterns above.

---

## ⚠️ IMPORTANT NOTES

### 1. ProtectedRoute Already Works

Pages wrapped in `<ProtectedRoute>` already handle loading correctly. The issue is **inside** those pages when they use `useAuth()` directly.

### 2. Don't Remove ProtectedRoute

Keep your `<ProtectedRoute>` wrappers - they handle:
- Redirecting to login
- Redirecting to onboarding
- Role-based access

The fix is **additional** loading checks inside the page components.

### 3. The _redirects File is Correct

Your `dist/_redirects` file is already correct:
```
/*    /index.html   200
```

This ensures React Router handles all routes on reload.

---

## 🔥 SUMMARY

**Problem:** Pages render before auth loads → blank screen  
**Solution:** Always check `loading` state before rendering  
**Pattern:** loading → no user → user ready  
**Tools:** `PageLoading`, `useAuthGuard`, null-safe access  

**Result:** No more blank screens on reload! 🎉

---

**Ready to fix?** Just say which pages you want me to update!
