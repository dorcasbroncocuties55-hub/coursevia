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
    let done = false;

    const handleSession = async (session: any) => {
      if (done || !mounted) return;
      done = true;

      try {
        if (!session?.user) throw new Error("No session. Please try again.");

        setStatus("Setting up account...");

        const userId = session.user.id;
        const meta = session.user.user_metadata || {};
        const requestedRole = parseRole(window.localStorage.getItem("coursevia_oauth_role")) || "learner";
        const fullName = meta.full_name || meta.name || session.user.email?.split("@")[0] || "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email = session.user.email || null;

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

        setStatus("Loading profile...");

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

        navigate(roleToDashboardPath(resolvedRole as any), { replace: true });

      } catch (err: any) {
        toast.error(err?.message || "Authentication failed");
        window.localStorage.removeItem("coursevia_oauth_role");
        if (mounted) navigate("/login", { replace: true });
      }
    };

    // detectSessionInUrl fires SIGNED_IN when it processes the hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        handleSession(session);
      }
    });

    // Also check if session already exists (e.g. already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session);
    });

    // Timeout fallback — if nothing fires in 10s, show error
    const timeout = setTimeout(() => {
      if (!done && mounted) {
        toast.error("Sign in timed out. Please try again.");
        window.localStorage.removeItem("coursevia_oauth_role");
        navigate("/login", { replace: true });
      }
    }, 10000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
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
