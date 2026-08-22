/**
 * LearnerDashboard - Main dashboard for learners
 * Shows: Stats, Continue Learning, Upcoming Sessions, Quick Actions
 */

import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAsync } from "@/lib/portalEngine";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Calendar, CreditCard, Wallet, ChevronRight, PlayCircle } from "lucide-react";

// ── Coursevia brand tokens ────────────────────────────────────────────────────
const A = "#2D9E6B";  // Primary
const D = "#0F3D2E";  // Dark
const B = "#EAE6E2";  // Border
const TS = "#6B7280"; // Text secondary

// ── Components ────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "#fff", border: `1px solid ${B}`, borderRadius: 16, padding: 24, ...style }}>
    {children}
  </div>
);

const SectionHead = ({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
    <h2 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 20, color: D, margin: 0 }}>{title}</h2>
    {link && (
      <Link to={link} style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: A, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
        {linkLabel} <ChevronRight size={14} />
      </Link>
    )}
  </div>
);

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
  <div style={{
    background: "#fff",
    border: `1px solid ${B}`,
    borderRadius: 12,
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
  }}>
    <div style={{
      width: 48,
      height: 48,
      borderRadius: 12,
      background: `${color}15`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 24, color: D, margin: 0 }}>{value}</p>
    </div>
  </div>
);

// ── Data Hooks ────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalEnrolled: number;
  completedCourses: number;
  upcomingSessions: number;
  totalSpent: number;
}

function useDashboardStats(userId: string | undefined) {
  return useAsync<DashboardStats>(async () => {
    if (!userId) return { totalEnrolled: 0, completedCourses: 0, upcomingSessions: 0, totalSpent: 0 };

    // Get enrolled courses
    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("id, status")
      .eq("user_id", userId);

    const totalEnrolled = enrollments?.length || 0;
    const completedCourses = enrollments?.filter(e => e.status === "completed").length || 0;

    // Get upcoming sessions
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("learner_id", userId)
      .gte("scheduled_at", new Date().toISOString())
      .eq("status", "confirmed");

    const upcomingSessions = bookings?.length || 0;

    // Get total spent
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "completed");

    const totalSpent = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    return { totalEnrolled, completedCourses, upcomingSessions, totalSpent };
  }, [userId]);
}

