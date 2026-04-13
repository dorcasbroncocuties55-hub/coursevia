import { supabase } from "@/integrations/supabase/client";

export const checkConflict = async (providerId: string, scheduledAt: string) => {
  const { data, error } = await supabase.rpc("provider_booking_conflict", {
    p_provider_id: providerId,
    p_scheduled_at: scheduledAt,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
};