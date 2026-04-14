/**
 * Stripe payment redirect component.
 * Replaces Checkout.com Frames — redirects to Stripe Checkout hosted page.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildBackendUrl } from "@/lib/backendApi";
import { Lock, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

type Props = {
  reference: string;
  amount: number;
  currency?: string;
  email: string;
  userId: string;
  type: string;
  contentId?: string | null;
  plan?: string | null;
  onSuccess: (result: any) => void;
  onError: (msg: string) => void;
};

const CheckoutFrames = ({ reference, amount, currency = "USD", email, userId, type, contentId, plan, onError }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const redirect = async () => {
      try {
        const res = await fetch(buildBackendUrl("/api/checkout/initialize"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            user_id: userId,
            type,
            amount,
            currency,
            content_id: contentId,
            plan,
            reference,
            callback_url: `${window.location.origin}/billing/subscription-callback`,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Could not start checkout");

        const url = data.redirect_url || data.authorization_url;
        if (!url) throw new Error("No checkout URL returned");

        window.location.href = url;
      } catch (err: any) {
        const msg = err?.message || "Payment initialization failed";
        setError(msg);
        setLoading(false);
        onError(msg);
      }
    };

    redirect();
  }, []);

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700">Payment failed to start</p>
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to Stripe checkout…</p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center">
        <Lock size={11} /> 256-bit TLS · PCI DSS compliant via Stripe
      </div>

      <Button disabled className="w-full">
        <ShieldCheck size={15} className="mr-2" /> Pay ${Number(amount).toFixed(2)}
      </Button>
    </div>
  );
};

export default CheckoutFrames;
