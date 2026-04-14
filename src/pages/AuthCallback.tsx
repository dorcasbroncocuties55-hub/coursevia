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

    const run = async () => {
      try {
        let session = null;

        // Parse hash manually — Supabase v2.99+ does not auto-parse hash tokens
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.replace("#", ""));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token") || "";

          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            session = data.session;
          }
        }

        // PKCE flow — exchange code
        if (!session) {
          const code = new URL(window.location.href).searchParams.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          }
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          session = data.session;
        }

        if (!session?.user) throw new Error("Authentication failed. Please try again.");

        if (!mounted) return;
        setStatus("Setting up your account...");

        const userId = session.user.id;
        const meta = session.user.user_metadata || {};
        const requestedRole = parseRole(window.localStorage.getItem("coursevia_oauth_role")) || "learner";
        const fullName = meta.full_name || meta.name || session.user.email?.split("@")[0] || "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email = session.user.email || null;

        // Try RPC, fall back to direct insert
        try {
          await supabase.rpc("ensure_my_profile_and_role", { p_requested_role: requestedRole } as any);
        } catch {
          await supabase.from("profiles").upsert(
            { user_id: userId, email, full_name: fullName, avatar_url: avatarUrl, onboarding_completed: false },
            { onConflict: "user_id", ignoreDuplicates: true }
          );
          const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", userId).maybeSingle();
          if (!existingRole) {
            await supabase.from("user_roles").insert({ user_id: userId, role: requestedRole as any });
          }
        }

        const [{ data: profile }, { data: roleRows }] = await Promise.all([
          supabase.from("profiles").select("onboarding_completed, role").eq("user_id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
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

      } catch (err: any) {
        console.error("AuthCallback error:", err);
        toast.error(err?.message || "Authentication failed");
        window.localStorage.removeItem("coursevia_oauth_role");
        if (mounted) navigate("/login", { replace: true });
      }
    };

    run();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">{status}</p>
    </div>
  );
};

export default AuthCallback;
