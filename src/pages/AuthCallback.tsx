import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { roleToDashboardPath, parseRole } from "@/lib/authRoles";

const OAUTH_ROLE_KEY = "coursevia_oauth_role";

const AuthCallback = () => {
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    let mounted = true;

    const timeoutId = setTimeout(() => {
      if (mounted) {
        toast.error("Sign in is taking longer than expected. Redirecting...");
        window.location.replace("/onboarding");
      }
    }, 15000);

    const run = async () => {
      try {
        setStatus("Signing you in...");

        const url = new URL(window.location.href);

        // ── PKCE: exchange code for session ──────────────────────────────
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.warn("exchangeCodeForSession:", error.message);
          url.searchParams.delete("code");
          window.history.replaceState({}, "", url.toString());
        }

        // ── Implicit: hash contains access_token ─────────────────────────
        if (window.location.hash?.includes("access_token")) {
          await new Promise(r => setTimeout(r, 800));
          window.history.replaceState({}, "", url.pathname + url.search);
        }

        // ── Poll for session (up to 12 s) ─────────────────────────────────
        let session = null;
        for (let i = 0; i < 40; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) { session = data.session; break; }
          await new Promise(r => setTimeout(r, 300));
        }

        if (!session?.user) throw new Error("Sign in timed out. Please try again.");
        if (!mounted) return;

        setStatus("Setting up your account...");

        const authUser  = session.user;
        const userId    = authUser.id;
        const meta      = authUser.user_metadata || {};
        const fullName  = meta.full_name || meta.name || authUser.email?.split("@")[0] || "User";
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email     = authUser.email || null;

        // Read (and immediately clear) any role the signup page stored
        const storedRole = parseRole(window.localStorage.getItem(OAUTH_ROLE_KEY));
        window.localStorage.removeItem(OAUTH_ROLE_KEY);

        // ── Fetch existing profile ────────────────────────────────────────
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("onboarding_completed, role")
          .eq("user_id", userId)
          .maybeSingle();

        const isNewUser = !existingProfile;

        if (isNewUser) {
          // Brand-new user — create profile row (role will be chosen in onboarding)
          const { error: insertErr } = await supabase.from("profiles").insert({
            user_id: userId,
            email,
            full_name: fullName,
            avatar_url: avatarUrl,
            onboarding_completed: false,
            status: "active",
            ...(storedRole ? { role: storedRole } : {}),
          });
          if (insertErr && insertErr.code !== "23505") {
            console.warn("AuthCallback: profile insert error:", insertErr.message);
          }

          // Ensure a role row exists
          const roleToInsert = storedRole || "learner";
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: roleToInsert })
            .then(({ error }) => {
              if (error && error.code !== "23505") {
                console.warn("AuthCallback: role insert error:", error.message);
              }
            });

          clearTimeout(timeoutId);
          if (mounted) window.location.replace("/onboarding");
          return;
        }

        // ── Returning user ────────────────────────────────────────────────
        // Update avatar/name in case they changed in Google
        await supabase
          .from("profiles")
          .update({ full_name: fullName, avatar_url: avatarUrl })
          .eq("user_id", userId);

        const onboardingDone = existingProfile.onboarding_completed === true;
        const role = existingProfile.role || storedRole || "learner";

        clearTimeout(timeoutId);

        if (!mounted) return;

        if (!onboardingDone) {
          window.location.replace("/onboarding");
        } else {
          window.location.replace(roleToDashboardPath(role as any));
        }
      } catch (err: any) {
        console.error("AuthCallback error:", err);
        toast.error(err?.message || "Authentication failed. Please try again.");
        window.localStorage.removeItem(OAUTH_ROLE_KEY);
        clearTimeout(timeoutId);
        if (mounted) window.location.replace("/login");
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
