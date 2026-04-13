import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flag, CheckCircle2, XCircle, Clock, Wallet } from "lucide-react";
import { buildBackendUrl } from "@/lib/backendApi";

type Report = {
  id: string;
  reporter_id?: string;
  reported_user_id?: string;
  booking_id?: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
};

const statusBadge = (s: string) => {
  if (s === "resolved")  return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "dismissed") return "bg-slate-50 text-slate-500 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports((data as Report[]) || []);
  };

  useEffect(() => { fetchReports(); }, []);

  const resolve = async (id: string, status: string) => {
    setActing(id);
    await supabase.from("reports").update({ status }).eq("id", id);
    toast.success(`Report ${status}.`);
    await fetchReports();
    setActing(null);
  };

  const issueRefundFromReport = async (report: Report) => {
    if (!report.booking_id) {
      toast.error("No booking linked to this report.");
      return;
    }
    setRefundingId(report.id);
    try {
      // Load booking to get learner and amount
      const { data: booking } = await supabase
        .from("bookings")
        .select("learner_id, price")
        .eq("id", report.booking_id)
        .maybeSingle();

      if (!booking?.learner_id) throw new Error("Could not find booking details.");

      // Create a refund record then approve it
      const { data: refund, error: insertErr } = await supabase
        .from("refunds" as any)
        .insert({
          user_id: booking.learner_id,
          booking_id: report.booking_id,
          amount: Number(booking.price || 0),
          reason: `Admin-issued refund from report: ${report.reason}`,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(insertErr.message);

      const res = await fetch(buildBackendUrl("/api/refunds/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund_id: (refund as any).id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);

      // Mark report resolved
      await supabase.from("reports").update({ status: "resolved" }).eq("id", report.id);
      toast.success("Refund issued and learner wallet credited.");
      await fetchReports();
    } catch (e: any) {
      toast.error(e.message || "Could not issue refund.");
    } finally {
      setRefundingId(null);
    }
  };

  const pending = reports.filter((r) => r.status === "pending").length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review user reports. You can issue a refund directly from a report if a booking is linked.
            </p>
          </div>
          {pending > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 text-sm font-semibold">
              {pending} pending
            </span>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <Flag size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No reports yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground capitalize">{r.reason.replaceAll("_", " ")}</p>
                      <span className={`border rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {r.booking_id && <span>Booking: <span className="font-mono">{r.booking_id.slice(0, 8)}…</span></span>}
                      {r.reported_user_id && <span>Reported user: <span className="font-mono">{r.reported_user_id.slice(0, 8)}…</span></span>}
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {r.status === "pending" && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {r.booking_id && (
                        <Button size="sm" onClick={() => issueRefundFromReport(r)} disabled={refundingId === r.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 px-3 text-xs">
                          <Wallet size={12} />
                          {refundingId === r.id ? "Processing…" : "Issue refund"}
                        </Button>
                      )}
                      <Button size="sm" onClick={() => resolve(r.id, "resolved")} disabled={acting === r.id}
                        className="h-8 px-3 text-xs gap-1.5">
                        <CheckCircle2 size={12} /> Resolve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolve(r.id, "dismissed")} disabled={acting === r.id}
                        className="h-8 px-3 text-xs gap-1.5">
                        <XCircle size={12} /> Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminReports;
