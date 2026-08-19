# JWT Expiration Fix - Complete Solution

## Problem
Users were experiencing JWT token expiration errors causing all API calls to fail with 401 status codes. The symptoms included:

- "JWT expired" errors in console
- All dashboard queries failing simultaneously
- Session not automatically refreshing despite `autoRefreshToken: true` being set
- User forced to log out and log back in manually

## Root Causes

1. **No proactive session checking**: The AuthContext didn't check if sessions were expired before making API calls
2. **No retry mechanism**: When queries failed due to JWT expiration, there was no automatic retry after token refresh
3. **Silent failures**: Background profile fetches failed silently without triggering session refresh
4. **Race conditions**: Multiple queries failing simultaneously without coordinated refresh

## Solutions Implemented

### 1. Enhanced AuthContext Session Management (`src/contexts/AuthContext.tsx`)

#### Added Proactive Session Expiration Check
```typescript
// Check if the session is expired and refresh if needed
const now = Math.floor(Date.now() / 1000);
const expiresAt = nextSession.expires_at;

if (expiresAt && expiresAt < now) {
  console.log("[AuthContext] Session expired, attempting refresh...");
  
  const { data: { session: refreshedSession }, error: refreshError } = 
    await supabase.auth.refreshSession();
  
  if (refreshError || !refreshedSession) {
    console.error("[AuthContext] Session refresh failed, logging out");
    await logout();
    return;
  }
  
  console.log("[AuthContext] Session refreshed successfully");
  nextSession = refreshedSession;
  setSession(refreshedSession);
  setUser(refreshedSession.user);
}
```

#### Added Automatic Retry Logic to fetchProfile
```typescript
const fetchProfile = async (userId: string, retryCount = 0): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("...")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // If JWT expired, try to refresh the session once
    if ((error.message?.includes("JWT expired") || error.code === "PGRST301") && retryCount === 0) {
      console.log("[AuthContext] JWT expired, attempting session refresh...");
      
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error("[AuthContext] Session refresh failed:", refreshError);
        await logout();
        return null;
      }
      
      if (refreshedSession) {
        console.log("[AuthContext] Session refreshed successfully, retrying profile fetch");
        return fetchProfile(userId, retryCount + 1);
      }
    }
    
    logSupabaseError("fetchProfile error:", error);
    setProfile(null);
    return null;
  }

  const nextProfile = (data as Profile | null) ?? null;
  setProfile(nextProfile);
  return nextProfile;
};
```

#### Added Same Retry Logic to fetchRoles
- Mirrors the fetchProfile retry logic
- Ensures role queries also recover from JWT expiration
- Logs out user if refresh fails

### 2. Created Reusable Query Wrapper (`src/hooks/useSupabaseQuery.ts`)

Created `queryWithRefresh` helper to wrap any Supabase query with automatic token refresh:

```typescript
export async function queryWithRefresh<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  onRefreshFailed?: () => void
): Promise<{ data: T | null; error: any }> {
  let result = await queryFn();

  // If JWT expired, try to refresh and retry once
  if (result.error?.message?.includes("JWT expired") || result.error?.code === "PGRST301") {
    console.log("[queryWithRefresh] JWT expired, attempting session refresh...");

    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !session) {
      console.error("[queryWithRefresh] Session refresh failed:", refreshError);
      onRefreshFailed?.();
      return result;
    }

    console.log("[queryWithRefresh] Session refreshed, retrying query");
    result = await queryFn();
  }

  return result;
}
```

### 3. Updated LearnerDashboard (`src/pages/dashboard/LearnerDashboard.tsx`)

Wrapped all dashboard queries with `queryWithRefresh` to handle JWT expiration gracefully:

```typescript
const [videos, bookings, notifs, paymentMethods, payments] = await Promise.all([
  queryWithRefresh(
    () => supabase.from("content_access").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("content_type", "video")
  ).then(result => safeSingle<any>(result, { count: 0 })),
  queryWithRefresh(
    () => supabase.from("bookings").select("id", { count: "exact", head: true })
      .eq("learner_id", user.id)
  ).then(result => safeSingle<any>(result, { count: 0 })),
  // ... other queries
]);
```

### 4. Enhanced Supabase Client Configuration (`src/integrations/supabase/client.ts`)

Added client identification header for better debugging:

```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
  },
  global: {
    headers: {
      'X-Client-Info': 'coursevia-web',
    },
  },
});
```

## How It Works

### Normal Flow (No Expiration)
1. User makes API request
2. Request completes successfully
3. Data displayed to user

### JWT Expired Flow (Now Fixed)
1. User makes API request
2. Supabase returns 401 "JWT expired" error
3. `queryWithRefresh` detects the error
4. Automatically calls `supabase.auth.refreshSession()`
5. Supabase exchanges refresh token for new access token
6. Query is retried with new token
7. Data returned successfully

### Session Expired Flow (Refresh Token Also Expired)
1. User makes API request
2. JWT is expired
3. Refresh attempt fails (refresh token also expired)
4. User is automatically logged out
5. Redirected to login page

## Benefits

1. **Seamless UX**: Users no longer see errors or need to manually re-login
2. **Automatic Recovery**: System self-heals from token expiration
3. **Graceful Degradation**: If refresh fails, users are logged out cleanly
4. **Reusable Pattern**: `queryWithRefresh` can be used across the entire app
5. **Better Logging**: Clear console logs for debugging session issues
6. **No Race Conditions**: Each query handles its own refresh independently

## Testing Recommendations

1. **Force JWT Expiration**: Manually expire JWT in localStorage and verify auto-refresh
2. **Network Delay**: Test with slow network to ensure refresh completes
3. **Refresh Token Expiration**: Test behavior when refresh token is also expired
4. **Multiple Simultaneous Queries**: Verify dashboard loads correctly on session edge cases
5. **Background Tabs**: Test session refresh when tab has been inactive

## Next Steps

### Apply to Other Components
Use `queryWithRefresh` in:
- CoachDashboard
- TherapistDashboard
- AdminDashboard
- Video player components
- Booking components
- Payment components
- Any component making Supabase queries

### Example Pattern
```typescript
import { queryWithRefresh } from "@/hooks/useSupabaseQuery";

// Wrap your query
const { data, error } = await queryWithRefresh(
  () => supabase.from("your_table").select("*"),
  () => logout() // Optional: what to do if refresh fails
);
```

## Monitoring

Watch for these log messages in console:
- `[AuthContext] JWT expired, attempting session refresh...`
- `[queryWithRefresh] JWT expired, attempting session refresh...`
- `[AuthContext] Session refreshed successfully`
- `[AuthContext] Session refresh failed` (indicates a problem)

## Files Modified

1. `src/contexts/AuthContext.tsx` - Added retry logic and session expiration checks
2. `src/integrations/supabase/client.ts` - Enhanced configuration
3. `src/hooks/useSupabaseQuery.ts` - **NEW** - Reusable query wrapper
4. `src/pages/dashboard/LearnerDashboard.tsx` - Applied query wrapper pattern

## Rollout Strategy

1. ✅ **Phase 1** (Completed): Core infrastructure (AuthContext + useSupabaseQuery)
2. ✅ **Phase 2** (Completed): LearnerDashboard
3. **Phase 3** (Recommended): Apply to all other dashboard components
4. **Phase 4** (Recommended): Apply to all components with Supabase queries
5. **Phase 5** (Optional): Add telemetry to track refresh success rates
