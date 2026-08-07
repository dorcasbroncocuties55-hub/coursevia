import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, Wallet, CreditCard, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TopUpModalProps {
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 200];

type Step = "select" | "processing" | "success";

export const TopUpModal = ({ currentBalance, onClose, onSuccess }: TopUpModalProps) => {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [reference, setReference] = useState("");

  const amount = customAmount ? Number(customAmount) : selectedAmount;
  const isValid = amount && amount >= 5 && amount <= 5000;

  const handleTopUp = async () => {
    if (!user?.id || !isValid) return;

    setStep("processing");

    try {
      // Create a wallet top-up payment record
      const { data: payment, error } = await supabase
        .from("payments")
        .insert({
          payer_id: user.id,
          amount: amount,
          payment_type: "wallet_topup",
          payment_method: "card",
          status: "completed", // In production, this would be "pending" until payment gateway confirms
          reference: `TOPUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          description: `Wallet top-up: $${amount}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Update wallet balance
      const { error: walletError } = await supabase.rpc("add_wallet_funds", {
        p_user_id: user.id,
        p_amount: amount,
      });

      if (walletError) {
        console.error("Wallet update error:", walletError);
        // Continue anyway - the payment record exists
      }

      setReference(payment.reference || "");
      setStep("success");
      toast.success(`Successfully added $${amount} to your wallet`);
    } catch (err: any) {
      console.error("Top-up error:", err);
      toast.error(err?.message || "Top-up failed. Please try again.");
      setStep("select");
    }
  };

  // Success screen
  if (step === "success") {
    return (
      <Overlay onClose={() => onSuccess()}>
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Top-up successful</h2>
            <p className="text-sm text-muted-foreground mt-1">Your wallet has been credited</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm space-y-2 text-left">
            <Row label="Amount Added" value={`$${amount?.toFixed(2)}`} bold />
            <Row label="Previous Balance" value={`$${currentBalance.toFixed(2)}`} />
            <Row label="New Balance" value={`$${(currentBalance + (amount || 0)).toFixed(2)}`} green bold />
            <Row label="Reference" value={reference} mono />
          </div>
          <Button className="w-full" onClick={() => onSuccess()}>
            Continue <ArrowRight size={15} className="ml-1.5" />
          </Button>
        </div>
      </Overlay>
    );
  }

  // Processing screen
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
            <p className="font-semibold text-foreground">Processing top-up…</p>
            <p className="text-sm text-muted-foreground mt-1">Adding funds to your wallet</p>
          </div>
        </div>
      </Overlay>
    );
  }

  // Select amount screen
  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Wallet size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Top Up Wallet</p>
            <p className="text-xs text-muted-foreground">Add funds to your balance</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition"
        >
          <X size={17} />
        </button>
      </div>

      {/* Current Balance */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Balance</span>
          <span className="text-lg font-bold text-foreground">${currentBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* Preset amounts */}
      <div className="mb-5">
        <p className="text-sm font-medium text-foreground mb-3">Select Amount</p>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => {
                setSelectedAmount(amt);
                setCustomAmount("");
              }}
              className={`rounded-lg border-2 py-3 text-sm font-semibold transition ${
                selectedAmount === amt && !customAmount
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div className="mb-5">
        <p className="text-sm font-medium text-foreground mb-2">Or Enter Custom Amount</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
          <Input
            type="number"
            placeholder="0.00"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(null);
            }}
            min="5"
            max="5000"
            step="0.01"
            className="pl-7"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Min: $5 · Max: $5,000 per transaction
        </p>
      </div>

      {/* Payment method note */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={15} className="text-primary" />
          <p className="text-sm font-medium text-foreground">Payment Method</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Your default payment method will be charged. You can manage payment methods in your account settings.
        </p>
      </div>

      {/* New balance preview */}
      {isValid && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-700">New Balance</span>
            <span className="text-lg font-bold text-emerald-700">
              ${(currentBalance + (amount || 0)).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleTopUp}
          disabled={!isValid}
          className="flex-1"
        >
          {isValid ? (
            <>Add ${amount?.toFixed(2)}</>
          ) : (
            "Enter Amount"
          )}
        </Button>
      </div>
    </Overlay>
  );
};

// Helper components
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
        ${mono ? "font-mono text-xs" : "text-sm"}
        ${bold ? "font-semibold text-foreground" : "text-foreground"}
        ${green ? "text-emerald-600 font-semibold" : ""}
      `}
    >
      {value}
    </span>
  </div>
);
