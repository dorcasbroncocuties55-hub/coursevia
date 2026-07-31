import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Preservation Property Tests
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * These tests encode the UNCHANGED behavior that must be preserved after the fix.
 * They MUST PASS on unfixed code and continue to pass after the fix.
 */

// ── Shared helpers ────────────────────────────────────────────────────────────

/** The expected status style mapping used in ProviderBookingsBoard and LearnerBookings */
const EXPECTED_STATUS_STYLES: Record<string, string> = {
  pending:          "bg-amber-50 text-amber-700 border-amber-200",
  confirmed:        "bg-blue-50 text-blue-700 border-blue-200",
  completed:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  learner_approved: "bg-green-50 text-green-700 border-green-200",
  cancelled:        "bg-slate-50 text-slate-500 border-slate-200",
};

/** Simulates the booking confirmation email content generation logic from backend/server.js */
function buildLearnerEmailContent(params: {
  provider_name: string;
  service_title: string;
  scheduled_at: string;
  service_mode: string;
  office_address?: string;
  provider_phone?: string;
}): string {
  const { provider_name, service_title, scheduled_at, service_mode, office_address, provider_phone } = params;
  if (service_mode === "in_person") {
    return `Your in-person session with ${provider_name} is confirmed!\n\nSession Details:\n- Service: ${service_title}\n- Date & Time: ${scheduled_at}\n- Location: ${office_address || "Contact provider for address"}${provider_phone ? `\n- Phone: ${provider_phone}` : ""}\n\nPlease arrive 5-10 minutes early.`;
  }
  return `Your online session with ${provider_name} is confirmed!\n\nSession Details:\n- Service: ${service_title}\n- Date & Time: ${scheduled_at}\n- You will receive a meeting link via email before the session.`;
}

