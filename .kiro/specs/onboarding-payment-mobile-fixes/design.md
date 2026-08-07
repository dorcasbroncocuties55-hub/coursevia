# Onboarding, Payment & Mobile Navigation Bugfix Design

## Overview

This design document addresses three distinct bugs in the Coursevia platform:

1. **Onboarding Loop Bug**: ProtectedRoute redirects users to onboarding after completion
2. **Payment Page Loading Bug**: LearnerPayments page shows infinite loading spinner
3. **Mobile Dashboard Navigation Bug**: Horizontal tab navigation has scrolling/layout issues

Each bug requires minimal, targeted changes to fix the defective behavior while preserving all existing functionality. The fixes focus on state management, error handling, and responsive layout improvements.

## Glossary

- **Bug_Condition (C)**: The condition that triggers each bug
- **Property (P)**: The desired behavior when the bug condition holds
- **Preservation**: Existing behavior that must remain unchanged by the fix
- **ProtectedRoute**: Authentication guard component in `src/components/ProtectedRoute.tsx`
- **LearnerPayments**: Payment history component in `src/pages/dashboard/LearnerPayments.tsx`
- **DashboardLayout**: Layout component in `src/components/layouts/DashboardLayout.tsx`
- **onboarding_completed**: Profile field indicating whether user finished onboarding
- **profile loading state**: The period when user is authenticated but profile hasn't loaded from database yet

---

## Bug #1: Onboarding Loop

### Bug Condition

The onboarding loop bug manifests when a user with `onboarding_completed=true` navigates back in their browser or when the profile hasn't loaded yet. The ProtectedRoute component either redirects them to `/onboarding` or shows an infinite loading spinner, even though the user has already completed onboarding.

**Formal Specification:**
```
FUNCTION isBugCondition_OnboardingLoop(input)
  INPUT: input of type { user: User, profile: Profile | null, location: Location }
  OUTPUT: boolean
  
  RETURN input.user IS authenticated
         AND input.user.user_metadata.onboarding_completed == true
         AND (input.profile == null OR input.profile.onboarding_completed == true)
         AND (redirectsToOnboarding(input) OR showsInfiniteSpinner(input))
END FUNCTION
```

### Examples

- User completes onboarding → navigates to dashboard → clicks back button → redirected to /onboarding (should go to previous page)
- User with completed onboarding refreshes page → profile hasn't loaded yet → infinite spinner (should use cached metadata)
- User with completed onboarding opens dashboard in new tab → profile loads slowly → redirected to /onboarding (should wait or use metadata)

### Preservation Requirements

**Unchanged Behaviors:**
- Users who have NOT completed onboarding must still be redirected to /onboarding
- Users actively on the onboarding page can complete the flow without interruption
- Admin users bypass onboarding requirements completely
- Role-based access control continues to work correctly

**Scope:**
All authentication and routing logic that does NOT involve completed-onboarding users should be completely unaffected by this fix. This includes:
- First-time user onboarding flow
- Role verification and dashboard routing
- Anonymous user handling
- Logout and session management

## Hypothesized Root Cause

Based on the code analysis, the most likely issues are:

1. **Premature Profile Check**: Lines 77-99 in ProtectedRoute check `if (!profile)` and sometimes redirect to onboarding before checking if the user has already completed onboarding via cached metadata

2. **Incorrect Loading State Handling**: The condition at line 77 `if (!profile)` doesn't differentiate between "profile never loaded" vs "profile loading in progress for a completed user"

3. **Insufficient Metadata Usage**: The component has `metadataRole` and `resolvedRoles` that could indicate completion status, but doesn't use them consistently to prevent premature redirects

4. **Race Condition**: The profile fetch can complete AFTER the redirect logic executes, causing users to be sent to onboarding before the system knows they've completed it

## Correctness Properties

Property 1: Bug Condition - No Premature Onboarding Redirects

_For any_ authenticated user where `onboarding_completed=true` (either in profile or user_metadata), the fixed ProtectedRoute SHALL NOT redirect to /onboarding, regardless of profile loading state. The component SHALL either wait for profile to load, use cached metadata to determine completion, or allow access without redirection.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Incomplete Users Still Redirected

_For any_ authenticated user where `onboarding_completed=false` or is undefined in both profile and metadata, the fixed ProtectedRoute SHALL continue to redirect to /onboarding exactly as before, preserving the requirement that incomplete users cannot access protected routes.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `src/components/ProtectedRoute.tsx`

**Function**: `ProtectedRoute` component

**Specific Changes**:

