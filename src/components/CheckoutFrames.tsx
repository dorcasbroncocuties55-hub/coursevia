/**
 * Internal card payment component.
 * Navigates to /pay with query params — no external Stripe redirect.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  reference: string;
  amount: number;
  currency?: string;
  email: string;
  userId: string;
  type: string;
  contentId?: string | null;
  contentTitle?: string;
  plan?: string | null;
  onSuccess: (result: any) => void;
  onError: (msg: string) => void;
};

const CheckoutFrames = ({
  amount, type, contentId, contentTitle, plan, onError,
}: Props) => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const params = new URLSearchParams({
        type,
        amount:     String(amount),
        title:      contentTitle || type,
        ...(contentId ? { content_id: contentId } : {}),
        ...(plan      ? { plan }                  : {}),
        redirect:   type === "subscription" ? "/dashboard/subscription" : "/dashboard",
      });
      navigate(`/pay?${params.toString()}`);
    } catch (err: any) {
      onError(err?.message || "Could not start payment");
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading payment page…</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center">
        <Lock size={11} /> 256-bit TLS · Secure payment
      </div>
      <Button disabled className="w-full">
        <ShieldCheck size={15} className="mr-2" /> Pay ${Number(amount).toFixed(2)}
      </Button>
    </div>
  );
};

export default CheckoutFrames;
