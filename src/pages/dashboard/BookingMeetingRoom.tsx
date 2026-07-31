import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, MessageSquare, ShieldCheck, Video, Clock, CheckCircle2, Globe, MapPin } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

const BookingMeetingRoom = () => {
  const { bookingId } = useParams();
  const { primaryRole, user } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const layoutRole = useMemo(() => {
    if (["coach", "therapist", "creator", "admin"].includes(primaryRole || "")) return primaryRole as any;
    return "learner" as const;
  }, [primaryRole]);

  const isProvider = ["coach", "therapist"].includes(layoutRole);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      setLoading(true);
      const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
      if (error) { toast.error(error.message); setLoading(false); return; }
      if (!data) { setLoading(false); return; }

      const meetingUrl = (data as any).meeting_url || (data as any).meeting_link || `https://meet.jit.si/coursevia-${data.id}`;
      if (!(data as any).meeting_url) {
        await supabase.from("bookings").update({
          meeting_url: meetingUrl,
          status: data.status === "pending" ? "confirmed" : data.status,
        } as any).eq("id", data.id);
      }
      setBooking({ ...data, meeting_url: meetingUrl });
      setLoading(false);
    };
    load();
  }, [bookingId]);

  const handleMarkComplete = async () => {
    if (!booking) return;
    setMarking(true);
    const { error } = await supabase.from("bookings").update({ status: "completed" } as any).eq("id", booking.id);
    if (error) toast.error(error.message);
    else { toast.success("Session marked complete. Learner will be asked to approve."); setBooking({ ...booking, status: "completed" }); }
    setMarking(false);
  };

  const openMessage = () => {
    if (!booking) return;
    const otherId = isProvider ? booking.learner_id : (booking.coach_id || booking.provider_id);
    if (!otherId) { toast.error("Messaging not available for this booking."); return; }
    const base = isProvider ? `/${layoutRole}/messages` : "/dashboard/messages";
    window.location.href = `${base}?user=${otherId}`;
  };

  const scheduledAt = booking?.scheduled_at ? new Date(booking.scheduled_at) : null;
  const minsUntil = scheduledAt ? differenceInMinutes(scheduledAt, new Date()) : null;
  const isOnline = booking?.service_delivery_mode !== "in_person";

  const sessionStatus = useMemo(() => {
    if (!scheduledAt) return null;
    if (minsUntil !== null && minsUntil > 60) return { label: `Starts in ${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`, color: "text-muted-foreground" };
    if (minsUntil !== null && minsUntil > 0) return { label: `Starting in ${minsUntil} min`, color: "text-amber-600 font-semibold" };
    if (minsUntil !== null && minsUntil >= -120) return { label: "Session in progress", color: "text-emerald-600 font-semibold" };
    return { label: "Session time has passed", color: "text-muted-foreground" };
  }, [minsUntil]);

  return (
    <DashboardLayout role={layoutRole}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck size={14} /> Secure session room
            </div>
            <h1 className="text-2xl font-bold text-foreground">Session Room</h1>
            {sessionStatus && (
              <p className={`mt-1 text-sm ${sessionStatus.color}`}>
                <Clock size={13} className="inline mr-1" />{sessionStatus.label}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={openMessage}>
              <MessageSquare size={14} className="mr-1.5" /> Message
            </Button>
            {booking?.meeting_url && (
              <Button variant="outline" size="sm" onClick={() => window.open(booking.meeting_url, "_blank", "noopener,noreferrer")}>
                <ExternalLink size={14} className="mr-1.5" /> Open in new tab
              </Button>
            )}
            {isProvider && booking?.status === "confirmed" && (
              <Button size="sm" onClick={handleMarkComplete} disabled={marking}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <CheckCircle2 size={14} />
                {marking ? "Saving…" : "Mark session complete"}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground animate-pulse">Loading session…</div>
        ) : !booking ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Booking not found.</div>
        ) : (
          <>
            {/* Info cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Schedule</p>
                <p className="font-semibold text-foreground">
                  {scheduledAt ? format(scheduledAt, "PPP") : "Flexible"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {scheduledAt ? format(scheduledAt, "p") : "Join when ready"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Session type</p>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  {isOnline ? <><Globe size={14} /> Online</> : <><MapPin size={14} /> In-person</>}
                </p>
                <p className="text-sm text-muted-foreground capitalize">{booking.status || "confirmed"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Room</p>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Video size={14} /> Live room ready
                </p>
                <p className="text-sm text-muted-foreground">Camera & mic required</p>
              </div>
            </div>

            {/* In-person notice */}
            {!isOnline ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                <p className="font-semibold mb-1">In-person session</p>
                <p>This session is scheduled to take place in person. No video room is needed. Use the message button to coordinate location details with your {isProvider ? "client" : "provider"}.</p>
              </div>
            ) : (
              /* Video iframe */
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <iframe
                  title="Coursevia Session Room"
                  src={booking.meeting_url}
                  allow="camera; microphone; fullscreen; display-capture"
                  className="h-[76vh] w-full"
                />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BookingMeetingRoom;