1. **Add Metadata Completion Check**: Extract `onboarding_completed` from `user.user_metadata` and use it as a fallback indicator
   ```typescript
   const metadataOnboardingCompleted = user?.user_metadata?.onboarding_completed === true;
   ```

2. **Modify Profile Loading Logic (Lines 77-99)**: Replace the `if (!profile)` block to check metadata completion before deciding whether to wait or redirect
   ```typescript
   if (!profile) {
     // If user has completed onboarding per metadata, don't redirect
     if (metadataOnboardingCompleted) {
       return <>{children}</>;
     }
     
     // Otherwise, existing logic continues...
   }
   ```

3. **Update Onboarding Redirect Logic (Lines 101-109)**: Add check for metadata completion before redirecting
   ```typescript
   if (
     requireOnboarding &&
     profile &&
     !profile.onboarding_completed &&
     !metadataOnboardingCompleted &&  // NEW CHECK
     !isOnboardingPath &&
     !resolvedRoles.includes("admin" as AppRole)
   ) {
     return <Navigate to="/onboarding" replace />;
   }
   ```

4. **Update Onboarding Page Access (Lines 111-120)**: Check metadata completion when determining if completed users should be redirected away from onboarding
   ```typescript
   const isOnboardingComplete = profile?.onboarding_completed || metadataOnboardingCompleted;
   
   if (
     requireOnboarding === false &&
     isOnboardingPath &&
     isOnboardingComplete &&
     resolvedPrimaryRole &&
     resolvedPrimaryRole !== "admin"
   ) {
     return <Navigate to={roleToDashboardPath(resolvedPrimaryRole)} replace />;
   }
   ```

5. **Add Safety Comment**: Document the race condition fix for future maintainers

---

## Bug #2: Payment Page Loading

### Bug Condition

The payment page loading bug manifests when the data fetching in the `load()` function fails silently or takes too long without proper timeout handling. The component remains in loading state indefinitely because there's no error handling or timeout mechanism.

**Formal Specification:**
```
FUNCTION isBugCondition_PaymentLoading(input)
  INPUT: input of type { fetchDuration: number, fetchError: Error | null }
  OUTPUT: boolean
  
  RETURN (input.fetchDuration > 3000 AND loadingStateStillTrue)
         OR (input.fetchError != null AND noErrorDisplayed)
END FUNCTION
```

### Examples

- User clicks "Payments" link → data fetch takes 10+ seconds → infinite spinner (should timeout and show error)
- User loads payment page → Supabase query fails → infinite spinner (should show error message)
- User loads payment page → network error occurs → infinite spinner (should show retry option)
- User loads payment page → query returns empty result slowly → infinite spinner (should complete and show empty state)

### Preservation Requirements

**Unchanged Behaviors:**
- Successful payment data display with correct amounts, dates, and statuses
- Refund request modal functionality
- Tab switching between "Payment History" and "Refund Requests"
- Empty state display when user has no payments

**Scope:**
All functionality that works when data loads successfully should be completely unaffected. This includes:
- Payment table rendering
- Refund eligibility calculation
- Status badge styling
- Statistics display (total spent, transaction count)

## Hypothesized Root Cause

Based on the code analysis, the most likely issues are:

1. **Missing Error Handling**: The `load()` function at lines 36-47 uses `await Promise.all()` but doesn't have a try-catch block to handle fetch failures

2. **No Timeout Mechanism**: There's no timeout to prevent infinite waiting if the Supabase query stalls

3. **Missing Error State**: The component has `loading` state but no `error` state to track and display fetch failures

4. **Silent Failure Mode**: If the query fails, `setLoading(false)` is never called, leaving the spinner visible indefinitely

## Correctness Properties

Property 1: Bug Condition - Error Handling and Timeout

_For any_ data fetch operation in LearnerPayments where the fetch fails OR takes longer than 5 seconds, the fixed component SHALL display an error message with a retry button, ensuring users are never stuck with an infinite loading spinner.

**Validates: Requirements 2.1, 2.3**

Property 2: Preservation - Successful Load Behavior

_For any_ data fetch operation that succeeds within the timeout period, the fixed component SHALL display payment data exactly as before, preserving all table rendering, refund functionality, and statistics calculations.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `src/pages/dashboard/LearnerPayments.tsx`

**Component**: `LearnerPayments`

**Specific Changes**:

1. **Add Error State**: Add new state variable to track errors
   ```typescript
   const [error, setError] = useState<string | null>(null);
   ```

