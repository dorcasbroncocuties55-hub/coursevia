import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AuthDecisionGuardProps = {
  children: ReactNode;
  fallbackPath?: string;
};

const AuthDecisionGuard = ({
  children,
  fallbackPath = "/auth-gate",
}: AuthDecisionGuardProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{ destinationPath: location.pathname }}
      />
    );
  }

  return <>{children}</>;
};

export default AuthDecisionGuard;
