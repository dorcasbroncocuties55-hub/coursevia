import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseRole, roleToDashboardPath } from "@/lib/authRoles";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: any) => {
      if (!session?.user || !mounted) return;

      try {
        setStatus("Setting up your account...");

        const requestedRole = parseRole(
          window.localStorage.getItem("coursevia_oauth_role")
        );

        // Ensure profile and role exist in DB
        try {
          await supabase.rpc("ensure_my_profile_and_role", {
            p_requested_role: requestedRole,
          } as any);
        } catch (rpcError) {
          console.warn("ensure_my_profile_and_role skipped:", rpcError);
        }

        const [{ data: profile }, { data: roleRows }] = await Promise.all([
          supabase
            .from("profiles")
            .select("onboarding_completed, role")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id),
        ]);

        window.localStorage.removeItem("coursevia_oauth_role");

        if (!mounted) return;

        const resolvedRole =
          parseRole(roleRows?.[0]?.role) ||
          parseRole(profile?.role) ||
          parseRole(session.user.user_metadata?.requested_role) ||
          requestedRole;

        if (!profile || !profile.onboarding_completed) {
          navigate("/onboarding", { replace: true });
          return;
        }

        navigate(
          resolvedRole ? roleToDashboardPath(resolvedRole) : "/onboarding",
          { replace: true }
        );
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast.error(error?.message || "Authentication failed");
        window.localStorage.removeItem("coursevia_oauth_role");
        if (mounted) navigate("/login", { replace: true });
      }
    };

    // Listen for auth state — fires immediately when Supabase parses the hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          await handleSession(session);
        }
      }
    );

    // Also check if session already exists (page reload case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        handleSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
};

export default AuthCallback;
