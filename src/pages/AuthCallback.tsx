import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseRole, roleToDashboardPath } from "@/lib/authRoles";

const AuthCallback = () => {
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        // Poll for session — Supabase processes the hash automatically
        setStatus("Signing you in...");
        let session = null;

        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            session = data.session;
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }

        if (!session?.user) {
          throw new Error("Sign in timed out. Please try again.");
        }

        if (!mounted) return;
        setStatus("Setting up your account...");

        const userId = session.user.id;
        const meta = session.user.user_metadata || {};
        const requestedRole =
          parseRole(window.localStorage.getItem("coursevia_oauth_role")) ||
          "learner";
        const fullName =
          meta.full_name ||
          meta.name ||
          session.user.email?.split("@")[0] ||
          "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email = session.user.email || null;

        // Create profile and role
        try {
          await supabase.rpc("ensure_my_profile_and_role", {
            p_requested_role: requestedRole,
          } as any);
        } catch {
          await supabase
            .from("profiles")
            .upsert(
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

        // Use hard redirect to avoid any React Router / AuthContext interference
        if (!profile || !profile.onboarding_completed) {
          window.location.href = "/onboarding";
        } else {
          window.location.href = roleToDashboardPath(resolvedRole as any);
        }
      } catch (err: any) {
        toast.error(err?.message || "Authentication failed");
        window.localStorage.removeItem("coursevia_oauth_role");
        if (mounted) window.location.href = "/login";
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">{status}</p>
    </div>
  );
};

export default AuthCallback;
