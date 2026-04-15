import { PageLoading } from "@/components/LoadingSpinner";`nimport DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, TrendingUp, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { RefundRequestModal } from "@/components/shared/RefundRequestModal";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { RefundHistory } from "@/components/shared/RefundHistory";

const statusStyle: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  approved:  "bg-emerald-100 text-emerald-700",
  success:   "bg-emerald-100 text-emerald-700",
  pending:   "bg-amber-100 text-amber-700",
  failed:    "bg-red-100 text-red-700",
  rejected:  "bg-red-100 text-red-700",
};

const isRefundable = (p: any) => {
  if (!["completed", "approved", "success"].includes(p.status)) return false;
  if (p.payment_type === "subscription") return false;
  const paid = new Date(p.created_at);
  const windowEnd = new Date(paid.getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Date() < windowEnd;
};

const LearnerPayments = () => {
  const { user , loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"payments" | "refunds">("payments");
  const [refundModal, setRefundModal] = useState<any | null>(null);
  const [existingRefunds, setExistingRefunds] = useState<Set<string>>(new Set());

  const load = async () => {
        const [{ data: pays }, { data: refs }] = await Promise.all([
      supabase.from("payments").select("*").eq("payer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("refunds" as any).select("payment_id").eq("user_id", user.id).in("status", ["pending", "processed"]),
    ]);
    setPayments(pays || []);
    setExistingRefunds(new Set((refs || []).map((r: any) => r.payment_id).filter(Boolean)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const total = payments.filter(p => ["completed", "approved", "success"].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const tabs = [
    { key: "payments", label: "Payment History" },
    { key: "refunds",  label: "Refund Requests" },
  ] as const;

  return (
    <DashboardLayout role="learner">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your payments and refund requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={15} className="text-primary" />
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </div>
            <p className="text-2xl font-bold text-foreground">${total.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={15} className="text-primary" />
              <p className="text-sm text-muted-foreground">Transactions</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{payments.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "refunds" ? (
          <RefundHistory userId={user?.id || ""} />
        ) : loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <CreditCard size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No payment history yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Method</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => {
                    const canRefund = isRefundable(p) && !existingRefunds.has(p.id);
                    const hasRefund = existingRefunds.has(p.id);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="p-4 text-muted-foreground">{format(new Date(p.created_at), "PP")}</td>
                        <td className="p-4 capitalize font-medium">{String(p.payment_type || "payment").replace(/_/g, " ")}</td>
                        <td className="p-4 font-mono font-semibold">${Number(p.amount || 0).toFixed(2)}</td>
                        <td className="p-4 text-muted-foreground capitalize">{p.payment_method || "—"}</td>
                        <td className="p-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyle[p.status] || "bg-muted text-muted-foreground"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {hasRefund ? (
                            <span className="text-xs text-amber-600 font-medium">Requested</span>
                          ) : canRefund ? (
                            <Button size="sm" variant="outline" onClick={() => setRefundModal(p)}
                              className="h-7 px-2.5 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                              <RotateCcw size={11} /> Request
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {refundModal && user && (
        <RefundRequestModal
          paymentId={refundModal.id}
          userId={user.id}
          amount={refundModal.amount}
          paymentType={refundModal.payment_type}
          onSuccess={() => { setRefundModal(null); load(); setTab("refunds"); }}
          onClose={() => setRefundModal(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default LearnerPayments;

