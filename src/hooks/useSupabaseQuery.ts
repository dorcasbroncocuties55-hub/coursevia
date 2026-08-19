import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

/**
 * Helper hook to automatically refresh session when queries fail with JWT expired
 * This ensures all queries across the app can recover from token expiration
 */
export function useSupabaseQuery() {
  const { logout } = useAuth();
  const refreshAttemptedRef = useRef(false);

  // Reset refresh attempt flag on mount
  useEffect(() => {
    refreshAttemptedRef.current = false;
  }, []);

  const handleQueryError = async (error: any): Promise<boolean> => {
    // Check if it's a JWT expiration error
    if (!error?.message?.includes("JWT expired") && error?.code !== "PGRST301") {
      return false;
    }

    // Only attempt refresh once per component lifecycle
    if (refreshAttemptedRef.current) {
      console.log("[useSupabaseQuery] Already attempted refresh, logging out");
      await logout();
      return false;
    }

    refreshAttemptedRef.current = true;
    console.log("[useSupabaseQuery] JWT expired, attempting session refresh...");

    try {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !session) {
        console.error("[useSupabaseQuery] Session refresh failed:", refreshError);
        await logout();
        return false;
      }

      console.log("[useSupabaseQuery] Session refreshed successfully");
      return true;
    } catch (err) {
      console.error("[useSupabaseQuery] Refresh error:", err);
      await logout();
      return false;
    }
  };

  return { handleQueryError };
}

/**
 * Wrapper for Supabase queries that automatically retries once after refreshing the session
 * if the initial query fails with a JWT expired error
 */
export async function queryWithRefresh<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  onRefreshFailed?: () => void
): Promise<{ data: T | null; error: any }> {
  let result = await queryFn();

  // If JWT expired, try to refresh and retry once
  if (result.error?.message?.includes("JWT expired") || result.error?.code === "PGRST301") {
    console.log("[queryWithRefresh] JWT expired, attempting session refresh...");

    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !session) {
      console.error("[queryWithRefresh] Session refresh failed:", refreshError);
      onRefreshFailed?.();
      return result;
    }

    console.log("[queryWithRefresh] Session refreshed, retrying query");
    result = await queryFn();
  }

  return result;
}
