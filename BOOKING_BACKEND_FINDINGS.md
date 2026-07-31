Manual backend/database findings from the uploaded project:

1) src/components/BookingModal.tsx imports "@/services/bookingService", but that file is missing in the uploaded zip.
   Result: the booking flow cannot compile/run correctly in this state.

2) Frontend booking payload uses:
   - provider_id
   - scheduled_time
   - booking_type
   - duration
   But generated Supabase booking types still show bookings shaped around:
   - coach_id
   - scheduled_at
   - duration_minutes
   Result: booking insert/RPC can fail or write partial/wrong fields.

3) backend/server.js finalizeBookingPayment currently loads:
   select id, coach_id, learner_id, service_id, meeting_url from bookings
   Then resolves provider earnings only through coach_profiles.
   Result: therapist bookings are not fully supported on payout finalization.

4) The app has session-opening pages that rely on booking.meeting_url / session_room_url,
   but there is no reliable single booking creation path in the uploaded project that guarantees those fields exist.

What this pack fixes:
- Adds a reliable SQL RPC: create_booking_and_session(...)
- Adds provider_booking_conflict(...)
- Aligns bookings columns with the current frontend flow
- Adds missing src/services/bookingService.ts
- Adds missing src/services/conflictService.ts

Recommended backend patch in backend/server.js:
- when finalising booking payments, resolve provider by provider_id first
- fall back to coach_id / therapist_id only if provider_id is null
- preserve meeting_url/session_room_url if already set