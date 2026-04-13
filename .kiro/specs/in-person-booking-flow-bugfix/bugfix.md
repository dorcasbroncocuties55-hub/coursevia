# In-Person Booking Flow Bugfix Requirements

## Introduction

When a learner completes payment for an in-person session booking, the system should redirect them to their dashboard, send a confirmation email with the provider's office address and phone number, and display the booking as "confirmed" across all dashboards (learner, therapist, coach, creator, admin). Currently, the phone number is missing from the confirmation email, and there are inconsistencies in how bookings are displayed across different dashboard views.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a learner completes payment for an in-person booking THEN the confirmation email is sent without the provider's phone number

1.2 WHEN a learner completes payment for an in-person booking THEN the booking may not redirect to `/dashboard/bookings` if the payment type is not properly identified

1.3 WHEN a booking is confirmed in the database THEN the booking may not display as "confirmed" in all provider dashboards (therapist, coach) due to inconsistent status filtering

### Expected Behavior (Correct)

2.1 WHEN a learner completes payment for an in-person booking THEN the confirmation email SHALL include the provider's phone number from the `profiles.phone` field

2.2 WHEN a learner completes payment for an in-person booking THEN the system SHALL redirect to `/dashboard/bookings` with the correct payment type parameter

2.3 WHEN a booking status is updated to "confirmed" in the database THEN the booking SHALL display as "confirmed" in all provider dashboards (therapist, coach, creator, admin) with consistent status styling

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a learner completes payment for an online booking THEN the system SHALL CONTINUE TO send a confirmation email without the office address

3.2 WHEN a booking is in "pending" status THEN the system SHALL CONTINUE TO display it with the pending status badge in all dashboards

3.3 WHEN a learner views their bookings THEN the system SHALL CONTINUE TO display all booking statuses (pending, confirmed, completed, cancelled) with appropriate styling

3.4 WHEN a provider views their recent bookings on the dashboard THEN the system SHALL CONTINUE TO show the 5 most recent bookings ordered by creation date
