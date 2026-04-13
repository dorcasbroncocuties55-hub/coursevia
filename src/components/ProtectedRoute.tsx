import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { parseRole, roleToDashboardPath } from "@/lib/authRoles";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requireOnboarding?: boolean;
}

const Spinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const ProtectedRoute = ({
  children,
  requiredRole,
  requireOnboarding = true,
}: ProtectedRouteProps) => {
  const { user, roles, profile, primaryRole, loading } = useAuth();
  const location = useLocation();

  const metadataRole = parseRole(
    user?.user_metadata?.requested_role ??
      user?.user_metadata?.role ??
      user?.user_metadata?.account_type
  );

  const resolvedRoles = Array.from(
    new Set<AppRole>([
      ...(roles || []),
      ...(profile?.role ? [profile.role] : []),
      ...(metadataRole ? [metadataRole] : []),
    ])
  );

  // Use profile.role first — it's the user's chosen role from onboarding.
  // primaryRole uses a priority list that can pick the wrong role when user has multiple roles.
  const resolvedPrimaryRole =
    profile?.role ?? primaryRole ?? metadataRole ?? null;

  const fallbackRoute = roleToDashboardPath(resolvedPrimaryRole);

  const isOnboardingPath = location.pathname === "/onboarding";

  // Still loading auth state — show spinner, never redirect yet
  if (loading) return <Spinner />;

  // Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }

  // User is logged in but profile hasn't loaded yet from DB.
  // Keep showing spinner — do NOT redirect to onboarding prematurely.
  // This is the main cause of the "refresh → onboarding" bug.
  if (!profile) {
    // If we have enough role info from metadata/roles to confirm access, allow through
    if (requiredRole && resolvedRoles.includes(requiredRole)) {
      return <>{children}</>;
    }
    // Otherwise wait — profile is still being fetched
    return <Spinner />;
  }

  // Profile loaded — send incomplete users to onboarding
  if (
    requireOnboarding &&
    !profile.onboarding_completed &&
    !isOnboardingPath &&
    !resolvedRoles.includes("admin" as AppRole)
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // User finished onboarding but is trying to visit onboarding again — redirect to dashboard
  if (
    requireOnboarding === false &&
    isOnboardingPath &&
    profile.onboarding_completed &&
    resolvedPrimaryRole &&
    resolvedPrimaryRole !== "admin"
  ) {
    return <Navigate to={roleToDashboardPath(resolvedPrimaryRole)} replace />;
  }

  // Role check: if roles are still catching up (profile says onboarding done but roles list
  // hasn't populated yet), wait briefly instead of redirecting to wrong dashboard
  if (
    requiredRole &&
    !resolvedRoles.includes(requiredRole) &&
    (
      profile.onboarding_completed ||
      metadataRole === requiredRole ||
      primaryRole === requiredRole
    )
  ) {
    return <Spinner />;
  }

  // Wrong role — redirect to the user's actual dashboard
  if (requiredRole && !resolvedRoles.includes(requiredRole)) {
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;