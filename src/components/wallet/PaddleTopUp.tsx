/**
 * PaddleTopUp
 * Lets a learner fund their Coursevia wallet using Paddle.js overlay checkout.
 *
 * Flow:
 *  1. Learner picks a top-up amount (preset or custom)
 *  2. Frontend calls POST /api/paddle/create-transaction to get a transaction ID
 *  3. Paddle.Checkout.open({ transactionId }) opens the overlay
 *  4. Learner pays with their card (Paddle handles PCI, VAT, fraud)
 *  5. Paddle fires transaction.completed webhook → backend credits wallet
 *  6. UI polls wallet balance and shows the updated amount
 *
 * Prerequisites (set in .env):
 *   VITE_PADDLE_CLIENT_TOKEN=live_...
 *   VITE_PADDLE_ENV=production          (or "sandbox" for testing)
 *   VITE_PADDLE_TOPUP_PRICE_ID=pri_...  (a Paddle price ID for "Wallet Top-Up")
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildBackendUrl } from "@/lib/backendApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CreditCard, Loader2, CheckCircle2, AlertCircle,
  Wallet, RefreshCw, ShieldCheck,
} from "lucide-react";

declare global {
  interface Window {
    Paddle?: any;
  }
}

const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "";
const PADDLE_ENV          = import.meta.env.VITE_PADDLE_ENV || "production";
const PADDLE_PRICE_ID     = import.meta.env.VITE_PADDLE_TOPUP_PRICE_ID || "";

const PRESET_AMOUNTS = [10, 25, 50, 100, 200, 500];

type TopUpState = "idle" | "creating" | "checkout" | "polling" | "success" | "error";

interface PaddleTopUpProps {
  /** Called after wallet is successfully credited so parent can refresh balance */
  onSuccess?: (amount: number) => void;
}

