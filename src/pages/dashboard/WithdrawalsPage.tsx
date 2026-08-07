/**
 * WithdrawalsPage — Airwallex-powered international bank transfer.
 * Providers enter recipient bank details inline and send earnings
 * to any bank in the world. No pre-saved accounts required.
 */
import { Navigate, Link } from "react-router-dom";
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
  Loader2, Building2, Send, Copy, ChevronLeft, AlertCircle, Globe,
} from "lucide-react";
import { PageLoading } from "@/components/LoadingSpinner";

type Step = "form" | "review" | "processing" | "receipt";

type Payout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  account_name: string;
  bank_name: string;
  country_code: string;
  created_at: string;
  note?: string;
};

const buildRef = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  return `TRF-${date}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
};

const estimatedArrival = () => {
  const d = new Date();
  let added = 0;
  while (added < 3) { d.setDate(d.getDate()+1); if (d.getDay()!==0 && d.getDay()!==6) added++; }
  return d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
};

const statusBadge = (s: string) => {
  if (s==="completed"||s==="submitted"||s==="processed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s==="failed"||s==="rejected") return "bg-red-50 text-red-600 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "form",       label: "Details"  },
  { key: "review",     label: "Review"   },
  { key: "processing", label: "Sending"  },
  { key: "receipt",    label: "Done"     },
];

const StepBar = ({ current }: { current: Step }) => {
  const idx = STEP_LABELS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEP_LABELS.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < idx ? "bg-primary text-primary-foreground"
              : i === idx ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
              : "bg-muted text-muted-foreground"}`}>
              {i < idx ? <CheckCircle2 size={14}/> : i+1}
            </div>
            <span className={`text-[10px] mt-1 font-medium ${i===idx?"text-primary":"text-muted-foreground"}`}>{s.label}</span>
          </div>
          {i < STEP_LABELS.length-1 && <div className={`w-10 h-0.5 mx-1 mb-4 ${i<idx?"bg-primary":"bg-border"}`}/>}
        </div>
      ))}
    </div>
  );
};

const Row = ({ label, value, bold, mono }: { label:string; value:string; bold?:boolean; mono?:boolean }) => (
  <div className="flex items-center justify-between px-4 py-3 gap-4">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className={`text-xs text-right break-all ${bold?"font-semibold text-foreground":"text-foreground"} ${mono?"font-mono":""}`}>{value}</span>
  </div>
);

