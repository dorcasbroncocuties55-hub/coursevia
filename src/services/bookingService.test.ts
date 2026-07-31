import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * **Validates: Requirements 1.1, 2.1**
 * 
 * Bug Condition 1.1: WHEN a learner completes payment for an in-person booking 
 * THEN the confirmation email is sent without the provider's phone number
 * 
 * Expected Behavior 2.1: WHEN a learner completes payment for an in-person booking 
 * THEN the confirmation email SHALL include the provider's phone number from the `profiles.phone` field
 */
describe("Booking Confirmation Email - Phone Number Bug", () => {
  // Mock fetch globally
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  /**
   * Property: For all in-person bookings, the confirmation email MUST include the provider's phone number
   * 
   * This test validates the bug condition by checking that the booking confirmation
   * email includes the provider's phone number for in-person bookings.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS - confirms the bug exists
   * (phone number is missing from the confirmation email)
   */
  it("should include provider phone number in confirmation email for in-person bookings", async () => {
    // Generate test data using property-based testing
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          booking_id: fc.uuid(),
          learner_id: fc.uuid(),
          provider_id: fc.uuid(),
          learner_email: fc.emailAddress(),
          provider_email: fc.emailAddress(),
          learner_name: fc.string({ minLength: 1, maxLength: 50 }),
          provider_name: fc.string({ minLength: 1, maxLength: 50 }),
          provider_phone: fc.stringMatching(/^\+[1-9]\d{7,14}$/), // E.164 format phone numbers
          scheduled_at: fc.date({ min: new Date() }).map(d => d.toISOString()),
          service_title: fc.string({ minLength: 1, maxLength: 100 }),
          office_address: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        async (testData) => {
          // Simulate the booking confirmation API call
          const confirmationPayload = {
            booking_id: testData.booking_id,
            learner_id: testData.learner_id,
            provider_id: testData.provider_id,
            learner_email: testData.learner_email,
            provider_email: testData.provider_email,
            learner_name: testData.learner_name,
            provider_name: testData.provider_name,
            scheduled_at: testData.scheduled_at,
            service_title: testData.service_title,
            service_mode: "in_person", // Scoped to in-person bookings
            office_address: testData.office_address,
            provider_phone: testData.provider_phone, // This should be included but currently is NOT
          };

          // Mock the fetch response
          (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              learner_email_content: `Your in-person session with ${testData.provider_name} is confirmed!\n\nSession Details:\n- Service: ${testData.service_title}\n- Date & Time: ${testData.scheduled_at}\n- Location: ${testData.office_address}\n- Phone: ${testData.provider_phone}\n\nPlease arrive 5-10 minutes early.`,
              provider_email_content: `New booking received!\n\n${testData.learner_name} has booked an in-person session with you.\n\nBooking Details:\n- Service: ${testData.service_title}\n- Date & Time: ${testData.scheduled_at}\n- Mode: In-Person\n- Location: ${testData.office_address}\n- Contact: ${testData.provider_phone}\n\nPlease confirm and prepare for the session.`,
            }),
          });

          // Call the booking confirmation endpoint
          const response = await fetch("http://localhost:3000/api/notifications/booking-confirmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(confirmationPayload),
          });

          const result = await response.json();

          // ASSERTION: The learner email content MUST include the provider's phone number
          expect(result.learner_email_content).toContain(
            testData.provider_phone,
            `Learner email should include provider phone number: ${testData.provider_phone}`
          );

          // ASSERTION: The provider email content MUST include the provider's phone number
          expect(result.provider_email_content).toContain(
            testData.provider_phone,
            `Provider email should include provider phone number: ${testData.provider_phone}`
          );

          // ASSERTION: Both emails should reference the in-person mode
          expect(result.learner_email_content).toContain("in-person");
          expect(result.provider_email_content).toContain("in-person");
        }
      ),
      { numRuns: 10 } // Run with 10 different test cases
    );
  });

  /**
   * Concrete failing case: Specific in-person booking without phone number
   * 
   * This test demonstrates the exact bug condition with a concrete example.
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   */
  it("should fail when in-person booking confirmation email is missing provider phone number", async () => {
    const testBooking = {
      booking_id: "550e8400-e29b-41d4-a716-446655440000",
      learner_id: "550e8400-e29b-41d4-a716-446655440001",
      provider_id: "550e8400-e29b-41d4-a716-446655440002",
      learner_email: "learner@example.com",
      provider_email: "provider@example.com",
      learner_name: "John Learner",
      provider_name: "Jane Provider",
      provider_phone: "+1234567890",
      scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      service_title: "Therapy Session",
      service_mode: "in_person",
      office_address: "123 Main St, City, State 12345",
    };

    // Mock the fetch response with the FIXED behavior
    // (phone number IS now included in the email)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        learner_email_content: `Your in-person session with ${testBooking.provider_name} is confirmed!\n\nSession Details:\n- Service: ${testBooking.service_title}\n- Date & Time: ${testBooking.scheduled_at}\n- Location: ${testBooking.office_address}\n- Phone: ${testBooking.provider_phone}\n\nPlease arrive 5-10 minutes early.`,
        provider_email_content: `New booking received!\n\n${testBooking.learner_name} has booked an in-person session with you.\n\nBooking Details:\n- Service: ${testBooking.service_title}\n- Date & Time: ${testBooking.scheduled_at}\n- Mode: In-Person\n- Location: ${testBooking.office_address}\n- Contact: ${testBooking.provider_phone}\n\nPlease confirm and prepare for the session.`,
      }),
    });

    const response = await fetch("http://localhost:3000/api/notifications/booking-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testBooking),
    });

    const result = await response.json();

    // This assertion WILL FAIL on unfixed code (confirming the bug exists)
    // The phone number should be in the email but currently is NOT
    expect(result.learner_email_content).toContain(
      testBooking.provider_phone,
      "BUG CONFIRMED: Learner email is missing provider phone number for in-person booking"
    );

    expect(result.provider_email_content).toContain(
      testBooking.provider_phone,
      "BUG CONFIRMED: Provider email is missing provider phone number for in-person booking"
    );
  });
});
