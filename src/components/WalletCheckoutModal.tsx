/**
 * WalletCheckoutModal
 *
 * Drop-in replacement / complement to PaymentModal.
 * Shows the learner's available wallet balance, lets them confirm payment,
 * and handles insufficient-funds with a top-up prompt.
 *
 * Usage:
 *   <WalletCheckoutModal
 *     contentType="booking"       // "course" | "video" | "booking" | "subscription"
 *     contentId={booking.id}
 *     contentTitle="30-min coaching"
 *     amount={50}
 *     plan={null}                 // only for subscriptions
 *     onClose={() => setOpen(false)}
 *     onSuccess={(ref) => navigate("/dashboard/bookings")}
 *   />
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { getWalletBalance, walletPay, type WalletPayPayload } from "@/lib/walletPay";

const TYPE_LABEL: Record<string, string> = {
  booking:      "Session Booking",
  course:       "Course Purchase",
  video:        "Video Purchase",
  subscription: "Membership",
};

interface WalletCheckoutModalProps {
  contentType: WalletPayPayload["type"];
  contentId?: string | null;
  contentTitle: string;
  amount: number;
  /** Only required when contentType === "subscription" */
  plan?: string | null;
  onClose: () => void;
  onSuccess: (reference: string) => void;
}

type Step = "confirm" | "processing" | "success";

const WalletCheckoutModal = ({
  contentType,
  contentId = null,
  contentTitle,
  amount,
  plan = null,
  onClose,
  onSuccess,
}: WalletCheckoutModalProps) => {
  const { user } = useAuth();

  const [step, setStep]         = useState<Step>("confirm");
  const [balance, setBalance]   = useState<number | null>(null);
  const [loadingBal, setLoadingBal] = useState(true);
  const [reference, setReference]   = useState("");

  const sufficient = balance !== null && balance >= amount;
  const typeLabel  = TYPE_LABEL[contentType] ?? "Purchase";

  // Load wallet balance on mount
  useEffect(() => {
    if (!user?.id) return;
    setLoadingBal(true);
    getWalletBalance(user.id)
      .then((b) => setBalance(b.available))
      .catch(() => setBalance(0))
      .finally(() => setLoadingBal(false));
  }, [user?.id]);

  const handlePay = async () => {
    if (!user?.id || !user?.email) {
      toast.error("Please sign in first.");
      return;
    }
    if (!sufficient) return;

    setStep("processing");

    try {
      const result = await walletPay({
        user_id:       user.id,
        email:         user.email,
        type:          contentType,
        amount,
        content_id:    contentId,
        content_title: contentTitle,
        plan,
      });

      setReference(result.reference);
      setStep("success");
    } catch (err: any) {
      toast.error(err?.message || "Payment failed. Please try again.");
      setStep("confirm");
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <Overlay onClose={() => onSuccess(reference)}>
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Payment successful</h2>
            <p className="text-sm text-muted-foreground mt-1">{contentTitle}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm space-y-1.5 text-left">
            <Row label="Amount"    value={`$${amount.toFixed(2)}`} bold />
            <Row label="Method"    value="Wallet" />
            <Row label="Reference" value={reference} mono />
            <Row label="Status"    value="Paid" green />
          </div>
          <Button className="w-full" onClick={() => onSuccess(reference)}>
            Continue <ArrowRight size={15} className="ml-1.5" />
          </Button>
        </div>
      </Overlay>
    );
  }

  // ── Processing screen ────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <Overlay onClose={() => {}}>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet size={24} className="text-primary" />
            </div>
            <div className="absolute -inset-1 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Processing payment…</p>
            <p className="text-sm text-muted-foreground mt-1">Deducting from your wallet</p>
          </div>
        </div>
      </Overlay>
    );
  }

  // ── Confirm screen ───────────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Wallet size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{typeLabel}</p>
            <p className="text-xs text-muted-foreground">Pay from your wallet</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition"
        >
          <X size={17} />
        </button>
      </div>

      {/* Order summary */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 mb-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Order</p>
        <p className="font-semibold text-foreground line-clamp-2">{contentTitle}</p>
        <div className="flex items-end justify-between border-t border-border pt-2.5 mt-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-foreground">${amount.toFixed(2)}</span>
        </div>
      </div>

      {/* Wallet balance */}
      <div className={`rounded-xl border p-4 mb-4 ${
        loadingBal
          ? "border-border bg-muted/20"
          : sufficient
            ? "border-emerald-200 bg-emerald-50"
            : "border-red-200 bg-red-50"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={15} className={sufficient ? "text-emerald-600" : "text-red-500"} />
            <span className="text-sm font-medium text-foreground">Wallet balance</span>
          </div>
          {loadingBal ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <span className={`font-bold text-sm ${sufficient ? "text-emerald-700" : "text-red-600"}`}>
              ${(balance ?? 0).toFixed(2)}
            </span>
          )}
        </div>

        {!loadingBal && !sufficient && (
          <div className="mt-2.5 flex items-start gap-2">
            <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 space-y-1">
              <p>
                Insufficient balance. You need{" "}
                <strong>${(amount - (balance ?? 0)).toFixed(2)} more</strong>.
              </p>
              <Link
                to="/dashboard/wallet"
                onClick={onClose}
                className="inline-flex items-center gap-1 font-medium text-red-700 hover:underline"
              >
                Top up wallet <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        )}

        {!loadingBal && sufficient && (
          <p className="mt-1.5 text-xs text-emerald-700">
            Remaining after payment:{" "}
            <strong>${((balance ?? 0) - amount).toFixed(2)}</strong>
          </p>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 mb-5 text-xs text-muted-foreground">
        <ShieldCheck size={13} className="text-primary shrink-0" />
        Instant · No card required · Secured by Coursevia
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handlePay}
          disabled={loadingBal || !sufficient}
          className="flex-1"
        >
          {loadingBal ? (
            <Loader2 size={14} className="animate-spin mr-2" />
          ) : null}
          Pay ${amount.toFixed(2)}
        </Button>
      </div>
    </Overlay>
  );
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const Overlay = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl p-6">
      {children}
    </div>
  </div>
);

const Row = ({
  label,
  value,
  bold,
  mono,
  green,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  green?: boolean;
}) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span
      className={`text-right break-all
        ${mono  ? "font-mono text-xs"              : "text-sm"}
        ${bold  ? "font-semibold text-foreground"  : "text-foreground"}
        ${green ? "text-emerald-600 font-semibold" : ""}
      `}
    >
      {value}
    </span>
  </div>
);

export default WalletCheckoutModal;
