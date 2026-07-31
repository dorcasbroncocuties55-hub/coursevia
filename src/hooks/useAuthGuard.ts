import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to safely guard pages that require authentication
 * Returns loading state and user - never returns null user while loading
 * 
 * Usage:
 * ```tsx
 * const { user, loading } = useAuthGuard();
 * 
 * if (loading) return <PageLoading />;
 * // Now user is guaranteed to be non-null
 * ```
 */
export function useAuthGuard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect after loading is complete
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  return {
    user,
    profile,
    loading,
    // Helper: true if we have user and profile loaded
    isReady: !loading && !!user && !!profile,
  };
}

/**
 * Hook for pages that need user but not necessarily profile
 * (e.g., onboarding page)
 */
export function useAuthGuardMinimal() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  return {
    user,
    loading,
    isReady: !loading && !!user,
  };
}