2. **Add Timeout and Error Handling to load()**: Wrap the fetch in try-catch and add timeout
   ```typescript
   const load = async () => {
     if (!user) {
       setPayments([]);
       setLoading(false);
       return;
     }
     
     setError(null);
     setLoading(true);
     
     try {
       const timeoutPromise = new Promise((_, reject) =>
         setTimeout(() => reject(new Error('Request timeout')), 5000)
       );
       
       const fetchPromise = Promise.all([
         supabase.from("payments").select("*").eq("payer_id", user.id).order("created_at", { ascending: false }),
         supabase.from("refunds" as any).select("payment_id").eq("user_id", user.id).in("status", ["pending", "processed"]),
       ]);
       
       const [{ data: pays, error: payError }, { data: refs, error: refError }] = await Promise.race([
         fetchPromise,
         timeoutPromise
       ]);
       
       if (payError || refError) {
         throw new Error(payError?.message || refError?.message || 'Failed to load payment data');
       }
       
       setPayments(pays || []);
       setExistingRefunds(new Set((refs || []).map((r: any) => r.payment_id).filter(Boolean)));
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to load payments');
     } finally {
       setLoading(false);
     }
   };
   ```

3. **Add Error State Display**: Add error UI before the loading check (around line 61)
   ```typescript
   if (error) {
     return (
       <DashboardLayout role="learner">
         <div className="space-y-6">
           <div>
             <h1 className="text-2xl font-bold text-foreground">Payments</h1>
             <p className="text-sm text-muted-foreground mt-0.5">Manage your payments and refund requests</p>
           </div>
           <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-12 text-center">
             <CreditCard size={32} className="mx-auto text-destructive mb-3" />
             <p className="text-destructive font-medium mb-2">Failed to load payment data</p>
             <p className="text-sm text-muted-foreground mb-4">{error}</p>
             <Button onClick={load} variant="outline">Retry</Button>
           </div>
         </div>
       </DashboardLayout>
     );
   }
   ```

4. **Update useEffect Dependency**: Ensure `load` function is properly memoized or dependencies are correct
   ```typescript
   useEffect(() => {
     if (!authLoading) {
       load();
     }
   }, [user?.id, authLoading]); // More specific dependency
   ```

---

## Bug #3: Mobile Dashboard Navigation

### Bug Condition

The mobile navigation bug manifests when users view the dashboard on mobile devices (viewport < 1024px) and have many navigation items. The horizontal scrolling container either doesn't scroll properly, has incorrect layout, or makes items difficult to access.

**Formal Specification:**
```
FUNCTION isBugCondition_MobileNav(input)
  INPUT: input of type { viewportWidth: number, navItemCount: number, canScroll: boolean }
  OUTPUT: boolean
  
  RETURN input.viewportWidth < 1024
         AND input.navItemCount >= 10
         AND (NOT input.canScroll OR hasLayoutIssues(input))
END FUNCTION
```

### Examples

- User opens coach dashboard on mobile (15 nav items) → tabs overflow without scrolling (should scroll horizontally)
- User swipes navigation on mobile → scroll is janky or doesn't work (should have smooth touch scrolling)
- User has therapist role on mobile (14 nav items) → can't reach last items (should scroll to access all items)
- User taps a tab on mobile → active state doesn't show clearly (should highlight active tab)

### Preservation Requirements

**Unchanged Behaviors:**
- Desktop sidebar navigation (viewport >= 1024px) displays as fixed sidebar
- Active navigation item highlighting
- Sign out functionality
- Page content rendering below navigation

**Scope:**
All desktop navigation behavior and page content rendering should be completely unaffected. This includes:
- Fixed sidebar on desktop
- Navigation item hover states on desktop
- User profile display in sidebar
- Main content scrolling behavior

## Hypothesized Root Cause

Based on the code analysis, the most likely issues are:

1. **Missing Scrollbar Styling**: Line 226 has `scrollbarWidth: "none"` which hides the scrollbar but may also disable scrolling on some browsers

2. **Insufficient Touch Support**: No explicit touch event handling or `-webkit-overflow-scrolling: touch` for smooth iOS scrolling

3. **Layout Issues with Many Items**: The `gap-1` and padding may not provide enough spacing when there are 15+ items

4. **No Scroll Indicators**: Users can't tell that more items are available off-screen without visual cues

## Correctness Properties

Property 1: Bug Condition - Smooth Mobile Navigation Scrolling

_For any_ dashboard viewed on mobile (viewport < 1024px) with any number of navigation items, the fixed DashboardLayout SHALL provide smooth horizontal scrolling with touch/swipe support, proper spacing, and visual indication that more items are available.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Desktop Navigation Unchanged

