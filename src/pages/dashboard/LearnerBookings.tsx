/**
 * LearnerBookings — shows the learner's past and upcoming bookings.
 * Includes refund request button that triggers the court room ban pipeline.
 */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RefundRequestModal from "@/components/refunds/RefundRequestModal";
import { Loader2, Video, MapPin, ExternalLink, RotateCcw } from "lucide-react";

interface Booking {
  id: string;
  scheduled_at: string;
  status: string | null;
  duration_minutes: number;
  meeting_url: string | null;
  notes: string | null;
  coach_id: string;
  provider?: { full_name: string | null; avatar_url: string | null } | null;
  service?: { title: string; price: number } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function isUpcoming(iso: string) { return new Date(iso) >= new Date(); }

const statusBadge = (s: string | null) => {
  switch ((s || "pending").toLowerCase()) {
    case "confirmed": return { bg: "#EFF6FF", text: "#1E40AF", label: "Confirmed" };
    case "completed": return { bg: "#F0FDF4", text: "#166534", label: "Completed" };
    case "cancelled": return { bg: "#FEF2F2", text: "#991B1B", label: "Cancelled" };
    default:          return { bg: "#FEF3C7", text: "#92400E", label: "Pending"   };
  }
};

export default function LearnerBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(`
          *,
          provider:profiles!bookings_coach_id_fkey(full_name, avatar_url),
          service:coach_services(title, price)
        `)
        .eq("learner_id", user.id)
        .order("scheduled_at", { ascending: false });
      setBookings((data as any) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const visible = bookings.filter(b =>
    tab === "upcoming" ? isUpcoming(b.scheduled_at) : !isUpcoming(b.scheduled_at)
  );

  // Can request refund: booking is past + completed + not already refunded
  const canRefund = (b: Booking) =>
    !isUpcoming(b.scheduled_at) &&
    b.status !== "cancelled" &&
    b.status !== "refunded";

  return (
    <DashboardLayout role="learner">
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your sessions and request refunds if needed.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {(["upcoming", "past"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition capitalize -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t} ({bookings.filter(b => t === "upcoming" ? isUpcoming(b.scheduled_at) : !isUpcoming(b.scheduled_at)).length})
            </button>
          ))}
        </div>

        {loading
          ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
          : visible.length === 0
            ? <div className="text-center py-16 text-muted-foreground">No {tab} bookings</div>
            : <div className="space-y-3">
                {visible.map(b => {
                  const badge = statusBadge(b.status);
                  const isVirtual = !!b.meeting_url;
                  const upcoming = isUpcoming(b.scheduled_at);
                  return (
                    <div key={b.id} className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground overflow-hidden shrink-0">
                            {(b.provider as any)?.avatar_url
                              ? <img src={(b.provider as any).avatar_url} className="w-full h-full object-cover" alt="" />
                              : ((b.provider as any)?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{(b.provider as any)?.full_name || "Provider"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{(b.service as any)?.title || "Session"} · {b.duration_minutes}min</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {isVirtual ? <Video size={11} /> : <MapPin size={11} />}
                              <span>{fmtDate(b.scheduled_at)} at {fmtTime(b.scheduled_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.text }}>{badge.label}</span>

                          {upcoming && b.meeting_url && (
                            <a href={`/session/${b.id}`}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
                              target="_blank" rel="noopener noreferrer">
                              <ExternalLink size={11} /> Join Session
                            </a>
                          )}

                          {canRefund(b) && (
                            <button onClick={() => setRefundTarget(b)}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition">
                              <RotateCcw size={11} /> Request Refund
                            </button>
                          )}
                        </div>
                      </div>

                      {b.notes && !b.notes.startsWith("{") && (
                        <p className="mt-3 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">{b.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>}
      </div>

      {/* Refund modal */}
      {refundTarget && (
        <RefundRequestModal
          bookingId={refundTarget.id}
          providerName={(refundTarget.provider as any)?.full_name || "Provider"}
          serviceName={(refundTarget.service as any)?.title || "Session"}
          amount={(refundTarget.service as any)?.price || 0}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => {
            // Update booking status locally
            setBookings(bs => bs.map(b =>
              b.id === refundTarget.id ? { ...b, status: "refund_pending" } : b
            ));
          }}
        />
      )}
    </DashboardLayout>
  );
}
