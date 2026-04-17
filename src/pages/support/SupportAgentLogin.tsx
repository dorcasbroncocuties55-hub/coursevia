import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Headphones } from "lucide-react";
import { PageLoading } from "@/components/LoadingSpinner";

const SupportAgentLogin = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if already logged in as support agent
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: agent } = await supabase
          .from("support_agents" as any)
          .select("id, is_active")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (agent && agent.is_active) {
          navigate("/support-agent/dashboard", { replace: true });
          return;
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Handle auth loading state
  if (authLoading) {
    return <PageLoading />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); setLoading(false); return; }

      // Check if they are a support agent
      const { data: agent, error: agentError } = await supabase
        .from("support_agents" as any)
        .select("id, is_active")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (agentError) {
        // Table may not exist yet — run SUPPORT_AGENT_MIGRATION.sql in Supabase
        await supabase.auth.signOut();
        toast.error("Support agent system not set up yet. Please run SUPPORT_AGENT_MIGRATION.sql in Supabase.");
        setLoading(false);
        return;
      }

      if (!agent) {
        await supabase.auth.signOut();
        toast.error("Access denied. This account is not registered as a support agent.");
        setLoading(false);
        return;
      }
      if (!(agent as any).is_active) {
        await supabase.auth.signOut();
        toast.error("Your support agent account has been deactivated. Contact admin.");
        setLoading(false);
        return;
      }

      await supabase.from("support_agents" as any).update({ is_online: true }).eq("user_id", data.user.id);
      toast.success("Welcome back!");
      navigate("/support-agent/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Full name is required"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) { toast.error(error.message); setLoading(false); return; }

      // Supabase may require email confirmation — handle both cases
      const userId = data.user?.id || data.session?.user?.id;

      if (!userId) {
        // Email confirmation required — tell user to confirm then sign in
        toast.success("Account created! Check your email to confirm, then sign in.");
        setMode("login");
        setPassword("");
        setConfirm("");
        setLoading(false);
        return;
      }

      // User is immediately active (email confirmation disabled) — set up agent
      await supabase.from("profiles").upsert({
        user_id: userId,
        full_name: fullName.trim(),
        email,
        onboarding_completed: true,
      }, { onConflict: "user_id", ignoreDuplicates: true });

      const { error: agentError } = await supabase.from("support_agents" as any).insert({
        user_id: userId,
        full_name: fullName.trim(),
        email,
        is_active: true,
        is_online: false,
      });

      if (agentError) {
        // Table doesn't exist — still created auth account, just can't be agent yet
        toast.error("Account created but support agent table not set up. Run SUPPORT_AGENT_MIGRATION.sql in Supabase, then sign in.");
        await supabase.auth.signOut();
        setMode("login");
        setLoading(false);
        return;
      }

      toast.success("Agent account created! Signing you in...");

      // Auto sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast.success("Account created! Please sign in.");
        setMode("login");
        setPassword("");
        setConfirm("");
      } else {
        await supabase.from("support_agents" as any).update({ is_online: true }).eq("user_id", userId);
        navigate("/support-agent/dashboard", { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <Headphones size={28} className="text-primary" />
        <span className="text-2xl font-bold text-foreground">Coursevia Support</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {(["login", "signup"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {mode === "login" ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-1">Agent sign in</h1>
              <p className="text-sm text-muted-foreground mb-6">Sign in to your support agent account</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@example.com" required />
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="relative">
                    <Input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="pr-10" />
                    <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-1">Create agent account</h1>
              <p className="text-sm text-muted-foreground mb-6">Register as a Coursevia support agent</p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@example.com" required />
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="relative">
                    <Input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required className="pr-10" />
                    <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirm password</Label>
                  <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create agent account"}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Back to Coursevia</Link>
        </p>
      </div>
    </div>
  );
};

export default SupportAgentLogin;
