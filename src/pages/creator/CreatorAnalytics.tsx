import { useState } from "react";
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  DollarSign, 
  Eye,
  Clock,
  Award,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// ── Figma-exact Creator Portal design tokens ──────────────────────────────────
const S = {
  accent: "#4F46E5",
  accentLight: "#EEF2FF",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  dim: "#64748B",
  full: "#0F172A",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

// Mock analytics data
const OVERVIEW_STATS = [
  { 
    label: "Total Revenue", 
    value: "$24,580", 
    change: "+12.5%", 
    trend: "up",
    icon: DollarSign, 
    color: S.success 
  },
  { 
    label: "Total Students", 
    value: "1,847", 
    change: "+8.3%", 
    trend: "up",
    icon: Users, 
    color: S.accent 
  },
  { 
    label: "Course Views", 
    value: "12,456", 
    change: "-2.1%", 
    trend: "down",
    icon: Eye, 
    color: S.warning 
  },
  { 
    label: "Avg. Rating", 
    value: "4.8", 
    change: "+0.2", 
    trend: "up",
    icon: Award, 
    color: "#F59E0B" 
  },
];

const REVENUE_DATA = [
  { month: "Jan", revenue: 1800 },
  { month: "Feb", revenue: 2200 },
  { month: "Mar", revenue: 1900 },
  { month: "Apr", revenue: 2800 },
  { month: "May", revenue: 2400 },
  { month: "Jun", revenue: 3200 },
];

const ENROLLMENT_DATA = [
  { month: "Jan", enrollments: 120 },
  { month: "Feb", enrollments: 145 },
  { month: "Mar", enrollments: 132 },
  { month: "Apr", enrollments: 198 },
  { month: "May", enrollments: 176 },
  { month: "Jun", enrollments: 234 },
];

const TOP_COURSES_PERFORMANCE = [
  { title: "Advanced React Patterns", students: 342, revenue: "$8,550", rating: 4.9, completion: 87 },
  { title: "TypeScript Masterclass", students: 289, revenue: "$7,225", rating: 4.8, completion: 92 },
  { title: "Node.js Backend Dev", students: 256, revenue: "$6,400", rating: 4.7, completion: 78 },
  { title: "Full Stack Development", students: 234, revenue: "$5,850", rating: 4.8, completion: 85 },
];

const TRAFFIC_SOURCES = [
  { source: "Direct", percentage: 42, color: S.accent },
  { source: "Social Media", percentage: 28, color: S.success },
  { source: "Search", percentage: 20, color: S.warning },
  { source: "Referral", percentage: 10, color: "#8B5CF6" },
];

export default function CreatorAnalytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const maxRevenue = Math.max(...REVENUE_DATA.map(d => d.revenue));
  const maxEnrollments = Math.max(...ENROLLMENT_DATA.map(d => d.enrollments));

  return (
    <div style={{ fontFamily: "Inter,sans-serif" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        marginBottom: 32,
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: S.full, margin: 0, marginBottom: 8 }}>
            Analytics
          </h1>
          <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
            Track your performance and growth metrics
          </p>
        </div>
        
        {/* Time range selector */}
        <div style={{ display: "flex", gap: 8, background: S.card, borderRadius: 8, padding: 4, border: `1px solid ${S.border}` }}>
          {(["7d", "30d", "90d", "1y"] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: "8px 16px",
                border: "none",
                background: timeRange === range ? S.accent : "transparent",
                color: timeRange === range ? "#FFFFFF" : S.dim,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "1 Year"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 20, 
        marginBottom: 32 
      }}>
        {OVERVIEW_STATS.map(({ label, value, change, trend, icon: Icon, color }) => (
          <div 
            key={label}
            style={{
              background: S.card,
              borderRadius: 12,
              border: `1px solid ${S.border}`,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
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
            <div style={{ fontSize: 32, fontWeight: 700, color: S.full, marginBottom: 8 }}>
              {value}
            </div>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6,
              fontSize: 13,
              color: trend === "up" ? S.success : S.danger,
              fontWeight: 600,
            }}>
              {trend === "up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {change} from last period
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        {/* Revenue Chart */}
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          padding: 24,
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: S.full, margin: 0, marginBottom: 4 }}>
              Revenue Trend
            </h2>
            <p style={{ fontSize: 13, color: S.dim, margin: 0 }}>
              Monthly revenue over the last 6 months
            </p>
          </div>
          
          {/* Simple bar chart */}
          <div style={{ 
            display: "flex", 
            alignItems: "flex-end", 
            justifyContent: "space-between",
            height: 200,
            gap: 12,
          }}>
            {REVENUE_DATA.map((item, i) => (
              <div 
                key={i}
                style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{
                  width: "100%",
                  height: `${(item.revenue / maxRevenue) * 180}px`,
                  background: `linear-gradient(180deg, ${S.accent} 0%, ${S.accentLight} 100%)`,
                  borderRadius: "6px 6px 0 0",
                  position: "relative",
                  transition: "all 0.3s",
                }}>
                  <div style={{
                    position: "absolute",
                    top: -24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: S.full,
                    whiteSpace: "nowrap",
                  }}>
                    ${(item.revenue / 1000).toFixed(1)}k
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: S.dim }}>
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Enrollments Chart */}
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          padding: 24,
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: S.full, margin: 0, marginBottom: 4 }}>
              New Enrollments
            </h2>
            <p style={{ fontSize: 13, color: S.dim, margin: 0 }}>
              Student enrollments by month
            </p>
          </div>
          
          {/* Line chart simulation */}
          <div style={{ 
            height: 200,
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}>
            {ENROLLMENT_DATA.map((item, i) => (
              <div 
                key={i}
                style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{
                  width: "100%",
                  height: `${(item.enrollments / maxEnrollments) * 180}px`,
                  background: `linear-gradient(180deg, ${S.success} 0%, ${S.success}30 100%)`,
                  borderRadius: "6px 6px 0 0",
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute",
                    top: -24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: S.full,
                  }}>
                    {item.enrollments}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: S.dim }}>
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Top Courses Performance */}
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          overflow: "hidden",
        }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${S.border}` }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: S.full, margin: 0 }}>
              Course Performance
            </h2>
          </div>
          <div style={{ padding: 0 }}>
            {TOP_COURSES_PERFORMANCE.map((course, i) => (
              <div 
                key={i}
                style={{
                  padding: "16px 24px",
                  borderBottom: i < TOP_COURSES_PERFORMANCE.length - 1 ? `1px solid ${S.border}` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: S.full, marginBottom: 4 }}>
                      {course.title}
                    </div>
                    <div style={{ fontSize: 13, color: S.dim }}>
                      {course.students} students · {course.revenue} revenue
                    </div>
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 14,
                    fontWeight: 600,
                    color: S.warning,
                  }}>
                    <Award size={16} fill={S.warning} />
                    {course.rating}
                  </div>
                </div>
                
                {/* Completion bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: S.dim, minWidth: 80 }}>
                    Completion
                  </span>
                  <div style={{
                    flex: 1,
                    height: 8,
                    background: S.border,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${course.completion}%`,
                      height: "100%",
                      background: S.accent,
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: S.full, minWidth: 40, textAlign: "right" }}>
                    {course.completion}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          padding: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: S.full, margin: 0, marginBottom: 20 }}>
            Traffic Sources
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {TRAFFIC_SOURCES.map((source, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: S.full }}>
                    {source.source}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: S.full }}>
                    {source.percentage}%
                  </span>
                </div>
                <div style={{
                  width: "100%",
                  height: 8,
                  background: S.border,
                  borderRadius: 4,
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${source.percentage}%`,
                    height: "100%",
                    background: source.color,
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Donut chart simulation */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div style={{
              width: 140,
              height: 140,
              margin: "0 auto",
              borderRadius: "50%",
              background: `conic-gradient(
                ${TRAFFIC_SOURCES[0].color} 0% ${TRAFFIC_SOURCES[0].percentage}%,
                ${TRAFFIC_SOURCES[1].color} ${TRAFFIC_SOURCES[0].percentage}% ${TRAFFIC_SOURCES[0].percentage + TRAFFIC_SOURCES[1].percentage}%,
                ${TRAFFIC_SOURCES[2].color} ${TRAFFIC_SOURCES[0].percentage + TRAFFIC_SOURCES[1].percentage}% ${TRAFFIC_SOURCES[0].percentage + TRAFFIC_SOURCES[1].percentage + TRAFFIC_SOURCES[2].percentage}%,
                ${TRAFFIC_SOURCES[3].color} ${TRAFFIC_SOURCES[0].percentage + TRAFFIC_SOURCES[1].percentage + TRAFFIC_SOURCES[2].percentage}% 100%
              )`,
              position: "relative",
            }}>
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: S.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: S.full }}>
                  100%
                </div>
                <div style={{ fontSize: 11, color: S.dim }}>
                  Total
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
