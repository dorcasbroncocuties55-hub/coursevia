import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { roleToDashboardPath } from "@/lib/authRoles";

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, primaryRole, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setForceShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dashboardPath = useMemo(() => {
    if (primaryRole) return roleToDashboardPath(primaryRole);
    if (profile?.role) return roleToDashboardPath(profile.role);
    return "/onboarding";
  }, [primaryRole, profile?.role]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!profile || !profile.onboarding_completed) { navigate("/onboarding", { replace: true }); return; }
    navigate(dashboardPath, { replace: true });
  }, [authLoading, user, profile, navigate, dashboardPath]);

  if (authLoading && !forceShow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleGoogle = async () => {
    try {
      setLoading(true);
      window.localStorage.setItem("coursevia_oauth_role", "learner");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error?.message || "Google sign-up failed");
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName) { toast.error("Full name is required"); return; }
    if (!cleanEmail) { toast.error("Email is required"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: cleanName, display_name: cleanName, role: "learner", requested_role: "learner" },
        },
      });
      if (error) throw error;
      if (data.session) {
        toast.success("Account created!");
        navigate("/onboarding", { replace: true });
        return;
      }
      toast.success("Check your email to verify your account.");
      navigate("/verify-email", { replace: true, state: { email: cleanEmail } });
    } catch (error: any) {
      const msg = error?.message?.toLowerCase?.() || "";
      if (msg.includes("already registered") || msg.includes("user already registered")) {
        // Check if it's a Google account
        try {
          const { data: existing } = await supabase.from("profiles").select("email").eq("email", cleanEmail).maybeSingle();
          if (existing) {
            toast.error("This email is already registered. If you signed up with Google, use \"Continue with Google\" to sign in.", { duration: 6000 });
          } else {
            toast.error("This email already has an account. Please sign in instead.");
          }
        } catch {
          toast.error("This email already has an account. Please sign in instead.");
        }
      } else {
        toast.error(error?.message || "Could not create account");
      }
    } finally {
      setLoading(false);
    }
  };

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-emerald-500"];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-black text-sm">C</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Coursevia</span>
        </Link>
        <p className="text-sm text-gray-500">
          Have an account?{" "}
          <Link to="/login" state={{ from: location.state?.from }} className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
            <p className="text-sm text-gray-500">Join Coursevia — free to get started</p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-60 shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${strength === 1 ? "text-red-500" : strength === 2 ? "text-amber-500" : "text-emerald-600"}`}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account...</> : "Create account"}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-6 space-y-2">
            {["Free to join — no credit card required", "Choose your role after signup", "Access courses, coaching & more"].map(b => (
              <div key={b} className="flex items-center gap-2 text-xs text-gray-500">
                <Check size={13} className="text-primary shrink-0" />
                {b}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            By signing up, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-gray-600">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
