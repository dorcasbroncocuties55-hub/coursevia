import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Wallet, Lock, ArrowDownCircle, Clock, CheckCircle2, XCircle, Loader2, Building2, CreditCard } from "lucide-react";
import { PageLoading } from "@/components/LoadingSpinner";

type WithdrawalRow = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  notes?: string;
};

type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_name?: string;
  is_default: boolean;
  currency: string;
};

const statusIcon = (s: string) => {
  if (s === "completed" || s === "processed") return <CheckCircle2 size={13} className="text-emerald-500" />;
  if (s === "failed" || s === "rejected")     return <XCircle size={13} className="text-red-500" />;
  return <Clock size={13} className="text-amber-500" />;
};

const statusClass = (s: string) => {
  if (s === "completed" || s === "processed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "failed" || s === "rejected")     return "bg-red-50 text-red-600 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const WithdrawalsPage = ({ role }: { role: "coach" | "creator" | "therapist" }) => {
  const { user, loading: authLoading } = useAuth();
  const [withdrawals,    setWithdrawals]    = useState<WithdrawalRow[]>([]);
  const [bankAccounts,   setBankAccounts]   = useState<BankAccount[]>([]);
  const [wallet,         setWallet]         = useState<any>(null);
  const [selectedBank,   setSelectedBank]   = useState("");
  const [amount,         setAmount]         = useState("");
  const [processing,     setProcessing]     = useState(false);
  const [loading,        setLoading]        = useState(true);

  const available = Number(wallet?.available_balance ?? wallet?.balance ?? 0);
  const pending   = Number(wallet?.pending_balance ?? 0);

  const loadData = async () => {
    if (!user) {
      setWithdrawals([]);
      setBankAccounts([]);
      setWallet(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [walletRes, withdrawalsRes, banksRes] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("withdrawals" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("bank_accounts").select("id, bank_name, account_number, account_name, is_default, currency").eq("user_id", user.id).order("is_default", { ascending: false }),
      ]);

      setWallet(walletRes.data);
      setWithdrawals((withdrawalsRes.data as any) || []);
      setBankAccounts(banksRes.data || []);

      // Auto-select default bank
      const defaultBank = banksRes.data?.find(b => b.is_default) || banksRes.data?.[0];
      if (defaultBank && !selectedBank) setSelectedBank(defaultBank.id);
    } catch (err: any) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0)    { toast.error("Enter a valid amount"); return; }
    if (amt > available)     { toast.error(`Max available: $${available.toFixed(2)}`); return; }
    if (!selectedBank)       { toast.error("Select a bank account"); return; }

    setProcessing(true);
    try {
      // Get wallet
      const { data: walletData } = await supabase.from("wallets").select("id, available_balance, balance").eq("user_id", user!.id).maybeSingle();
      if (!walletData) throw new Error("Wallet not found. Contact support.");

      const currentBalance = Number((walletData as any).available_balance ?? (walletData as any).balance ?? 0);
      const newBalance = Math.max(0, currentBalance - amt);

      // Deduct from wallet immediately
      const { error: walletErr } = await supabase.from("wallets").update({
        available_balance: newBalance,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }).eq("id", (walletData as any).id);

      if (walletErr) throw walletErr;

      // Record withdrawal as completed immediately
      const { error: withdrawErr } = await supabase.from("withdrawals" as any).insert({
        user_id: user!.id,
        amount: amt,
        bank_account_id: selectedBank,
        status: "completed",
        notes: "Withdrawal processed",
        processed_at: new Date().toISOString(),
      });

      if (withdrawErr) throw withdrawErr;

      // Record in wallet ledger
      await supabase.from("wallet_ledger").insert({
        wallet_id: (walletData as any).id,
        type: "debit",
        amount: amt,
        balance_after: newBalance,
        description: "Withdrawal to bank account",
      });

      toast.success(`$${amt.toFixed(2)} withdrawn successfully! Funds will arrive in 1–3 business days.`);
      setAmount("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 max-w-2xl">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Withdrawals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Transfer your earnings to your bank account</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/${role}/bank-accounts`}>Manage banks</Link>
          </Button>
        </div>

        {/* Balance cards */}
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
              <p className="text-sm text-muted-foreground">Pending (8-day hold)</p>
            </div>
            <p className="text-3xl font-bold text-foreground">${pending.toFixed(2)}</p>
          </div>
        </div>

        {/* Withdraw form */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Withdraw Funds</h2>

          <div>
            <Label>Amount (USD)</Label>
            <Input
              type="number" min="1" step="0.01" max={available}
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={`Max $${available.toFixed(2)}`}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Payout account</Label>
            {loading ? (
              <div className="mt-1 h-10 rounded-md bg-muted animate-pulse" />
            ) : bankAccounts.length === 0 ? (
              <div className="mt-1 rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">No bank accounts added yet</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/${role}/bank-accounts`}>Add bank account</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-1 space-y-2">
                {bankAccounts.map(bank => (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedBank(bank.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selectedBank === bank.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="rounded-lg bg-primary/10 p-2">
                      {bank.bank_name?.toLowerCase().includes("paypal")
                        ? <CreditCard size={16} className="text-primary" />
                        : <Building2 size={16} className="text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{bank.bank_name}</p>
                      <p className="text-xs text-muted-foreground">
                        ****{bank.account_number?.slice(-4)} · {bank.currency || "USD"}
                        {bank.is_default && <span className="ml-2 text-primary">Default</span>}
                      </p>
                    </div>
                    {selectedBank === bank.id && (
                      <CheckCircle2 size={16} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleWithdraw}
            disabled={processing || available <= 0 || !selectedBank || !amount}
            className="w-full gap-2"
          >
            {processing
              ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
              : <><ArrowDownCircle size={14} /> Withdraw now</>
            }
          </Button>

          {available <= 0 && (
            <p className="text-xs text-center text-muted-foreground">No available balance to withdraw</p>
          )}
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Withdrawal History</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : withdrawals.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No withdrawals yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {withdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    {statusIcon(w.status)}
                    <div>
                      <p className="text-sm font-medium text-foreground">${Number(w.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs border rounded-full px-2.5 py-0.5 capitalize font-medium ${statusClass(w.status)}`}>
                    {w.status}
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

export default WithdrawalsPage;
export const CoachWithdrawals     = () => <WithdrawalsPage role="coach" />;
export const CreatorWithdrawals   = () => <WithdrawalsPage role="creator" />;
export const TherapistWithdrawals = () => <WithdrawalsPage role="therapist" />;
