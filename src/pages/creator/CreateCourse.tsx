import { useState } from "react";
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  GripVertical, 
  Trash2, 
  Eye,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

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
};

interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "article" | "quiz";
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export default function CreateCourse() {
  const [activeTab, setActiveTab] = useState<"basic" | "curriculum" | "pricing">("basic");
  const [courseData, setCourseData] = useState({
    title: "",
    description: "",
    category: "",
    level: "beginner",
    price: "",
    thumbnail: null as File | null,
  });
  
  const [sections, setSections] = useState<Section[]>([
    {
      id: "1",
      title: "Introduction",
      lessons: [
        { id: "1-1", title: "Welcome to the Course", duration: "5:30", type: "video" },
        { id: "1-2", title: "Course Overview", duration: "3:45", type: "article" },
      ],
    },
  ]);

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: Date.now().toString(),
        title: "New Section",
        lessons: [],
      },
    ]);
  };

  const addLesson = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId
        ? {
            ...section,
            lessons: [
              ...section.lessons,
              {
                id: `${sectionId}-${Date.now()}`,
                title: "New Lesson",
                duration: "0:00",
                type: "video",
              },
            ],
          }
        : section
    ));
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const deleteLesson = (sectionId: string, lessonId: string) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? { ...section, lessons: section.lessons.filter(l => l.id !== lessonId) }
        : section
    ));
  };

  return (
    <div style={{ fontFamily: "Inter,sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link 
          to="/creator/courses"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: S.accent,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} />
          Back to Courses
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: S.full, margin: 0, marginBottom: 8 }}>
              Create New Course
            </h1>
            <p style={{ fontSize: 15, color: S.dim, margin: 0 }}>
              Build your course content and curriculum
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: S.card,
              border: `1px solid ${S.border}`,
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              color: S.full,
              cursor: "pointer",
            }}>
              <Eye size={18} />
              Preview
            </button>
            <button style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: S.accent,
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              color: "#FFFFFF",
              cursor: "pointer",
            }}>
              <Save size={18} />
              Save & Publish
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: 0, 
        borderBottom: `2px solid ${S.border}`,
        marginBottom: 32,
      }}>
        {(["basic", "curriculum", "pricing"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 24px",
              background: "transparent",
              border: "none",
              borderBottom: `3px solid ${activeTab === tab ? S.accent : "transparent"}`,
              color: activeTab === tab ? S.accent : S.dim,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
              marginBottom: -2,
            }}
          >
            {tab === "basic" ? "Basic Info" : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{
            background: S.card,
            borderRadius: 12,
            border: `1px solid ${S.border}`,
            padding: 32,
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: S.full, margin: 0, marginBottom: 24 }}>
              Course Information
            </h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Title */}
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: S.full, 
                  marginBottom: 8 
                }}>
                  Course Title *
                </label>
                <input 
                  type="text"
                  placeholder="e.g., Advanced React Patterns"
                  value={courseData.title}
                  onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: `1px solid ${S.border}`,
                    borderRadius: 8,
                    fontSize: 15,
                    fontFamily: "Inter,sans-serif",
                    outline: "none",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: S.full, 
                  marginBottom: 8 
                }}>
                  Description *
                </label>
                <textarea 
                  placeholder="Describe what students will learn..."
                  value={courseData.description}
                  onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                  rows={5}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: `1px solid ${S.border}`,
                    borderRadius: 8,
                    fontSize: 15,
                    fontFamily: "Inter,sans-serif",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Category & Level */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    fontSize: 14, 
                    fontWeight: 600, 
                    color: S.full, 
                    marginBottom: 8 
                  }}>
                    Category *
                  </label>
                  <select 
                    value={courseData.category}
                    onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: `1px solid ${S.border}`,
                      borderRadius: 8,
                      fontSize: 15,
                      fontFamily: "Inter,sans-serif",
                      outline: "none",
                      background: S.card,
                    }}
                  >
                    <option value="">Select category</option>
                    <option value="development">Development</option>
                    <option value="design">Design</option>
                    <option value="business">Business</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                <div>
                  <label style={{ 
                    display: "block", 
                    fontSize: 14, 
                    fontWeight: 600, 
                    color: S.full, 
                    marginBottom: 8 
                  }}>
                    Level *
                  </label>
                  <select 
                    value={courseData.level}
                    onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: `1px solid ${S.border}`,
                      borderRadius: 8,
                      fontSize: 15,
                      fontFamily: "Inter,sans-serif",
                      outline: "none",
                      background: S.card,
                    }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: S.full, 
                  marginBottom: 8 
                }}>
                  Course Thumbnail *
                </label>
                <div style={{
                  border: `2px dashed ${S.border}`,
                  borderRadius: 8,
                  padding: 40,
                  textAlign: "center",
                  cursor: "pointer",
                }}>
                  <Upload size={32} style={{ color: S.dim, margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 14, color: S.dim, margin: 0, marginBottom: 4 }}>
                    Drop your image here, or <span style={{ color: S.accent, fontWeight: 600 }}>browse</span>
                  </p>
                  <p style={{ fontSize: 13, color: S.dim, margin: 0 }}>
                    Recommended: 1920x1080px (16:9 ratio)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "curriculum" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Sections */}
          {sections.map((section, sectionIndex) => (
            <div 
              key={section.id}
              style={{
                background: S.card,
                borderRadius: 12,
                border: `1px solid ${S.border}`,
                overflow: "hidden",
              }}
            >
              {/* Section Header */}
              <div style={{
                padding: "20px 24px",
                background: S.accentLight,
                borderBottom: `1px solid ${S.border}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <GripVertical size={20} style={{ color: S.dim, cursor: "grab" }} />
                <div style={{ flex: 1 }}>
                  <input 
                    type="text"
                    value={section.title}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[sectionIndex].title = e.target.value;
                      setSections(newSections);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: `1px solid ${S.border}`,
                      borderRadius: 6,
                      fontSize: 16,
                      fontWeight: 600,
                      fontFamily: "Inter,sans-serif",
                      outline: "none",
                      background: S.card,
                    }}
                  />
                </div>
                <button
                  onClick={() => addLesson(section.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    background: S.accent,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={16} />
                  Add Lesson
                </button>
                <button
                  onClick={() => deleteSection(section.id)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    border: `1px solid ${S.border}`,
                    background: S.card,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={16} style={{ color: "#EF4444" }} />
                </button>
              </div>

              {/* Lessons */}
              <div style={{ padding: 0 }}>
                {section.lessons.map((lesson, lessonIndex) => (
                  <div 
                    key={lesson.id}
                    style={{
                      padding: "16px 24px",
                      borderBottom: lessonIndex < section.lessons.length - 1 ? `1px solid ${S.border}` : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <GripVertical size={18} style={{ color: S.dim, cursor: "grab" }} />
                    <div style={{ flex: 1, display: "flex", gap: 12, alignItems: "center" }}>
                      <input 
                        type="text"
                        value={lesson.title}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[sectionIndex].lessons[lessonIndex].title = e.target.value;
                          setSections(newSections);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: `1px solid ${S.border}`,
                          borderRadius: 6,
                          fontSize: 14,
                          fontFamily: "Inter,sans-serif",
                          outline: "none",
                        }}
                      />
                      <select 
                        value={lesson.type}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[sectionIndex].lessons[lessonIndex].type = e.target.value as "video" | "article" | "quiz";
                          setSections(newSections);
                        }}
                        style={{
                          padding: "8px 12px",
                          border: `1px solid ${S.border}`,
                          borderRadius: 6,
                          fontSize: 14,
                          fontFamily: "Inter,sans-serif",
                          outline: "none",
                          background: S.card,
                          minWidth: 120,
                        }}
                      >
                        <option value="video">Video</option>
                        <option value="article">Article</option>
                        <option value="quiz">Quiz</option>
                      </select>
                      <input 
                        type="text"
                        value={lesson.duration}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[sectionIndex].lessons[lessonIndex].duration = e.target.value;
                          setSections(newSections);
                        }}
                        placeholder="0:00"
                        style={{
                          width: 80,
                          padding: "8px 12px",
                          border: `1px solid ${S.border}`,
                          borderRadius: 6,
                          fontSize: 14,
                          fontFamily: "Inter,sans-serif",
                          outline: "none",
                          textAlign: "center",
                        }}
                      />
                    </div>
                    <button
                      onClick={() => deleteLesson(section.id, lesson.id)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={16} style={{ color: S.dim }} />
                    </button>
                  </div>
                ))}
                {section.lessons.length === 0 && (
                  <div style={{ 
                    padding: "32px 24px", 
                    textAlign: "center",
                    color: S.dim,
                    fontSize: 14,
                  }}>
                    No lessons yet. Click "Add Lesson" to get started.
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add Section Button */}
          <button
            onClick={addSection}
            style={{
              width: "100%",
              padding: "16px",
              background: S.card,
              border: `2px dashed ${S.border}`,
              borderRadius: 12,
              color: S.accent,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Plus size={20} />
            Add New Section
          </button>
        </div>
      )}

      {activeTab === "pricing" && (
        <div style={{
          background: S.card,
          borderRadius: 12,
          border: `1px solid ${S.border}`,
          padding: 32,
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: S.full, margin: 0, marginBottom: 24 }}>
            Pricing & Settings
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 500 }}>
            <div>
              <label style={{ 
                display: "block", 
                fontSize: 14, 
                fontWeight: 600, 
                color: S.full, 
                marginBottom: 8 
              }}>
                Course Price *
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 15,
                  color: S.dim,
                  fontWeight: 600,
                }}>
                  $
                </span>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={courseData.price}
                  onChange={(e) => setCourseData({ ...courseData, price: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px 12px 32px",
                    border: `1px solid ${S.border}`,
                    borderRadius: 8,
                    fontSize: 15,
                    fontFamily: "Inter,sans-serif",
                    outline: "none",
                  }}
                />
              </div>
              <p style={{ fontSize: 13, color: S.dim, margin: "8px 0 0" }}>
                Set to $0 for a free course
              </p>
            </div>

            <div style={{
              padding: 16,
              background: S.accentLight,
              borderRadius: 8,
              border: `1px solid ${S.accent}30`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <SettingsIcon size={18} style={{ color: S.accent }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: S.accent }}>
                  Course Settings
                </span>
              </div>
              <p style={{ fontSize: 13, color: S.dim, margin: 0, lineHeight: 1.6 }}>
                Additional settings like enrollment limits, completion certificates, and course access duration can be configured after publishing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
