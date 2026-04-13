# Implementation Plan

## Phase 1: Exploration & Preservation Testing

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Phone Number Missing from In-Person Booking Confirmation Email
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the phone number is missing from confirmation emails
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to concrete failing case(s) to ensure reproducibility
  - Test implementation details from Bug Condition in design (section 1.1)
  - The test assertions should match the Expected Behavior Properties from design (section 2.1)
  - Test that booking confirmation email includes provider phone number for all in-person bookings
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "confirmation email missing phone field for in-person booking")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Online Booking Confirmation and Status Display Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Online bookings continue to send confirmation emails WITHOUT office address
  - Observe: Pending bookings display with pending status badge in all dashboards
  - Observe: Confirmed bookings display with confirmed status badge in learner dashboard
  - Observe: Recent bookings on provider dashboard show 5 most recent bookings ordered by creation date
  - Write property-based tests: for all non-in-person bookings, confirmation email does NOT include office address (from Preservation Requirements in design section 3.1)
  - Write property-based tests: for all booking statuses, appropriate status styling is applied in dashboards (from section 3.2, 3.3)
  - Write property-based tests: provider dashboard displays 5 most recent bookings in creation order (from section 3.4)
  - Verify tests pass on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

## Phase 2: Implementation

- [x] 3. Fix in-person booking confirmation email and redirect flow

  - [x] 3.1 Implement phone number inclusion in booking confirmation email
    - Modify `/api/notifications/booking-confirmation` endpoint to retrieve provider phone number from `profiles.phone`
    - Include phone number in email template for in-person bookings only
    - Ensure online bookings continue to exclude office address and phone number
    - _Bug_Condition: isBugCondition(booking) where booking.service_delivery_mode = "in_person" AND confirmation email missing phone_
    - _Expected_Behavior: expectedBehavior(email) includes provider.phone from profiles table for in-person bookings_
    - _Preservation: Online bookings continue to exclude office address and phone_
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Verify payment redirect uses correct booking type parameter
    - Ensure `verifyCheckout()` function correctly identifies payment type as "booking" for in-person bookings
    - Verify `SubscriptionCallback.tsx` receives correct type parameter and redirects to `/dashboard/bookings`
    - Test redirect flow for both online and in-person bookings
    - _Bug_Condition: isBugCondition(payment) where payment.type not properly set for in-person bookings_
    - _Expected_Behavior: expectedBehavior(redirect) = "/dashboard/bookings" for all booking types_
    - _Preservation: Online bookings and other payment types continue to redirect correctly_
    - _Requirements: 1.2, 2.2_

  - [x] 3.3 Ensure confirmed bookings display consistently across all provider dashboards
    - Verify therapist dashboard filters and displays confirmed bookings with correct status styling
    - Verify coach dashboard filters and displays confirmed bookings with correct status styling
    - Verify creator dashboard filters and displays confirmed bookings with correct status styling
    - Verify admin dashboard filters and displays confirmed bookings with correct status styling
    - Ensure all dashboards use consistent status tone mapping for "confirmed" status
    - _Bug_Condition: isBugCondition(booking) where booking.status = "confirmed" AND not displayed in all dashboards_
    - _Expected_Behavior: expectedBehavior(display) shows confirmed bookings in all provider dashboards with consistent styling_
    - _Preservation: Pending, completed, and cancelled bookings continue to display correctly_
    - _Requirements: 1.3, 2.3, 3.2, 3.3, 3.4_

- [x] 4. Verify bug condition exploration test now passes
  - **Property 1: Expected Behavior** - Phone Number Included in In-Person Booking Confirmation Email
  - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
  - The test from task 1 encodes the expected behavior
  - When this test passes, it confirms the expected behavior is satisfied
  - Run bug condition exploration test from step 1
  - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
  - _Requirements: 2.1_

- [x] 5. Verify preservation tests still pass
  - **Property 2: Preservation** - Online Booking and Status Display Behavior Unchanged
  - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
  - Run preservation property tests from step 2
  - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
  - Confirm all tests still pass after fix (no regressions)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Verify all exploration, preservation, and implementation tests pass
  - Confirm phone number appears in in-person booking confirmation emails
  - Confirm redirect to `/dashboard/bookings` works for all booking types
  - Confirm confirmed bookings display consistently across all provider dashboards
  - Ask the user if questions arise
