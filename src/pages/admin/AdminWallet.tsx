import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { TrendingUp, CreditCard, CheckCircle2, ArrowRight } from "lucide-react";
import { getAdminShare, roundMoney } from "@/lib/pricingRules";
import { Button } from "@/components/ui/button";

const AdminWallet = () => {
  const { user } = useAuth();
  const [totals, setTotals] = useState({ total: 0, subscriptions: 0, commissions: 0 });
  const [payments, setPayments] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*")
      .in("status", ["completed", "approved"] as any)
      .order("created_at", { ascending: false });

    const rows = data || [];
    const subscriptions = roundMoney(rows.filter(r => String(r.payment_type || "").toLowerCase() === "subscription").reduce((s, r) => s + Number(r.amount || 0), 0));
    const commissions   = roundMoney(rows.filter(r => String(r.payment_type || "").toLowerCase() !== "subscription").reduce((s, r) => s + getAdminShare(Number(r.amount || 0), r.payment_type), 0));
    const total         = roundMoney(subscriptions + commissions);

    if (user?.id) {
      const { data: wallet } = await supabase.from("wallets").select("available_balance, balance").eq("user_id", user.id).maybeSingle();
      setBalance(Number((wallet as any)?.available_balance ?? (wallet as any)?.balance ?? 0));
    }

    setTotals({ total, subscriptions, commissions });
    setPayments(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Wallet</h1>
          <p className="text-muted-foreground mt-1">Platform revenue overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Available Balance",  value: `$${balance.toFixed(2)}`,             icon: CreditCard,   color: "bg-emerald-50 text-emerald-600" },
            { label: "Total Revenue",      value: `$${totals.total.toFixed(2)}`,         icon: TrendingUp,   color: "bg-blue-50 text-blue-600" },
            { label: "Subscriptions",      value: `$${totals.subscriptions.toFixed(2)}`, icon: CheckCircle2, color: "bg-purple-50 text-purple-600" },
            { label: "Commissions (5%)",   value: `$${totals.commissions.toFixed(2)}`,   icon: CreditCard,   color: "bg-amber-50 text-amber-600" },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
              <div className={`rounded-xl p-2.5 w-fit mb-3 ${card.color}`}>
                <card.icon size={18} />
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                {loading ? <span className="animate-pulse bg-muted rounded h-7 w-20 block" /> : card.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Payout actions - same as other roles */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-2">Bank Accounts</h2>
            <p className="text-sm text-muted-foreground mb-4">Add your bank account to receive withdrawals</p>
            <Button asChild className="w-full gap-2">
              <Link to="/admin/bank-accounts">
                Manage Bank Accounts <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-2">Withdrawals</h2>
            <p className="text-sm text-muted-foreground mb-4">Withdraw your available balance to your bank</p>
            <Button asChild variant="outline" className="w-full gap-2">
              <Link to="/admin/withdrawals">
                Request Withdrawal <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </div>

        {/* Revenue rules */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-3">Revenue Rules</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Subscription payments — 100% admin revenue</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Paid videos, courses, bookings — 5% admin commission</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Providers withdraw their earnings directly</li>
          </ul>
        </div>

        {/* Payment history */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Revenue History</h2>
          </div>
          {payments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No revenue yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Gross</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Admin Share</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="p-3 capitalize">{String(p.payment_type || "payment").replace(/_/g, " ")}</td>
                      <td className="p-3 font-mono">${Number(p.amount || 0).toFixed(2)}</td>
                      <td className="p-3 font-mono text-emerald-600">${getAdminShare(Number(p.amount || 0), p.payment_type).toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          p.status === "completed" || p.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminWallet;