const TransferPage = ({ role }: { role: "coach" | "creator" | "therapist" }) => {
  const { user, loading: authLoading } = useAuth();

  const [wallet,     setWallet]     = useState<any>(null);
  const [payouts,    setPayouts]    = useState<Payout[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [step,       setStep]       = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [receipt,    setReceipt]    = useState<any>(null);

  // Form fields
  const [amount,         setAmount]         = useState("");
  const [currency,       setCurrency]       = useState("USD");
  const [accountName,    setAccountName]    = useState("");
  const [accountNumber,  setAccountNumber]  = useState("");
  const [bankName,       setBankName]       = useState("");
  const [bankCode,       setBankCode]       = useState("");
  const [swiftCode,      setSwiftCode]      = useState("");
  const [iban,           setIban]           = useState("");
  const [routingNumber,  setRoutingNumber]  = useState("");
  const [countryCode,    setCountryCode]    = useState("US");
  const [note,           setNote]           = useState("");

  const available = safeNum(wallet?.available_balance ?? wallet?.balance);
  const pending   = safeNum(wallet?.pending_balance);
  const amt       = safeNum(amount);

  function safeNum(v: any) { return Number.isFinite(Number(v)) ? Number(v) : 0; }

  const loadData = async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [walletRes, payoutsRes] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        fetch(buildBackendUrl(`/api/payouts/history?user_id=${user.id}`)),
      ]);
      setWallet(walletRes.data);
      const pd = await payoutsRes.json().catch(() => ({}));
      setPayouts(pd.payouts || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const validate = () => {
    if (!amt || amt <= 0)       { toast.error("Enter a valid amount"); return false; }
    if (amt > available)        { toast.error(`Max available: $${available.toFixed(2)}`); return false; }
    if (!accountName.trim())    { toast.error("Account holder name is required"); return false; }
    if (!accountNumber.trim() && !iban.trim()) { toast.error("Account number or IBAN is required"); return false; }
    if (!bankName.trim())       { toast.error("Bank name is required"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep("processing");
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1800)); // brief animation
    try {
      const res = await fetch(buildBackendUrl("/api/payouts/transfer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user!.id, amount: amt, currency,
          account_name: accountName.trim(),
          account_number: accountNumber.trim() || undefined,
          bank_name: bankName.trim(),
          bank_code: bankCode.trim() || undefined,
          swift_code: swiftCode.trim() || undefined,
          iban: iban.trim() || undefined,
          routing_number: routingNumber.trim() || undefined,
          country_code: countryCode.trim().toUpperCase(),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Transfer failed");
      setReceipt({ ...data, arrival: estimatedArrival() });
      setStep("receipt");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Transfer failed. Please try again.");
      setStep("review");
    } finally { setSubmitting(false); }
  };

  const reset = () => {
    setAmount(""); setAccountName(""); setAccountNumber(""); setBankName("");
    setBankCode(""); setSwiftCode(""); setIban(""); setRoutingNumber("");
    setCountryCode("US"); setNote(""); setReceipt(null); setStep("form");
  };

  if (authLoading) return <PageLoading />;
  if (!user)       return <Navigate to="/login" replace />;

  const CURRENCIES = ["USD","EUR","GBP","AUD","CAD","NGN","GHS","KES","ZAR","INR","SGD","HKD","JPY","CNY","BRL","MXN","AED","SAR"];

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transfer Earnings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Send your earnings to any bank in the world via Airwallex</p>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2"><Wallet size={15} className="text-emerald-500"/><p className="text-sm text-muted-foreground">Available</p></div>
            <p className="text-3xl font-bold text-foreground">${available.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2"><Lock size={15} className="text-amber-500"/><p className="text-sm text-muted-foreground">Clearing (8-day hold)</p></div>
            <p className="text-3xl font-bold text-foreground">${pending.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Released automatically</p>
          </div>
        </div>

        {/* Transfer card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">

          {/* ── FORM ── */}
          {step === "form" && (
            <div className="p-6 space-y-5">
              <StepBar current="form"/>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                    <Input type="number" min="1" step="0.01" max={available} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="pl-7 text-lg font-semibold h-12"/>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Available: ${available.toFixed(2)}</span>
                    <button onClick={()=>setAmount(available.toFixed(2))} className="text-xs text-primary hover:underline">Transfer all</button>
                  </div>
                </div>
                <div>
                  <Label>Currency</Label>
                  <select value={currency} onChange={e=>setCurrency(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Building2 size={12}/>Recipient Bank Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Account Holder Name *</Label><Input className="mt-1" value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Full legal name"/></div>
                  <div><Label>Account Number</Label><Input className="mt-1" value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} placeholder="Account / NUBAN number"/></div>
                  <div><Label>Bank Name *</Label><Input className="mt-1" value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="e.g. Access Bank, Chase"/></div>
                  <div><Label>Bank Code / Sort Code</Label><Input className="mt-1" value={bankCode} onChange={e=>setBankCode(e.target.value)} placeholder="Optional"/></div>
                  <div><Label>SWIFT / BIC Code</Label><Input className="mt-1" value={swiftCode} onChange={e=>setSwiftCode(e.target.value)} placeholder="For international SWIFT"/></div>
                  <div><Label>IBAN</Label><Input className="mt-1" value={iban} onChange={e=>setIban(e.target.value)} placeholder="For EU / SEPA transfers"/></div>
                  <div><Label>Routing Number</Label><Input className="mt-1" value={routingNumber} onChange={e=>setRoutingNumber(e.target.value)} placeholder="US ACH routing"/></div>
                  <div><Label>Country Code *</Label><Input className="mt-1" value={countryCode} onChange={e=>setCountryCode(e.target.value.toUpperCase())} placeholder="e.g. US, NG, GB" maxLength={2}/></div>
                </div>
              </div>

              <div><Label>Transfer Note <span className="text-muted-foreground font-normal">(optional)</span></Label><Input className="mt-1.5" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Earnings — July 2026" maxLength={80}/></div>

              <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-800">
                <Globe size={13} className="shrink-0 mt-0.5"/>
                <span>Transfers are sent worldwide via Airwallex. Fill only the fields relevant to your recipient's country — SWIFT + IBAN for Europe, routing number for US ACH, bank code for Nigeria/Africa.</span>
              </div>

              <Button onClick={()=>{ if(validate()) setStep("review"); }} className="w-full h-11 gap-2 text-base">
                Review Transfer <ArrowRight size={16}/>
              </Button>
            </div>
          )}

          {/* ── REVIEW ── */}
          {step === "review" && (
            <div className="p-6 space-y-5">
              <StepBar current="review"/>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Transferring</p>
                <p className="text-4xl font-bold text-foreground mt-1">{currency} {amt.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                <Row label="From"            value="Your Coursevia Wallet"/>
                <Row label="To"              value={`${bankName}${accountNumber ? " ****"+accountNumber.slice(-4) : ""}`}/>
                <Row label="Account Holder"  value={accountName}/>
                {iban         && <Row label="IBAN"          value={iban}/>}
                {swiftCode    && <Row label="SWIFT/BIC"     value={swiftCode}/>}
                {routingNumber&& <Row label="Routing"       value={routingNumber}/>}
                <Row label="Country"         value={countryCode.toUpperCase()}/>
                <Row label="Amount"          value={`${currency} ${amt.toFixed(2)}`} bold/>
                <Row label="Fee"             value="Free"/>
                <Row label="Est. arrival"    value="1–3 business days"/>
                {note && <Row label="Note"   value={note}/>}
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                <AlertCircle size={13} className="shrink-0 mt-0.5"/>
                Verify the recipient details carefully. Transfers cannot be reversed once submitted.
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={()=>setStep("form")}><ChevronLeft size={15}/> Back</Button>
                <Button className="flex-1 h-11" onClick={handleSubmit}><Send size={15} className="mr-1"/> Confirm & Send</Button>
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === "processing" && (
            <div className="p-10 flex flex-col items-center gap-5 min-h-[260px]">
              <StepBar current="processing"/>
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Send size={26} className="text-primary"/></div>
                <div className="absolute -inset-1 rounded-full border-2 border-primary/30 border-t-primary animate-spin"/>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Sending via Airwallex…</p>
                <p className="text-sm text-muted-foreground">Connecting to the global banking network</p>
              </div>
            </div>
          )}

          {/* ── RECEIPT ── */}
          {step === "receipt" && receipt && (
            <div className="p-6 space-y-5">
              <StepBar current="receipt"/>
              <div className="flex flex-col items-center gap-2 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={30} className="text-emerald-600"/></div>
                <p className="text-lg font-bold text-foreground">Transfer Submitted</p>
                <p className="text-sm text-muted-foreground">{currency} {amt.toFixed(2)} is on its way to {bankName}</p>
              </div>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                <div className="bg-muted/40 px-4 py-2.5 flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transfer Receipt</span>
                  <button onClick={()=>{navigator.clipboard.writeText(receipt.reference);toast.success("Reference copied");}} className="text-xs text-primary hover:underline flex items-center gap-1"><Copy size={11}/> Copy ref</button>
                </div>
                <Row label="Reference"  value={receipt.reference} mono bold/>
                <Row label="Amount"     value={`${currency} ${amt.toFixed(2)}`} bold/>
                <Row label="To"         value={`${bankName}${accountNumber?" ****"+accountNumber.slice(-4):""}`}/>
                <Row label="Status"     value={receipt.status || "Submitted"}/>
                <Row label="Est. arrival" value={receipt.arrival}/>
                {receipt.airwallex_transfer_id && <Row label="Airwallex ID" value={receipt.airwallex_transfer_id} mono/>}
              </div>
              <Button onClick={reset} className="w-full gap-2"><Send size={14}/> New Transfer</Button>
            </div>
          )}
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Transfer History</h2>
            <span className="text-xs text-muted-foreground">{payouts.length} record{payouts.length!==1?"s":""}</span>
          </div>
          {loading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          : payouts.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No transfers yet.</p>
          : <div className="divide-y divide-border">
              {payouts.map(p=>(
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {p.status==="completed"||p.status==="submitted" ? <CheckCircle2 size={14} className="text-emerald-500"/> : p.status==="failed" ? <XCircle size={14} className="text-red-500"/> : <Clock size={14} className="text-amber-500"/>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.currency} {Number(p.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{p.bank_name} · {new Date(p.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
                    </div>
                  </div>
                  <span className={`text-xs border rounded-full px-2.5 py-0.5 capitalize font-medium ${statusBadge(p.status)}`}>{p.status==="submitted"?"Sent":p.status}</span>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TransferPage;
export const CoachWithdrawals     = () => <TransferPage role="coach"     />;
export const CreatorWithdrawals   = () => <TransferPage role="creator"   />;
export const TherapistWithdrawals = () => <TransferPage role="therapist" />;
