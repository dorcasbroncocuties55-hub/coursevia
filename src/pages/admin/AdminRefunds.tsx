import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Wallet } from "lucide-react";
import { buildBackendUrl } from "@/lib/backendApi";

type Refund = {
  id: string;
  user_id: string;
  booking_id?: string;
  amount: number;
  reason?: string;
  status: string;
  created_at: string;
  processed_at?: string;
  profiles?: { full_name?: string; email?: string };
};

const statusIcon = (s: string) => {
  if (s === "processed") return <CheckCircle2 size={13} className="text-emerald-500" />;
  if (s === "rejected")  return <XCircle size={13} className="text-red-500" />;
  return <Clock size={13} className="text-amber-500" />;
};

const statusBadge = (s: string) => {
  if (s === "processed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "rejected")  return "bg-red-50 text-red-600 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const AdminRefunds = () => {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

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
      // Use backend endpoint which credits wallet directly
      const res = await fetch(buildBackendUrl("/api/refunds/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message || "Refund approved. Learner wallet credited.");
      await load();
    } catch (e: any) {
      // Fallback to RPC
      try {
        const { error } = await supabase.rpc("approve_refund" as any, { p_refund_id: id });
        if (error) throw error;
        toast.success("Refund approved.");
        await load();
      } catch (e2: any) {
        toast.error(e2.message || e.message || "Failed to approve refund.");
      }
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: string) => {
    setActing(id);
    await supabase.from("refunds" as any).update({ status: "rejected" }).eq("id", id);
    toast.success("Refund rejected.");
    await load();
    setActing(null);
  };

  const pending = refunds.filter((r) => r.status === "pending").length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Refund Requests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Approved refunds are credited directly to the learner's wallet.
            </p>
          </div>
          {pending > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 text-sm font-semibold">
              {pending} pending
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">User</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Reason</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Booking</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : refunds.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No refund requests.</td></tr>
              ) : refunds.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="p-3">
                    <p className="font-medium text-foreground">{r.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.profiles?.email || r.user_id.slice(0, 8)}</p>
                  </td>
                  <td className="p-3 font-mono font-semibold text-foreground">${Number(r.amount).toFixed(2)}</td>
                  <td className="p-3 text-muted-foreground max-w-[180px]">
                    <p className="truncate" title={r.reason}>{r.reason || "—"}</p>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">
                    {r.booking_id ? r.booking_id.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(r.status)}`}>
                      {statusIcon(r.status)} {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.status === "pending" && (
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => approve(r.id)} disabled={acting === r.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-xs gap-1">
                          <Wallet size={11} /> Approve & credit wallet
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject(r.id)} disabled={acting === r.id}
                          className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-2.5 text-xs">
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminRefunds;
