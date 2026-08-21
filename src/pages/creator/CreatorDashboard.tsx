import { BookOpen, Users, DollarSign, TrendingUp, Clock, Star } from "lucide-react";

// ── Figma-exact Creator Portal design tokens (Indigo theme) ──────────────────
const S = {
  accent: "#4F46E5",       // indigo-600
  accentLight: "#EEF2FF",  // indigo-50
  bg: "#F8FAFC",           // slate-50
  card: "#FFFFFF",
  border: "#E2E8F0",       // slate-200
  dim: "#64748B",          // slate-500
  full: "#0F172A",         // slate-900
  success: "#10B981",      // green-500
  warning: "#F59E0B",      // amber-500
};

// Mock data - will be replaced with real Supabase queries
const STATS = [
  { label: "Total Courses", value: "12", change: "+2 this month", icon: BookOpen, color: S.accent },
  { label: "Total Students", value: "1,847", change: "+127 this week", icon: Users, color: S.success },
  { label: "Revenue", value: "$24,580", change: "+12% from last month", icon: DollarSign, color: S.warning },
  { label: "Avg. Rating", value: "4.8", change: "From 342 reviews", icon: Star, color: "#F59E0B" },
];

const RECENT_ENROLLMENTS = [
  { student: "Sarah Johnson", course: "Advanced React Patterns", time: "2 hours ago", avatar: "SJ" },
  { student: "Michael Chen", course: "TypeScript Masterclass", time: "5 hours ago", avatar: "MC" },
  { student: "Emily Davis", course: "Node.js Backend Dev", time: "1 day ago", avatar: "ED" },
  { student: "James Wilson", course: "Advanced React Patterns", time: "1 day ago", avatar: "JW" },
  { student: "Lisa Anderson", course: "Full Stack Development", time: "2 days ago", avatar: "LA" },
];

const TOP_COURSES = [
  { title: "Advanced React Patterns", students: 342, revenue: "$8,550", rating: 4.9 },
  { title: "TypeScript Masterclass", students: 289, revenue: "$7,225", rating: 4.8 },
  { title: "Node.js Backend Dev", students: 256, revenue: "$6,400", rating: 4.7 },
  { title: "Full Stack Development", students: 234, revenue: "$5,850", rating: 4.8 },
];

export default function CreatorDashboard() {
  return (
    <div style={{ fontFamily: "Inter,sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          color: S.full, 
          margin: 0, 
          marginBottom: 8 
        }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
          Overview of your creator activity and performance
        </p>
      </div>

      {/* Stats grid — Figma 4-column layout */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 20, 
        marginBottom: 32 
      }}>
        {STATS.map(({ label, value, change, icon: Icon, color }) => (
          <div 
            key={label}
            style={{
              background: S.card,
              borderRadius: 12,
              border: `1px solid ${S.border}`,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: S.dim }}>{label}</span>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Icon size={20} style={{ color }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: S.full, marginBottom: 4 }}>
                {value}
              </div>
              <div style={{ 
                fontSize: 13, 
                color: S.dim, 
                display: "flex", 
                alignItems: "center", 
                gap: 4 
              }}>
                <TrendingUp size={14} />
                {change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 32 }}>
        {/* Recent Enrollments */}
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          overflow: "hidden",
        }}>
          <div style={{ 
            padding: "20px 24px", 
            borderBottom: `1px solid ${S.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: S.full, margin: 0 }}>
              Recent Enrollments
            </h2>
            <button style={{
              fontSize: 14,
              fontWeight: 500,
              color: S.accent,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}>
              View all
            </button>
          </div>
          <div style={{ padding: 0 }}>
            {RECENT_ENROLLMENTS.map((item, i) => (
              <div 
                key={i}
                style={{
                  padding: "16px 24px",
                  borderBottom: i < RECENT_ENROLLMENTS.length - 1 ? `1px solid ${S.border}` : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: S.accentLight,
                  color: S.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 14,
                  flexShrink: 0,
                }}>
                  {item.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: 15, 
                    fontWeight: 600, 
                    color: S.full, 
                    marginBottom: 2 
                  }}>
                    {item.student}
                  </div>
                  <div style={{ fontSize: 13, color: S.dim }}>
                    Enrolled in {item.course}
                  </div>
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6, 
                  fontSize: 13, 
                  color: S.dim,
                  flexShrink: 0,
                }}>
                  <Clock size={14} />
                  {item.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Courses */}
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          overflow: "hidden",
        }}>
          <div style={{ 
            padding: "20px 24px", 
            borderBottom: `1px solid ${S.border}`,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: S.full, margin: 0 }}>
              Top Performing Courses
            </h2>
          </div>
          <div style={{ padding: 0 }}>
            {TOP_COURSES.map((course, i) => (
              <div 
                key={i}
                style={{
                  padding: "16px 24px",
                  borderBottom: i < TOP_COURSES.length - 1 ? `1px solid ${S.border}` : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 24,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ 
                    fontSize: 15, 
                    fontWeight: 600, 
                    color: S.full, 
                    marginBottom: 2 
                  }}>
                    {course.title}
                  </div>
                  <div style={{ fontSize: 13, color: S.dim }}>
                    {course.students} students
                  </div>
                </div>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: S.full,
                  textAlign: "right",
                }}>
                  {course.revenue}
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  color: S.warning,
                }}>
                  <Star size={16} fill={S.warning} />
                  {course.rating}
                </div>
                <button style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: `1px solid ${S.border}`,
                  background: S.card,
                  color: S.full,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}>
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
