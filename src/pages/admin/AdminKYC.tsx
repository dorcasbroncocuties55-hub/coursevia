import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldX, Clock, Eye, X, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type KYCRow = {
  id: string;
  user_id: string;
  status: string;
  role?: string;
  inquiry_id?: string;
  provider?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
  profiles?: { full_name?: string; email?: string; kyc_status?: string; is_verified?: boolean };
};

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
};

const AdminKYC = () => {
  const [requests, setRequests] = useState<KYCRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<KYCRow | null>(null);
  const [filter, setFilter]     = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("verification_requests" as any)
      .select("*, profiles!verification_requests_user_id_fkey(full_name, email, kyc_status, is_verified)")
      .order("created_at", { ascending: false });
    if (filter !== "all") (q as any).eq("status", filter);
    const { data } = await q;
    setRequests((data as KYCRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const refreshFromDidit = async (row: KYCRow) => {
    if (!row.inquiry_id) { toast.error("No Didit verification ID found"); return; }
    setRefreshing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/kyc/didit/status/${row.inquiry_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to refresh");
      toast.success(`Status refreshed: ${data.status}`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh from Didit");
    } finally {
      setRefreshing(false);
    }
  };

  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">KYC Verifications</h1>
            <p className="text-muted-foreground mt-1">All verifications are handled automatically by Didit</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <img src="https://didit.me/favicon.ico" alt="Didit" className="h-4 w-4" onError={e => (e.currentTarget.style.display = "none")} />
            <span className="text-xs font-medium text-muted-foreground">Powered by Didit</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                filter === f ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <p className="text-2xl font-bold text-foreground font-mono">{counts[f]}</p>
              <p className="text-xs text-muted-foreground capitalize mt-1">{f === "all" ? "Total" : f}</p>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Verification Requests</h2>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">User</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Provider</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Didit ID</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Submitted</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No verification requests found.</td></tr>
                ) : requests.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{r.profiles?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.profiles?.email || r.user_id.slice(0, 8)}</p>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground capitalize">
                        {r.provider || "didit"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        {r.inquiry_id ? r.inquiry_id.slice(0, 12) + "…" : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"}`}>
                        {r.status === "pending"  && <Clock size={11} />}
                        {r.status === "approved" && <ShieldCheck size={11} />}
                        {r.status === "rejected" && <ShieldX size={11} />}
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelected(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                        >
                          <Eye size={12} /> View
                        </button>
                        {r.inquiry_id && (
                          <button
                            onClick={() => refreshFromDidit(r)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                          >
                            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Sync
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Automated by Didit</p>
              <p className="text-sm text-blue-800 mt-0.5">
                All KYC verifications are automatically processed by Didit. When a user completes verification,
                Didit sends a webhook that updates their status automatically. Use "Sync" to manually refresh
                a specific verification's status from Didit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">Verification Details</h2>
              <button onClick={() => setSelected(null)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">User</p><p className="font-medium">{selected.profiles?.full_name || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{selected.profiles?.email || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Provider</p><p className="font-medium capitalize">{selected.provider || "didit"}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[selected.status] || ""}`}>
                    {selected.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Didit Verification ID</p>
                  <p className="font-mono text-xs mt-0.5 break-all">{selected.inquiry_id || "—"}</p>
                </div>
                {selected.reviewed_at && (
                  <div><p className="text-xs text-muted-foreground">Reviewed</p><p className="font-medium">{new Date(selected.reviewed_at).toLocaleString()}</p></div>
                )}
              </div>

              {selected.rejection_reason && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-semibold">Rejection reason:</p>
                  <p className="mt-1">{selected.rejection_reason}</p>
                </div>
              )}

              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-semibold mb-1">Handled by Didit</p>
                <p>This verification is automatically processed by Didit. The status updates via webhook when Didit completes their review.</p>
              </div>

              {selected.inquiry_id && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => refreshFromDidit(selected)}
                  disabled={refreshing}
                >
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  Sync status from Didit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminKYC;
