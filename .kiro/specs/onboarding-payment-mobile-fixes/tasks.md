# Implementation Plan: Onboarding, Payment & Mobile Navigation Bugfixes

## Bug #1: Onboarding Loop Fix

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Completed User Premature Onboarding Redirects
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate completed users are incorrectly redirected to /onboarding
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to concrete failing cases: authenticated users with `onboarding_completed=true` in metadata but null profile
  - Test that ProtectedRoute does NOT redirect to /onboarding for users with `user.user_metadata.onboarding_completed == true`, regardless of profile loading state
  - Test cases: (1) user navigates back after completion, (2) profile hasn't loaded yet but metadata shows completion, (3) page refresh before profile loads
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: which scenarios cause incorrect redirects or infinite spinners
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Incomplete Users Still Redirected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (users with `onboarding_completed=false` or undefined)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that users with incomplete onboarding are still redirected to /onboarding
  - Test that admin users still bypass onboarding requirements
  - Test that role-based access control continues to work correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix for Onboarding Loop - Metadata Completion Fallback

  - [ ] 3.1 Implement the fix in ProtectedRoute.tsx
    - Add metadata completion check: extract `onboarding_completed` from `user.user_metadata` and use as fallback
    - Modify profile loading logic (lines 77-99): check metadata completion before deciding to wait or redirect
    - If `metadataOnboardingCompleted == true` and profile is null, render children instead of showing spinner
    - Update onboarding redirect logic (lines 101-109): add check for metadata completion before redirecting
    - Update onboarding page access logic (lines 111-120): check metadata completion when determining if completed users should be redirected away
    - Add safety comment documenting the race condition fix for future maintainers
    - _Bug_Condition: user.onboarding_completed == true AND (profile == null OR profile.onboarding_completed == true) AND (redirectsToOnboarding OR showsInfiniteSpinner)_
    - _Expected_Behavior: Does NOT redirect to /onboarding AND does NOT show infinite spinner_
    - _Preservation: Users with onboarding_completed=false still redirected; admin bypass preserved; role-based access unchanged_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - No Premature Onboarding Redirects
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Incomplete Users Still Redirected
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all Bug #1 tests pass
  - Ensure all tests pass, ask the user if questions arise

---

## Bug #2: Payment Page Loading Fix

- [ ] 5. Write bug condition exploration test
  - **Property 1: Bug Condition** - Infinite Loading Spinner on Fetch Errors
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the infinite loading spinner bug
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: fetch timeouts (>5 seconds), network errors, Supabase error responses
  - Test that LearnerPayments load() function shows error message with retry button for all fetch failures or timeouts
  - Test cases: (1) fetch takes >5 seconds, (2) network error during fetch, (3) Supabase returns error object
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists - infinite spinner shown instead of error)
  - Document counterexamples found: which error scenarios cause infinite loading
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.3_

- [ ] 6. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Successful Load Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (successful data fetches within timeout)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that payment table displays correctly when data loads successfully
  - Test that refund request modal functionality continues to work
  - Test that tab switching between "Payment History" and "Refund Requests" works
  - Test that empty state displays correctly when user has no payments
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7. Fix for Payment Page Loading - Error Handling and Timeout

  - [ ] 7.1 Implement the fix in LearnerPayments.tsx
    - Add error state: `const [error, setError] = useState<string | null>(null);`
    - Wrap load() function fetch in try-catch block
    - Add 5-second timeout using Promise.race with timeout promise
    - Handle Supabase errors (payError, refError) by throwing descriptive error
    - Set error state in catch block with appropriate message
    - Ensure setLoading(false) is called in finally block
    - Add error state display UI: error message, icon, and retry button
    - Place error state check before loading check in component render
    - Update useEffect dependency to be more specific: `[user?.id, authLoading]`
    - _Bug_Condition: (fetchDuration > 5000 AND loadingStateStillTrue) OR (fetchError != null AND noErrorDisplayed)_
    - _Expected_Behavior: Shows error message with retry button; no infinite spinner_
    - _Preservation: Successful data display unchanged; refund functionality preserved; tab switching works_
    - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.3_

  - [ ] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Error Handling and Timeout
    - **IMPORTANT**: Re-run the SAME test from task 5 - do NOT write a new test
    - The test from task 5 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 5
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - error shown instead of infinite spinner)
    - _Requirements: 2.1, 2.3_

  - [ ] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Successful Load Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Run preservation property tests from step 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 8. Checkpoint - Ensure all Bug #2 tests pass
  - Ensure all tests pass, ask the user if questions arise

