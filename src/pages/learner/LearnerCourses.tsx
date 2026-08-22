/**
 * LearnerCourses - View all enrolled courses with progress tracking
 * Features: Grid view, tabs (In Progress/Completed/All), progress bars, certificates
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAsync } from "@/lib/portalEngine";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, PlayCircle, Award, Download, Search } from "lucide-react";

// ── Coursevia brand tokens ────────────────────────────────────────────────────
const A = "#2D9E6B";  // Primary
const D = "#0F3D2E";  // Dark
const B = "#EAE6E2";  // Border
const TS = "#6B7280"; // Text secondary

// ── Types ─────────────────────────────────────────────────────────────────────
interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  instructor_name: string | null;
  instructor_avatar: string | null;
  category: string | null;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  enrolledAt: string;
  status: "active" | "completed";
  certificate_url?: string | null;
}

// ── Data Hook ─────────────────────────────────────────────────────────────────
function useEnrolledCourses(userId: string | undefined) {
  return useAsync<Course[]>(async () => {
    if (!userId) return [];

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select(`
        id,
        course_id,
        status,
        enrolled_at,
        certificate_url,
        courses (
          id,
          title,
          description,
          thumbnail_url,
          category,
          creator_id,
          lessons:course_lessons (id)
        )
      `)
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });

    if (!enrollments) return [];

    const courses = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const course = enrollment.courses;
        const totalLessons = course.lessons?.length || 0;

        // Get instructor info
        const { data: instructor } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", course.creator_id)
          .single();

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
          description: course.description,
          thumbnail: course.thumbnail_url,
          instructor_name: instructor?.full_name || "Instructor",
          instructor_avatar: instructor?.avatar_url,
          category: course.category,
          progress: progressPercent,
          totalLessons,
          completedLessons,
          enrolledAt: enrollment.enrolled_at,
          status: enrollment.status,
          certificate_url: enrollment.certificate_url,
        };
      })
    );

    return courses;
  }, [userId]);
}

// ── Components ────────────────────────────────────────────────────────────────
const CourseCard = ({ course }: { course: Course }) => (
  <Link to={`/learner/courses/${course.id}`} style={{ textDecoration: "none", color: "inherit" }}>
    <div 
      style={{
        border: `1px solid ${B}`,
        borderRadius: 16,
        overflow: "hidden",
        background: "#fff",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Thumbnail */}
      {course.thumbnail ? (
        <img src={course.thumbnail} alt={course.title} style={{ width: "100%", height: 180, objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: 180, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BookOpen size={56} style={{ color: TS }} />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Category badge */}
        {course.category && (
          <span style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 6,
            background: `${A}15`,
            fontFamily: "Inter,sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: A,
            marginBottom: 10,
            width: "fit-content",
          }}>
            {course.category}
          </span>
        )}

        {/* Title */}
        <h3 style={{
          fontFamily: "Inter,sans-serif",
          fontWeight: 700,
          fontSize: 16,
          color: D,
          margin: "0 0 8px",
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p style={{
            fontFamily: "Inter,sans-serif",
            fontSize: 13,
            color: TS,
            margin: "0 0 12px",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {course.description}
          </p>
        )}

        {/* Instructor */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E5E7EB", overflow: "hidden", flexShrink: 0 }}>
            {course.instructor_avatar ? (
              <img src={course.instructor_avatar} alt={course.instructor_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 700, color: TS }}>
                {course.instructor_name?.charAt(0)}
              </div>
            )}
          </div>
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS }}>
            by {course.instructor_name}
          </span>
        </div>

        {/* Progress */}
        <div style={{ marginTop: "auto" }}>
          {course.status === "completed" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #86EFAC" }}>
              <Award size={18} style={{ color: "#15803D" }} />
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#15803D" }}>
                Completed
              </span>
              {course.certificate_url && (
                <a 
                  href={course.certificate_url} 
                  download 
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginLeft: "auto", padding: "4px 8px", borderRadius: 6, background: "#15803D", color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Download size={12} />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 600 }}>Certificate</span>
                </a>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: TS }}>
                  {course.completedLessons} / {course.totalLessons} lessons
                </span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: A }}>
                  {course.progress}%
                </span>
              </div>
              <div style={{ width: "100%", height: 8, background: "#E5E7EB", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${course.progress}%`, height: "100%", background: A, borderRadius: 4, transition: "width 0.3s" }} />
              </div>
              <button 
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  marginTop: 12,
                  borderRadius: 8,
                  border: "none",
                  background: A,
                  fontFamily: "Inter,sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <PlayCircle size={16} />
                {course.progress === 0 ? "Start Course" : "Continue"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  </Link>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function LearnerCourses() {
  const { user } = useAuth();
  const { data: courses, loading } = useEnrolledCourses(user?.id);
  const [activeTab, setActiveTab] = useState<"all" | "in-progress" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter courses based on tab and search
  const filteredCourses = courses?.filter(course => {
    // Tab filter
    if (activeTab === "in-progress" && course.status !== "active") return false;
    if (activeTab === "completed" && course.status !== "completed") return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        course.title.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query) ||
        course.instructor_name?.toLowerCase().includes(query) ||
        course.category?.toLowerCase().includes(query)
      );
    }
    
    return true;
  }) || [];

  const inProgressCount = courses?.filter(c => c.status === "active").length || 0;
  const completedCount = courses?.filter(c => c.status === "completed").length || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 28, color: D, margin: "0 0 8px" }}>
            My Courses
          </h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS }}>
            {loading ? "Loading your courses..." : `${courses?.length || 0} enrolled course${courses?.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* ── Tabs & Search ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, background: "#fff", padding: 4, borderRadius: 10, border: `1px solid ${B}` }}>
            <button
              onClick={() => setActiveTab("all")}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                background: activeTab === "all" ? A : "transparent",
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
                fontSize: 13,
                color: activeTab === "all" ? "#fff" : TS,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              All {courses && courses.length > 0 && `(${courses.length})`}
            </button>
            <button
              onClick={() => setActiveTab("in-progress")}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                background: activeTab === "in-progress" ? A : "transparent",
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
                fontSize: 13,
                color: activeTab === "in-progress" ? "#fff" : TS,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              In Progress {inProgressCount > 0 && `(${inProgressCount})`}
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                background: activeTab === "completed" ? A : "transparent",
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
                fontSize: 13,
                color: activeTab === "completed" ? "#fff" : TS,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Completed {completedCount > 0 && `(${completedCount})`}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: TS }} />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 42px",
                borderRadius: 10,
                border: `1px solid ${B}`,
                fontFamily: "Inter,sans-serif",
                fontSize: 14,
                color: D,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* ── Course Grid ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader2 size={40} className="animate-spin" style={{ color: A }} />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 16, border: `1px solid ${B}` }}>
            <BookOpen size={64} style={{ color: TS, margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: 18, color: D, margin: "0 0 8px" }}>
              {searchQuery ? "No courses found" : activeTab === "completed" ? "No completed courses yet" : activeTab === "in-progress" ? "No courses in progress" : "No enrolled courses"}
            </h3>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: TS, margin: "0 0 20px" }}>
              {searchQuery ? "Try a different search term" : "Start your learning journey by enrolling in a course"}
            </p>
            {!searchQuery && (
              <Link 
                to="/explore" 
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
                Browse Courses
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