interface InProgressCourse {
  id: string;
  title: string;
  thumbnail: string | null;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

function useInProgressCourses(userId: string | undefined) {
  return useAsync<InProgressCourse[]>(async () => {
    if (!userId) return [];

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select(`
        id,
        course_id,
        courses (
          id,
          title,
          thumbnail_url,
          lessons:course_lessons (id)
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(3);

    if (!enrollments) return [];

    const courses = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const course = enrollment.courses;
        const totalLessons = course.lessons?.length || 0;

        // Get completed lessons
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", course.id)
          .eq("status", "completed");

        const completedLessons = progress?.length || 0;
        const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return {
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail_url,
          progress: progressPercent,
          totalLessons,
          completedLessons,
        };
      })
    );

    return courses.filter(c => c.progress < 100);
  }, [userId]);
}

interface UpcomingSession {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  coach_name: string;
  coach_avatar: string | null;
  service_title: string;
  meeting_url: string | null;
}

function useUpcomingSessions(userId: string | undefined) {
  return useAsync<UpcomingSession[]>(async () => {
    if (!userId) return [];

    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        meeting_url,
        coach_id,
        service_id,
        coach_services (title),
        profiles!bookings_coach_id_fkey (full_name, avatar_url)
      `)
      .eq("learner_id", userId)
      .gte("scheduled_at", new Date().toISOString())
      .eq("status", "confirmed")
      .order("scheduled_at", { ascending: true })
      .limit(3);

    if (!bookings) return [];

    return bookings.map((b: any) => ({
      id: b.id,
      scheduled_at: b.scheduled_at,
      duration_minutes: b.duration_minutes,
      coach_name: b.profiles?.full_name || "Coach",
      coach_avatar: b.profiles?.avatar_url,
      service_title: b.coach_services?.title || "Session",
      meeting_url: b.meeting_url,
    }));
  }, [userId]);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LearnerDashboard() {
  const { user, profile } = useAuth();
  const { data: stats, loading: loadingStats } = useDashboardStats(user?.id);
  const { data: inProgressCourses, loading: loadingCourses } = useInProgressCourses(user?.id);
  const { data: upcomingSessions, loading: loadingSessions } = useUpcomingSessions(user?.id);

  const firstName = profile?.full_name?.split(" ")[0] || "Learner";

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: 0 }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, marginTop: 4 }}>
            Continue your learning journey
          </p>
        </div>

        {/* ── Stats Grid ── */}
        {loadingStats ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: A }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
            <StatCard icon={<BookOpen size={24} style={{ color: A }} />} label="Enrolled Courses" value={stats?.totalEnrolled || 0} color={A} />
            <StatCard icon={<PlayCircle size={24} style={{ color: "#3B82F6" }} />} label="Completed" value={stats?.completedCourses || 0} color="#3B82F6" />
            <StatCard icon={<Calendar size={24} style={{ color: "#F59E0B" }} />} label="Upcoming Sessions" value={stats?.upcomingSessions || 0} color="#F59E0B" />
            <StatCard icon={<CreditCard size={24} style={{ color: "#8B5CF6" }} />} label="Total Spent" value={`$${(stats?.totalSpent || 0).toFixed(0)}`} color="#8B5CF6" />
          </div>
        )}

        {/* ── Continue Learning ── */}
        <Card style={{ marginBottom: 24 }}>
          <SectionHead title="Continue Learning" link="/learner/courses" linkLabel="View all" />
          {loadingCourses ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: TS, margin: "0 auto" }} />
            </div>
          ) : !inProgressCourses || inProgressCourses.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <BookOpen size={48} style={{ color: TS, margin: "0 auto 12px" }} />
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>No courses in progress</p>
              <Link to="/explore" style={{ display: "inline-block", marginTop: 12, padding: "8px 16px", borderRadius: 8, background: A, fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#fff", textDecoration: "none" }}>
                Browse Courses
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {inProgressCourses.map(course => (
                <Link key={course.id} to={`/learner/courses/${course.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ border: `1px solid ${B}`, borderRadius: 12, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}>
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: 160, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BookOpen size={48} style={{ color: TS }} />
                      </div>
                    )}
                    <div style={{ padding: 16 }}>
                      <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 15, color: D, margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {course.title}
                      </h3>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS }}>
                            {course.completedLessons} / {course.totalLessons} lessons
                          </span>
                          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, color: A }}>
                            {course.progress}%
                          </span>
                        </div>
                        <div style={{ width: "100%", height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${course.progress}%`, height: "100%", background: A, borderRadius: 3, transition: "width 0.3s" }} />
                        </div>
                      </div>
                      <button style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${A}`, background: "#fff", fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 12, color: A, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <PlayCircle size={14} /> Continue
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* ── Upcoming Sessions ── */}
        <Card style={{ marginBottom: 24 }}>
          <SectionHead title="Upcoming Sessions" link="/learner/bookings" linkLabel="View all" />
          {loadingSessions ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: TS, margin: "0 auto" }} />
            </div>
          ) : !upcomingSessions || upcomingSessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <Calendar size={48} style={{ color: TS, margin: "0 auto 12px" }} />
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>No upcoming sessions</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {upcomingSessions.map(session => (
                <div key={session.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: `1px solid ${B}`, borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#E5E7EB", flexShrink: 0, overflow: "hidden" }}>
                      {session.coach_avatar ? (
                        <img src={session.coach_avatar} alt={session.coach_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 16, color: TS }}>
                          {session.coach_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: "0 0 2px" }}>
                        {session.service_title}
                      </p>
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: TS, margin: 0 }}>
                        with {session.coach_name}
                      </p>
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS, margin: "4px 0 0" }}>
                        {new Date(session.scheduled_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {new Date(session.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} • {session.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  {session.meeting_url && (
                    <a href={session.meeting_url} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", borderRadius: 6, background: A, fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 13, color: "#fff", textDecoration: "none" }}>
                      Join
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Quick Actions ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Link to="/learner/courses" style={{ textDecoration: "none" }}>
            <div style={{ padding: 20, border: `1px solid ${B}`, borderRadius: 12, background: "#fff", textAlign: "center", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
              <BookOpen size={32} style={{ color: A, margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: 0 }}>My Courses</p>
            </div>
          </Link>
          <Link to="/learner/bookings" style={{ textDecoration: "none" }}>
            <div style={{ padding: 20, border: `1px solid ${B}`, borderRadius: 12, background: "#fff", textAlign: "center", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
              <Calendar size={32} style={{ color: A, margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: 0 }}>Sessions</p>
            </div>
          </Link>
          <Link to="/learner/payment-methods" style={{ textDecoration: "none" }}>
            <div style={{ padding: 20, border: `1px solid ${B}`, borderRadius: 12, background: "#fff", textAlign: "center", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
              <CreditCard size={32} style={{ color: A, margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: 0 }}>Payment Methods</p>
            </div>
          </Link>
          <Link to="/dashboard/wallet" style={{ textDecoration: "none" }}>
            <div style={{ padding: 20, border: `1px solid ${B}`, borderRadius: 12, background: "#fff", textAlign: "center", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
              <Wallet size={32} style={{ color: A, margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 14, color: D, margin: 0 }}>Wallet</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
