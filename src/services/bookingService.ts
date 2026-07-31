import { supabase } from "@/integrations/supabase/client";

type CreateBookingPayload = {
  provider_id: string;
  learner_id: string;
  service_id?: string | null;
  coach_profile_id?: string | null;
  booking_type?: "instant" | "scheduled";
  scheduled_time?: string | null;
  duration?: number;
  notes?: string;
  provider_type?: string | null;
  service_delivery_mode?: "online" | "in_person" | string | null;
  calendar_mode?: "open_schedule" | "provider_calendar" | string | null;
  release_provider_phone?: boolean;
};

export const checkConflict = async (providerId: string, scheduledAt: string) => {
  const { data, error } = await supabase.rpc("provider_booking_conflict", {
    p_provider_id: providerId,
    p_scheduled_at: scheduledAt,
  });

  if (error) throw error;
  return Boolean(data);
};

export const createBooking = async (payload: CreateBookingPayload) => {
  const bookingType = payload.booking_type || "instant";
  const duration = Math.max(Number(payload.duration || 60), 30);

  const { data, error } = await supabase.rpc("create_booking_and_session", {
    p_provider_id: payload.provider_id,
    p_learner_id: payload.learner_id,
    p_service_id: payload.service_id || null,
    p_coach_id: payload.coach_profile_id || null,
    p_booking_type: bookingType,
    p_scheduled_at: bookingType === "scheduled" ? payload.scheduled_time : null,
    p_duration_minutes: duration,
    p_notes: payload.notes || null,
    p_service_delivery_mode: payload.service_delivery_mode || "online",
    p_calendar_mode: payload.calendar_mode || null,
    p_release_provider_phone: Boolean(payload.release_provider_phone),
  } as any);

  if (error) throw error;
  if (!data?.booking_id) throw new Error("Booking was not created.");

  return {
    id: data.booking_id,
    meeting_url: data.meeting_url,
    scheduled_at: data.scheduled_at,
    session_opens_at: data.session_opens_at,
    session_ends_at: data.session_ends_at,
    provider_phone: data.provider_phone || null,
  };
};
