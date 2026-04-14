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

        const userId = session.user.id;
        const requestedRole = parseRole(
          window.localStorage.getItem("coursevia_oauth_role")
        ) || "learner";

        const meta = session.user.user_metadata || {};
        const fullName =
          meta.full_name || meta.name || session.user.email?.split("@")[0] || "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email = session.user.email || null;

        // Try RPC first, fall back to direct upsert
        try {
          await supabase.rpc("ensure_my_profile_and_role", {
            p_requested_role: requestedRole,
          } as any);
        } catch {
          // RPC failed — do it directly
          await supabase.from("profiles").upsert(
            {
              user_id: userId,
              email,
              full_name: fullName,
              avatar_url: avatarUrl,
              onboarding_completed: false,
            },
            { onConflict: "user_id", ignoreDuplicates: true }
          );

          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingRole) {
            await supabase
              .from("user_roles")
              .insert({ user_id: userId, role: requestedRole as any });
          }
        }

        // Fetch profile and roles
        const [{ data: profile }, { data: roleRows }] = await Promise.all([
          supabase
            .from("profiles")
            .select("onboarding_completed, role")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId),
        ]);

        window.localStorage.removeItem("coursevia_oauth_role");

        if (!mounted) return;

        const resolvedRole =
          parseRole(roleRows?.[0]?.role) ||
          parseRole((profile as any)?.role) ||
          parseRole(meta.requested_role) ||
          requestedRole;

        if (!profile || !profile.onboarding_completed) {
          navigate("/onboarding", { replace: true });
          return;
        }

        navigate(roleToDashboardPath(resolvedRole), { replace: true });
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast.error(error?.message || "Authentication failed");
        window.localStorage.removeItem("coursevia_oauth_role");
        if (mounted) navigate("/login", { replace: true });
      }
    };

    // onAuthStateChange fires the moment Supabase parses the hash token
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        await handleSession(session);
      }
    });

    // Also handle already-active session (e.g. page reload)
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">{status}</p>
    </div>
  );
};

export default AuthCallback;
