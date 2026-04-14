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
          if (exchangeError) console.warn("exchangeCodeForSession:", exchangeError.message);
        }

        // Poll until session is ready
        let session = null;
        for (let i = 0; i < 30; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) { session = data.session; break; }
          await new Promise((r) => setTimeout(r, 400));
        }

        if (!session?.user) throw new Error("Sign in timed out. Please try again.");
        if (!mounted) return;

        setStatus("Setting up your account...");

        const userId    = session.user.id;
        const meta      = session.user.user_metadata || {};
        const fullName  = meta.full_name || meta.name || session.user.email?.split("@")[0] || "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email     = session.user.email || null;

        window.localStorage.removeItem("coursevia_oauth_role");

        // Upsert profile — never overwrite onboarding_completed if it's already true
        await supabase.from("profiles").upsert(
          {
            user_id: userId,
            email,
            full_name: fullName,
            avatar_url: avatarUrl,
            // Only set these on insert — existing rows keep their values
          },
          { onConflict: "user_id", ignoreDuplicates: true }
        );

        // Ensure a role row exists
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingRole) {
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "learner" })
            .throwOnError();
        }

        // Re-fetch the final profile state AFTER all upserts
        const { data: finalProfile } = await supabase
          .from("profiles")
          .select("onboarding_completed, role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!mounted) return;

        const onboardingDone = finalProfile?.onboarding_completed === true;
        const role = finalProfile?.role || existingRole?.role || "learner";

        console.log("AuthCallback routing:", { onboardingDone, role });

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
