import { supabase } from "@/integrations/supabase/client";

export const safeCount = async (queryPromise: Promise<any>): Promise<number> => {
  try {
    const result = await queryPromise;
    return Number(result?.count || 0);
  } catch {
    return 0;
  }
};

export const safeSingle = async <T = any>(queryPromise: Promise<any>, fallback: T | null = null): Promise<T | null> => {
  try {
    const result = await queryPromise;
    if (typeof result?.data !== "undefined" && result?.data !== null) return result.data as T;
    if (typeof result?.count !== "undefined") return result as T;
    return fallback;
  } catch {
    return fallback;
  }
};

export const getProfileRecord = async (userId: string) => {
  const byUserId = await safeSingle<any>(supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle());
  if (byUserId) return byUserId;
  const byId = await safeSingle<any>(supabase.from("profiles").select("*").eq("id", userId).maybeSingle());
  return byId;
};

export const getProviderRecord = async (role: "coach" | "therapist", userId: string) => {
  const table = role === "therapist" ? "therapist_profiles" : "coach_profiles";
  const byUserId = await safeSingle<any>((supabase as any).from(table).select("*").eq("user_id", userId).maybeSingle());
  if (byUserId) return byUserId;
  const byId = await safeSingle<any>((supabase as any).from(table).select("*").eq("id", userId).maybeSingle());
  return byId;
};

export const countProviderServices = async (role: "coach" | "therapist", providerProfileId: string | null | undefined, userId: string) => {
  const table = role === "therapist" ? "therapist_services" : "coach_services";
  const relationKey = role === "therapist" ? "therapist_id" : "coach_id";

  if (providerProfileId) {
    const countByProfile = await safeCount((supabase as any).from(table).select("id", { count: "exact", head: true }).eq(relationKey, providerProfileId));
    if (countByProfile > 0) return countByProfile;
  }

  return safeCount((supabase as any).from(table).select("id", { count: "exact", head: true }).eq(relationKey, userId));
};

export const loadProviderServices = async (role: "coach" | "therapist", providerProfileId: string | null | undefined, userId: string) => {
  const table = role === "therapist" ? "therapist_services" : "coach_services";
  const relationKey = role === "therapist" ? "therapist_id" : "coach_id";

  if (providerProfileId) {
    const byProfile = await (supabase as any).from(table).select("*").eq(relationKey, providerProfileId).order("created_at", { ascending: false });
    if (!byProfile?.error && Array.isArray(byProfile?.data) && byProfile.data.length) return byProfile.data;
  }

  const byUser = await (supabase as any).from(table).select("*").eq(relationKey, userId).order("created_at", { ascending: false });
  return byUser?.data || [];
};

export const loadProviderAvailability = async (role: "coach" | "therapist", providerProfileId: string | null | undefined, userId: string) => {
  const table = role === "therapist" ? "therapist_availability" : "coach_availability";
  const relationKey = role === "therapist" ? "therapist_id" : "coach_id";

  if (providerProfileId) {
    const byProfile = await (supabase as any).from(table).select("*").eq(relationKey, providerProfileId).eq("is_available", true).order("day_of_week", { ascending: true });
    if (!byProfile?.error && Array.isArray(byProfile?.data) && byProfile.data.length) return byProfile.data;
  }

  const byUser = await (supabase as any).from(table).select("*").eq(relationKey, userId).eq("is_available", true).order("day_of_week", { ascending: true });
  return byUser?.data || [];
};

export const countUnreadMessages = async (userId: string) => {
  return safeCount(
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false),
  );
};
