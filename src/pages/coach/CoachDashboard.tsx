import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import CoachLayout from "@/components/layouts/CoachLayout";
import {
  useTodayBookings,
  useWallet,
  useConversations,
  fmtTime,
  fmtDate,
  fmt,
  getInitials,
  bookingStatusBadge,
  isToday,
  useProviderBookings,
} from "@/lib/portalEngine";
import { Loader2, ChevronRight, Video, MapPin, FileText } from "lucide-react";

// ── brand tokens ──────────────────────────────────────────────────────────────
const A = "#2D9E6B";
const D = "#0F3D2E";
const B = "#EAE6E2";
const TM = "#1A1A1A";
const TS = "#6B7280";

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, ...style }}>
    {children}
  </div>
);

const SectionHead = ({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
    <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 20, color: D, margin: 0 }}>{title}</h2>
    {link && (
      <Link to={link} style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: A, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
        {linkLabel} <ChevronRight size={14} />
      </Link>
    )}
  </div>
);

const Avatar = ({ name, url, size = 36 }: { name: string | null; url?: string | null; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", background: "#E5E7EB", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
  }}>
    {url
      ? <img src={url} alt={name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: size * 0.33, color: TS }}>
        {getInitials(name)}
      </span>}
  </div>
);

// ── weekday summary ───────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function CoachDashboard() {
  const { user, profile } = useAuth();
  const { data: todayBookings, loading: loadingToday } = useTodayBookings(user?.id);
  const { data: allBookings } = useProviderBookings(user?.id);
  const { data: wallet } = useWallet(user?.id);
  const { data: convs } = useConversations(user?.id);

  const firstName = profile?.full_name?.split(" ")[0] || "Coach";
  const unreadCount = (convs || []).filter(c => (c.unread_count ?? 0) > 0).length;

  // Build this-week summary
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekDays = DAYS.map((d, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const count = (allBookings || []).filter(b => {
      const bd = new Date(b.scheduled_at);
      return bd.toDateString() === date.toDateString();
    }).length;
    const isCurrentDay = date.toDateString() === now.toDateString();
    return { day: d, date: date.getDate(), count, isCurrentDay };
  });

  return (
    <CoachLayout>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: 0 }}>
            Welcome, {firstName}
          </h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, marginTop: 4 }}>
            {loadingToday ? "Loading today's schedule…" : `${todayBookings?.length ?? 0} session${(todayBookings?.length ?? 0) !== 1 ? "s" : ""} scheduled today`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {unreadCount > 0 && (
            <Link to="/therapist/messages" style={{ padding: "5px 12px", borderRadius: 999, background: "#FEF3C7", border: "1px solid #D97706", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: "#92400E", textDecoration: "none" }}>
              {unreadCount} unread message{unreadCount > 1 ? "s" : ""}
            </Link>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, border: "1px solid #166534", background: "#F0FDF4" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#166534" }} />
            <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: "#166534" }}>Active Portal</span>
          </span>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Today", value: todayBookings?.length ?? 0, unit: "sessions" },
          { label: "Wallet", value: wallet ? fmt(wallet.available_balance ?? wallet.balance ?? 0) : "—", unit: "available" },
          { label: "Pending", value: wallet ? fmt(wallet.pending_balance ?? 0) : "—", unit: "clearing" },
        ].map(s => (
          <div key={s.label} style={{ flex: "1 1 140px", background: "#fff", border: `1px solid ${B}`, borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: TS, textTransform: "uppercase", margin: "0 0 6px" }}>{s.label}</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 24, color: A, margin: "0 0 2px" }}>{s.value}</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>{s.unit}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Left column */}
        <div style={{ flex: "1 1 480px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Today's Bookings */}
          <Card>
            <SectionHead title="Today's Bookings" link="/therapist/bookings" linkLabel="View Full Schedule" />
            {loadingToday ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: A }} />
              </div>
            ) : !todayBookings?.length ? (
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, textAlign: "center", padding: "24px 0" }}>No sessions today</p>
            ) : (
              <div>
                {todayBookings.map((b, i) => {
                  const badge = bookingStatusBadge(b.status);
                  const isVirtual = !!b.meeting_url;
                  return (
                    <div key={b.id} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
                      borderBottom: i < todayBookings.length - 1 ? `1px solid ${B}` : "none"
                    }}>
                      <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, width: 76, flexShrink: 0 }}>
                        {fmtTime(b.scheduled_at)}
                      </span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={b.learner?.full_name ?? null} url={b.learner?.avatar_url} />
                        <div>
                          <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, margin: 0 }}>
                            {b.learner?.full_name || "Client"}
                          </p>
                          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>
                            {b.service?.title || "Session"} · {b.duration_minutes}m
                          </p>
                        </div>
                      </div>
                      <span style={{
                        padding: "3px 8px", borderRadius: 6, background: isVirtual ? "#EFF6FF" : "#F0FDF4",
                        fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 10,
                        color: isVirtual ? "#1E40AF" : "#166534", textTransform: "uppercase", flexShrink: 0
                      }}>
                        {isVirtual ? <><Video size={9} style={{ marginRight: 3, display: "inline" }} />Virtual</> : <><MapPin size={9} style={{ marginRight: 3, display: "inline" }} />In-Person</>}
                      </span>
                      <span style={{
                        padding: "3px 8px", borderRadius: 6, background: badge.bg, fontFamily: "Inter,sans-serif",
                        fontWeight: 600, fontSize: 10, color: badge.text, textTransform: "uppercase", flexShrink: 0
                      }}>
                        {badge.label}
                      </span>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <Link to={`/therapist/sessions`}
                          style={{
                            padding: "5px 10px", borderRadius: 6, border: `1px solid ${B}`, background: "#fff",
                            fontFamily: "Inter,sans-serif", fontWeight: 500, fontSize: 11, color: TS, textDecoration: "none"
                          }}>
                          <FileText size={11} style={{ marginRight: 3, display: "inline" }} />Chart
                        </Link>
                        {b.meeting_url && (
                          <a href={`/session/${b.id}`}
                            style={{
                              padding: "5px 10px", borderRadius: 6, border: "none", background: A,
                              fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: "#fff", textDecoration: "none"
                            }}>
                            Start
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent Patients */}
          <div>
            <SectionHead title="Recent Clients Quick-View" link="/coach/clients" linkLabel="See All Clients" />
            {(!allBookings || allBookings.length === 0) ? (
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>No client records yet</p>
            ) : (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {/* Dedupe by learner_id, show last 3 */}
                {Array.from(new Map((allBookings || []).map(b => [b.learner_id, b])).values())
                  .slice(0, 3)
                  .map(b => {
                    const nextSession = (allBookings || [])
                      .filter(x => x.learner_id === b.learner_id && new Date(x.scheduled_at) >= new Date())
                      .sort((a, x) => new Date(a.scheduled_at).getTime() - new Date(x.scheduled_at).getTime())[0];
                    const lastSession = (allBookings || [])
                      .filter(x => x.learner_id === b.learner_id && new Date(x.scheduled_at) < new Date())
                      .sort((a, x) => new Date(x.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];
                    return (
                      <div key={b.learner_id} style={{ flex: "1 1 180px", background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          <Avatar name={b.learner?.full_name ?? null} url={b.learner?.avatar_url} size={42} />
                          <div>
                            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: TM, margin: 0 }}>{b.learner?.full_name || "Client"}</p>
                            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>{b.learner?.email || ""}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 10, color: TS, textTransform: "uppercase", margin: "0 0 2px" }}>Last session</p>
                            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TM, margin: 0 }}>{lastSession ? fmtDate(lastSession.scheduled_at) : "—"}</p>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 10, color: TS, textTransform: "uppercase", margin: "0 0 2px" }}>Next session</p>
                            <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: nextSession ? A : TS, margin: 0 }}>
                              {nextSession ? (isToday(nextSession.scheduled_at) ? `Today, ${fmtTime(nextSession.scheduled_at)}` : fmtDate(nextSession.scheduled_at)) : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Weekly calendar widget */}
          <Card>
            <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 17, color: D, margin: "0 0 16px" }}>Availability (Weekly)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weekDays.map(d => (
                <div key={d.day} style={{
                  background: d.isCurrentDay ? "#F0FDF6" : "#fff",
                  border: `1px solid ${d.isCurrentDay ? "rgba(45,158,107,0.25)" : B}`,
                  borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, textTransform: "uppercase", color: d.isCurrentDay ? A : TS, width: 28 }}>{d.day}</span>
                    <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: d.isCurrentDay ? D : TM }}>{d.date}</span>
                  </div>
                  {d.count > 0
                    ? <span style={{ padding: "2px 8px", borderRadius: 4, background: D, fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 10, color: "#fff" }}>{d.count} sessions</span>
                    : <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: TS }}>Empty</span>}
                </div>
              ))}
            </div>
          </Card>

          {/* Recent messages */}
          <Card>
            <SectionHead title="Messages" link="/therapist/messages" linkLabel="All" />
            {(!convs || convs.length === 0)
              ? <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>No messages yet</p>
              : convs.slice(0, 3).map(c => (
                <Link key={c.id} to="/therapist/messages"
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                    borderBottom: `1px solid ${B}`, textDecoration: "none"
                  }}>
                  <Avatar name={c.other_user?.full_name ?? null} url={c.other_user?.avatar_url} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: TM }}>{c.other_user?.full_name || "Client"}</span>
                      {(c.unread_count ?? 0) > 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: A, flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_message || "…"}</p>
                  </div>
                </Link>
              ))}
          </Card>
        </div>
      </div>
    </CoachLayout>
  );
}
