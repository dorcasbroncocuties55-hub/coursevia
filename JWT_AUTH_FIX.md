# 🔐 JWT Authentication Fix - Token Expiry Issue

## 🚨 **Problem Identified**

Your user is logged in but getting **401 Unauthorized** errors because:
- JWT token has expired 
- Supabase client not refreshing tokens automatically
- All API calls failing with "JWT expired"

---

## 🔍 **Error Analysis**

```
❌ Failed API Calls:
- profiles?user_id=eq.2f30f0ae... → 401 (JWT expired)
- categories → 401 (JWT expired)  
- courses → 401 (JWT expired)
- bookings → 401 (JWT expired)
- notifications → 401 (JWT expired)
- wallets → 401 (JWT expired)
- payments → 401 (JWT expired)

✅ Auth State: SIGNED_IN (user: kaylajames76334@gmail.com)
❌ Token Status: EXPIRED
```

---

## 🛠️ **Solution 1: Force Token Refresh**

### Update your AuthContext to handle token refresh:

```javascript
// In your AuthContext.tsx or auth component
import { supabase } from "@/integrations/supabase/client";

const refreshSession = async () => {
  try {
    console.log("[AuthContext] Refreshing session...");
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("[AuthContext] Refresh failed:", error.message);
      // Force re-login if refresh fails
      await supabase.auth.signOut();
      return false;
    }
    
    if (data?.session) {
      console.log("[AuthContext] Session refreshed successfully");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[AuthContext] Refresh error:", error);
    return false;
  }
};

// Add this to your fetchProfile function
const fetchProfile = async (userId) => {
  try {
    // First attempt
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If JWT expired, try to refresh
      if (error.message?.includes("JWT") || error.message?.includes("expired")) {
        console.log("[AuthContext] JWT expired, attempting refresh...");
        
        const refreshed = await refreshSession();
        if (refreshed) {
          // Retry the call with new token
          const { data: retryData, error: retryError } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .single();
            
          if (!retryError) {
            return retryData;
          }
        }
        
        // If refresh failed, force logout
        console.log("[AuthContext] Refresh failed, signing out...");
        await supabase.auth.signOut();
        return null;
      }
      
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("[AuthContext] fetchProfile error:", error);
    return null;
  }
};
```

---

## 🛠️ **Solution 2: Auto-Refresh Setup**

### Configure automatic token refresh:

```javascript
// In your Supabase client initialization
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,       // Enable auto-refresh
      persistSession: true,         // Persist sessions
      detectSessionInUrl: true,     // Detect auth redirects
      flowType: 'pkce'             // Use PKCE flow for better security
    }
  }
);

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('[Auth] State change:', event, session?.user?.email);
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('[Auth] Token refreshed successfully');
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('[Auth] User signed out');
    // Clear any local state
  }
});
```

---

## 🛠️ **Solution 3: Quick Fix - Force Re-Login**

### Immediate solution for testing:

```javascript
// Add this to your dashboard component
const handleAuthError = async () => {
  console.log("Forcing re-authentication...");
  
  // Clear current session
  await supabase.auth.signOut();
  
  // Redirect to login
  window.location.href = '/login';
};

// Or add a "Refresh Login" button
const refreshAuth = async () => {
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      await handleAuthError();
    } else {
      window.location.reload(); // Reload page with new token
    }
  } catch (error) {
    await handleAuthError();
  }
};
```

---

## 🛠️ **Solution 4: Check Supabase JWT Settings**

### In Supabase Dashboard:

1. **Go to Authentication → Settings**
2. **Check JWT expiry time:**
   - Default: 1 hour
   - Recommended: 24 hours for development
   - Production: 1-8 hours

3. **Update JWT settings if needed:**
   ```
   JWT expiry: 86400 seconds (24 hours)
   Refresh token expiry: 604800 seconds (7 days)
   ```

---

## 🔧 **Debugging Steps**

### 1. Check Current Session Status:
```javascript
const checkAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  console.log('Session:', {
    user: session?.user?.email,
    expiresAt: session?.expires_at,
    isExpired: session ? Date.now() / 1000 > session.expires_at : 'No session',
    accessToken: session?.access_token?.substring(0, 20) + '...',
    refreshToken: session?.refresh_token ? 'Present' : 'Missing'
  });
};

// Run this in browser console
checkAuth();
```

### 2. Test Token Refresh Manually:
```javascript
// In browser console
const testRefresh = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  console.log('Refresh result:', { data: !!data.session, error });
};

testRefresh();
```

### 3. Check Network Tab:
- Look for `Authorization: Bearer eyJ...` headers
- Verify JWT tokens in requests
- Check for 401 responses

---

## 🚀 **Recommended Fix (Immediate)**

**For quick resolution:**

1. **Sign out and back in:**
   ```javascript
   // In browser console or add button
   await supabase.auth.signOut();
   // Then login again normally
   ```

2. **Clear browser storage:**
   - Press F12 → Application → Storage
   - Clear "Local Storage" for your domain
   - Clear "Session Storage" 
   - Refresh page and login again

3. **Update AuthContext with token refresh logic** (Solution 1 above)

---

## 🔐 **Long-term Security Improvements**

### 1. Implement Token Refresh Interceptor:
```javascript
// Create API wrapper that handles token refresh
const apiCall = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    if (error.message?.includes('JWT') || error.message?.includes('expired')) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        return await fn(); // Retry with new token
      }
    }
    throw error;
  }
};

// Usage:
const profiles = await apiCall(() => 
  supabase.from('profiles').select('*').eq('user_id', userId).single()
);
```

### 2. Add Token Expiry Monitoring:
```javascript
// Check token expiry every 30 minutes
setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    const expiresIn = session.expires_at - (Date.now() / 1000);
    
    // Refresh if expires in less than 5 minutes
    if (expiresIn < 300) {
      console.log('[Auth] Proactive token refresh');
      await supabase.auth.refreshSession();
    }
  }
}, 30 * 60 * 1000); // Every 30 minutes
```

---

## 📋 **Action Items**

**Immediate (to fix right now):**
1. ✅ Sign out: `supabase.auth.signOut()`
2. ✅ Clear browser storage
3. ✅ Login again
4. ✅ Test if 401 errors are gone

**Short-term (this week):**
1. ✅ Add token refresh logic to AuthContext
2. ✅ Implement API error handling
3. ✅ Test auto-refresh functionality

**Long-term (next sprint):**
1. ✅ Add proactive token refresh
2. ✅ Implement retry logic for API calls
3. ✅ Add better error boundaries

---

This JWT expiry issue is common but easily fixable. The immediate solution is to re-login, and the permanent solution is adding proper token refresh handling! 🔐✨