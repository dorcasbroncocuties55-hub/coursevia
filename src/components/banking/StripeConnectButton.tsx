import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { backendRequest } from "@/lib/backendApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2, AlertCircle, ExternalLink,
  Loader2, Building2, ArrowRight,
} from "lucide-react";

interface ConnectStatus {
  connected: boolean;
  verified: boolean;
  payouts_enabled: boolean;
  requirements?: string[];
  country?: string;
}

interface StripeConnectButtonProps {
  role?: "coach" | "therapist" | "creator";
}

export const StripeConnectButton = ({ role = "coach" }: StripeConnectButtonProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  useEffect(() => { if (user) loadStatus(); }, [user]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "success") {
      toast.success("Bank account connected! Stripe is verifying your details.");
      window.history.replaceState({}, "", window.location.pathname);
      loadStatus();
    } else if (params.get("connect") === "refresh") {
      toast.info("Onboarding session expired. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await backendRequest<ConnectStatus>(
        `/api/connect/status?user_id=${encodeURIComponent(user.id)}`
      );
      setStatus(data);
    } catch {
      setStatus({ connected: false, verified: false, payouts_enabled: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user?.email) { toast.error("Sign in first."); return; }
    setConnecting(true);
    try {
      const data = await backendRequest<{ onboarding_url: string }>("/api/connect/onboard", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, email: user.email, role }),
      });
      window.location.href = data.onboarding_url;
    } catch (e: any) {
      toast.error(e.message || "Could not start bank setup.");
      setConnecting(false);
    }
  };

  const handleDashboard = async () => {
    if (!user) return;
    setOpeningDashboard(true);
    try {
      const data = await backendRequest<{ url: string }>("/api/connect/dashboard-link", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id }),
      });
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Could not open Stripe dashboard.");
    } finally {
      setOpeningDashboard(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking payout status…</span>
        </CardContent>
      </Card>
    );
  }

  // Not connected — show onboarding CTA
  if (!status?.connected) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
              <Building2 size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Connect your bank via Stripe</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Stripe verifies your bank account and handles payouts directly to your bank. Secure, fast, and reflected in your Stripe dashboard.
              </p>
            </div>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 pl-1">
            <li>✓ Real bank verification by Stripe</li>
            <li>✓ Payouts visible in your Stripe dashboard</li>
            <li>✓ Supports 40+ countries</li>
            <li>✓ Takes 2–5 minutes to set up</li>
          </ul>
          <Button onClick={handleConnect} disabled={connecting} className="w-full gap-2">
            {connecting
              ? <><Loader2 size={14} className="animate-spin" /> Opening Stripe…</>
              : <><Building2 size={14} /> Connect Bank Account <ArrowRight size={14} /></>
            }
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Connected but pending verification
  if (status.connected && !status.payouts_enabled) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Verification in progress</p>
                <p className="text-sm text-amber-700">Complete any outstanding requirements on Stripe to enable payouts.</p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 shrink-0">Pending</Badge>
          </div>
          {status.requirements && status.requirements.length > 0 && (
            <div className="text-xs text-amber-700 space-y-1 pl-1">
              <p className="font-medium">Still needed:</p>
              {status.requirements.map(r => <p key={r}>• {r.replace(/_/g, " ")}</p>)}
            </div>
          )}
          <Button variant="outline" onClick={handleDashboard} disabled={openingDashboard} className="w-full gap-2 border-amber-300">
            {openingDashboard ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
            Complete on Stripe
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Fully verified
  return (
    <Card className="border-emerald-200 bg-emerald-50">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-900">Bank connected & verified</p>
            <p className="text-sm text-emerald-700">Withdrawals go directly to your bank via Stripe.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
          <Button variant="outline" size="sm" onClick={handleDashboard} disabled={openingDashboard} className="gap-1.5 border-emerald-300 text-emerald-800">
            {openingDashboard ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
            Stripe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
