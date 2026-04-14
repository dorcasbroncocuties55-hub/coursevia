import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Wallet, RotateCcw, Loader2 } from "lucide-react";
import { buildBackendUrl } from "@/lib/backendApi";
import { format } from "date-fns";

type Refund = {
  id: string;
  user_id: string;
  booking_id?: string;
  payment_id?: string;
  amount: number;
  reason?: string;
  reject_reason?: string;
  status: string;
  payment_type?: string;
  content_title?: string;
  created_at: string;
  processed_at?: string;
  profiles?: { full_name?: string; email?: string };
};

const statusConfig = {
  processed: { icon: CheckCircle2, badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Approved" },
  rejected:  { icon: XCircle,      badge: "bg-red-50 text-red-600 border-red-200",           label: "Rejected" },
  pending:   { icon: Clock,        badge: "bg-amber-50 text-amber-700 border-amber-200",     label: "Pending" },
};

const AdminRefunds = () => {
  const [refunds, setRefunds]       = useState<Refund[]>([]);
  const [loading, setLoading]       = useState(true);
  const [acting, setActing]         = useState<string | null>(null);
  const [filter, setFilter]         = useState<"all" | "pending" | "processed" | "rejected">("all");
  const [rejectModal, setRejectModal] = useState<Refund | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("refunds" as any)
      .select("*, profiles!refunds_user_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });
    setRefunds((data as Refund[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(buildBackendUrl("/api/refunds/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message || "Refund approved. Wallet credited.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve refund.");
    } finally {
      setActing(null);
    }
  };

  const reject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason."); return; }
    setActing(rejectModal.id);
    try {
      const res = await fetch(buildBackendUrl("/api/refunds/reject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund_id: rejectModal.id, reject_reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Refund rejected.");
      setRejectModal(null);
      setRejectReason("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to reject refund.");
    } finally {
      setActing(null);
    }
  };

  const pending   = refunds.filter(r => r.status === "pending").length;
  const filtered  = filter === "all" ? refunds : refunds.filter(r => r.status === filter);

  const tabs = [
    { key: "all",       label: "All" },
    { key: "pending",   label: `Pending${pending > 0 ? ` (${pending})` : ""}` },
    { key: "processed", label: "Approved" },
    { key: "rejected",  label: "Rejected" },
  ] as const;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Refund Requests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Approved refunds are credited directly to the user's wallet.
            </p>
          </div>
          {pending > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 text-sm font-semibold">
              {pending} pending
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total",    value: refunds.length,                                    color: "text-foreground" },
            { label: "Pending",  value: refunds.filter(r => r.status === "pending").length,   color: "text-amber-600" },
            { label: "Approved", value: refunds.filter(r => r.status === "processed").length, color: "text-emerald-600" },
            { label: "Rejected", value: refunds.filter(r => r.status === "rejected").length,  color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">User</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Reason</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">
                  <Loader2 size={20} className="animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center">
                  <RotateCcw size={28} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No refund requests found.</p>
                </td></tr>
              ) : filtered.map(r => {
                const cfg = statusConfig[r.status as keyof typeof statusConfig] || statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{r.profiles?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.profiles?.email || r.user_id.slice(0, 8)}</p>
                    </td>
                    <td className="p-3 font-mono font-semibold text-foreground">${Number(r.amount).toFixed(2)}</td>
                    <td className="p-3">
                      <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {r.payment_type?.replace(/_/g, " ") || "booking"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[200px]">
                      <p className="truncate text-xs" title={r.reason}>{r.reason || "—"}</p>
                      {r.reject_reason && (
                        <p className="truncate text-xs text-red-500 mt-0.5" title={r.reject_reason}>
                          Rejected: {r.reject_reason}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.created_at), "PP")}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.status === "pending" && (
                        <div className="flex gap-1.5">
                          <Button size="sm" onClick={() => approve(r.id)} disabled={acting === r.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-xs gap-1">
                            {acting === r.id ? <Loader2 size={10} className="animate-spin" /> : <Wallet size={10} />}
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectModal(r); setRejectReason(""); }}
                            disabled={acting === r.id}
                            className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-2.5 text-xs">
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="font-bold text-foreground">Reject Refund Request</h2>
              <p className="text-sm text-muted-foreground mt-1">
                User: <span className="font-medium text-foreground">{rejectModal.profiles?.full_name}</span> —
                Amount: <span className="font-medium text-foreground">${Number(rejectModal.amount).toFixed(2)}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="rejectReason">Rejection reason <span className="text-destructive">*</span></Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this refund is being rejected..."
                rows={4}
                className="resize-none mt-1.5"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={reject} disabled={!!acting}>
                {acting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminRefunds;