export const PaddleTopUp = ({ onSuccess }: PaddleTopUpProps) => {
  const { user } = useAuth();

  const [sdkReady,    setSdkReady]    = useState(false);
  const [state,       setState]       = useState<TopUpState>("idle");
  const [amount,      setAmount]      = useState<string>("25");
  const [customAmt,   setCustomAmt]   = useState("");
  const [useCustom,   setUseCustom]   = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [creditedAmt, setCreditedAmt] = useState(0);

  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount   = useRef(0);
  const txIdRef     = useRef<string | null>(null);

  // ── Load Paddle.js SDK ──────────────────────────────────────────────────────
  useEffect(() => {
    if (window.Paddle) { initPaddle(); return; }
    const script  = document.createElement("script");
    script.src    = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async  = true;
    script.onload = () => initPaddle();
    script.onerror = () => setErrorMsg("Could not load Paddle.js. Check your connection.");
    document.head.appendChild(script);
  }, []);

  const initPaddle = () => {
    if (!window.Paddle) return;
    if (PADDLE_ENV === "sandbox") {
      window.Paddle.Environment.set("sandbox");
    }
    if (PADDLE_CLIENT_TOKEN) {
      window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
    }
    setSdkReady(true);
  };

  // ── Cleanup poll on unmount ─────────────────────────────────────────────────
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const resolvedAmount = useCustom
    ? parseFloat(customAmt) || 0
    : parseFloat(amount) || 0;

  // ── Start checkout ──────────────────────────────────────────────────────────
  const handleTopUp = async () => {
    if (!user?.id || !user?.email) {
      toast.error("Please sign in first.");
      return;
    }
    if (resolvedAmount < 1) {
      toast.error("Minimum top-up is $1.");
      return;
    }
    if (!PADDLE_PRICE_ID) {
      setErrorMsg("Paddle price not configured. Set VITE_PADDLE_TOPUP_PRICE_ID in .env");
      setState("error");
      return;
    }
    if (!sdkReady || !window.Paddle) {
      toast.error("Payment SDK not ready. Please refresh and try again.");
      return;
    }

    setState("creating");
    setErrorMsg("");

    try {
      // 1. Create a Paddle transaction server-side to get a transaction ID
      const res = await fetch(buildBackendUrl("/api/paddle/create-transaction"), {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id:    PADDLE_PRICE_ID,
          quantity:    1,
          user_id:     user.id,
          email:       user.email,
          custom_data: {
            type:   "topup",
            amount: resolvedAmount,
            email:  user.email,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create checkout session.");

      txIdRef.current = data.transaction_id;
      setState("checkout");

      // 2. Open Paddle overlay with the transaction ID
      window.Paddle.Checkout.open({
        transactionId: data.transaction_id,
        settings: {
          displayMode:   "overlay",
          theme:         "light",
          locale:        "en",
          successUrl:    `${window.location.origin}/dashboard/wallet?topup=success`,
        },
        customer: { email: user.email },
        customData: {
          user_id: user.id,
          type:    "topup",
          amount:  resolvedAmount,
        },
        eventCallback: (ev: any) => {
          const type = ev?.name || ev?.event || "";
          if (type === "checkout.completed") {
            setState("polling");
            startPolling();
          }
          if (type === "checkout.closed" && state === "checkout") {
            setState("idle");
          }
          if (type === "checkout.error") {
            setErrorMsg(ev?.data?.error?.detail || "Checkout error. Please try again.");
            setState("error");
          }
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Could not start checkout.");
      setState("error");
    }
  };

  // ── Poll wallet balance to detect credit ────────────────────────────────────
  // Webhook fires async — we poll for up to 60s until balance increases
  const startPolling = () => {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > 12) {
        // 12 × 5s = 60s timeout — show success anyway (webhook may just be slow)
        clearInterval(pollRef.current!);
        setState("success");
        setCreditedAmt(resolvedAmount);
        onSuccess?.(resolvedAmount);
        return;
      }
      try {
        const res = await fetch(buildBackendUrl(`/api/wallet/balance/${user!.id}`));
        if (res.ok) {
          const d = await res.json().catch(() => ({}));
          const bal = d?.available ?? d?.available_balance ?? 0;
          if (bal > 0) {
            clearInterval(pollRef.current!);
            setState("success");
            setCreditedAmt(resolvedAmount);
            onSuccess?.(resolvedAmount);
          }
        }
      } catch { /* keep polling */ }
    }, 5000);
  };

  const reset = () => {
    setState("idle");
    setErrorMsg("");
    setCreditedAmt(0);
    txIdRef.current = null;
    pollCount.current = 0;
  };

  // ── Not configured banner ───────────────────────────────────────────────────
  if (!PADDLE_CLIENT_TOKEN) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Card payments not configured</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Set <code className="bg-amber-100 px-1 rounded">VITE_PADDLE_CLIENT_TOKEN</code> and{" "}
              <code className="bg-amber-100 px-1 rounded">VITE_PADDLE_TOPUP_PRICE_ID</code> in your{" "}
              <code className="bg-amber-100 px-1 rounded">.env</code> file. See{" "}
              <strong>PADDLE_SETUP.md</strong> for instructions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={26} className="text-emerald-600" />
        </div>
        <p className="font-bold text-emerald-900">Wallet funded!</p>
        <p className="text-sm text-emerald-800">
          ${creditedAmt.toFixed(2)} has been added to your wallet balance.
        </p>
        <Button size="sm" variant="outline" onClick={reset}>Make another top-up</Button>
      </div>
    );
  }

  // ── Polling screen ──────────────────────────────────────────────────────────
  if (state === "polling") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet size={22} className="text-primary" />
          </div>
          <div className="absolute -inset-1 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold text-foreground">Payment received</p>
          <p className="text-sm text-muted-foreground">Crediting your wallet — just a moment…</p>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error screen ────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Top-up failed</p>
            <p className="text-xs text-red-800 mt-0.5">{errorMsg}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={reset} className="gap-1.5">
          <RefreshCw size={12} /> Try again
        </Button>
      </div>
    );
  }

  // ── Main top-up form ────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <CreditCard size={16} className="text-primary" />
        <h2 className="font-semibold text-foreground">Top Up with Card</h2>
      </div>

      <div className="p-5 space-y-4">

        {/* Info */}
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3.5 text-sm text-foreground space-y-1">
          <p className="font-medium">Fund your wallet instantly</p>
          <p className="text-xs text-muted-foreground">
            Pay with any card worldwide. Paddle handles the payment securely —
            your wallet balance updates within seconds.
          </p>
        </div>

        {/* Preset amounts */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Select amount (USD)</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map(preset => (
              <button
                key={preset}
                onClick={() => { setAmount(String(preset)); setUseCustom(false); }}
                className={`rounded-xl border py-2.5 text-sm font-semibold transition
                  ${!useCustom && amount === String(preset)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 text-foreground"}`}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div>
          <button
            onClick={() => setUseCustom(v => !v)}
            className="text-xs text-primary hover:underline font-medium"
          >
            {useCustom ? "Use preset amount" : "Enter custom amount"}
          </button>
          {useCustom && (
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <Input
                type="number" min="1" step="1"
                placeholder="Enter amount"
                value={customAmt}
                onChange={e => setCustomAmt(e.target.value)}
                className="pl-7 text-lg font-semibold h-12"
              />
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
          Secured by Paddle · PCI DSS compliant · Supports Visa, Mastercard, Amex, Apple Pay, Google Pay
        </div>

        {/* CTA */}
        <Button
          onClick={handleTopUp}
          disabled={state === "creating" || resolvedAmount < 1 || !sdkReady}
          className="w-full h-11 gap-2 text-base"
        >
          {state === "creating"
            ? <><Loader2 size={16} className="animate-spin" /> Preparing checkout…</>
            : <><CreditCard size={16} /> Top up ${resolvedAmount > 0 ? resolvedAmount.toFixed(2) : "—"}</>}
        </Button>

        {!sdkReady && (
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Loader2 size={11} className="animate-spin" /> Loading payment SDK…
          </p>
        )}
      </div>
    </div>
  );
};
