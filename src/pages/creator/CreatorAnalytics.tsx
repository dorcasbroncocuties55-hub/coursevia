import { useState, useEffect } from "react";
import { TrendingUp, Users, DollarSign, Eye, Award, ArrowUp, ArrowDown } from "lucide-react";
import { getCreatorDashboardStats, getRevenueAnalytics, getCoursePerformanceComparison } from "@/lib/api/analyticsService";

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

export default function CreatorAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    const [statsData, revenueData, performanceData] = await Promise.all([
      getCreatorDashboardStats(timeRange),
      getRevenueAnalytics(timeRange),
      getCoursePerformanceComparison(),
    ]);

    if (statsData.data) setStats(statsData.data);
    if (revenueData.data) setRevenue(revenueData.data);
    if (performanceData.data) setPerformance(performanceData.data);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <div style={{ fontSize: 16, color: S.dim }}>Loading analytics...</div>
      </div>
    );
  }

  const OVERVIEW_STATS = [
    {
      label: "Total Revenue",
      value: formatCurrency(stats?.totalRevenue || 0),
      change: `${stats?.revenueGrowth > 0 ? '+' : ''}${stats?.revenueGrowth || 0}%`,
      trend: stats?.revenueGrowth >= 0 ? "up" : "down",
      icon: DollarSign,
      color: S.success
    },
    {
      label: "Total Students",
      value: formatNumber(stats?.totalStudents || 0),
      change: `${stats?.studentGrowth > 0 ? '+' : ''}${stats?.studentGrowth || 0}%`,
      trend: stats?.studentGrowth >= 0 ? "up" : "down",
      icon: Users,
      color: S.accent
    },
    {
      label: "Total Enrollments",
      value: formatNumber(stats?.totalEnrollments || 0),
      change: `${stats?.publishedCourses || 0} courses`,
      trend: "up",
      icon: Eye,
      color: S.warning
    },
    {
      label: "Avg. Rating",
      value: stats?.avgCourseRating?.toFixed(1) || "0.0",
      change: `${stats?.completionRate || 0}% completion`,
      trend: "up",
      icon: Award,
      color: "#F59E0B"
    },
  ];

  const maxRevenue = revenue?.timeline ? Math.max(...revenue.timeline.map((d: any) => d.revenue)) : 1;

  return (
    <div style={{ fontFamily: "Inter,sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: S.full, margin: 0, marginBottom: 8 }}>
            Analytics
          </h1>
          <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
            Track your course performance and revenue
          </p>
        </div>

        {/* Time range selector */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["7d", "30d", "90d", "1y"] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: "10px 16px",
                border: `1px solid ${timeRange === range ? S.accent : S.border}`,
                background: timeRange === range ? S.accentLight : S.card,
                color: timeRange === range ? S.accent : S.dim,
                borderRadius: 8,
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

      {/* Overview stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }}>
        {OVERVIEW_STATS.map(({ label, value, change, trend, icon: Icon, color }) => (
          <div key={label} style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: S.dim }}>{label}</span>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={20} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: S.full, marginBottom: 8 }}>
              {value}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: trend === "up" ? S.success : S.danger }}>
              {trend === "up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {change}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: S.full, margin: 0, marginBottom: 20 }}>
          Revenue Over Time
        </h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 200 }}>
          {revenue?.timeline?.map((item: any, i: number) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.full }}>
                {formatCurrency(item.revenue)}
              </div>
              <div style={{ width: "100%", height: `${(item.revenue / maxRevenue) * 160}px`, background: S.accent, borderRadius: "4px 4px 0 0", minHeight: 20 }} />
              <span style={{ fontSize: 12, color: S.dim }}>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
        {(!revenue?.timeline || revenue.timeline.length === 0) && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: S.dim }}>
            No revenue data for this period
          </div>
        )}
      </div>

      {/* Top performing courses */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${S.border}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: S.full, margin: 0 }}>
            Course Performance
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: S.bg, borderBottom: `1px solid ${S.border}` }}>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>COURSE</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>STUDENTS</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>REVENUE</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>RATING</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>COMPLETION</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((course, i) => (
                <tr key={course.courseId} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: "16px 20px", fontSize: 15, fontWeight: 600, color: S.full }}>{course.title}</td>
                  <td style={{ padding: "16px 20px", fontSize: 15, color: S.full }}>{course.students}</td>
                  <td style={{ padding: "16px 20px", fontSize: 15, fontWeight: 600, color: S.success }}>{formatCurrency(course.revenue)}</td>
                  <td style={{ padding: "16px 20px", fontSize: 15, color: S.full }}>{course.avgRating.toFixed(1)}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: S.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${course.completionRate}%`, height: "100%", background: S.accent }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: S.full }}>{course.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {performance.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: 16, color: S.dim, margin: 0 }}>No course data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
