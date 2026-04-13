import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail } from "lucide-react";

const AuthGate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);

  const destinationPath =
    typeof location.state?.destinationPath === "string"
      ? location.state.destinationPath
      : "/checkout";

  const handleContinue = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error("Please enter your email.");
      return;
    }

    try {
      setChecking(true);

      const { data, error } = await supabase.rpc("check_user_exists_by_email", {
        user_email: cleanEmail,
      });

      if (error) throw error;

      if (data === true) {
        navigate("/login", {
          replace: true,
          state: {
            from: destinationPath,
            prefillEmail: cleanEmail,
          },
        });
        return;
      }

      navigate("/signup", {
        replace: true,
        state: {
          from: destinationPath,
          prefillEmail: cleanEmail,
        },
      });
    } catch (error: any) {
      toast.error(error?.message || "Unable to check account.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Continue to checkout
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email. If you already have an account, you will sign in. If not, you will create one first.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleContinue();
                }}
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleContinue}
            disabled={checking}
          >
            {checking ? "Checking..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthGate;