---

## Bug #3: Mobile Dashboard Navigation Fix

- [ ] 9. Write bug condition exploration test
  - **Property 1: Bug Condition** - Mobile Navigation Scrolling Issues
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate mobile navigation scrolling problems
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: viewport <1024px with 10+ navigation items
  - Test that DashboardLayout provides smooth horizontal scrolling on mobile viewports for dashboards with many items
  - Test cases: (1) coach dashboard on mobile with 15 items, (2) touch/swipe events on mobile nav, (3) all navigation items are accessible on small viewport
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists - scrolling doesn't work or is janky)
  - Document counterexamples found: which mobile scenarios have scrolling issues
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 10. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Desktop Navigation Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (desktop viewports >= 1024px)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that fixed sidebar displays correctly on desktop
  - Test that active navigation item highlighting works
  - Test that hover states work correctly on desktop
  - Test that sign out functionality continues to work
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 11. Fix for Mobile Dashboard Navigation - Scrolling Improvements

  - [ ] 11.1 Implement the fix in DashboardLayout.tsx
    - Improve scrolling container (lines 212-238): add touch scroll support with `-webkit-overflow-scrolling: touch`
    - Change scrollbarWidth from 'none' to 'thin' for better usability
    - Add scrollbarColor for subtle scrollbar: `rgba(0,0,0,0.2) transparent`
    - Add scroll-smooth and snap classes: `scroll-smooth snap-x snap-mandatory`
    - Update navigation link className: add `snap-start shrink-0` for snap points
    - Increase gap from `gap-1` to `gap-2` for better spacing
    - Add scroll shadow indicators: gradient overlays on left/right to show more content is available
    - Wrap navigation in relative container for absolute positioned gradients
    - Verify touch target size is at least 44x44px for accessibility (current padding should be sufficient)
    - _Bug_Condition: viewportWidth < 1024 AND navItemCount >= 10 AND (NOT canScroll OR hasLayoutIssues)_
    - _Expected_Behavior: Smooth horizontal scrolling with touch support; visual scroll indicators; all items accessible_
    - _Preservation: Desktop sidebar unchanged; active highlighting preserved; sign out works; hover states work_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [ ] 11.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Smooth Mobile Navigation Scrolling
    - **IMPORTANT**: Re-run the SAME test from task 9 - do NOT write a new test
    - The test from task 9 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 9
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - scrolling works smoothly)
    - Note: Touch scroll smoothness may require manual testing on actual devices
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 11.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Desktop Navigation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 10 - do NOT write new tests
    - Run preservation property tests from step 10
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 12. Checkpoint - Ensure all Bug #3 tests pass
  - Ensure all tests pass, ask the user if questions arise

---

## Final Integration Testing

- [ ] 13. Run full integration tests across all three bugfixes
  - Test Bug #1: Full onboarding flow completion → navigate to dashboard → click back button → verify stays on dashboard
  - Test Bug #1: User refresh after onboarding completion → verify no redirect to onboarding
  - Test Bug #2: Navigate to payment page with network error → verify error message → click retry → verify data loads
  - Test Bug #2: Refund request flow from payment page → verify modal opens → submit request → verify success
  - Test Bug #3: Coach dashboard on mobile → swipe navigation left/right → verify smooth scrolling
  - Test Bug #3: Therapist dashboard on desktop → verify sidebar displays → click items → verify navigation works
  - Test responsive behavior: resize from desktop to mobile → verify layout switches correctly for all dashboards

- [ ] 14. Final Checkpoint
  - Ensure all tests pass across all three bugfixes
  - Verify no regressions in existing functionality
  - Ask user if any questions arise or if ready for deployment
