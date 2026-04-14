import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { roleToDashboardPath } from "@/lib/authRoles";

const Signup = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, profile, primaryRole, loading: authLoading, refreshAll } = useAuth();

  const [fullName,     setFullName]     = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);

  const dashboardPath = useMemo(() => {
    if (primaryRole)   return roleToDashboardPath(primaryRole);
    if (profile?.role) return roleToDashboardPath(profile.role);
    return "/onboarding";
  }, [primaryRole, profile?.role]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!profile || !profile.onboarding_completed) { navigate("/onboarding", { replace: true }); return; }
    navigate(dashboardPath, { replace: true });
  }, [authLoading, user, profile, navigate, dashboardPath]);

  const runGoogleSignup = async () => {
    try {
      setLoading(true);
      // Role will be chosen during onboarding — store learner as default
      window.localStorage.setItem("coursevia_oauth_role", "learner");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error?.message || "Google sign-up failed");
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const cleanName  = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanName)          { toast.error("Full name is required"); return; }
      if (!cleanEmail)         { toast.error("Email is required"); return; }
      if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: cleanName,
            display_name: cleanName,
            // Role is chosen in onboarding step 1
            role: "learner",
            requested_role: "learner",
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        await refreshAll?.();
        toast.success("Account created successfully");
        navigate("/onboarding", { replace: true });
        return;
      }
      toast.success("Account created. Check your email to verify.");
      navigate("/verify-email", { replace: true, state: { email: cleanEmail } });
    } catch (error: any) {
      const msg = error?.message?.toLowerCase?.() || "";
      if (msg.includes("already registered")) toast.error("This email already has an account. Please sign in.");
      else toast.error(error?.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          <Link to="/" className="text-xl font-bold text-primary">
            Coursevia
          </Link>

          <h1 className="text-2xl font-bold text-foreground mt-8 mb-2">
            Create your account
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Join Coursevia — you'll choose your role in the next step.
          </p>

          {/* Google */}
          <Button variant="outline" className="w-full mb-6" onClick={runGoogleSignup} disabled={loading}>
            {loading ? "Please wait..." : "Continue with Google"}
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" state={{ from: location.state?.from, prefillEmail: email }} className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right — branding panel */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Your journey starts here
          </h2>
          <p className="text-muted-foreground">
            Whether you're here to learn, teach, coach, or create — Coursevia gives you the tools to grow and connect.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Signup;
