import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseRole, roleToDashboardPath } from "@/lib/authRoles";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const finishAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const authError = url.searchParams.get("error_description") || url.searchParams.get("error");
        const requestedRole = parseRole(window.localStorage.getItem("coursevia_oauth_role"));

        if (authError) {
          throw new Error(authError);
        }

        // Handle hash-based token (implicit flow from Google OAuth)
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          // Supabase will auto-detect and set the session from the hash
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session) {
            // Session already set by Supabase from hash - proceed
          } else {
            // Wait a moment for Supabase to process the hash
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;
        if (!session?.user) throw new Error("Authentication failed. Please try again.");

        if (requestedRole) {
          const { error: updateUserError } = await supabase.auth.updateUser({
            data: {
              requested_role: requestedRole,
              role: requestedRole,
              account_type: requestedRole,
              provider_type: requestedRole === "learner" ? null : requestedRole,
            },
          });

          if (updateUserError) {
            console.error("OAuth metadata update error:", updateUserError);
          }
        }

        try {
          await supabase.rpc("ensure_my_profile_and_role", {
            p_requested_role: requestedRole,
          } as any);
        } catch (rpcError) {
          console.warn("ensure_my_profile_and_role skipped during OAuth callback:", rpcError);
        }

        const [{ data: profile }, { data: roleRows }] = await Promise.all([
          supabase
            .from("profiles")
            .select("onboarding_completed, role")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        ]);

        const resolvedRole =
          parseRole(roleRows?.[0]?.role) ||
          parseRole(profile?.role) ||
          parseRole(session.user.user_metadata?.requested_role) ||
          requestedRole;

        if (!profile || !profile.onboarding_completed) {
          if (mounted) navigate("/onboarding", { replace: true });
          return;
        }

        if (mounted) {
          navigate(resolvedRole ? roleToDashboardPath(resolvedRole) : "/onboarding", { replace: true });
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast.error(error?.message || "Authentication failed");
        if (mounted) navigate("/login", { replace: true });
      }
    };

    finishAuth();

    return () => {
      mounted = false;
      window.localStorage.removeItem("coursevia_oauth_role");
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Completing sign in...</p>
    </div>
  );
};

export default AuthCallback;
