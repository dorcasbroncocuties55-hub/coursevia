import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, isPast, differenceInHours } from "date-fns";
import {
  Calendar, Clock, ExternalLink, MessageSquare, Video,
  MapPin, CheckCircle2, XCircle, Globe, DollarSign, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Role = "coach" | "therapist";
type Mode = "bookings" | "sessions" | "calendar" | "clients";

type BookingRow = {
  id: string;
  learner_id?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  created_at?: string | null;
  meeting_url?: string | null;
  notes?: string | null;
  price?: number | null;
  service_delivery_mode?: string | null;
  duration?: number | null;
  learner_name?: string | null;
  [key: string]: any;
};

const statusStyle: Record<string, string> = {
  pending:          "bg-amber-50 text-amber-700 border-amber-200",
  confirmed:        "bg-blue-50 text-blue-700 border-blue-200",
  completed:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  learner_approved: "bg-green-50 text-green-700 border-green-200",
  cancelled:        "bg-slate-50 text-slate-500 border-slate-200",
  in_progress:      "bg-purple-50 text-purple-700 border-purple-200",
};

const dayLabel = (d: Date) => {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMM d");
};

const ProviderBookingsBoard = ({ role, mode }: { role: Role; mode: Mode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const profileTable  = role === "coach" ? "coach_profiles" : "therapist_profiles";
  const bookingColumn = role === "coach" ? "coach_id" : "therapist_id";

  const load = async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from(profileTable as any).select("id").eq("user_id", user.id).maybeSingle();

      if (!profile?.id) { setBookings([]); return; }

      const { data: rows, error } = await supabase
        .from("bookings").select("*")
        .eq(bookingColumn, profile.id)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;

      const learnerIds = [...new Set((rows || []).map((r) => r.learner_id).filter(Boolean))];
      let nameMap = new Map<string, string>();
      if (learnerIds.length) {
        const { data: profiles } = await supabase
          .from("profiles").select("user_id, full_name").in("user_id", learnerIds);
        (profiles || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name || "Client"));
      }

      setBookings((rows || []).map((r) => ({
        ...r,
        learner_name: nameMap.get(r.learner_id || "") || "Client",
        meeting_url: r.meeting_url || r.meeting_link || r.session_room_url || null,
      })));
    } catch (e: any) {
      toast.error(e?.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, role]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const confirmBooking = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.from("bookings").update({ status: "confirmed" } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Booking confirmed."); await load(); }
    setActingId(null);
  };

  const markComplete = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.from("bookings").update({ status: "completed" } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Session marked complete."); await load(); }
    setActingId(null);
  };

  const cancelBooking = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    setActingId(id);
    const { error } = await supabase.from("bookings").update({ status: "cancelled" } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Booking cancelled."); await load(); }
    setActingId(null);
  };

  const openSession = async (booking: BookingRow) => {
    let url = booking.meeting_url;
    if (!url) {
      url = `https://meet.jit.si/coursevia-${booking.id}`;
      await supabase.from("bookings").update({
        meeting_url: url,
        status: booking.status === "pending" ? "confirmed" : booking.status,
      } as any).eq("id", booking.id);
    }
    navigate(`/session/${booking.id}`);
  };

  const openMessages = (booking: BookingRow) => {
    const id = booking.learner_id;
    if (!id) { toast.error("No client linked to this booking."); return; }
    navigate(`/${role}/messages?user=${id}`);
  };

  // ── Filtered views ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (mode === "sessions")
      return bookings.filter((b) => ["confirmed", "in_progress"].includes(String(b.status || "")));
    if (mode === "calendar")
      return bookings.filter((b) => b.scheduled_at && !["cancelled"].includes(String(b.status || "")));
    return bookings;
  }, [bookings, mode]);

  // Calendar: group by date
  const calendarGroups = useMemo(() => {
    if (mode !== "calendar") return null;
    const groups = new Map<string, BookingRow[]>();
    filtered.forEach((b) => {
      const key = b.scheduled_at ? format(new Date(b.scheduled_at), "yyyy-MM-dd") : "unscheduled";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    });
    return groups;
  }, [filtered, mode]);

  const title = {
    bookings: `${role === "coach" ? "Coach" : "Therapist"} Bookings`,
    sessions: "Live Sessions",
    calendar: "Session Calendar",
    clients:  "Clients",
  }[mode];

  const subtitle = {
    bookings: "Manage all booking requests and confirmed sessions.",
    sessions: "Confirmed sessions ready to start.",
    calendar: "All upcoming appointments by date and time.",
    clients:  "Everyone who has booked with you.",
  }[mode];

  // ── Booking card ───────────────────────────────────────────────────────────
  const BookingCard = ({ b, compact = false }: { b: BookingRow; compact?: boolean }) => {
    const status = String(b.status || "pending").toLowerCase();
    const scheduledAt = b.scheduled_at ? new Date(b.scheduled_at) : null;
    const isOnline = b.service_delivery_mode !== "in_person";
    const isPaid = Number(b.price || 0) > 0;
    const canJoin = scheduledAt && differenceInHours(scheduledAt, new Date()) <= 1 && differenceInHours(scheduledAt, new Date()) >= -2;
    const canConfirm = status === "pending";
    const canComplete = ["confirmed", "in_progress"].includes(status);
    const canCancel = ["pending", "confirmed"].includes(status);

    return (
      <div className={`rounded-2xl border border-border bg-card shadow-sm ${compact ? "p-4" : "p-5"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: info */}
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground truncate">{b.learner_name}</span>
              <span className={`border rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusStyle[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                {status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {scheduledAt && (
                <>
                  <span className="flex items-center gap-1"><Calendar size={13} />{format(scheduledAt, "PPP")}</span>
                  <span className="flex items-center gap-1"><Clock size={13} />{format(scheduledAt, "p")}</span>
                </>
              )}
              <span className="flex items-center gap-1">
                {isOnline ? <Globe size={13} /> : <MapPin size={13} />}
                {isOnline ? "Online" : "In-person"}
              </span>
              {b.duration && <span className="flex items-center gap-1"><Clock size={13} />{b.duration} min</span>}
              {isPaid && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <DollarSign size={13} />${Number(b.price).toFixed(2)}
                </span>
              )}
            </div>

            {b.notes && <p className="text-sm text-muted-foreground line-clamp-2">{b.notes}</p>}
          </div>

          {/* Right: actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {canJoin && isOnline && (
              <Button size="sm" onClick={() => openSession(b)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <Video size={13} /> Join session
              </Button>
            )}
            {!canJoin && isOnline && ["confirmed", "in_progress"].includes(status) && (
              <Button size="sm" variant="outline" onClick={() => openSession(b)} className="gap-1.5">
                <ExternalLink size={13} /> Open room
              </Button>
            )}
            {canConfirm && (
              <Button size="sm" onClick={() => confirmBooking(b.id)} disabled={actingId === b.id}
                className="gap-1.5">
                <CheckCircle2 size={13} />
                {actingId === b.id ? "Confirming…" : "Confirm"}
              </Button>
            )}
            {canComplete && (
              <Button size="sm" variant="outline" onClick={() => markComplete(b.id)} disabled={actingId === b.id}
                className="gap-1.5">
                <CheckCircle2 size={13} />
                {actingId === b.id ? "Saving…" : "Mark complete"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => openMessages(b)} className="gap-1.5 text-muted-foreground">
              <MessageSquare size={13} /> Message
            </Button>
            {canCancel && (
              <Button size="sm" variant="ghost" onClick={() => cancelBooking(b.id)} disabled={actingId === b.id}
                className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50">
                <XCircle size={13} /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Clients view ───────────────────────────────────────────────────────────
  const clientMap = useMemo(() => {
    const map = new Map<string, BookingRow>();
    bookings.forEach((b) => { if (b.learner_id && !map.has(b.learner_id)) map.set(b.learner_id, b); });
    return [...map.values()];
  }, [bookings]);

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground animate-pulse">Loading…</div>
        ) : mode === "clients" ? (
          clientMap.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No clients yet. Bookings will appear here.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clientMap.map((b) => (
                <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{b.learner_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{b.status || "pending"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openMessages(b)}>
                      <MessageSquare size={13} className="mr-1.5" /> Message
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => openSession(b)}>
                      <Video size={13} className="mr-1.5" /> Session
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : mode === "calendar" ? (
          // ── Calendar view: grouped by date ──────────────────────────────
          calendarGroups && calendarGroups.size === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No upcoming appointments scheduled.
            </div>
          ) : (
            <div className="space-y-6">
              {calendarGroups && [...calendarGroups.entries()].map(([dateKey, dayBookings]) => {
                const date = dateKey !== "unscheduled" ? new Date(dateKey) : null;
                const isPassedDay = date ? isPast(date) && !isToday(date) : false;
                return (
                  <div key={dateKey}>
                    <div className={`mb-3 flex items-center gap-3`}>
                      <div className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                        date && isToday(date) ? "bg-primary text-primary-foreground" :
                        date && isTomorrow(date) ? "bg-blue-100 text-blue-700" :
                        isPassedDay ? "bg-slate-100 text-slate-500" :
                        "bg-secondary text-foreground"
                      }`}>
                        {date ? dayLabel(date) : "Unscheduled"}
                      </div>
                      <span className="text-xs text-muted-foreground">{dayBookings.length} session{dayBookings.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="space-y-3 pl-2 border-l-2 border-border ml-2">
                      {dayBookings.map((b) => <BookingCard key={b.id} b={b} compact />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // ── Bookings / Sessions list ────────────────────────────────────
          filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              {mode === "sessions" ? "No confirmed sessions yet." : "No bookings yet."}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => <BookingCard key={b.id} b={b} />)}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProviderBookingsBoard;
