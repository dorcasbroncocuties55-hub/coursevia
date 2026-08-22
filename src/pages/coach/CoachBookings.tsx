import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import CoachLayout from "@/components/layouts/CoachLayout";
import { useProviderBookings, fmtDate, fmtTime, getInitials, bookingStatusBadge, isToday } from "@/lib/portalEngine";
import { Loader2, ChevronLeft, ChevronRight, Video, MapPin, ExternalLink } from "lucide-react";

const A = "#2D9E6B", D = "#0F3D2E", B = "#EAE6E2", TM = "#1A1A1A", TS = "#6B7280";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const STATUS_FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

const Av = ({ name, url, size = 34 }: { name: string | null; url?: string | null; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: "#E5E7EB", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: size * 0.33, color: TS }}>{getInitials(name)}</span>}
  </div>
);

export default function CoachBookings() {
  const { user } = useAuth();
  const { data: bookings, loading } = useProviderBookings(user?.id);
  const [weekOffset, setWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState(0);

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);

  const weekDays = DAYS.map((d, i) => {
    const date = new Date(monday); date.setDate(monday.getDate() + i);
    const count = (bookings || []).filter(b => new Date(b.scheduled_at).toDateString() === date.toDateString()).length;
    return { day: d, date: date.getDate(), fullDate: date, count, isCurrentDay: date.toDateString() === now.toDateString() };
  });

  const weekStart = weekDays[0].fullDate;
  const weekEnd = new Date(weekDays[4].fullDate.getTime() + 86399999);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const visibleBookings = (bookings || [])
    .filter(b => {
      const bd = new Date(b.scheduled_at);
      const inWeek = bd >= weekStart && bd <= weekEnd;
      const matchStatus = statusFilter === 0 || b.status?.toLowerCase() === STATUS_FILTERS[statusFilter].toLowerCase();
      return inWeek && matchStatus;
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const pendingRequests = (bookings || []).filter(b => b.status === "pending").slice(0, 3);

  return (
    <CoachLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: 0 }}>Scheduler & Books</h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, marginTop: 4 }}>Manage your calendar, client bookings, and virtual sessions.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Weekly grid + list */}
        <div style={{ flex: "1 1 480px", background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24 }}>
          {/* Week nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 20, color: D, margin: 0 }}>Weekly Grid ({weekLabel})</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ChevronLeft size={15} color={TS} /></button>
              <button onClick={() => setWeekOffset(0)} style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${B}`, background: "#fff", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: TM, cursor: "pointer" }}>Today</button>
              <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ChevronRight size={15} color={TS} /></button>
            </div>
          </div>

          {/* Day columns */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {weekDays.map(d => (
              <div key={d.day} style={{ flex: 1, background: d.isCurrentDay ? "#F0FDF6" : "#fff", border: `1px solid ${d.isCurrentDay ? "rgba(45,158,107,0.25)" : B}`, borderRadius: 10, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 10, textTransform: "uppercase", color: d.isCurrentDay ? A : TS }}>{d.day}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: d.isCurrentDay ? D : TM }}>{d.date}</span>
                {d.count > 0
                  ? <span style={{ padding: "2px 6px", borderRadius: 4, background: D, fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 9, color: "#fff" }}>{d.count}</span>
                  : <span style={{ fontFamily: "Inter,sans-serif", fontSize: 9, color: TS }}>Off</span>}
              </div>
            ))}
          </div>

          <hr style={{ border: "none", borderTop: `1px solid ${B}`, marginBottom: 14 }} />

          {/* Status filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((f, i) => (
              <button key={f} onClick={() => setStatusFilter(i)} style={{ padding: "4px 12px", borderRadius: 999, border: `1px solid ${i === statusFilter ? A : B}`, background: i === statusFilter ? "#F0FDF6" : "#fff", fontFamily: "Inter,sans-serif", fontWeight: 500, fontSize: 11, color: i === statusFilter ? D : TS, cursor: "pointer" }}>{f}</button>
            ))}
          </div>

          {loading
            ? <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Loader2 size={24} className="animate-spin" style={{ color: A }} /></div>
            : visibleBookings.length === 0
              ? <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, textAlign: "center", padding: 24 }}>No bookings this week</p>
              : visibleBookings.map(b => {
                const badge = bookingStatusBadge(b.status);
                const isVirtual = !!b.meeting_url;
                return (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "#FBFBF9", borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ width: 74, flexShrink: 0 }}>
                      <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: D, margin: 0 }}>{isToday(b.scheduled_at) ? "Today" : fmtDate(b.scheduled_at)}</p>
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>{fmtTime(b.scheduled_at)}</p>
                    </div>
                    <Av name={b.learner?.full_name ?? null} url={b.learner?.avatar_url} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, margin: 0 }}>{b.learner?.full_name || "Client"}</p>
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        {isVirtual ? <Video size={9} /> : <MapPin size={9} />}
                        {b.service?.title || "Session"} · {b.duration_minutes}m
                      </p>
                    </div>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: badge.bg, fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 10, color: badge.text, textTransform: "uppercase", flexShrink: 0 }}>{badge.label}</span>
                    {b.meeting_url && b.status !== "cancelled" && (
                      <a href={`/session/${b.id}`} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "none", background: A, fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: "#fff", textDecoration: "none", flexShrink: 0 }}>
                        <ExternalLink size={10} /> Start
                      </a>
                    )}
                  </div>
                );
              })}
        </div>

        {/* Right panel */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Booking requests */}
          <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: D, margin: "0 0 14px" }}>Booking Requests Queue</h3>
            {pendingRequests.length === 0
              ? <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>No pending requests</p>
              : pendingRequests.map(b => (
                <div key={b.id} style={{ background: "#F9F8F6", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TM }}>{b.learner?.full_name || "Client"}</span>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS }}>New</span>
                  </div>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: "0 0 8px" }}>
                    {b.service?.title || "Session"} on {fmtDate(b.scheduled_at)} at {fmtTime(b.scheduled_at)}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#FEE2E2", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: "#991B1B", cursor: "pointer" }}>Decline</button>
                    <button style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#F0FDF4", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: "#166534", cursor: "pointer" }}>Confirm</button>
                  </div>
                </div>
              ))}
          </div>

          {/* This week stats */}
          <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: D, margin: "0 0 14px" }}>This Week</h3>
            {[
              { label: "Total", value: visibleBookings.length },
              { label: "Confirmed", value: (bookings || []).filter(b => { const d = new Date(b.scheduled_at); return d >= weekStart && d <= weekEnd && b.status === "confirmed"; }).length },
              { label: "Completed", value: (bookings || []).filter(b => { const d = new Date(b.scheduled_at); return d >= weekStart && d <= weekEnd && b.status === "completed"; }).length },
              { label: "Pending", value: (bookings || []).filter(b => { const d = new Date(b.scheduled_at); return d >= weekStart && d <= weekEnd && b.status === "pending"; }).length },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${B}` }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>{s.label}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CoachLayout>
  );
}
