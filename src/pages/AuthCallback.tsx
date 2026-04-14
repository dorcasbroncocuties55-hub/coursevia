import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { roleToDashboardPath } from "@/lib/authRoles";

const AuthCallback = () => {
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setStatus("Signing you in...");

        // Exchange code for session if present in URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) console.warn("exchangeCodeForSession error:", exchangeError);
        }

        // Poll for session — Supabase processes the OAuth hash automatically
        let session = null;
        for (let i = 0; i < 30; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) { session = data.session; break; }
          await new Promise((r) => setTimeout(r, 400));
        }

        if (!session?.user) throw new Error("Sign in timed out. Please try again.");
        if (!mounted) return;

        setStatus("Setting up your account...");

        const userId = session.user.id;
        const meta   = session.user.user_metadata || {};
        const fullName  = meta.full_name || meta.name || session.user.email?.split("@")[0] || "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email     = session.user.email || null;

        // Always start as learner — role is chosen in onboarding step 1
        const requestedRole = "learner";
        window.localStorage.removeItem("coursevia_oauth_role");

        // Ensure profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("user_id, onboarding_completed, role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingProfile) {
          // New user — create profile
          await supabase.from("profiles").upsert(
            {
              user_id: userId,
              email,
              full_name: fullName,
              avatar_url: avatarUrl,
              role: requestedRole,
              onboarding_completed: false,
            },
            { onConflict: "user_id" }
          );
        }

        // Ensure role record exists
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingRole) {
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: existingProfile?.role || requestedRole });
        }

        if (!mounted) return;

        // Decide where to send the user
        const onboardingDone = existingProfile?.onboarding_completed === true;
        const role = existingProfile?.role || requestedRole;

        if (!onboardingDone) {
          window.location.href = "/onboarding";
        } else {
          window.location.href = roleToDashboardPath(role as any);
        }
      } catch (err: any) {
        console.error("AuthCallback error:", err);
        toast.error(err?.message || "Authentication failed. Please try again.");
        window.localStorage.removeItem("coursevia_oauth_role");
        if (mounted) window.location.href = "/login";
      }
    };

    run();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">{status}</p>
    </div>
  );
};

export default AuthCallback;
