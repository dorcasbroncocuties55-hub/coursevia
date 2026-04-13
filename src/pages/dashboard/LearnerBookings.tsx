import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInHours } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Video, MapPin, Clock, CheckCircle2, AlertTriangle, Flag, RefreshCw } from "lucide-react";
import { buildBackendUrl } from "@/lib/backendApi";

const statusTone: Record<string, string> = {
  pending:           "bg-amber-50 text-amber-700 border-amber-200",
  confirmed:         "bg-blue-50 text-blue-700 border-blue-200",
  completed:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  learner_approved:  "bg-green-50 text-green-700 border-green-200",
  cancelled:         "bg-slate-50 text-slate-500 border-slate-200",
};

type Booking = {
  id: string;
  status: string;
  scheduled_at?: string;
  notes?: string;
  price?: number;
  service_delivery_mode?: string;
  coach_profiles?: { profiles?: { full_name?: string } };
  payment_created_at?: string;
};

type RefundModal = { bookingId: string; amount: number } | null;
type ReportModal = { bookingId: string; providerId?: string } | null;

const LearnerBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refundModal, setRefundModal] = useState<RefundModal>(null);
  const [reportModal, setReportModal] = useState<ReportModal>(null);
  const [refundReason, setRefundReason] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select("*, coach_profiles(*, profiles(*))")
      .eq("learner_id", user.id)
      .order("created_at", { ascending: false });
    setBookings((data as Booking[]) || []);
  };

  useEffect(() => { loadBookings(); }, [user]);

  const handleApproveCompletion = async (bookingId: string) => {
    try {
      setApprovingId(bookingId);
      const { error } = await supabase.rpc("approve_booking_completion", { p_booking_id: bookingId } as any);
      if (error) {
        const fallback = await supabase.from("bookings").update({ status: "learner_approved" } as any)
          .eq("id", bookingId).eq("learner_id", user?.id || "");
        if (fallback.error) throw error;
      }
      toast.success("Session approved. Provider earnings enter the 8-day pending window.");
      await loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Could not approve this booking.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm("Cancel this booking? This cannot be undone.")) return;
    setCancellingId(bookingId);
    try {
      await supabase.from("bookings").update({ status: "cancelled" } as any)
        .eq("id", bookingId).eq("learner_id", user?.id || "");
      toast.success("Booking cancelled.");
      await loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundModal || !refundReason.trim()) {
      toast.error("Please provide a reason for the refund.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(buildBackendUrl("/api/refunds/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: refundModal.bookingId, user_id: user?.id, reason: refundReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message || "Refund request submitted.");
      setRefundModal(null);
      setRefundReason("");
    } catch (e: any) {
      toast.error(e.message || "Could not submit refund request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportModal || !reportReason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(buildBackendUrl("/api/reports/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter_id: user?.id,
          reported_user_id: reportModal.providerId,
          booking_id: reportModal.bookingId,
          reason: reportReason,
          description: reportDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message || "Report submitted.");
      setReportModal(null);
      setReportReason("");
      setReportDesc("");
    } catch (e: any) {
      toast.error(e.message || "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  // Refund eligibility: 2 days after payment AND 1 day before session
  const isRefundEligible = (b: Booking) => {
    if (!["confirmed", "pending"].includes(b.status)) return false;
    const now = new Date();
    const paidAt = b.payment_created_at ? new Date(b.payment_created_at) : null;
    const scheduledAt = b.scheduled_at ? new Date(b.scheduled_at) : null;
    if (paidAt && now < new Date(paidAt.getTime() + 2 * 24 * 60 * 60 * 1000)) return false;
    if (scheduledAt && now > new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)) return false;
    return true;
  };

  const canJoinSession = (b: Booking) => {
    if (!["confirmed", "completed"].includes(b.status)) return false;
    if (!b.scheduled_at) return false;
    const diff = differenceInHours(new Date(b.scheduled_at), new Date());
    return diff <= 1 && diff >= -2; // 1hr before to 2hrs after
  };

  return (
    <DashboardLayout role="learner">
      <h1 className="mb-6 text-2xl font-bold text-foreground">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No bookings yet.</p>
          <a href="/coaches" className="mt-2 inline-block text-sm text-primary hover:underline">Find a coach</a>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const providerName = (b as any).coach_profiles?.profiles?.full_name || "Provider";
            const status = b.status || "pending";
            const canApprove = ["completed", "session_finished", "awaiting_learner_approval"].includes(status);
            const isOnline = b.service_delivery_mode !== "in_person";
            const sessionJoinable = canJoinSession(b);
            const refundEligible = isRefundEligible(b);
            const cancellable = ["pending", "confirmed"].includes(status);

            return (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{providerName}</p>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusTone[status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {b.scheduled_at ? format(new Date(b.scheduled_at), "PPP p") : "Schedule pending"}
                      </span>
                      <span className="flex items-center gap-1">
                        {isOnline ? <Video size={13} /> : <MapPin size={13} />}
                        {isOnline ? "Online" : "In-person"}
                      </span>
                      {b.price ? <span className="font-medium text-foreground">${Number(b.price).toFixed(2)}</span> : null}
                    </div>
                    {b.notes && <p className="text-sm text-muted-foreground">{b.notes}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {sessionJoinable && isOnline && (
                      <a href={`/session/${b.id}`} target="_blank" rel="noreferrer">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                          <Video size={13} /> Join session
                        </Button>
                      </a>
                    )}

                    {canApprove && (
                      <Button size="sm" onClick={() => handleApproveCompletion(b.id)} disabled={approvingId === b.id}
                        className="gap-1.5">
                        <CheckCircle2 size={13} />
                        {approvingId === b.id ? "Approving…" : "Approve session"}
                      </Button>
                    )}

                    {refundEligible && (
                      <Button size="sm" variant="outline" onClick={() => setRefundModal({ bookingId: b.id, amount: Number(b.price || 0) })}
                        className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                        <RefreshCw size={13} /> Request refund
                      </Button>
                    )}

                    {cancellable && (
                      <Button size="sm" variant="outline" onClick={() => handleCancel(b.id)} disabled={cancellingId === b.id}
                        className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                        {cancellingId === b.id ? "Cancelling…" : "Cancel"}
                      </Button>
                    )}

                    <Button size="sm" variant="ghost" onClick={() => setReportModal({ bookingId: b.id, providerId: (b as any).coach_profiles?.user_id })}
                      className="gap-1.5 text-muted-foreground hover:text-red-600">
                      <Flag size={13} /> Report
                    </Button>
                  </div>
                </div>

                {status === "learner_approved" && (
                  <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
                    Session approved. Provider earnings are in the 8-day pending window before payout.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Refund modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Request a refund</h2>
            <p className="text-sm text-slate-500 mb-4">
              Amount: <strong>${refundModal.amount.toFixed(2)}</strong>. Your request will be reviewed by our team within 24–48 hours. If approved, the amount is credited to your wallet.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  placeholder="Describe why you're requesting a refund…"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0b7e84] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleRefundSubmit} disabled={submitting} className="flex-1">
                  {submitting ? "Submitting…" : "Submit request"}
                </Button>
                <Button variant="outline" onClick={() => { setRefundModal(null); setRefundReason(""); }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-red-500" />
              <h2 className="text-lg font-bold text-slate-900">Report an issue</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Our team will review your report and take appropriate action.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0b7e84]"
                >
                  <option value="">Select a reason</option>
                  <option value="no_show">Provider did not show up</option>
                  <option value="inappropriate_behaviour">Inappropriate behaviour</option>
                  <option value="wrong_service">Service not as described</option>
                  <option value="technical_issue">Technical issue during session</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Details (optional)</label>
                <textarea
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  rows={3}
                  placeholder="Provide any additional details…"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0b7e84] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleReportSubmit} disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  {submitting ? "Submitting…" : "Submit report"}
                </Button>
                <Button variant="outline" onClick={() => { setReportModal(null); setReportReason(""); setReportDesc(""); }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default LearnerBookings;
