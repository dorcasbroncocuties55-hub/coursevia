import { useState, useEffect } from "react";
import { BookOpen, Users, DollarSign, TrendingUp, Clock, Star } from "lucide-react";
import { getCreatorDashboardStats } from "@/lib/api/analyticsService";
import { getEnrollmentStats } from "@/lib/api/enrollmentService";
import { getCourses } from "@/lib/api/courseService";
import { formatNotificationTime } from "@/lib/api/notificationService";

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

export default function CreatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Load all dashboard data
      const [dashboardData, enrollmentData, coursesData] = await Promise.all([
        getCreatorDashboardStats('30d').catch(err => {
          console.error('Failed to load dashboard stats:', err);
          return { data: null, error: err };
        }),
        getEnrollmentStats('30d').catch(err => {
          console.error('Failed to load enrollment stats:', err);
          return { data: null, error: err };
        }),
        getCourses({ status: 'published', limit: 4 }).catch(err => {
          console.error('Failed to load courses:', err);
          return { data: null, error: err };
        }),
      ]);

      if (dashboardData.data) {
        setStats(dashboardData.data);
      }

      if (enrollmentData.data) {
        setRecentEnrollments(enrollmentData.data.recentEnrollments?.slice(0, 5) || []);
      }

      if (coursesData.data) {
        setTopCourses(coursesData.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div style={{
        fontFamily: "Inter,sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
      }}>
        <div style={{ fontSize: 16, color: S.dim }}>Loading dashboard...</div>
      </div>
    );
  }

  const STATS = [
    {
      label: "Total Courses",
      value: stats?.totalCourses || 0,
      change: `${stats?.publishedCourses || 0} published`,
      icon: BookOpen,
      color: S.accent
    },
    {
      label: "Total Students",
      value: formatNumber(stats?.totalStudents || 0),
      change: `${stats?.activeStudents || 0} active`,
      icon: Users,
      color: S.success
    },
    {
      label: "Revenue",
      value: formatCurrency(stats?.totalRevenue || 0),
      change: `${stats?.revenueGrowth > 0 ? '+' : ''}${stats?.revenueGrowth || 0}% growth`,
      icon: DollarSign,
      color: S.warning
    },
    {
      label: "Avg. Rating",
      value: stats?.avgCourseRating?.toFixed(1) || "0.0",
      change: `${stats?.completionRate || 0}% completion`,
      icon: Star,
      color: "#F59E0B"
    },
  ];

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
            {recentEnrollments.length > 0 ? (
              recentEnrollments.map((enrollment, i) => (
                <div
                  key={enrollment.id}
                  style={{
                    padding: "16px 24px",
                    borderBottom: i < recentEnrollments.length - 1 ? `1px solid ${S.border}` : "none",
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
                    {getInitials(enrollment.student?.full_name || 'Student')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: S.full,
                      marginBottom: 2
                    }}>
                      {enrollment.student?.full_name || 'Anonymous Student'}
                    </div>
                    <div style={{ fontSize: 13, color: S.dim }}>
                      Enrolled in {enrollment.course?.title || 'Unknown Course'}
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
                    {formatNotificationTime(enrollment.enrolled_at)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                padding: "32px 24px",
                textAlign: "center",
                color: S.dim,
                fontSize: 14,
              }}>
                No recent enrollments
              </div>
            )}
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
            {topCourses.length > 0 ? (
              topCourses.map((course, i) => (
                <div
                  key={course.id}
                  style={{
                    padding: "16px 24px",
                    borderBottom: i < topCourses.length - 1 ? `1px solid ${S.border}` : "none",
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
                      {course.total_enrollments || 0} students
                    </div>
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: S.full,
                    textAlign: "right",
                  }}>
                    {formatCurrency((course.total_enrollments || 0) * (course.price || 0))}
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
                    {course.average_rating?.toFixed(1) || '0.0'}
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
              ))
            ) : (
              <div style={{
                padding: "32px 24px",
                textAlign: "center",
                color: S.dim,
                fontSize: 14,
              }}>
                No courses yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
