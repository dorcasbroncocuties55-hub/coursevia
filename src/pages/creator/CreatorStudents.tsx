import { useState, useEffect } from "react";
import { Search, Mail, MoreVertical, TrendingUp, Clock, Award } from "lucide-react";
import { getStudentAnalytics } from "@/lib/api/analyticsService";
import { formatNotificationTime } from "@/lib/api/notificationService";

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
};

export default function CreatorStudents() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await getStudentAnalytics();
    if (data) {
      setStats(data);
      setStudents(data.topStudents || []);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
        <div style={{ fontSize: 16, color: S.dim }}>Loading students...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter,sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: S.full, margin: 0, marginBottom: 8 }}>
          Students
        </h1>
        <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
          Manage and track your student enrollments
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 20,
        marginBottom: 32
      }}>
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: S.dim, marginBottom: 8 }}>
            Total Students
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: S.full }}>
            {stats?.totalStudents || 0}
          </div>
        </div>
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: S.dim, marginBottom: 8 }}>
            New Students
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: S.success }}>
            {stats?.newStudents || 0}
          </div>
        </div>
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: S.dim, marginBottom: 8 }}>
            Avg. Courses
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: S.accent }}>
            {stats?.avgCoursesPerStudent?.toFixed(1) || 0}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 24, maxWidth: 400 }}>
        <Search
          size={18}
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: S.dim }}
        />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px 10px 42px",
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            fontSize: 15,
            fontFamily: "Inter,sans-serif",
            outline: "none",
          }}
        />
      </div>

      {/* Students Table */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: S.bg, borderBottom: `1px solid ${S.border}` }}>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>
                  STUDENT
                </th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>
                  ENROLLED
                </th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>
                  PROGRESS
                </th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: S.dim }}>
                  SPENT
                </th>
                <th style={{ padding: "14px 20px", width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.studentId}
                  style={{ borderBottom: `1px solid ${S.border}`, cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = S.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  onClick={() => setSelectedStudent(student)}
                >
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", background: S.accentLight,
                        color: S.accent, display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 600, fontSize: 14, flexShrink: 0,
                      }}>
                        {getInitials(student.name)}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: S.full }}>
                        {student.name}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 15, fontWeight: 600, color: S.full }}>
                    {student.coursesEnrolled}
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: S.full }}>
                        {student.avgProgress}%
                      </div>
                      <div style={{ width: 100, height: 6, background: S.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          width: `${student.avgProgress}%`, height: "100%",
                          background: student.avgProgress === 100 ? S.success : S.accent,
                        }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 15, fontWeight: 600, color: S.full }}>
                    {formatCurrency(student.totalSpent)}
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <button style={{
                      width: 32, height: 32, borderRadius: 6, border: "none", background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}>
                      <MoreVertical size={16} style={{ color: S.dim }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: 16, color: S.dim, margin: 0 }}>
              {searchQuery ? 'No students found' : 'No students yet'}
            </p>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1000, padding: 20,
          }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            style={{
              background: S.card, borderRadius: 12, padding: 32, maxWidth: 500,
              width: "100%", maxHeight: "90vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: S.accentLight,
                color: S.accent, display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 600, fontSize: 20,
              }}>
                {getInitials(selectedStudent.name)}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: S.full, margin: 0, marginBottom: 4 }}>
                  {selectedStudent.name}
                </h3>
                <p style={{ fontSize: 14, color: S.dim, margin: 0 }}>
                  Student ID: {selectedStudent.studentId.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  padding: "8px 16px", background: S.border, border: "none",
                  borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                padding: 16, background: S.bg, borderRadius: 8,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <TrendingUp size={20} style={{ color: S.accent }} />
                <div>
                  <div style={{ fontSize: 13, color: S.dim }}>Enrolled Courses</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: S.full }}>
                    {selectedStudent.coursesEnrolled}
                  </div>
                </div>
              </div>

              <div style={{
                padding: 16, background: S.bg, borderRadius: 8,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <Award size={20} style={{ color: S.success }} />
                <div>
                  <div style={{ fontSize: 13, color: S.dim }}>Average Progress</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: S.full }}>
                    {selectedStudent.avgProgress}%
                  </div>
                </div>
              </div>

              <div style={{
                padding: 16, background: S.bg, borderRadius: 8,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <Clock size={20} style={{ color: S.warning }} />
                <div>
                  <div style={{ fontSize: 13, color: S.dim }}>Total Spent</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: S.full }}>
                    {formatCurrency(selectedStudent.totalSpent)}
                  </div>
                </div>
              </div>

              <button style={{
                marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "12px", background: S.accent, color: "#FFFFFF",
                border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: "pointer", width: "100%",
              }}>
                <Mail size={18} />
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
