import { Navigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Wallet, Lock, ArrowRight, Clock, CheckCircle2, XCircle,
  Loader2, Building2, CreditCard, ChevronLeft, Send,
  Copy, AlertCircle, ExternalLink, Shield, RefreshCw,
} from "lucide-react";
import { PageLoading } from "@/components/LoadingSpinner";

// ── Types ────────────────────────────────────────────────────────────────────

type WithdrawalRow = {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  stripe_transfer_id?: string;
  failure_reason?: string;
};

type StripeConnectStatus = {
  hasStripeAccount: boolean;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  canWithdraw: boolean;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  accountStatus: any;
};

type Step = "setup" | "amount" | "review" | "processing" | "receipt";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a withdrawal reference: WDR-YYYYMMDD-XXXXXX */
const buildReference = () => {
  const today = new Date();
  const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WDR-${date}-${rand}`;
};

/** Estimated arrival: skip weekends for a realistic estimate */
const estimatedArrival = () => {
  const d = new Date();
  let daysAdded = 0;
  while (daysAdded < 2) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) daysAdded++;
  }
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

const statusIcon = (s: string) => {
  if (s === "completed" || s === "processed") return <CheckCircle2 size={13} className="text-emerald-500" />;
  if (s === "failed" || s === "rejected") return <XCircle size={13} className="text-red-500" />;
  return <Clock size={13} className="text-amber-500" />;
};

const statusClass = (s: string) => {
  if (s === "completed" || s === "processed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "failed" || s === "rejected") return "bg-red-50 text-red-600 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const MIN_WITHDRAWAL = 20;

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "setup", label: "Setup" },
  { key: "amount", label: "Amount" },
  { key: "review", label: "Review" },
  { key: "processing", label: "Process" },
  { key: "receipt", label: "Receipt" },
];

const StepBar = ({ current }: { current: Step }) => {
  // Hide the setup step from the bar once past it
  const visibleSteps = current === "setup" ? STEPS : STEPS.slice(1);
  const idx = visibleSteps.findIndex(s => s.key === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {visibleSteps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${done ? "bg-primary text-primary-foreground"
                  : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div className={`w-12 h-0.5 mx-1 mb-4 ${i < idx ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Detail row helper ─────────────────────────────────────────────────────────

const DetailRow = ({
  label, value, bold, mono, className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  className?: string;
}) => (
  <div className="flex items-center justify-between px-4 py-3 gap-4">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className={`text-xs text-right break-all
      ${bold ? "font-semibold text-foreground" : "text-foreground"}
      ${mono ? "font-mono" : ""}
      ${className ?? ""}`}>
      {value}
    </span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────

const TransferPage = ({ role }: { role: "coach" | "creator" | "therapist" }) => {
  const { user, loading: authLoading } = useAuth();

  // Data state
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [step, setStep] = useState<Step>("setup");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [reference, setReference] = useState("");
  const [arrival, setArrival] = useState("");
  const [onboarding, setOnboarding] = useState(false);

  const available = Number(stripeStatus?.availableBalance ?? wallet?.available_balance ?? wallet?.balance ?? 0);
  const pending = Number(stripeStatus?.pendingBalance ?? wallet?.pending_balance ?? 0);
  const amt = Number(amount);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadData = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [walletRes, statusRes, historyRes] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        fetch(`/api/stripe-connect/status/${user.id}`),
        fetch(`/api/stripe-connect/withdrawals/${user.id}`),
      ]);

      setWallet(walletRes.data);

      if (statusRes.ok) {
        const statusData: StripeConnectStatus = await statusRes.json();
        setStripeStatus(statusData);
        // Advance past "setup" if payouts are already enabled
        if (statusData.payoutsEnabled) {
          setStep(prev => prev === "setup" ? "amount" : prev);
        }
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        // Backend returns the array directly or wrapped in { data: [] }
        setWithdrawals(Array.isArray(historyData) ? historyData : (historyData.data ?? []));
      }
    } catch (err: any) {
      console.error("LoadData error:", err);
      toast.error("Failed to load withdrawal data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.id]);

  // ── Stripe Connect onboarding ─────────────────────────────────────────────

  const handleStartOnboarding = async () => {
    if (!user) return;
    setOnboarding(true);
    try {
      const res = await fetch("/api/stripe-connect/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role }),
      });
      const data = await res.json();
      if (data.onboardingUrl || data.url) {
        window.location.href = data.onboardingUrl ?? data.url;
      } else {
        toast.error(data.error || "Could not start onboarding. Try again.");
      }
    } catch (err: any) {
      toast.error("Onboarding failed. Please try again.");
    } finally {
      setOnboarding(false);
    }
  };

  // ── Step: amount → review ─────────────────────────────────────────────────

  const handleContinueToReview = () => {
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is $${MIN_WITHDRAWAL}.00`);
      return;
    }
    if (amt > available) {
      toast.error(`Max available: $${available.toFixed(2)}`);
      return;
    }
    setStep("review");
  };

  // ── Step: review → processing → receipt ──────────────────────────────────

  const handleConfirmWithdrawal = async () => {
    if (!user) return;
    setStep("processing");
    setProcessing(true);
    try {
      const res = await fetch("/api/stripe-connect/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount: amt, role }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Withdrawal failed. Please try again.");
      }

      const ref = buildReference();
      const arrivalStr = estimatedArrival();
      setReference(ref);
      setArrival(arrivalStr);
      setStep("receipt");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed. Please try again.");
      setStep("review");
    } finally {
      setProcessing(false);
    }
  };

  const handleNewWithdrawal = () => {
    setAmount("");
    setReference("");
    setArrival("");
    setStep("amount");
  };

  const copyRef = () => {
    navigator.clipboard.writeText(reference).then(
      () => toast.success("Reference copied"),
      () => toast.error("Could not copy — please copy manually"),
    );
  };

  // ── Auth guards ───────────────────────────────────────────────────────────

  if (authLoading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role={role}>
      <div className="space-y-8 max-w-2xl">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Withdrawals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Transfer your earnings to your bank account via Stripe
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={15} className="text-emerald-500" />
              <p className="text-sm text-muted-foreground">Available to withdraw</p>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {loading ? "—" : `$${available.toFixed(2)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">USD</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={15} className="text-amber-500" />
              <p className="text-sm text-muted-foreground">Clearing (8-day hold)</p>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {loading ? "—" : `$${pending.toFixed(2)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Released automatically</p>
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">

          {/* ── Step: Setup (Stripe Connect) ──────────────────────────────── */}
          {step === "setup" && (
            <div className="p-8 space-y-6">
              <StepBar current="setup" />

              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Shield size={26} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Connect your bank account</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  To receive payouts you need to complete a one-time Stripe identity verification.
                  It only takes a few minutes.
                </p>
              </div>

              {stripeStatus?.hasStripeAccount && !stripeStatus.onboardingComplete && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-2 items-start">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>
                    Your Stripe account is set up but verification is not yet complete.
                    Please finish onboarding to enable payouts.
                  </span>
                </div>
              )}

              <div className="rounded-xl border border-border divide-y divide-border text-sm">
                <div className="flex items-center gap-3 p-3.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">Secure identity verification via Stripe</span>
                </div>
                <div className="flex items-center gap-3 p-3.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">Bank-level encryption for account details</span>
                </div>
                <div className="flex items-center gap-3 p-3.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">One-time setup — payouts are instant after approval</span>
                </div>
              </div>

              <Button
                onClick={handleStartOnboarding}
                disabled={onboarding}
                className="w-full h-11 gap-2 text-base"
              >
                {onboarding
                  ? <><Loader2 size={16} className="animate-spin" /> Redirecting to Stripe…</>
                  : <><ExternalLink size={15} /> Start Stripe Onboarding</>}
              </Button>

              {stripeStatus?.payoutsEnabled && (
                <Button
                  variant="ghost"
                  className="w-full text-sm text-primary"
                  onClick={() => setStep("amount")}
                >
                  Payouts already enabled — go to withdraw
                </Button>
              )}
            </div>
          )}

          {/* ── Step: Amount ──────────────────────────────────────────────── */}
          {step === "amount" && (
            <div className="p-6 space-y-5">
              <StepBar current="amount" />

              {/* Stripe not fully enabled warning */}
              {stripeStatus && !stripeStatus.payoutsEnabled && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 flex gap-2 items-start">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    Your Stripe account is pending verification. Withdrawals will be enabled once approved.{" "}
                    <button onClick={() => setStep("setup")} className="underline font-medium">
                      Check setup
                    </button>
                  </span>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Withdrawal amount</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input
                    type="number"
                    min={MIN_WITHDRAWAL}
                    step="0.01"
                    max={available}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 text-lg font-semibold h-12"
                    disabled={!stripeStatus?.payoutsEnabled}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-muted-foreground">
                    Available: <span className="font-medium text-foreground">${available.toFixed(2)}</span>
                    <span className="ml-2 text-muted-foreground/70">· Min ${MIN_WITHDRAWAL}.00</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setAmount(available.toFixed(2))}
                    disabled={!stripeStatus?.payoutsEnabled || available <= 0}
                    className="text-xs text-primary hover:underline font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Withdraw all
                  </button>
                </div>
              </div>

              <Button
                onClick={handleContinueToReview}
                disabled={!stripeStatus?.payoutsEnabled || !amt || amt < MIN_WITHDRAWAL || amt > available}
                className="w-full h-11 gap-2 text-base"
              >
                Continue <ArrowRight size={16} />
              </Button>

              {available <= 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  No available balance — funds clear after the 8-day hold period.
                </p>
              )}
            </div>
          )}

          {/* ── Step: Review ─────────────────────────────────────────────── */}
          {step === "review" && (
            <div className="p-6 space-y-5">
              <StepBar current="review" />

              <div className="text-center mb-2">
                <p className="text-sm text-muted-foreground">You are about to withdraw</p>
                <p className="text-4xl font-bold text-foreground mt-1">${amt.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-0.5">USD</p>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  <DetailRow label="From" value="Your Coursevia wallet" />
                  <DetailRow label="To" value="Your verified bank account (via Stripe)" />
                  <DetailRow label="Amount" value={`$${amt.toFixed(2)} USD`} bold />
                  <DetailRow label="Fee" value="Free" className="text-emerald-600" />
                  <DetailRow label="Estimated arrival" value="1 – 3 business days" />
                  <DetailRow label="Minimum withdrawal" value={`$${MIN_WITHDRAWAL}.00`} />
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 flex gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Withdrawals are processed via Stripe and cannot be cancelled once submitted.
                  Please confirm the details above are correct.
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => setStep("amount")}
                >
                  <ChevronLeft size={15} /> Back
                </Button>
                <Button
                  className="flex-1 gap-2 h-11"
                  onClick={handleConfirmWithdrawal}
                >
                  <Send size={15} /> Confirm Withdrawal
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Processing ─────────────────────────────────────────── */}
          {step === "processing" && (
            <div className="p-10 flex flex-col items-center justify-center gap-5 min-h-[280px]">
              <StepBar current="processing" />
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Send size={26} className="text-primary" />
                </div>
                <div className="absolute -inset-1 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Processing your withdrawal…</p>
                <p className="text-sm text-muted-foreground">Communicating with Stripe</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Receipt ─────────────────────────────────────────────── */}
          {step === "receipt" && (
            <div className="p-6 space-y-5">
              <StepBar current="receipt" />

              <div className="flex flex-col items-center text-center gap-2 py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={30} className="text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-foreground">Withdrawal Submitted</p>
                <p className="text-sm text-muted-foreground">
                  ${amt.toFixed(2)} is being processed via Stripe
                </p>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Withdrawal Receipt
                  </span>
                  <button
                    onClick={copyRef}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Copy size={11} /> Copy ref
                  </button>
                </div>
                <div className="divide-y divide-border">
                  <DetailRow label="Reference" value={reference} mono bold />
                  <DetailRow label="Amount" value={`$${amt.toFixed(2)} USD`} bold />
                  <DetailRow label="Status" value="Submitted to Stripe" className="text-emerald-600" />
                  <DetailRow label="Estimated arrival" value={arrival} />
                  <DetailRow label="Date" value={new Date().toLocaleString()} />
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Keep reference <span className="font-semibold text-foreground">{reference}</span> for tracking.
              </p>

              <Button onClick={handleNewWithdrawal} className="w-full gap-2">
                <Send size={14} /> Make Another Withdrawal
              </Button>
            </div>
          )}
        </div>

        {/* Withdrawal history */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Withdrawal History</h2>
            <span className="text-xs text-muted-foreground">
              {withdrawals.length} record{withdrawals.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
          ) : withdrawals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No withdrawals yet. Your history will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {withdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {statusIcon(w.status)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">${Number(w.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.requested_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                        {w.stripe_transfer_id && (
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground/70">
                            {w.stripe_transfer_id}
                          </span>
                        )}
                      </p>
                      {w.failure_reason && (
                        <p className="text-xs text-red-500 mt-0.5">{w.failure_reason}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs border rounded-full px-2.5 py-0.5 capitalize font-medium ${statusClass(w.status)}`}>
                    {w.status === "completed" ? "Transferred" : w.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

// ── Named exports ─────────────────────────────────────────────────────────────

export default TransferPage;
export const CoachWithdrawals = () => <TransferPage role="coach" />;
export const CreatorWithdrawals = () => <TransferPage role="creator" />;
export const TherapistWithdrawals = () => <TransferPage role="therapist" />;
