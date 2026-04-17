import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { roleToDashboardPath } from "@/lib/authRoles";

const AuthCallback = () => {
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Timeout fallback - if callback takes too long, redirect to onboarding
    timeoutId = setTimeout(() => {
      console.error("AuthCallback: Timeout after 15 seconds, forcing redirect to onboarding");
      if (mounted) {
        toast.error("Sign in is taking longer than expected. Redirecting...");
        window.location.href = "/onboarding";
      }
    }, 15000);

    const run = async () => {
      try {
        setStatus("Signing you in...");
        console.log("AuthCallback: Starting authentication flow");

        const url = new URL(window.location.href);

        // ── PKCE flow: ?code= in query string ────────────────────────────
        const code = url.searchParams.get("code");
        if (code) {
          console.log("AuthCallback: Found PKCE code, exchanging for session");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.warn("exchangeCodeForSession:", error.message);
          // Clean URL
          url.searchParams.delete("code");
          window.history.replaceState({}, "", url.toString());
        }

        // ── Implicit flow: #access_token= in hash ────────────────────────
        // Supabase JS automatically parses the hash and sets the session.
        // We just need to wait for it to be ready.
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          console.log("AuthCallback: Found access token in hash");
          // Let Supabase process the hash — it does this automatically
          // but we give it a moment
          await new Promise(r => setTimeout(r, 800));
          // Clear the hash from URL so tokens aren't visible
          window.history.replaceState({}, "", url.pathname + url.search);
        }

        // ── Poll for session ──────────────────────────────────────────────
        console.log("AuthCallback: Polling for session...");
        let session = null;
        for (let i = 0; i < 40; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) { 
            session = data.session; 
            console.log("AuthCallback: Session found after", i + 1, "attempts");
            break; 
          }
          await new Promise(r => setTimeout(r, 300));
        }

        if (!session?.user) {
          console.error("AuthCallback: Session timeout");
          throw new Error("Sign in timed out. Please try again.");
        }
        if (!mounted) return;

        setStatus("Setting up your account...");
        console.log("AuthCallback: Setting up account for user", session.user.id);

        const userId    = session.user.id;
        const meta      = session.user.user_metadata || {};
        const fullName  = meta.full_name || meta.name || session.user.email?.split("@")[0] || "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email     = session.user.email || null;

        window.localStorage.removeItem("coursevia_oauth_role");

        // Upsert profile (ignoreDuplicates keeps existing onboarding_completed)
        console.log("AuthCallback: Upserting profile");
        await supabase.from("profiles").upsert(
          { user_id: userId, email, full_name: fullName, avatar_url: avatarUrl },
          { onConflict: "user_id", ignoreDuplicates: true }
        );

        // Ensure role row exists
        console.log("AuthCallback: Checking user role");
        const { data: existingRole } = await supabase
          .from("user_roles").select("role").eq("user_id", userId).maybeSingle();

        if (!existingRole) {
          console.log("AuthCallback: Creating default learner role");
          await supabase.from("user_roles").insert({ user_id: userId, role: "learner" });
        }

        // Fresh profile fetch to get real onboarding state
        console.log("AuthCallback: Fetching final profile");
        const { data: finalProfile } = await supabase
          .from("profiles").select("onboarding_completed, role").eq("user_id", userId).maybeSingle();

        if (!mounted) return;

        const onboardingDone = finalProfile?.onboarding_completed === true;
        const role = finalProfile?.role || existingRole?.role || "learner";

        console.log("AuthCallback: onboarding_completed =", onboardingDone, "role =", role);

        // Clear timeout since we're about to redirect
        clearTimeout(timeoutId);

        if (!onboardingDone) {
          console.log("AuthCallback: Redirecting to /onboarding");
          window.location.href = "/onboarding";
        } else {
          const dashboardPath = roleToDashboardPath(role as any);
          console.log("AuthCallback: Redirecting to", dashboardPath);
          window.location.href = dashboardPath;
        }
      } catch (err: any) {
        console.error("AuthCallback error:", err);
        toast.error(err?.message || "Authentication failed. Please try again.");
        window.localStorage.removeItem("coursevia_oauth_role");
        clearTimeout(timeoutId);
        if (mounted) window.location.href = "/login";
      }
    };

    run();
    return () => { 
      mounted = false;
      clearTimeout(timeoutId);
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
