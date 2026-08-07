# Bugfix Requirements Document

## Introduction

This document addresses three distinct bugs in the Coursevia platform:
1. **Onboarding Loop Bug**: Users are redirected to onboarding after completing it when navigating back
2. **Payment Page Loading Bug**: The /dashboard/payments page shows infinite loading spinner
3. **Mobile Dashboard Navigation Bug**: Dashboard navigation tabs on mobile have layout/positioning issues

## Bug Analysis

### Bug #1: Onboarding Loop

#### Current Behavior (Defect)

1.1 WHEN a user completes onboarding AND navigates to their dashboard (home page) AND clicks the browser back button THEN the system redirects them to /onboarding

1.2 WHEN a user with onboarding_completed=true visits any route that triggers ProtectedRoute AND the profile data hasn't loaded yet THEN the system shows loading spinner indefinitely OR redirects to onboarding

#### Expected Behavior (Correct)

2.1 WHEN a user completes onboarding AND navigates to their dashboard (home page) AND clicks the browser back button THEN the system SHALL navigate to the previous valid page in history (not /onboarding)

2.2 WHEN a user with onboarding_completed=true visits any route AND the profile data hasn't loaded yet THEN the system SHALL wait for profile to load OR use cached/metadata role information to allow access without redirecting to onboarding

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user has not completed onboarding (onboarding_completed=false) AND tries to access a protected route THEN the system SHALL CONTINUE TO redirect them to /onboarding

3.2 WHEN a user completes onboarding AND the system receives the completion confirmation THEN the system SHALL CONTINUE TO redirect to the appropriate role-based dashboard

3.3 WHEN a user is actively on the onboarding page AND has not completed the flow THEN the system SHALL CONTINUE TO allow them to complete onboarding without premature redirects

---

### Bug #2: Payment Page Loading

#### Current Behavior (Defect)

1.1 WHEN a user clicks on the payment page link (/dashboard/payments) THEN the system shows a loading spinner that never completes

1.2 WHEN the /dashboard/payments page loads AND there is a data fetching error THEN the system continues showing loading state instead of displaying an error

#### Expected Behavior (Correct)

2.1 WHEN a user clicks on the payment page link (/dashboard/payments) THEN the system SHALL load and display the payment history page within 3 seconds OR show an appropriate error message

2.2 WHEN the /dashboard/payments page loads successfully THEN the system SHALL display the user's payment history, transaction details, and refund options

2.3 WHEN the /dashboard/payments page encounters a loading error THEN the system SHALL display a user-friendly error message and offer a retry option

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user views their payment history AND has completed payments THEN the system SHALL CONTINUE TO display all payment records with correct amounts, dates, and statuses

3.2 WHEN a user requests a refund from the payment page THEN the system SHALL CONTINUE TO open the refund request modal and process the request correctly

3.3 WHEN a user switches between "Payment History" and "Refund Requests" tabs THEN the system SHALL CONTINUE TO load and display the correct data for each tab

---

### Bug #3: Mobile Dashboard Navigation

#### Current Behavior (Defect)

1.1 WHEN a user views a dashboard on mobile devices (viewport width < 1024px) THEN the navigation tabs display with incorrect positioning or layout

1.2 WHEN a user scrolls the horizontal tab navigation on mobile THEN the tabs may overflow without proper scrolling UI OR do not fit properly within the viewport

1.3 WHEN a user has many navigation items (e.g., coach or therapist dashboards with 15+ items) on mobile THEN the tabs become difficult to navigate or access

#### Expected Behavior (Correct)

2.1 WHEN a user views a dashboard on mobile devices THEN the system SHALL display navigation tabs in a horizontally scrollable container that fits within the viewport

2.2 WHEN a user scrolls the horizontal tab navigation on mobile THEN the system SHALL provide smooth horizontal scrolling with proper touch/swipe support

2.3 WHEN a user has many navigation items on mobile THEN the system SHALL make all tabs accessible through horizontal scrolling with appropriate spacing and sizing

2.4 WHEN a user taps a navigation tab on mobile THEN the system SHALL highlight the active tab and navigate to the correct page

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user views a dashboard on desktop (viewport width >= 1024px) THEN the system SHALL CONTINUE TO display the fixed sidebar navigation with all items visible

3.2 WHEN a user navigates between dashboard pages THEN the system SHALL CONTINUE TO highlight the active navigation item correctly

3.3 WHEN a user signs out from the dashboard THEN the system SHALL CONTINUE TO log them out and redirect to the login page

3.4 WHEN a user's dashboard loads page content THEN the system SHALL CONTINUE TO display stats cards, recent activity, and quick actions correctly
