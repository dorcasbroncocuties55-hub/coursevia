import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const statusStyle: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  approved:  "bg-emerald-100 text-emerald-700",
  pending:   "bg-amber-100 text-amber-700",
  failed:    "bg-red-100 text-red-700",
  rejected:  "bg-red-100 text-red-700",
};

const LearnerPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("payments").select("*").eq("payer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setPayments(data || []); setLoading(false); });
  }, [user]);

  const total = payments.filter(p => ["completed","approved"].includes(p.status)).reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <DashboardLayout role="learner">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{payments.length} transaction{payments.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Summary */}
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

        {loading ? (
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
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default LearnerPayments;
