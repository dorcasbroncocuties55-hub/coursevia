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
        setStatus("Step 1: Reading token...");

        // Read hash from sessionStorage if React Router already stripped it
        const hash = window.location.hash || sessionStorage.getItem("oauth_hash") || "";
        sessionStorage.removeItem("oauth_hash");
        const params = new URLSearchParams(hash.replace("#", ""));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token") || "";

        if (!accessToken) {
          throw new Error("No access token in URL. Please try signing in again.");
        }

        setStatus("Step 2: Setting session...");

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;
        if (!data.session?.user) throw new Error("Session could not be established.");

        setStatus("Step 3: Setting up account...");

        const userId = data.session.user.id;
        const meta = data.session.user.user_metadata || {};
        const requestedRole = parseRole(window.localStorage.getItem("coursevia_oauth_role")) || "learner";
        const fullName = meta.full_name || meta.name || data.session.user.email?.split("@")[0] || "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email = data.session.user.email || null;

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

        setStatus("Step 4: Loading profile...");

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
