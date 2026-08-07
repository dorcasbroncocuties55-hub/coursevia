/**
 * WithdrawalsPage — Manual payout request system.
 * Provider enters bank details + amount → request saved in DB →
 * Admin reviews, pays manually, then approves or rejects.
 * No third-party platform involved.
 */
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildBackendUrl } from "@/lib/backendApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Wallet, Lock, ArrowRight, Clock, CheckCircle2, XCircle,
  Building2, Send, Copy, ChevronLeft, AlertCircle, Info,
} from "lucide-react";
import { PageLoading } from "@/components/LoadingSpinner";

type Step = "form" | "review" | "submitted";

type PayoutRequest = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  account_name: string;
  bank_name: string;
  country_code: string;
  note?: string;
  admin_note?: string;
  created_at: string;
  processed_at?: string;
};

const CURRENCIES = ["USD","EUR","GBP","AUD","CAD","NGN","GHS","KES","ZAR","INR","SGD","HKD","JPY","CNY","BRL","MXN","AED","SAR"];

const statusBadge = (s: string) => {
  if (s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "rejected")  return "bg-red-50 text-red-600 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const statusLabel = (s: string) => {
  if (s === "completed") return "Paid";
  if (s === "rejected")  return "Rejected";
  return "Pending";
};

const Row = ({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) => (
  <div className="flex items-center justify-between px-4 py-3 gap-4 border-b border-border last:border-0">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className={`text-xs text-right break-all ${bold ? "font-semibold text-foreground" : "text-foreground"} ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

const WithdrawalsPage = ({ role }: { role: "coach" | "creator" | "therapist" }) => {
  const { user, loading: authLoading } = useAuth();

  const [wallet,     setWallet]     = useState<any>(null);
  const [requests,   setRequests]   = useState<PayoutRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [step,       setStep]       = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [receipt,    setReceipt]    = useState<any>(null);

  // Form fields
  const [amount,        setAmount]        = useState("");
  const [currency,      setCurrency]      = useState("USD");
  const [accountName,   setAccountName]   = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName,      setBankName]      = useState("");
  const [bankCode,      setBankCode]      = useState("");
  const [swiftCode,     setSwiftCode]     = useState("");
  const [iban,          setIban]          = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [countryCode,   setCountryCode]   = useState("NG");
  const [note,          setNote]          = useState("");

  function safeNum(v: any) { return Number.isFinite(Number(v)) ? Number(v) : 0; }
  const available = safeNum(wallet?.available_balance ?? wallet?.balance);
  const pending   = safeNum(wallet?.pending_balance);
  const amt       = safeNum(amount);

  const loadData = async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [walletRes, histRes] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        fetch(buildBackendUrl(`/api/payouts/history?user_id=${user.id}`)),
      ]);
      setWallet(walletRes.data);
      const hd = await histRes.json().catch(() => ({}));
      setRequests(hd.payouts || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const validate = () => {
    if (!amt || amt <= 0)                            { toast.error("Enter a valid amount"); return false; }
    if (amt > available)                             { toast.error(`Max available: $${available.toFixed(2)}`); return false; }
    if (!accountName.trim())                         { toast.error("Account holder name is required"); return false; }
    if (!accountNumber.trim() && !iban.trim())       { toast.error("Account number or IBAN is required"); return false; }
    if (!bankName.trim())                            { toast.error("Bank name is required"); return false; }
    if (!countryCode.trim())                         { toast.error("Country code is required"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(buildBackendUrl("/api/payouts/request"), {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:        user!.id,
          amount:         amt,
          currency,
          account_name:   accountName.trim(),
          account_number: accountNumber.trim() || undefined,
          bank_name:      bankName.trim(),
          bank_code:      bankCode.trim()      || undefined,
          swift_code:     swiftCode.trim()     || undefined,
          iban:           iban.trim()          || undefined,
          routing_number: routingNumber.trim() || undefined,
          country_code:   countryCode.trim().toUpperCase(),
          note:           note.trim()          || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setReceipt(data);
      setStep("submitted");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setAmount(""); setAccountName(""); setAccountNumber(""); setBankName("");
    setBankCode(""); setSwiftCode(""); setIban(""); setRoutingNumber("");
    setCountryCode("NG"); setNote(""); setReceipt(null); setStep("form");
  };

  if (authLoading) return <PageLoading />;
  if (!user)       return <Navigate to="/login" replace />;

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Request Payout</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit your bank details and amount — admin will transfer manually within 1–3 business days.
          </p>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={15} className="text-emerald-500" />
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
            <p className="text-3xl font-bold text-foreground">${available.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={15} className="text-amber-500" />
              <p className="text-sm text-muted-foreground">Clearing (8-day hold)</p>
            </div>
            <p className="text-3xl font-bold text-foreground">${pending.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Released automatically</p>
          </div>
        </div>

        {/* How it works banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 space-y-0.5">
            <p className="font-semibold">How payouts work</p>
            <p>Submit your request below. The admin reviews it and transfers the money directly from our business bank account to yours. You'll get a notification when it's done — usually within 1–3 business days.</p>
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">

          {/* ── FORM ── */}
          {step === "form" && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                    <Input
                      type="number" min="1" step="0.01" max={available}
                      value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00" className="pl-7 text-lg font-semibold h-12"
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Available: ${available.toFixed(2)}</span>
                    <button onClick={() => setAmount(available.toFixed(2))} className="text-xs text-primary hover:underline">Request all</button>
                  </div>
                </div>
                <div>
                  <Label>Currency</Label>
                  <select
                    value={currency} onChange={e => setCurrency(e.target.value)}
                    className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 size={12} /> Your Bank Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Account Holder Name *</Label><Input className="mt-1" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Your full legal name" /></div>
                  <div><Label>Account Number</Label><Input className="mt-1" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account / NUBAN number" /></div>
                  <div><Label>Bank Name *</Label><Input className="mt-1" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Access Bank, GTBank" /></div>
                  <div><Label>Bank Code / Sort Code</Label><Input className="mt-1" value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="Optional" /></div>
                  <div><Label>SWIFT / BIC</Label><Input className="mt-1" value={swiftCode} onChange={e => setSwiftCode(e.target.value)} placeholder="For international transfers" /></div>
                  <div><Label>IBAN</Label><Input className="mt-1" value={iban} onChange={e => setIban(e.target.value)} placeholder="For EU / SEPA transfers" /></div>
                  <div><Label>Routing Number</Label><Input className="mt-1" value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} placeholder="US ACH routing" /></div>
                  <div>
                    <Label>Country Code *</Label>
                    <Input className="mt-1" value={countryCode} onChange={e => setCountryCode(e.target.value.toUpperCase())} placeholder="e.g. NG, US, GB" maxLength={2} />
                  </div>
                </div>
              </div>

              <div>
                <Label>Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input className="mt-1.5" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Earnings — July 2026" maxLength={100} />
              </div>

              <Button onClick={() => { if (validate()) setStep("review"); }} className="w-full h-11 gap-2 text-base">
                Review Request <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {/* ── REVIEW ── */}
          {step === "review" && (
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Requesting payout of</p>
                <p className="text-4xl font-bold text-foreground mt-1">{currency} {amt.toFixed(2)}</p>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <Row label="Your bank"       value={bankName} />
                <Row label="Account holder"  value={accountName} />
                {accountNumber && <Row label="Account number" value={`****${accountNumber.slice(-4)}`} />}
                {iban          && <Row label="IBAN"           value={iban} />}
                {swiftCode     && <Row label="SWIFT / BIC"    value={swiftCode} />}
                {routingNumber && <Row label="Routing"        value={routingNumber} />}
                <Row label="Country"         value={countryCode.toUpperCase()} />
                <Row label="Amount"          value={`${currency} ${amt.toFixed(2)}`} bold />
                <Row label="Processing time" value="1–3 business days" />
                {note && <Row label="Note"   value={note} />}
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                Double-check your bank details. Incorrect details may cause your payment to be delayed or lost.
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                  <ChevronLeft size={15} /> Edit
                </Button>
                <Button className="flex-1 h-11" onClick={handleSubmit} disabled={submitting}>
                  {submitting
                    ? <><span className="animate-spin mr-1">⟳</span> Submitting…</>
                    : <><Send size={15} className="mr-1" /> Submit Request</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── SUBMITTED ── */}
          {step === "submitted" && receipt && (
            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center gap-2 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={30} className="text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-foreground">Request Submitted</p>
                <p className="text-sm text-muted-foreground">
                  Admin will transfer {currency} {amt.toFixed(2)} to your bank within 1–3 business days.
                </p>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request Receipt</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(receipt.reference); toast.success("Reference copied"); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy size={11} /> Copy ref
                  </button>
                </div>
                <Row label="Reference" value={receipt.reference} mono bold />
                <Row label="Amount"    value={`${currency} ${amt.toFixed(2)}`} bold />
                <Row label="Bank"      value={bankName} />
                <Row label="Status"    value="Pending admin approval" />
              </div>

              <Button onClick={reset} className="w-full gap-2">
                <Send size={14} /> New Request
              </Button>
            </div>
          )}
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Payout History</h2>
            <span className="text-xs text-muted-foreground">{requests.length} request{requests.length !== 1 ? "s" : ""}</span>
          </div>
          {loading
            ? <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            : requests.length === 0
              ? <p className="p-8 text-center text-sm text-muted-foreground">No payout requests yet.</p>
              : <div className="divide-y divide-border">
                  {requests.map(r => (
                    <div key={r.id} className="px-5 py-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {r.status === "completed" ? <CheckCircle2 size={14} className="text-emerald-500" />
                              : r.status === "rejected" ? <XCircle size={14} className="text-red-500" />
                              : <Clock size={14} className="text-amber-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{r.currency} {Number(r.amount).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.bank_name} · {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs border rounded-full px-2.5 py-0.5 font-medium capitalize ${statusBadge(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono pl-11">{r.reference}</p>
                      {r.admin_note && (
                        <p className="text-xs text-foreground pl-11 flex items-start gap-1">
                          <Info size={11} className="shrink-0 mt-0.5 text-muted-foreground" />
                          <span><span className="font-medium">Admin note:</span> {r.admin_note}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WithdrawalsPage;
export const CoachWithdrawals     = () => <WithdrawalsPage role="coach"     />;
export const CreatorWithdrawals   = () => <WithdrawalsPage role="creator"   />;
export const TherapistWithdrawals = () => <WithdrawalsPage role="therapist" />;
