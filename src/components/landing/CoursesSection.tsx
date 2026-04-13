import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Star, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";

const HARDCODED_CATEGORIES = [
  "Development", "Business", "Design", "Marketing",
  "Finance", "Health & Wellness", "Technology", "Personal Development",
];

const CourseCard = ({ course }: { course: any }) => (
  <Link
    to={`/courses/${course.slug}`}
    className="group flex-shrink-0 w-56 bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5"
  >
    <div className="relative aspect-video overflow-hidden bg-gray-100">
      {course.thumbnail_url ? (
        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-primary/5">
          <BookOpen size={28} className="text-primary/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="bg-white rounded-full p-2 shadow"><PlayCircle size={18} className="text-primary" /></div>
      </div>
    </div>
    <div className="p-3">
      <h3 className="font-bold text-gray-900 text-xs line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-1">
        {course.title}
      </h3>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[11px] font-bold text-amber-700">{Number(course.rating || 4.5).toFixed(1)}</span>
        <div className="flex">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={10} className={i <= Math.round(Number(course.rating || 4.5)) ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
          ))}
        </div>
        <span className="text-[10px] text-gray-400">({course.total_students || 0})</span>
      </div>
      <p className="font-bold text-gray-900 text-sm">
        {Number(course.price || 0) === 0
          ? <span className="text-primary">Free</span>
          : `$${Number(course.price).toFixed(2)}`
        }
      </p>
    </div>
  </Link>
);

const CategoryRow = ({ category, courses }: { category: string; courses: any[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (courses.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{category}</h2>
        <Link
          to={`/courses?category=${encodeURIComponent(category)}`}
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
        >
          See all <ChevronRight size={14} />
        </Link>
      </div>
      <div className="relative group/row">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-1.5 shadow-md opacity-0 group-hover/row:opacity-100 transition-opacity -translate-x-3 hover:bg-gray-50"
        >
          <ChevronLeft size={16} className="text-gray-700" />
        </button>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-1.5 shadow-md opacity-0 group-hover/row:opacity-100 transition-opacity translate-x-3 hover:bg-gray-50"
        >
          <ChevronRight size={16} className="text-gray-700" />
        </button>
      </div>
    </div>
  );
};

const CoursesSection = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Load categories from DB, fallback to hardcoded
      const { data: catData } = await supabase.from("categories").select("name").order("name");
      const catNames = catData && catData.length > 0
        ? catData.map((c: any) => c.name).filter((n: string) =>
            !["Therapy","Counseling","Mental Health","Coaching","Life Coaching","Sports Coaching"].includes(n)
          )
        : HARDCODED_CATEGORIES;
      setCategories(catNames);

      // Load courses
      const { data } = await supabase
        .from("courses")
        .select("*, categories(name)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(40);
      setCourses(data || []);
      setLoading(false);
    };
    load();
  }, []);

  // Group courses by category
  const coursesByCategory = categories.reduce((acc, cat) => {
    const catCourses = courses.filter(c => {
      const hay = `${c.title} ${c.description || ""} ${c.category || ""} ${c.categories?.name || ""}`.toLowerCase();
      return hay.includes(cat.toLowerCase());
    });
    if (catCourses.length > 0) acc[cat] = catCourses;
    return acc;
  }, {} as Record<string, any[]>);

  // All courses for "All" row
  const featuredCourses = courses.slice(0, 8);

  return (
    <section className="py-16 bg-white">
      <div className="container-wide">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Explore our <span className="text-primary">courses</span>
            </h2>
            <p className="text-gray-500 mt-1">Learn from expert instructors at your own pace</p>
          </div>
          <Link to="/courses" className="text-sm font-medium text-primary hover:underline hidden sm:flex items-center gap-1">
            Browse all courses <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-56 rounded-xl bg-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3" />
            <p>No courses yet. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Featured row */}
            <CategoryRow category="Featured Courses" courses={featuredCourses} />

            {/* Per-category rows */}
            {Object.entries(coursesByCategory).map(([cat, catCourses]) => (
              <CategoryRow key={cat} category={cat} courses={catCourses} />
            ))}
          </>
        )}

        {/* Browse all */}
        <div className="flex justify-center mt-4">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 border-2 border-primary text-primary font-semibold px-8 py-3 rounded-full hover:bg-primary hover:text-white transition-colors"
          >
            Browse All Courses <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
