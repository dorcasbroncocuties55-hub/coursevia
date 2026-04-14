import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";

type Refund = {
  id: string;
  amount: number;
  reason?: string;
  reject_reason?: string;
  status: string;
  payment_type?: string;
  content_title?: string;
  created_at: string;
  processed_at?: string;
};

const statusConfig = {
  processed: { icon: CheckCircle2, color: "text-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Approved" },
  rejected:  { icon: XCircle,      color: "text-red-500",     badge: "bg-red-50 text-red-600 border-red-200",           label: "Rejected" },
  pending:   { icon: Clock,        color: "text-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200",     label: "Pending" },
};

export const RefundHistory = ({ userId }: { userId: string }) => {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("refunds" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setRefunds((data as Refund[]) || []); setLoading(false); });
  }, [userId]);

  if (loading) return (
    <div className="space-y-2">
      {[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
    </div>
  );

  if (refunds.length === 0) return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <RotateCcw size={28} className="mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">No refund requests yet.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {refunds.map(r => {
        const cfg = statusConfig[r.status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = cfg.icon;
        return (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon size={15} className={cfg.color} />
                <span className="font-semibold text-foreground">${Number(r.amount).toFixed(2)}</span>
                {r.payment_type && (
                  <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-muted">
                    {r.payment_type.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <span className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>

            {r.reason && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Reason:</span> {r.reason}
              </p>
            )}

            {r.status === "rejected" && r.reject_reason && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-100">
                <p className="text-xs text-red-700">
                  <span className="font-medium">Admin note:</span> {r.reject_reason}
                </p>
              </div>
            )}

            {r.status === "processed" && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-700">
                  Refund credited to your wallet{r.processed_at ? ` on ${format(new Date(r.processed_at), "PP")}` : ""}.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Submitted {format(new Date(r.created_at), "PP")}
            </p>
          </div>
        );
      })}
    </div>
  );
};
