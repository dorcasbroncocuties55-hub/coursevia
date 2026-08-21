import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, MoreVertical, Users, Star, DollarSign, TrendingUp } from "lucide-react";

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

// Mock courses - will be replaced with real Supabase queries
const COURSES = [
  {
    id: 1,
    title: "Advanced React Patterns",
    description: "Master advanced React patterns and best practices for scalable applications",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop",
    status: "published",
    students: 342,
    rating: 4.9,
    reviews: 89,
    revenue: "$8,550",
    lastUpdated: "2 days ago",
  },
  {
    id: 2,
    title: "TypeScript Masterclass",
    description: "Complete guide to TypeScript from basics to advanced concepts",
    thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=225&fit=crop",
    status: "published",
    students: 289,
    rating: 4.8,
    reviews: 67,
    revenue: "$7,225",
    lastUpdated: "1 week ago",
  },
  {
    id: 3,
    title: "Node.js Backend Development",
    description: "Build scalable REST APIs and microservices with Node.js and Express",
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=225&fit=crop",
    status: "published",
    students: 256,
    rating: 4.7,
    reviews: 54,
    revenue: "$6,400",
    lastUpdated: "3 days ago",
  },
  {
    id: 4,
    title: "Full Stack Development",
    description: "Complete full-stack development course with React, Node.js, and MongoDB",
    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=225&fit=crop",
    status: "draft",
    students: 0,
    rating: 0,
    reviews: 0,
    revenue: "$0",
    lastUpdated: "1 day ago",
  },
];

export default function CreatorCourses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const filteredCourses = COURSES.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            color: S.full, 
            margin: 0, 
            marginBottom: 8 
          }}>
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
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 16, 
        marginBottom: 24,
        flexWrap: "wrap",
      }}>
        {/* Search bar */}
        <div style={{ 
          position: "relative", 
          flex: "1 1 300px",
          minWidth: 200,
        }}>
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
          {(["all", "published", "draft"] as const).map(status => (
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
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: 24,
      }}>
        {filteredCourses.map(course => (
          <div 
            key={course.id}
            style={{
              background: S.card,
              borderRadius: 12,
              border: `1px solid ${S.border}`,
              overflow: "hidden",
              transition: "box-shadow 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Thumbnail */}
            <div style={{ position: "relative" }}>
              <img 
                src={course.thumbnail} 
                alt={course.title}
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                }}
              />
              {/* Status badge */}
              <div style={{
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
              }}>
                {course.status}
              </div>
              {/* Menu button */}
              <button style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}>
                <MoreVertical size={16} style={{ color: S.full }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: 20 }}>
              <h3 style={{ 
                fontSize: 17, 
                fontWeight: 600, 
                color: S.full, 
                margin: 0, 
                marginBottom: 8,
                lineHeight: 1.4,
              }}>
                {course.title}
              </h3>
              <p style={{ 
                fontSize: 14, 
                color: S.dim, 
                margin: 0, 
                marginBottom: 16,
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {course.description}
              </p>

              {/* Stats */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                paddingTop: 16,
                borderTop: `1px solid ${S.border}`,
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 6,
                    fontSize: 13,
                    color: S.dim,
                  }}>
                    <Users size={14} />
                    Students
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: S.full }}>
                    {course.students}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 6,
                    fontSize: 13,
                    color: S.dim,
                  }}>
                    <Star size={14} />
                    Rating
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: S.full }}>
                    {course.rating > 0 ? course.rating : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 6,
                    fontSize: 13,
                    color: S.dim,
                  }}>
                    <DollarSign size={14} />
                    Revenue
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: S.full }}>
                    {course.revenue}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                marginTop: 16,
                paddingTop: 16,
                borderTop: `1px solid ${S.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 13, color: S.dim }}>
                  Updated {course.lastUpdated}
                </span>
                <button style={{
                  padding: "6px 14px",
                  background: S.accentLight,
                  color: S.accent,
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}>
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredCourses.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "80px 20px",
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
        }}>
          <p style={{ fontSize: 16, color: S.dim, margin: 0 }}>
            No courses found matching your criteria
          </p>
        </div>
      )}
    </div>
  );
}
