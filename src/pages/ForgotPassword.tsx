import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    // Check whether this email belongs to a registered user before sending.
    // We query the profiles table (publicly readable by email) so we never
    // call resetPasswordForEmail for an address that has no account.
    const { data: existingProfile, error: lookupError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (lookupError) {
      setLoading(false);
      toast.error("Something went wrong. Please try again.");
      return;
    }

    if (!existingProfile) {
      // No account found — show the same success UI so we don't leak
      // whether an address is registered (security best practice), but
      // we do NOT send any email.
      setLoading(false);
      setSent(true);
      return;
    }

    // redirectTo must be whitelisted in Supabase Dashboard →
    // Authentication → URL Configuration → Redirect URLs
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to send reset email. Please try again.");
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to login
          </Link>

          <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm mb-6">
            If an account exists for <span className="font-medium text-foreground">{email.trim().toLowerCase()}</span>,
            you'll receive a password reset link shortly.
          </p>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground mb-6">
            Didn't receive it? Check your spam folder, or wait a minute before trying again.
          </div>

          <button
            type="button"
            onClick={() => { setSent(false); setEmail(""); }}
            className="text-sm text-primary hover:underline"
          >
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to login
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-2">Reset your password</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
