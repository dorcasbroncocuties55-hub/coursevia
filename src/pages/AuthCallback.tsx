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

    const finishAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const authError =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");

        if (authError) throw new Error(authError);

        // PKCE flow — exchange code for session
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // Implicit flow — hash contains access_token, Supabase handles it automatically
        // Just wait a moment for the SDK to parse the hash and set the session
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          await new Promise((r) => setTimeout(r, 800));
        }

        // Wait for the session to be available — retry up to 5 times
        let session = null;
        for (let i = 0; i < 5; i++) {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (data.session) {
            session = data.session;
            break;
          }
          await new Promise((r) => setTimeout(r, 600));
        }

        if (!session?.user) throw new Error("Authentication failed. Please try again.");

        const requestedRole = parseRole(
          window.localStorage.getItem("coursevia_oauth_role")
        );

        // Ensure profile and role exist in DB
        try {
          setStatus("Setting up your account...");
          await supabase.rpc("ensure_my_profile_and_role", {
            p_requested_role: requestedRole,
          } as any);
        } catch (rpcError) {
          console.warn("ensure_my_profile_and_role skipped:", rpcError);
        }

        // Fetch profile and roles
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

        const resolvedRole =
          parseRole(roleRows?.[0]?.role) ||
          parseRole(profile?.role) ||
          parseRole(session.user.user_metadata?.requested_role) ||
          requestedRole;

        if (!mounted) return;

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

    finishAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
};

export default AuthCallback;
