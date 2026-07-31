/**
 * Admin bank transfer page — same 4-step flow as coach/therapist/creator.
 */
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Wallet, Lock, ArrowRight, Clock, CheckCircle2, XCircle,
  Loader2, Building2, CreditCard, ChevronLeft, Send,
  Copy, AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TransferRow  = { id: string; amount: number; status: string; created_at: string; notes?: string };
type BankAccount  = { id: string; bank_name: string; account_number: string; account_name?: string; is_default: boolean; currency: string };
type Step         = "amount" | "review" | "processing" | "receipt";

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildReference = () => {
  const d    = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TRF-${date}-${rand}`;
};

const estimatedArrival = () => {
  const d = new Date();
  let added = 0;
  while (added < 3) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

const statusIcon  = (s: string) => {
  if (s === "completed" || s === "processed") return <CheckCircle2 size={13} className="text-emerald-500" />;
  if (s === "failed"    || s === "rejected")  return <XCircle size={13} className="text-red-500" />;
  return <Clock size={13} className="text-amber-500" />;
};
const statusClass = (s: string) => {
  if (s === "completed" || s === "processed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "failed"    || s === "rejected")  return "bg-red-50 text-red-600 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

// ── Step bar ──────────────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "amount",     label: "Amount"  },
  { key: "review",     label: "Review"  },
  { key: "processing", label: "Process" },
  { key: "receipt",    label: "Receipt" },
];

const StepBar = ({ current }: { current: Step }) => {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${done   ? "bg-primary text-primary-foreground"
                : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                :          "bg-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mx-1 mb-4 ${i < idx ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Detail row ────────────────────────────────────────────────────────────────

const DetailRow = ({ label, value, bold, mono, className }: {
  label: string; value: string; bold?: boolean; mono?: boolean; className?: string;
}) => (
  <div className="flex items-center justify-between px-4 py-3 gap-4">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className={`text-xs text-right break-all
      ${bold ? "font-semibold text-foreground" : "text-foreground"}
      ${mono ? "font-mono" : ""}
      ${className || ""}`}>
      {value}
    </span>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

const AdminWithdrawals = () => {
  const { user } = useAuth();

  const [transfers,    setTransfers]    = useState<TransferRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [wallet,       setWallet]       = useState<any>(null);
  const [loading,      setLoading]      = useState(true);

  const [step,         setStep]         = useState<Step>("amount");
  const [amount,       setAmount]       = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [note,         setNote]         = useState("");
  const [processing,   setProcessing]   = useState(false);
  const [reference,    setReference]    = useState("");
  const [arrival,      setArrival]      = useState("");

  const available  = Number(wallet?.available_balance ?? wallet?.balance ?? 0);
  const pending    = Number(wallet?.pending_balance ?? 0);
  const amt        = Number(amount);
  const chosenBank = bankAccounts.find(b => b.id === selectedBank);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadData = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [walletRes, txRes, banksRes] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("withdrawals" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("bank_accounts").select("id, bank_name, account_number, account_name, is_default, currency").eq("user_id", user.id).order("is_default", { ascending: false }),
      ]);
      setWallet(walletRes.data);
      setTransfers((txRes.data as any) || []);
      setBankAccounts(banksRes.data || []);
      const def = banksRes.data?.find((b: any) => b.is_default) || banksRes.data?.[0];
      if (def) setSelectedBank(def.id);
    } catch (err: any) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleContinueToReview = () => {
    if (!amt || amt <= 0)  { toast.error("Enter a valid amount"); return; }
    if (amt > available)   { toast.error(`Max available: $${available.toFixed(2)}`); return; }
    if (!selectedBank)     { toast.error("Select a destination account"); return; }
    setStep("review");
  };

  const handleConfirmTransfer = async () => {
    setStep("processing");
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2200));
    try {
      const { data: walletData } = await supabase.from("wallets").select("id, available_balance, balance").eq("user_id", user!.id).maybeSingle();
      if (!walletData) throw new Error("Wallet not found. Contact support.");

      const currentBal = Number((walletData as any).available_balance ?? (walletData as any).balance ?? 0);
      const newBal     = Math.max(0, currentBal - amt);
      const ref        = buildReference();
      const arrivalStr = estimatedArrival();

      const { error: walletErr } = await supabase.from("wallets").update({
        available_balance: newBal, balance: newBal, updated_at: new Date().toISOString(),
      }).eq("id", (walletData as any).id);
      if (walletErr) throw walletErr;

      const noteText = [
        `REF:${ref}`,
        note.trim() || "Bank transfer",
        `To: ${chosenBank?.bank_name} ****${chosenBank?.account_number?.slice(-4)}`,
      ].join(" | ");

      const { error: txErr } = await supabase.from("withdrawals" as any).insert({
        user_id: user!.id, amount: amt, bank_account_id: selectedBank,
        status: "completed", notes: noteText,
      });
      if (txErr) throw txErr;

      await supabase.from("wallet_ledger").insert({
        wallet_id: (walletData as any).id, type: "debit", amount: amt,
        balance_after: newBal,
        description: `Transfer to ${chosenBank?.bank_name} ****${chosenBank?.account_number?.slice(-4)}`,
      });

      setReference(ref);
      setArrival(arrivalStr);
      setStep("receipt");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Transfer failed. Please try again.");
      setStep("review");
    } finally {
      setProcessing(false);
    }
  };

  const handleNewTransfer = () => {
    setAmount(""); setNote(""); setReference(""); setArrival(""); setStep("amount");
  };

  const copyRef = () => navigator.clipboard.writeText(reference).then(() => toast.success("Reference copied"));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8 max-w-2xl">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bank Transfer</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Send your earnings directly to your bank account</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/bank-accounts">Manage accounts</Link>
          </Button>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={15} className="text-emerald-500" />
              <p className="text-sm text-muted-foreground">Available to transfer</p>
            </div>
            <p className="text-3xl font-bold text-foreground">${available.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={15} className="text-amber-500" />
              <p className="text-sm text-muted-foreground">Clearing (8-day hold)</p>
            </div>
            <p className="text-3xl font-bold text-foreground">${pending.toFixed(2)}</p>
          </div>
        </div>

        {/* Transfer card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">

          {/* Step 1 — Amount */}
          {step === "amount" && (
            <div className="p-6 space-y-5">
              <StepBar current="amount" />
              <div>
                <Label className="text-sm font-medium">Transfer amount</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input type="number" min="1" step="0.01" max={available} value={amount}
                    onChange={e => setAmount(e.target.value)} placeholder="0.00"
                    className="pl-7 text-lg font-semibold h-12" />
                </div>
                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-muted-foreground">Available: <span className="font-medium text-foreground">${available.toFixed(2)}</span></p>
                  <button type="button" onClick={() => setAmount(available.toFixed(2))} className="text-xs text-primary hover:underline font-medium">Transfer all</button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Destination account</Label>
                {loading ? (
                  <div className="mt-1.5 h-16 rounded-xl bg-muted animate-pulse" />
                ) : bankAccounts.length === 0 ? (
                  <div className="mt-1.5 rounded-xl border border-dashed border-border p-5 text-center space-y-2">
                    <AlertCircle size={20} className="mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No bank accounts linked yet</p>
                    <Button size="sm" variant="outline" asChild><Link to="/admin/bank-accounts">Add bank account</Link></Button>
                  </div>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    {bankAccounts.map(bank => (
                      <button key={bank.id} type="button" onClick={() => setSelectedBank(bank.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all
                          ${selectedBank === bank.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 bg-background"}`}>
                        <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                          {bank.bank_name?.toLowerCase().includes("paypal") ? <CreditCard size={17} className="text-primary" /> : <Building2 size={17} className="text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{bank.bank_name}</p>
                          <p className="text-xs text-muted-foreground">
                            ****{bank.account_number?.slice(-4)}{bank.account_name && ` · ${bank.account_name}`}
                            <span className="ml-2 uppercase">{bank.currency || "USD"}</span>
                            {bank.is_default && <span className="ml-2 text-primary font-medium">Default</span>}
                          </p>
                        </div>
                        {selectedBank === bank.id && <CheckCircle2 size={16} className="text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input className="mt-1.5" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Admin payout — July" maxLength={80} />
              </div>

              <Button onClick={handleContinueToReview} disabled={!amt || amt <= 0 || amt > available || !selectedBank} className="w-full h-11 gap-2 text-base">
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {/* Step 2 — Review */}
          {step === "review" && (
            <div className="p-6 space-y-5">
              <StepBar current="review" />
              <div className="text-center mb-2">
                <p className="text-sm text-muted-foreground">You are about to transfer</p>
                <p className="text-4xl font-bold text-foreground mt-1">${amt.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{chosenBank?.currency || "USD"}</p>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  <DetailRow label="From"              value="Admin wallet" />
                  <DetailRow label="To"                value={`${chosenBank?.bank_name} ****${chosenBank?.account_number?.slice(-4)}`} />
                  {chosenBank?.account_name && <DetailRow label="Account holder" value={chosenBank.account_name} />}
                  <DetailRow label="Amount"            value={`$${amt.toFixed(2)} ${chosenBank?.currency || "USD"}`} bold />
                  <DetailRow label="Fee"               value="Free" className="text-emerald-600" />
                  <DetailRow label="Estimated arrival" value="1 – 3 business days" />
                  {note && <DetailRow label="Note"     value={note} />}
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 flex gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Verify the destination account before confirming. Transfers cannot be reversed once submitted.</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-1" onClick={() => setStep("amount")}><ChevronLeft size={15} /> Back</Button>
                <Button className="flex-1 gap-2 h-11" onClick={handleConfirmTransfer}><Send size={15} /> Confirm Transfer</Button>
              </div>
            </div>
          )}

          {/* Step 3 — Processing */}
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
                <p className="font-semibold text-foreground">Processing your transfer…</p>
                <p className="text-sm text-muted-foreground">Communicating with the banking network</p>
              </div>
              <div className="flex gap-1.5">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}

          {/* Step 4 — Receipt */}
          {step === "receipt" && (
            <div className="p-6 space-y-5">
              <StepBar current="receipt" />
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={30} className="text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-foreground">Transfer Successful</p>
                <p className="text-sm text-muted-foreground">${amt.toFixed(2)} is on its way to {chosenBank?.bank_name}</p>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transfer Receipt</span>
                  <button onClick={copyRef} className="flex items-center gap-1 text-xs text-primary hover:underline"><Copy size={11} /> Copy ref</button>
                </div>
                <div className="divide-y divide-border">
                  <DetailRow label="Reference"         value={reference} mono bold />
                  <DetailRow label="Amount"            value={`$${amt.toFixed(2)} ${chosenBank?.currency || "USD"}`} bold />
                  <DetailRow label="To"                value={`${chosenBank?.bank_name} ****${chosenBank?.account_number?.slice(-4)}`} />
                  {chosenBank?.account_name && <DetailRow label="Account holder" value={chosenBank.account_name} />}
                  <DetailRow label="Status"            value="Submitted to bank" className="text-emerald-600" />
                  <DetailRow label="Estimated arrival" value={arrival} />
                  <DetailRow label="Date"              value={new Date().toLocaleString()} />
                  {note && <DetailRow label="Note"     value={note} />}
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">Reference: <span className="font-semibold text-foreground">{reference}</span></p>
              <Button onClick={handleNewTransfer} className="w-full gap-2"><Send size={14} /> Make Another Transfer</Button>
            </div>
          )}
        </div>

        {/* Transfer history */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Transfer History</h2>
            <span className="text-xs text-muted-foreground">{transfers.length} record{transfers.length !== 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
          ) : transfers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No transfers yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {transfers.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">{statusIcon(t.status)}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">${Number(t.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {t.notes?.includes("REF:") && (
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground/70">{t.notes.match(/REF:([\w-]+)/)?.[1] || ""}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs border rounded-full px-2.5 py-0.5 capitalize font-medium ${statusClass(t.status)}`}>
                    {t.status === "completed" ? "Transferred" : t.status}
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

export default AdminWithdrawals;
