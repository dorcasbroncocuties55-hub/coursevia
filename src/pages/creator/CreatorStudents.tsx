import { useState } from "react";
import { Search, Filter, Mail, MoreVertical, TrendingUp, Clock, Award } from "lucide-react";

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
};

// Mock student data - will be replaced with real Supabase queries
const STUDENTS = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    avatar: "SJ",
    enrolledCourses: 3,
    completionRate: 87,
    totalSpent: "$149",
    joinedDate: "2024-01-15",
    lastActive: "2 hours ago",
    status: "active",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.c@email.com",
    avatar: "MC",
    enrolledCourses: 2,
    completionRate: 45,
    totalSpent: "$99",
    joinedDate: "2024-02-20",
    lastActive: "1 day ago",
    status: "active",
  },
  {
    id: 3,
    name: "Emily Davis",
    email: "emily.d@email.com",
    avatar: "ED",
    enrolledCourses: 1,
    completionRate: 100,
    totalSpent: "$49",
    joinedDate: "2024-01-08",
    lastActive: "3 days ago",
    status: "completed",
  },
  {
    id: 4,
    name: "James Wilson",
    email: "james.w@email.com",
    avatar: "JW",
    enrolledCourses: 4,
    completionRate: 62,
    totalSpent: "$197",
    joinedDate: "2023-12-05",
    lastActive: "5 hours ago",
    status: "active",
  },
  {
    id: 5,
    name: "Lisa Anderson",
    email: "lisa.a@email.com",
    avatar: "LA",
    enrolledCourses: 2,
    completionRate: 23,
    totalSpent: "$98",
    joinedDate: "2024-03-10",
    lastActive: "2 weeks ago",
    status: "inactive",
  },
];

export default function CreatorStudents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "inactive">("all");
  const [selectedStudent, setSelectedStudent] = useState<typeof STUDENTS[0] | null>(null);

  const filteredStudents = STUDENTS.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalStudents = STUDENTS.length;
  const activeStudents = STUDENTS.filter(s => s.status === "active").length;
  const avgCompletion = Math.round(
    STUDENTS.reduce((acc, s) => acc + s.completionRate, 0) / STUDENTS.length
  );

  return (
    <div style={{ fontFamily: "Inter,sans-serif" }}>
      {/* Header */}
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
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: S.dim, marginBottom: 8 }}>
            Total Students
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: S.full }}>
            {totalStudents}
          </div>
        </div>
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: S.dim, marginBottom: 8 }}>
            Active Students
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: S.success }}>
            {activeStudents}
          </div>
        </div>
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: S.dim, marginBottom: 8 }}>
            Avg. Completion
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: S.accent }}>
            {avgCompletion}%
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 16, 
        marginBottom: 24,
        flexWrap: "wrap",
      }}>
        {/* Search bar */}
        <div style={{ position: "relative", flex: "1 1 300px", minWidth: 200 }}>
          <Search 
            size={18} 
            style={{ 
              position: "absolute", 
              left: 14, 
              top: "50%", 
              transform: "translateY(-50%)",
              color: S.dim,
            }} 
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

        {/* Status filter */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "active", "completed", "inactive"] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: "10px 16px",
                border: `1px solid ${statusFilter === status ? S.accent : S.border}`,
                background: statusFilter === status ? S.accentLight : S.card,
                color: statusFilter === status ? S.accent : S.dim,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Students Table */}
      <div style={{
        background: S.card,
        borderRadius: 12,
        border: `1px solid ${S.border}`,
        overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: S.bg, borderBottom: `1px solid ${S.border}` }}>
                <th style={{ 
                  padding: "14px 20px", 
                  textAlign: "left", 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: S.dim,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Student
                </th>
                <th style={{ 
                  padding: "14px 20px", 
                  textAlign: "left", 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: S.dim,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Enrolled Courses
                </th>
                <th style={{ 
                  padding: "14px 20px", 
                  textAlign: "left", 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: S.dim,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Completion
                </th>
                <th style={{ 
                  padding: "14px 20px", 
                  textAlign: "left", 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: S.dim,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Total Spent
                </th>
                <th style={{ 
                  padding: "14px 20px", 
                  textAlign: "left", 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: S.dim,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Last Active
                </th>
                <th style={{ 
                  padding: "14px 20px", 
                  textAlign: "left", 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: S.dim,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Status
                </th>
                <th style={{ padding: "14px 20px", width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr 
                  key={student.id}
                  style={{ 
                    borderBottom: `1px solid ${S.border}`,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = S.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  onClick={() => setSelectedStudent(student)}
                >
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                        {student.avatar}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: S.full }}>
                          {student.name}
                        </div>
                        <div style={{ fontSize: 13, color: S.dim }}>
                          {student.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: S.full }}>
                      {student.enrolledCourses}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: S.full }}>
                        {student.completionRate}%
                      </div>
                      <div style={{
                        width: 100,
                        height: 6,
                        background: S.border,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          width: `${student.completionRate}%`,
                          height: "100%",
                          background: student.completionRate === 100 ? S.success : S.accent,
                          transition: "width 0.3s",
                        }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: S.full }}>
                      {student.totalSpent}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 14, color: S.dim }}>
                      {student.lastActive}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      background: 
                        student.status === "active" ? `${S.success}15` :
                        student.status === "completed" ? `${S.accent}15` :
                        `${S.dim}15`,
                      color: 
                        student.status === "active" ? S.success :
                        student.status === "completed" ? S.accent :
                        S.dim,
                    }}>
                      {student.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <button style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}>
                      <MoreVertical size={16} style={{ color: S.dim }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredStudents.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
          }}>
            <p style={{ fontSize: 16, color: S.dim, margin: 0 }}>
              No students found matching your criteria
            </p>
          </div>
        )}
      </div>

      {/* Student Detail Panel (Modal/Sidebar would be better in production) */}
      {selectedStudent && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSelectedStudent(null)}
        >
          <div 
            style={{
              background: S.card,
              borderRadius: 12,
              padding: 32,
              maxWidth: 500,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: S.accentLight,
                color: S.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 20,
              }}>
                {selectedStudent.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: S.full, margin: 0, marginBottom: 4 }}>
                  {selectedStudent.name}
                </h3>
                <p style={{ fontSize: 14, color: S.dim, margin: 0 }}>
                  {selectedStudent.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  padding: "8px 16px",
                  background: S.border,
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                padding: 16,
                background: S.bg,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <TrendingUp size={20} style={{ color: S.accent }} />
                <div>
                  <div style={{ fontSize: 13, color: S.dim }}>Enrolled Courses</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: S.full }}>
                    {selectedStudent.enrolledCourses}
                  </div>
                </div>
              </div>

              <div style={{
                padding: 16,
                background: S.bg,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <Award size={20} style={{ color: S.success }} />
                <div>
                  <div style={{ fontSize: 13, color: S.dim }}>Completion Rate</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: S.full }}>
                    {selectedStudent.completionRate}%
                  </div>
                </div>
              </div>

              <div style={{
                padding: 16,
                background: S.bg,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <Clock size={20} style={{ color: S.warning }} />
                <div>
                  <div style={{ fontSize: 13, color: S.dim }}>Last Active</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: S.full }}>
                    {selectedStudent.lastActive}
                  </div>
                </div>
              </div>

              <button style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px",
                background: S.accent,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
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