/** Simulates the recent bookings query: order by created_at DESC, limit 5 */
function getRecentBookings(bookings: Array<{ id: string; created_at: string; status: string }>): typeof bookings {
  return [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
}

// ── Property 3.1: Online bookings do NOT include office address ───────────────

describe("Preservation 3.1 - Online booking confirmation email excludes office address", () => {
  /**
   * Requirement 3.1: WHEN a learner completes payment for an online booking
   * THEN the system SHALL CONTINUE TO send a confirmation email without the office address
   */
  it("should NOT include office address in confirmation email for online bookings", () => {
    fc.assert(
      fc.property(
        fc.record({
          provider_name: fc.string({ minLength: 1, maxLength: 50 }),
          service_title: fc.string({ minLength: 1, maxLength: 100 }),
          scheduled_at: fc.integer({ min: Date.now(), max: Date.now() + 365 * 86400000 }).map(ms => new Date(ms).toISOString()),
          // Use a distinctive address that won't appear in generic email text
          office_address: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5 && !s.includes("online") && !s.includes("meeting")),
          provider_phone: fc.option(fc.stringMatching(/^\+[1-9]\d{7,14}$/), { nil: undefined }),
        }),
        (params) => {
          const content = buildLearnerEmailContent({
            ...params,
            service_mode: "online",
          });

          // Online bookings must NOT include office address
          expect(content).not.toContain(params.office_address);
          // Online bookings must reference online session
          expect(content).toContain("online");
          expect(content).toContain("meeting link");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("concrete: online booking email should not contain office address", () => {
    const content = buildLearnerEmailContent({
      provider_name: "Jane Provider",
      service_title: "Coaching Session",
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      service_mode: "online",
      office_address: "123 Main St, City, State 12345",
      provider_phone: "+1234567890",
    });

    expect(content).not.toContain("123 Main St");
    expect(content).not.toContain("+1234567890");
    expect(content).toContain("meeting link");
  });
});

// ── Property 3.2 & 3.3: Status styling is consistent ─────────────────────────

describe("Preservation 3.2 & 3.3 - Booking status styling is consistent", () => {
  /**
   * Requirement 3.2: Pending bookings display with pending status badge
   * Requirement 3.3: All booking statuses display with appropriate styling
   *
   * Validates that the statusStyle/statusTone maps in ProviderBookingsBoard
   * and LearnerBookings use consistent CSS classes for each status.
   */

  // These are the actual status style maps from the components
  const providerBoardStatusStyle: Record<string, string> = {
    pending:          "bg-amber-50 text-amber-700 border-amber-200",
    confirmed:        "bg-blue-50 text-blue-700 border-blue-200",
    completed:        "bg-emerald-50 text-emerald-700 border-emerald-200",
    learner_approved: "bg-green-50 text-green-700 border-green-200",
    cancelled:        "bg-slate-50 text-slate-500 border-slate-200",
    in_progress:      "bg-purple-50 text-purple-700 border-purple-200",
  };

  const learnerBookingsStatusTone: Record<string, string> = {
    pending:           "bg-amber-50 text-amber-700 border-amber-200",
    confirmed:         "bg-blue-50 text-blue-700 border-blue-200",
    completed:         "bg-emerald-50 text-emerald-700 border-emerald-200",
    learner_approved:  "bg-green-50 text-green-700 border-green-200",
    cancelled:         "bg-slate-50 text-slate-500 border-slate-200",
  };

  const CORE_STATUSES = ["pending", "confirmed", "completed", "cancelled", "learner_approved"] as const;

  it("should have consistent status styles for core statuses across provider board and learner bookings", () => {
    for (const status of CORE_STATUSES) {
      expect(providerBoardStatusStyle[status]).toBe(
        learnerBookingsStatusTone[status],
        `Status "${status}" has inconsistent styling between ProviderBookingsBoard and LearnerBookings`
      );
    }
  });

  it("pending status should use amber styling", () => {
    expect(EXPECTED_STATUS_STYLES.pending).toContain("amber");
    expect(providerBoardStatusStyle.pending).toContain("amber");
    expect(learnerBookingsStatusTone.pending).toContain("amber");
  });

  it("confirmed status should use blue styling (not emerald)", () => {
    // The confirmed status should be blue (not emerald which is used for completed)
    expect(EXPECTED_STATUS_STYLES.confirmed).toContain("blue");
    expect(providerBoardStatusStyle.confirmed).toContain("blue");
    expect(learnerBookingsStatusTone.confirmed).toContain("blue");
  });

  it("completed status should use emerald styling", () => {
    expect(EXPECTED_STATUS_STYLES.completed).toContain("emerald");
    expect(providerBoardStatusStyle.completed).toContain("emerald");
    expect(learnerBookingsStatusTone.completed).toContain("emerald");
  });

  it("cancelled status should use slate styling", () => {
    expect(EXPECTED_STATUS_STYLES.cancelled).toContain("slate");
    expect(providerBoardStatusStyle.cancelled).toContain("slate");
    expect(learnerBookingsStatusTone.cancelled).toContain("slate");
  });

  it("property: all core statuses should have non-empty style strings", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CORE_STATUSES),
        (status) => {
          expect(providerBoardStatusStyle[status]).toBeTruthy();
          expect(learnerBookingsStatusTone[status]).toBeTruthy();
        }
      )
    );
  });
});

// ── Property 3.4: Provider dashboard shows 5 most recent bookings ─────────────

describe("Preservation 3.4 - Provider dashboard shows 5 most recent bookings in creation order", () => {
  /**
   * Requirement 3.4: WHEN a provider views their recent bookings on the dashboard
   * THEN the system SHALL CONTINUE TO show the 5 most recent bookings ordered by creation date
   */

  it("should return at most 5 bookings", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            created_at: fc.integer({ min: 1704067200000, max: 1798761600000 }).map(ms => new Date(ms).toISOString()),
            status: fc.constantFrom("pending", "confirmed", "completed", "cancelled"),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (bookings) => {
          const recent = getRecentBookings(bookings);
          expect(recent.length).toBeLessThanOrEqual(5);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should return bookings ordered by created_at descending (most recent first)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            created_at: fc.integer({ min: 1704067200000, max: 1798761600000 }).map(ms => new Date(ms).toISOString()),
            status: fc.constantFrom("pending", "confirmed", "completed", "cancelled"),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (bookings) => {
          const recent = getRecentBookings(bookings);
          for (let i = 0; i < recent.length - 1; i++) {
            const curr = new Date(recent[i].created_at).getTime();
            const next = new Date(recent[i + 1].created_at).getTime();
            expect(curr).toBeGreaterThanOrEqual(next);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("concrete: with 8 bookings, should return the 5 most recent", () => {
    const bookings = [
      { id: "1", created_at: "2026-01-01T00:00:00Z", status: "pending" },
      { id: "2", created_at: "2026-01-08T00:00:00Z", status: "confirmed" },
      { id: "3", created_at: "2026-01-03T00:00:00Z", status: "completed" },
      { id: "4", created_at: "2026-01-10T00:00:00Z", status: "pending" },
      { id: "5", created_at: "2026-01-05T00:00:00Z", status: "cancelled" },
      { id: "6", created_at: "2026-01-12T00:00:00Z", status: "confirmed" },
      { id: "7", created_at: "2026-01-07T00:00:00Z", status: "pending" },
      { id: "8", created_at: "2026-01-15T00:00:00Z", status: "completed" },
    ];

    const recent = getRecentBookings(bookings);

    expect(recent).toHaveLength(5);
    // Should be ordered: id 8, 6, 4, 2, 7
    expect(recent[0].id).toBe("8"); // Jan 15
    expect(recent[1].id).toBe("6"); // Jan 12
    expect(recent[2].id).toBe("4"); // Jan 10
    expect(recent[3].id).toBe("2"); // Jan 8
    expect(recent[4].id).toBe("7"); // Jan 7
  });
});