_For any_ dashboard viewed on desktop (viewport >= 1024px), the fixed DashboardLayout SHALL display the fixed sidebar navigation exactly as before, with all items visible, proper hover states, and active highlighting.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `src/components/layouts/DashboardLayout.tsx`

**Component**: Mobile header navigation section (Lines 212-238)

**Specific Changes**:

1. **Improve Scrolling Container**: Replace the inline style and add better scroll support
   ```typescript
   <div 
     className="flex overflow-x-auto px-2 pb-2 gap-2 scroll-smooth snap-x snap-mandatory"
     style={{ 
       WebkitOverflowScrolling: 'touch',
       scrollbarWidth: 'thin',
       scrollbarColor: 'rgba(0,0,0,0.2) transparent'
     }}
   >
   ```

2. **Add Scroll Snap for Items**: Update link className to include snap points
   ```typescript
   <Link
     key={item.href}
     to={item.href}
     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors snap-start shrink-0 ${
       isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
     }`}
   >
   ```

3. **Increase Gap for Better Spacing**: Change `gap-1` to `gap-2` in the container

4. **Add Scroll Shadow Indicators**: Add gradient overlays to show more content is available
   ```typescript
   <div className="relative">
     <div 
       className="flex overflow-x-auto px-2 pb-2 gap-2 scroll-smooth"
       style={{ 
         WebkitOverflowScrolling: 'touch',
         scrollbarWidth: 'thin',
         scrollbarColor: 'rgba(0,0,0,0.2) transparent'
       }}
     >
       {nav.map((item) => (
         <Link
           key={item.href}
           to={item.href}
           className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
             isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
           }`}
         >
           <item.icon size={14} />
           {item.label}
         </Link>
       ))}
     </div>
     {/* Scroll indicators - gradient shadows */}
     <div className="absolute left-0 top-0 bottom-2 w-4 bg-gradient-to-r from-card to-transparent pointer-events-none" />
     <div className="absolute right-0 top-0 bottom-2 w-4 bg-gradient-to-l from-card to-transparent pointer-events-none" />
   </div>
   ```

5. **Ensure Proper Touch Target Size**: Make sure tabs are at least 44x44px for accessibility (current 1.5rem padding should be sufficient)

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify each fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate all three bugs BEFORE implementing the fixes. Confirm or refute the root cause analyses. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the bug conditions and observe failures on UNFIXED code.

**Test Cases**:

**Bug #1 - Onboarding Loop:**
1. **Completed User Back Navigation**: Simulate user with `onboarding_completed=true` clicking back button (will fail on unfixed code - redirects to /onboarding)
2. **Profile Loading Race Condition**: Simulate authenticated user with metadata completion but null profile (will fail on unfixed code - shows infinite spinner or redirects)
3. **Refresh After Completion**: Simulate page refresh for completed user before profile loads (will fail on unfixed code - redirects to onboarding)

**Bug #2 - Payment Loading:**
1. **Fetch Timeout**: Simulate slow Supabase query (>5 seconds) (will fail on unfixed code - infinite spinner)
2. **Fetch Error**: Simulate network error during data fetch (will fail on unfixed code - infinite spinner)
3. **Supabase Error Response**: Simulate Supabase returning error object (will fail on unfixed code - infinite spinner)

**Bug #3 - Mobile Navigation:**
1. **Many Items Scrolling**: Open coach dashboard on mobile viewport with 15 items (may fail on unfixed code - no scrolling)
2. **Touch Scroll Performance**: Simulate touch/swipe events on mobile nav (may fail on unfixed code - janky scrolling)
3. **Item Visibility**: Test if all navigation items are accessible on small viewport (may fail on unfixed code - items cut off)

**Expected Counterexamples**:
- Bug #1: Users redirected to /onboarding despite completion
- Bug #2: Loading spinner never disappears on fetch errors
- Bug #3: Navigation items not scrollable or hard to access on mobile

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed functions produce the expected behavior.

**Bug #1 Pseudocode:**
```
FOR ALL user WHERE user.onboarding_completed == true DO
  result := ProtectedRoute_fixed(user, profile=null, location)
  ASSERT NOT redirectsToOnboarding(result)
  ASSERT NOT showsInfiniteSpinner(result)
END FOR
```

**Bug #2 Pseudocode:**
```
FOR ALL fetch WHERE (fetch.duration > 5000 OR fetch.error != null) DO
  result := LearnerPayments_fixed.load()
  ASSERT showsErrorMessage(result)
  ASSERT offersRetryOption(result)
  ASSERT NOT showsInfiniteSpinner(result)
END FOR
```

**Bug #3 Pseudocode:**
```
FOR ALL viewport WHERE viewport.width < 1024 AND navItems.length >= 10 DO
  result := DashboardLayout_fixed(viewport, navItems)
  ASSERT canScrollHorizontally(result)
  ASSERT hasSmoothTouchScrolling(result)
  ASSERT allItemsAccessible(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same results as the original functions.

**Bug #1 Pseudocode:**
```
FOR ALL user WHERE user.onboarding_completed == false DO
  ASSERT ProtectedRoute_original(user, profile, location) = ProtectedRoute_fixed(user, profile, location)
END FOR
```

**Bug #2 Pseudocode:**
```
FOR ALL fetch WHERE fetch.success == true AND fetch.duration < 5000 DO
  ASSERT LearnerPayments_original.render(data) = LearnerPayments_fixed.render(data)
END FOR
```

**Bug #3 Pseudocode:**
```
FOR ALL viewport WHERE viewport.width >= 1024 DO
  ASSERT DashboardLayout_original(viewport, navItems) = DashboardLayout_fixed(viewport, navItems)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-bug scenarios, then write property-based tests capturing that behavior.

**Test Cases**:

**Bug #1 Preservation:**
1. **Incomplete User Redirect**: Verify users with `onboarding_completed=false` are still redirected to /onboarding
2. **Role-Based Access**: Verify role verification continues to work correctly
3. **Admin Bypass**: Verify admin users still bypass onboarding requirements

**Bug #2 Preservation:**
1. **Successful Load Display**: Verify payment table renders correctly when data loads successfully
2. **Refund Functionality**: Verify refund request modal works after fix
3. **Tab Switching**: Verify switching between tabs continues to work

**Bug #3 Preservation:**
1. **Desktop Sidebar**: Verify fixed sidebar displays correctly on desktop (viewport >= 1024px)
2. **Navigation Highlighting**: Verify active item highlighting works on both mobile and desktop
3. **Sign Out**: Verify sign out button works on both mobile and desktop

### Unit Tests

**Bug #1 - Onboarding Loop:**
- Test ProtectedRoute with authenticated user, null profile, metadata completion = true
- Test ProtectedRoute with authenticated user, profile completed = true
- Test ProtectedRoute with authenticated user, profile completed = false
- Test ProtectedRoute with unauthenticated user
- Test ProtectedRoute with admin user

**Bug #2 - Payment Loading:**
- Test load() with successful fetch
- Test load() with timeout (>5 seconds)
- Test load() with network error
- Test load() with Supabase error response
- Test error state display
- Test retry functionality

**Bug #3 - Mobile Navigation:**
- Test navigation rendering on mobile viewport (<1024px)
- Test navigation rendering on desktop viewport (>=1024px)
- Test horizontal scrolling on mobile with 15+ items
- Test active tab highlighting
- Test touch scroll smoothness (may require manual testing)

### Property-Based Tests

**Bug #1:**
- Generate random user states (authenticated, profile states, metadata states) and verify no completed user is redirected to onboarding
- Generate random incomplete user states and verify all are redirected to onboarding
- Generate random role combinations and verify role-based access works correctly

**Bug #2:**
- Generate random fetch scenarios (success, timeout, errors) and verify appropriate UI state
- Generate random payment data sets and verify correct rendering
- Generate random user interactions (tab switches, refund requests) and verify preservation

**Bug #3:**
- Generate random viewport widths and verify correct layout (sidebar vs mobile tabs)
- Generate random navigation item counts (5, 10, 15, 20) and verify all are accessible
- Generate random touch/click events and verify navigation works

### Integration Tests

**Bug #1 - Onboarding Loop:**
- Test full onboarding flow completion → navigate to dashboard → click back button → verify stays on dashboard
- Test user refresh after onboarding completion → verify no redirect to onboarding
- Test new user signup → verify redirect to onboarding → complete flow → verify redirect to role dashboard

**Bug #2 - Payment Loading:**
- Test navigation to payment page with successful data load → verify payment table displays
- Test navigation to payment page with network error → verify error message → click retry → verify data loads
- Test refund request flow from payment page → verify modal opens → submit request → verify success

**Bug #3 - Mobile Navigation:**
- Test coach dashboard on mobile → swipe navigation left/right → verify smooth scrolling
- Test therapist dashboard on mobile → tap navigation items → verify correct page loads
- Test learner dashboard on desktop → verify sidebar displays → click items → verify navigation works
- Test responsive behavior: resize from desktop to mobile → verify layout switches correctly
