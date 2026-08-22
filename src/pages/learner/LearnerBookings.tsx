/**
 * LearnerBookings - Manage therapy/coaching session bookings
 * Features: Upcoming/Past/Cancelled tabs, calendar view, join meeting links
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAsync } from "@/lib/portalEngine";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Video, Clock, MapPin, X, RefreshCcw } from "lucide-react";

// ── Coursevia brand tokens ────────────────────────────────────────────────────
const A = "#2D9E6B";  // Primary
const D = "#0F3D2E";  // Dark
const B = "#EAE6E2";  // Border
const TS = "#6B7280"; // Text secondary

// ── Types ─────────────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  meeting_url: string | null;
  coach_id: string;
  coach_name: string;
  coach_avatar: string | null;
  service_title: string;
  service_price: number;
  created_at: string;
}

// ── Data Hook ─────────────────────────────────────────────────────────────────
function useLearnerBookings(userId: string | undefined) {
  return useAsync<Booking[]>(async () => {
    if (!userId) return [];

    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        status,
        notes,
        meeting_url,
        coach_id,
        service_id,
        created_at,
        coach_services (title, price),
        profiles!bookings_coach_id_fkey (full_name, avatar_url)
      `)
      .eq("learner_id", userId)
      .order("scheduled_at", { ascending: false });

    if (!bookings) return [];

    return bookings.map((b: any) => ({
      id: b.id,
      scheduled_at: b.scheduled_at,
      duration_minutes: b.duration_minutes,
      status: b.status || "confirmed",
      notes: b.notes,
      meeting_url: b.meeting_url,
      coach_id: b.coach_id,
      coach_name: b.profiles?.full_name || "Coach",
      coach_avatar: b.profiles?.avatar_url,
      service_title: b.coach_services?.title || "Session",
      service_price: b.coach_services?.price || 0,
      created_at: b.created_at,
    }));
  }, [userId]);
}

// ── Components ────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    confirmed: { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" },
    completed: { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF" },
    cancelled: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
    pending: { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" },
  };

  const style = styles[status] || styles.pending;

  return (
    <span style={{
      padding: "4px 10px",
      borderRadius: 6,
      background: style.bg,
      border: `1px solid ${style.border}`,
      fontFamily: "Inter,sans-serif",
      fontSize: 11,
      fontWeight: 600,
      color: style.text,
      textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
};

const BookingCard = ({ booking }: { booking: Booking }) => {
  const scheduledDate = new Date(booking.scheduled_at);
  const now = new Date();
  const isPast = scheduledDate < now;
  const isUpcoming = !isPast && booking.status === "confirmed";
  const canJoin = isUpcoming && booking.meeting_url && 
    scheduledDate.getTime() - now.getTime() < 15 * 60 * 1000; // Can join 15 min before

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${B}`,
      borderRadius: 16,
      padding: 20,
      transition: "box-shadow 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          {/* Coach Avatar */}
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E5E7EB", flexShrink: 0, overflow: "hidden" }}>
            {booking.coach_avatar ? (
              <img src={booking.coach_avatar} alt={booking.coach_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 20, color: TS }}>
                {booking.coach_name.charAt(0)}
              </div>
            )}
          </div>

          {/* Session Info */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: D, margin: "0 0 4px" }}>
              {booking.service_title}
            </h3>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: "0 0 6px" }}>
              with {booking.coach_name}
            </p>
            <StatusBadge status={booking.status} />
          </div>
        </div>

        {/* Price */}
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 20, fontWeight: 700, color: D, margin: 0 }}>
            ${booking.service_price.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Date & Time */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={16} style={{ color: A }} />
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>
            {scheduledDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={16} style={{ color: A }} />
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>
            {scheduledDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} • {booking.duration_minutes} min
          </span>
        </div>
        {booking.meeting_url && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Video size={16} style={{ color: A }} />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS }}>
              Online Session
            </span>
          </div>
        )}
      </div>

      {/* Notes */}
      {booking.notes && (
        <div style={{ padding: 12, borderRadius: 8, background: "#F9FAFB", marginBottom: 16 }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: 0 }}>
            <strong style={{ color: D }}>Notes:</strong> {booking.notes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canJoin && (
          <a 
            href={booking.meeting_url!} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: A,
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: "#fff",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Video size={16} />
            Join Meeting
          </a>
        )}
        {isUpcoming && !canJoin && (
          <button 
            disabled
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: "#E5E7EB",
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: TS,
              border: "none",
              cursor: "not-allowed",
            }}
          >
            Join Available 15 min Before
          </button>
        )}
        {booking.status === "confirmed" && !isPast && (
          <button 
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: "#fff",
              border: `1px solid ${B}`,
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: TS,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={() => {/* TODO: Implement reschedule */}}
          >
            <RefreshCcw size={14} />
            Reschedule
          </button>
        )}
        {booking.status === "confirmed" && !isPast && (
          <button 
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: "#991B1B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={() => {/* TODO: Implement cancel */}}
          >
            <X size={14} />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function LearnerBookings() {
  const { user } = useAuth();
  const { data: bookings, loading } = useLearnerBookings(user?.id);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  const now = new Date();
  
  const upcomingBookings = bookings?.filter(b => 
    new Date(b.scheduled_at) >= now && b.status === "confirmed"
  ) || [];
  
  const pastBookings = bookings?.filter(b => 
    new Date(b.scheduled_at) < now && b.status !== "cancelled"
  ) || [];
  
  const cancelledBookings = bookings?.filter(b => 
    b.status === "cancelled"
  ) || [];

  const displayedBookings = activeTab === "upcoming" ? upcomingBookings :
                            activeTab === "past" ? pastBookings :
                            cancelledBookings;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: "0 0 8px" }}>
              My Sessions
            </h1>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>
              {loading ? "Loading your sessions..." : `${bookings?.length || 0} total booking${bookings?.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link 
            to="/explore/sessions" 
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: A,
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Book New Session
          </Link>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#fff", padding: 4, borderRadius: 10, border: `1px solid ${B}`, width: "fit-content" }}>
          <button
            onClick={() => setActiveTab("upcoming")}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: activeTab === "upcoming" ? A : "transparent",
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: activeTab === "upcoming" ? "#fff" : TS,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Upcoming {upcomingBookings.length > 0 && `(${upcomingBookings.length})`}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: activeTab === "past" ? A : "transparent",
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: activeTab === "past" ? "#fff" : TS,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Past {pastBookings.length > 0 && `(${pastBookings.length})`}
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: activeTab === "cancelled" ? A : "transparent",
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: activeTab === "cancelled" ? "#fff" : TS,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Cancelled {cancelledBookings.length > 0 && `(${cancelledBookings.length})`}
          </button>
        </div>

        {/* ── Bookings List ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader2 size={40} className="animate-spin" style={{ color: A }} />
          </div>
        ) : displayedBookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 16, border: `1px solid ${B}` }}>
            <Calendar size={64} style={{ color: TS, margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 8px" }}>
              {activeTab === "upcoming" ? "No upcoming sessions" :
               activeTab === "past" ? "No past sessions" :
               "No cancelled sessions"}
            </h3>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, margin: "0 0 20px" }}>
              {activeTab === "upcoming" && "Book a session with a coach or therapist"}
            </p>
            {activeTab === "upcoming" && (
              <Link 
                to="/explore/sessions" 
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  borderRadius: 8,
                  background: A,
                  fontFamily: "Inter,sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Browse Sessions
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {displayedBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
