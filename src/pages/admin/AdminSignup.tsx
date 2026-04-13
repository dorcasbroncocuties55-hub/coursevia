import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Shield } from "lucide-react";

const AdminSignup = () => {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user && roles.includes("admin")) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [authLoading, navigate, roles, user]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!adminCode.trim()) {
      toast.error("Admin invite code is required.");
      return;
    }

    setSubmitting(true);

    // 1. Sign up the user
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin-login`,
        data: {
          full_name: fullName.trim(),
          requested_role: "admin",
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    // 2. Validate and consume the invite code
    const userId = signUpData?.user?.id;
    if (userId) {
      const { data: codeValid } = await supabase.rpc("consume_admin_invite_code" as any, {
        p_code: adminCode.trim().toUpperCase(),
        p_user_id: userId,
      });
      if (!codeValid) {
        toast.error("Invalid or expired invite code. Contact an existing admin.");
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    toast.success("Admin account created. You can now sign in.");
    navigate("/admin-login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={24} className="text-primary" />
          <span className="text-xl font-bold text-foreground">Coursevia Admin</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Create admin account</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Use your secure admin access code to create an administrator account.
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Admin name"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="adminCode">Admin invite code</Label>
            <Input
              id="adminCode"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="8-character code from an existing admin"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating admin account..." : "Create admin account"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already have an admin account?{" "}
          <Link to="/admin-login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminSignup;
