# Quick Fix Guide: JWT Expiration Issues

## What Was Fixed
Your app was experiencing JWT token expiration causing all API calls to fail with 401 errors. This is now fixed with automatic token refresh and retry logic.

## Changes Made

### 1. Enhanced Authentication Context
**File:** `src/contexts/AuthContext.tsx`
- ✅ Added proactive session expiration checking
- ✅ Automatic session refresh when JWT expires
- ✅ Retry logic for profile and role queries
- ✅ Graceful logout if refresh fails

### 2. Created Reusable Query Helper
**File:** `src/hooks/useSupabaseQuery.ts` (NEW)
- ✅ `queryWithRefresh()` function wraps any Supabase query
- ✅ Automatically detects JWT expiration
- ✅ Refreshes session and retries once
- ✅ Can be used throughout your entire app

### 3. Updated Learner Dashboard
**File:** `src/pages/dashboard/LearnerDashboard.tsx`
- ✅ All queries now use `queryWithRefresh`
- ✅ Dashboard loads correctly even if JWT is expired

### 4. Enhanced Supabase Client
**File:** `src/integrations/supabase/client.ts`
- ✅ Added client identification header

## How to Test

### Test 1: Normal Operation
1. Log in to your app
2. Navigate to the learner dashboard
3. Should load without errors

### Test 2: Expired Session Recovery
1. Open browser DevTools → Application/Storage → Local Storage
2. Find the Supabase auth token
3. Change the expiration time to the past (or wait for natural expiration)
4. Refresh the page or navigate to dashboard
5. **Expected:** Dashboard should load successfully after auto-refresh

### Test 3: Completely Expired Session
1. Clear all Supabase tokens from localStorage
2. Try to access protected pages
3. **Expected:** Redirected to login page

## Apply to Other Components

To protect other components from JWT expiration, wrap their queries:

```typescript
// Import the helper
import { queryWithRefresh } from "@/hooks/useSupabaseQuery";

// Before (vulnerable to JWT expiration):
const { data, error } = await supabase
  .from("your_table")
  .select("*");

// After (protected with auto-retry):
const { data, error } = await queryWithRefresh(
  () => supabase.from("your_table").select("*")
);
```

## Components That Should Be Updated Next

1. `src/pages/dashboard/CoachDashboard.tsx`
2. `src/pages/dashboard/TherapistDashboard.tsx`
3. `src/pages/dashboard/AdminDashboard.tsx`
4. Any video player components
5. Any booking components
6. Any payment components

## Console Logs to Watch For

**Success logs (good):**
- `[AuthContext] Session refreshed successfully`
- `[queryWithRefresh] Session refreshed, retrying query`

**Warning logs (investigate if frequent):**
- `[AuthContext] JWT expired, attempting session refresh...`
- `[queryWithRefresh] JWT expired, attempting session refresh...`

**Error logs (need attention):**
- `[AuthContext] Session refresh failed` - Indicates refresh token also expired
- User will be logged out automatically

## Production Considerations

1. **Monitor Refresh Frequency**: If you see frequent refreshes, consider:
   - Increasing JWT token lifetime in Supabase settings
   - Implementing background token refresh before expiration

2. **User Experience**: Current solution is transparent to users
   - No error messages shown
   - No manual re-login required
   - Seamless data loading

3. **Performance**: Minimal impact
   - Only refreshes when needed
   - Single retry per query
   - Prevents cascading refresh attempts

## Troubleshooting

### Issue: Still seeing 401 errors
**Solution:** Check that components are using `queryWithRefresh`

### Issue: Users keep getting logged out
**Possible causes:**
- Refresh token lifetime too short
- Network issues preventing refresh
- Supabase configuration issue

### Issue: Dashboard loads slowly
**Possible cause:** Multiple queries triggering individual refreshes
**Solution:** Pre-emptive refresh in AuthContext should prevent this

## Next Steps

1. ✅ Core authentication fixed
2. ✅ Learner dashboard protected
3. ⏳ Apply pattern to remaining dashboards
4. ⏳ Apply pattern to all components with queries
5. ⏳ Add monitoring/telemetry for refresh rates
6. ⏳ Consider pre-emptive background refresh (before expiration)

## Need Help?

- Check `JWT_EXPIRATION_FIX.md` for detailed technical explanation
- Review console logs for refresh messages
- Test with expired tokens using DevTools
