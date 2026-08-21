import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TherapistLayout from "@/components/layouts/TherapistLayout";
import { useProviderBookings, fmtDate, fmtTime, getInitials, bookingStatusBadge, isToday, fmt } from "@/lib/portalEngine";
import { Loader2, Search, MoreHorizontal, FileText, CalendarCheck } from "lucide-react";

const A = "#2D9E6B"; const D = "#0F3D2E"; const B = "#EAE6E2"; const TM = "#1A1A1A"; const TS = "#6B7280";

const Avatar = ({ name, url, size = 36 }: { name: string | null; url?: string | null; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", background: "#E5E7EB", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
  }}>
    {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: size * 0.33, color: TS }}>{getInitials(name)}</span>}
  </div>
);

const FILTERS = ["All Patients", "Active", "New Request", "Inactive"];

export default function TherapistClients() {
  const { user } = useAuth();
  const { data: bookings, loading } = useProviderBookings(user?.id);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Dedupe patients from bookings
  const patientMap = new Map<string, {
    learnerId: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
    lastBooking: typeof bookings extends (infer T)[] | null ? T : never;
    nextBooking: typeof bookings extends (infer T)[] | null ? T : never;
    totalSessions: number;
    status: string;
  }>();

  (bookings || []).forEach(b => {
    const existing = patientMap.get(b.learner_id);
    const bDate = new Date(b.scheduled_at);
    const now = new Date();
    if (!existing) {
      patientMap.set(b.learner_id, {
        learnerId: b.learner_id,
        name: b.learner?.full_name ?? null,
        email: b.learner?.email ?? null,
        avatar: b.learner?.avatar_url ?? null,
        lastBooking: bDate < now ? b : null as any,
        nextBooking: bDate >= now ? b : null as any,
        totalSessions: 1,
        status: b.status === "pending" ? "New Request" : "Active",
      });
    } else {
      existing.totalSessions++;
      if (bDate < now && (!existing.lastBooking || bDate > new Date(existing.lastBooking.scheduled_at))) existing.lastBooking = b;
      if (bDate >= now && (!existing.nextBooking || bDate < new Date(existing.nextBooking.scheduled_at))) existing.nextBooking = b;
    }
  });

  const patients = Array.from(patientMap.values());
  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || (p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
    const matchF = filter === 0 || (filter === 1 && p.status === "Active") || (filter === 2 && p.status === "New Request") || (filter === 3 && p.status === "Inactive");
    return matchQ && matchF;
  });

  const selected = selectedId ? patients.find(p => p.learnerId === selectedId) : filtered[0];

  return (
    <TherapistLayout>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: 0 }}>Patient Directory</h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, marginTop: 4 }}>Manage therapy records, treatment logs, and clinical intake.</p>
        </div>
        <Link to="/therapist/bookings" style={{ padding: "9px 16px", borderRadius: 8, border: `1.5px solid ${A}`, background: "#fff", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: A, textDecoration: "none" }}>
          + New Booking
        </Link>
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#F9F8F6", border: `1px solid ${B}`, borderRadius: 10, flex: "1 1 200px", maxWidth: 320 }}>
          <Search size={15} color={TS} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients…"
            style={{ border: "none", background: "transparent", fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, outline: "none", flex: 1 }} />
        </div>
        {FILTERS.map((f, i) => (
          <button key={f} onClick={() => setFilter(i)}
            style={{
              padding: "5px 14px", borderRadius: 999, border: `1px solid ${i === filter ? A : B}`,
              background: i === filter ? "#F0FDF6" : "#fff", fontFamily: "Inter,sans-serif", fontWeight: 500, fontSize: 12,
              color: i === filter ? D : TS, cursor: "pointer"
            }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader2 size={28} className="animate-spin" style={{ color: A }} /></div>
      ) : (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* Table */}
          <div style={{ flex: "1 1 480px", background: "#fff", border: `1px solid ${B}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 12, padding: "13px 16px", background: "#FBFBF9", borderBottom: `1px solid ${B}` }}>
              {[["Patient Name", 3], ["Next Session", 2], ["Sessions", 1], ["Status", 1.5]].map(([h, f]) => (
                <span key={h as string} style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 11, color: TS, flex: f as number, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {filtered.length === 0
              ? <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, textAlign: "center", padding: 32 }}>No patients found</p>
              : filtered.map((p, i) => {
                const isSelected = (selectedId ?? filtered[0]?.learnerId) === p.learnerId;
                return (
                  <div key={p.learnerId} onClick={() => setSelectedId(p.learnerId)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                      borderBottom: `1px solid ${B}`, background: isSelected ? "#F0FDF6" : "#fff", cursor: "pointer"
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 3 }}>
                      <Avatar name={p.name} url={p.avatar} />
                      <div>
                        <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: TM, margin: 0 }}>{p.name || "Patient"}</p>
                        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: TS, margin: 0 }}>{p.email || ""}</p>
                      </div>
                    </div>
                    <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: p.nextBooking ? A : TS, flex: 2 }}>
                      {p.nextBooking ? (isToday(p.nextBooking.scheduled_at) ? `Today, ${fmtTime(p.nextBooking.scheduled_at)}` : fmtDate(p.nextBooking.scheduled_at)) : "—"}
                    </span>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TM, flex: 1 }}>{p.totalSessions}</span>
                    <div style={{ flex: 1.5 }}>
                      <span style={{
                        padding: "3px 8px", borderRadius: 6,
                        background: p.status === "Active" ? "#F0FDF4" : p.status === "New Request" ? "#EFF6FF" : "#F3F4F6",
                        fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 10,
                        color: p.status === "Active" ? "#166534" : p.status === "New Request" ? "#1E40AF" : TS,
                        textTransform: "uppercase"
                      }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Clinical summary panel */}
          {selected && (
            <div style={{ width: 340, flexShrink: 0, background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 18, color: D, margin: 0 }}>Clinical Summary</h3>
                <MoreHorizontal size={16} color={TS} style={{ cursor: "pointer" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <Avatar name={selected.name} url={selected.avatar} size={56} />
                <div>
                  <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 17, color: TM, margin: 0 }}>{selected.name || "Patient"}</p>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: 0 }}>{selected.totalSessions} sessions · {selected.status}</p>
                </div>
              </div>
              <hr style={{ border: "none", borderTop: `1px solid ${B}`, margin: "0 0 16px" }} />

              {[
                { label: "Last Session", value: selected.lastBooking ? fmtDate(selected.lastBooking.scheduled_at) : "No past sessions" },
                { label: "Next Session", value: selected.nextBooking ? (isToday(selected.nextBooking.scheduled_at) ? `Today, ${fmtTime(selected.nextBooking.scheduled_at)}` : fmtDate(selected.nextBooking.scheduled_at)) : "Not scheduled" },
                { label: "Total Sessions", value: String(selected.totalSessions) },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 12 }}>
                  <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 10, color: TS, textTransform: "uppercase", margin: "0 0 3px" }}>{row.label}</p>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TM, margin: 0 }}>{row.value}</p>
                </div>
              ))}

              <hr style={{ border: "none", borderTop: `1px solid ${B}`, margin: "16px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to="/therapist/sessions" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#F9F8F6", textDecoration: "none" }}>
                  <FileText size={14} color={A} />
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: D }}>View Session Notes</span>
                </Link>
                <Link to="/therapist/bookings" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#F9F8F6", textDecoration: "none" }}>
                  <CalendarCheck size={14} color={A} />
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: D }}>Schedule Next Session</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </TherapistLayout>
  );
}
