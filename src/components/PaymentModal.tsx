import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, ShieldCheck, X, CreditCard } from "lucide-react";
import { initializeCheckout, type CheckoutType } from "@/lib/paymentGateway";

interface PaymentModalProps {
  contentType: CheckoutType;
  contentId: string;
  contentTitle: string;
  amount: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const TYPE_COPY: Record<CheckoutType, { label: string; description: string }> = {
  booking:      { label: "Session Booking",  description: "Booking confirmed after payment verification." },
  course:       { label: "Course Purchase",  description: "Lifetime access granted after payment." },
  video:        { label: "Video Purchase",   description: "Video access unlocked after payment." },
  subscription: { label: "Membership",       description: "Membership activates after payment." },
};

const PaymentModal = ({ contentType, contentId, contentTitle, amount, onClose }: PaymentModalProps) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const copy = TYPE_COPY[contentType] ?? TYPE_COPY.course;

  const startCheckout = async () => {
    if (!user?.id || !user.email) { toast.error("Please sign in first."); return; }
    try {
      setProcessing(true);
      const checkout = await initializeCheckout({
        email: user.email,
        user_id: user.id,
        type: contentType,
        amount,
        content_id: contentId,
        content_title: contentTitle,
      });
      const url = checkout.authorization_url || checkout.redirect_url;
      if (!url) throw new Error("No payment URL returned.");
      window.location.href = url;
    } catch (error: any) {
      toast.error(error?.message || "Unable to start checkout.");
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b7e84]/10">
              <CreditCard size={18} className="text-[#0b7e84]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{copy.label}</p>
              <p className="text-xs text-slate-400">Powered by Stripe</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Order summary */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Order summary</p>
            <h3 className="mt-2 text-base font-semibold text-slate-900 line-clamp-2">{contentTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">{copy.description}</p>
            <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-3">
              <span className="text-sm text-slate-500">Total due</span>
              <span className="text-3xl font-bold text-slate-900">${Number(amount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Secure payment</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                You'll be redirected to Stripe's secure checkout page.
              </p>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock size={11} /> 256-bit TLS · PCI DSS compliant
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={processing} className="flex-1">Cancel</Button>
            <Button onClick={startCheckout} disabled={processing} className="flex-1 bg-[#0b7e84] hover:bg-[#096a70] text-white">
              {processing ? "Loading…" : `Pay $${Number(amount || 0).toFixed(2)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
