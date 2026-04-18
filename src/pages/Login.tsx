import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { roleToDashboardPath } from "@/lib/authRoles";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, primaryRole, profile, loading: authLoading } = useAuth();

  const prefillEmail = typeof location.state?.prefillEmail === "string" ? location.state.prefillEmail : "";
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setForceShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const getDestination = () => {
    if (typeof location.state?.from === "string") return location.state.from;
    if (profile && !profile.onboarding_completed) return "/onboarding";
    return roleToDashboardPath(profile?.role || primaryRole || "learner");
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (!profile && roles.length === 0) return;
    navigate(getDestination(), { replace: true });
  }, [user, roles, primaryRole, profile, authLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const msg = error.message?.toLowerCase() || "";
        if (msg.includes("invalid login credentials")) {
          // Check if this email was registered via Google OAuth
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("email", email.trim().toLowerCase())
              .maybeSingle();
            if (profile) {
              // Email exists — likely a Google account with no password
              toast.error(
                "This account was created with Google. Please use \"Continue with Google\" to sign in.",
                { duration: 5000 }
              );
              return;
            }
          } catch {}
          toast.error("Wrong email or password. Please check and try again.");
        } else if (msg.includes("email not confirmed")) {
          toast.error("Please confirm your email before signing in. Check your inbox.");
        } else {
          toast.error(error.message || "Failed to sign in");
        }
        return;
      }
      if (data.session) {
        try { await supabase.rpc("ensure_my_profile_and_role"); } catch {}
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      window.localStorage.removeItem("coursevia_oauth_role");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error?.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  if (authLoading && !forceShow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-black text-sm leading-none">C</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Coursevia</span>
        </Link>
        <p className="text-sm text-gray-500">
          No account?{" "}
          <Link to="/signup" state={{ from: location.state?.from, prefillEmail: email }} className="text-primary font-semibold hover:underline">
            Sign up free
          </Link>
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">

          <h1 className="text-[22px] font-bold text-gray-900 mb-1">Sign in to Coursevia</h1>
          <p className="text-sm text-gray-500 mb-7">Welcome back — choose how you'd like to sign in</p>

          {/* ── Option 1: Google (fastest) ── */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Recommended</p>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 hover:border-primary/40 hover:bg-primary/5 transition disabled:opacity-60"
            >
              <GoogleIcon />
              Continue with Google
              <span className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Fastest</span>
            </button>
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Option 2: Email + Password ── */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : "Sign in with email"}
            </button>
          </form>

          <p className="text-[11px] text-gray-400 text-center mt-6">
            By signing in you agree to our{" "}
            <Link to="/terms" className="underline">Terms</Link> &amp;{" "}
            <Link to="/privacy" className="underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
