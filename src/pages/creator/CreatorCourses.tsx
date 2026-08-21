import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, MoreVertical, Users, Star, DollarSign } from "lucide-react";
import { getCourses, deleteCourse, publishCourse, unpublishCourse } from "@/lib/api/courseService";
import { formatNotificationTime } from "@/lib/api/notificationService";

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

// Fix #2 — instantiate once outside the component
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
});

// Fix #5 — typed Course interface
interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  status: "published" | "draft";
  price?: number;
  total_enrollments?: number;
  average_rating?: number;
  updated_at: string;
}

// Fix #4 — extracted StatItem component
function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: S.dim,
        }}
      >
        <Icon size={14} />
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: S.full }}>{value}</div>
    </div>
  );
}

export default function CreatorCourses() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  // Fix #3 — error state
  const [error, setError] = useState<string | null>(null);
  // Fix #7 — inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Fix #8 — click-outside ref for dropdown
  const menuRef = useRef<HTMLDivElement>(null);

  // Fix #8 — close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Fix #3 — error handling; Fix #6 — searchQuery in deps via useCallback
  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getCourses({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      if (data) {
        setCourses(data);
      }
    } catch {
      setError("Failed to load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Fix #6 — proper deps: re-run when filter changes (search triggers via handleSearch)
  useEffect(() => {
    loadCourses();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: search is intentionally triggered manually via the search button / Enter key
  // to avoid firing on every keystroke.

  const handleSearch = () => {
    loadCourses();
  };

  // Fix #3 — error handling on toggle
  const handleTogglePublish = async (courseId: string, currentStatus: string) => {
    try {
      if (currentStatus === "published") {
        await unpublishCourse(courseId);
      } else {
        await publishCourse(courseId);
      }
      await loadCourses();
    } catch {
      setError("Failed to update course status. Please try again.");
    } finally {
      setMenuOpen(null);
    }
  };

  // Fix #3 + Fix #7 — error handling and inline confirmation
  const handleDeleteConfirmed = async (courseId: string) => {
    try {
      await deleteCourse(courseId);
      await loadCourses();
    } catch {
      setError("Failed to delete course. Please try again.");
    } finally {
      setConfirmDeleteId(null);
      setMenuOpen(null);
    }
  };

  const formatCurrency = (amount: number) => currencyFormatter.format(amount);

  const calculateRevenue = (course: Course) => {
    return (course.total_enrollments || 0) * (course.price || 0);
  };

  if (loading) {
    return (
      <div
        style={{
          fontFamily: "Inter,sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
      >
        <div style={{ fontSize: 16, color: S.dim }}>Loading courses...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter,sans-serif" }}>
      {/* Fix #3 — error banner */}
      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: "#FEF2F2",
            border: `1px solid #FECACA`,
            borderRadius: 8,
            fontSize: 14,
            color: S.danger,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: S.danger,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: S.full,
              margin: 0,
              marginBottom: 8,
            }}
          >
            My Courses
          </h1>
          <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
            Manage and track your course content
          </p>
        </div>
        <Link
          to="/creator/create-course"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            background: S.accent,
            color: "#FFFFFF",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={20} />
          Create Course
        </Link>
      </div>

      {/* Filters & Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {/* Search bar */}
        <div
          style={{
            position: "relative",
            flex: "1 1 300px",
            minWidth: 200,
          }}
        >
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
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
          {(["all", "published", "draft"] as const).map((status) => (
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

      {/* Courses grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 24,
        }}
      >
        {courses.map((course) => (
          <div
            key={course.id}
            style={{
              background: S.card,
              borderRadius: 12,
              border: `1px solid ${S.border}`,
              overflow: "hidden",
              transition: "box-shadow 0.2s",
              cursor: "pointer",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Fix #1 — thumbnail container is the single positioning context */}
            <div style={{ position: "relative" }}>
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  style={{ width: "100%", height: 180, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 180,
                    background: S.accentLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: S.accent,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  No thumbnail
                </div>
              )}

              {/* Status badge */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  padding: "4px 10px",
                  background: course.status === "published" ? S.success : S.warning,
                  color: "#FFFFFF",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {course.status}
              </div>

              {/* Fix #1 — menu button directly in thumbnail container, no nested wrapper */}
              {/* Fix #8 — wrap with ref for click-outside */}
              <div ref={menuOpen === course.id ? menuRef : undefined} style={{ position: "absolute", top: 8, right: 8 }}>
                <button
                  onClick={() => {
                    setMenuOpen(menuOpen === course.id ? null : course.id);
                    setConfirmDeleteId(null);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.9)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <MoreVertical size={16} style={{ color: S.full }} />
                </button>

                {/* Dropdown */}
                {menuOpen === course.id && (
                  <div
                    style={{
                      position: "absolute",
                      top: 40,
                      right: 0,
                      background: S.card,
                      border: `1px solid ${S.border}`,
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      zIndex: 10,
                      minWidth: 160,
                    }}
                  >
                    <button
                      onClick={() => handleTogglePublish(course.id, course.status)}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 14,
                        color: S.full,
                      }}
                    >
                      {course.status === "published" ? "Unpublish" : "Publish"}
                    </button>

                    {/* Fix #7 — inline confirmation instead of confirm() */}
                    {confirmDeleteId === course.id ? (
                      <div style={{ padding: "10px 16px", borderTop: `1px solid ${S.border}` }}>
                        <p style={{ fontSize: 13, color: S.full, margin: "0 0 8px" }}>
                          Delete this course?
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleDeleteConfirmed(course.id)}
                            style={{
                              flex: 1,
                              padding: "6px 0",
                              background: S.danger,
                              color: "#FFF",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              flex: 1,
                              padding: "6px 0",
                              background: S.border,
                              color: S.full,
                              border: "none",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(course.id)}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          textAlign: "left",
                          border: "none",
                          borderTop: `1px solid ${S.border}`,
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                          color: S.danger,
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: 20 }}>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: S.full,
                  margin: 0,
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}
              >
                {course.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: S.dim,
                  margin: 0,
                  marginBottom: 16,
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {course.description || "No description"}
              </p>

              {/* Fix #4 — use StatItem */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  paddingTop: 16,
                  borderTop: `1px solid ${S.border}`,
                }}
              >
                <StatItem
                  icon={Users}
                  label="Students"
                  value={course.total_enrollments || 0}
                />
                <StatItem
                  icon={Star}
                  label="Rating"
                  value={course.average_rating ? course.average_rating.toFixed(1) : "—"}
                />
                <StatItem
                  icon={DollarSign}
                  label="Revenue"
                  value={formatCurrency(calculateRevenue(course))}
                />
              </div>

              {/* Footer */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: `1px solid ${S.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: S.dim }}>
                  Updated {formatNotificationTime(course.updated_at)}
                </span>
                <Link
                  to={`/creator/create-course?id=${course.id}`}
                  style={{
                    padding: "6px 14px",
                    background: S.accentLight,
                    color: S.accent,
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {courses.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            background: S.card,
            borderRadius: 12,
            border: `1px solid ${S.border}`,
          }}
        >
          <p style={{ fontSize: 16, color: S.dim, margin: 0, marginBottom: 16 }}>
            {searchQuery ? "No courses found matching your criteria" : "No courses yet"}
          </p>
          {!searchQuery && (
            <Link
              to="/creator/create-course"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                background: S.accent,
                color: "#FFFFFF",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Plus size={20} />
              Create Your First Course
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
