import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { BookOpen, PlayCircle, Search, Star, ChevronRight } from "lucide-react";

// Same categories as home page
const CATEGORIES = [
  { label: "All",                  icon: "🎯" },
  { label: "Development",          icon: "💻" },
  { label: "Business",             icon: "💼" },
  { label: "Design",               icon: "🎨" },
  { label: "Marketing",            icon: "📣" },
  { label: "Finance",              icon: "💰" },
  { label: "Health & Wellness",    icon: "🧘" },
  { label: "Music",                icon: "🎵" },
  { label: "Photography",          icon: "📷" },
  { label: "Personal Development", icon: "🌱" },
  { label: "Technology",           icon: "⚙️" },
  { label: "Language",             icon: "🌍" },
  { label: "Data Science",         icon: "📊" },
  { label: "AI & Machine Learning",icon: "🤖" },
];

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest" },
  { value: "popular",    label: "Most Popular" },
  { value: "price_low",  label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "rating",     label: "Highest Rated" },
];

const Courses = () => {
  const [courses, setCourses]           = useState<any[]>([]);
  const [query, setQuery]               = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory]         = useState("All");
  const [sort, setSort]                 = useState("newest");
  const [loading, setLoading]           = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("content_items" as any)
        .select("*")
        .eq("content_type", "course")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) { setCourses(data as any[]); setLoading(false); return; }

      const fallback = await supabase
        .from("courses")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setCourses(fallback.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = courses.filter((c) => {
      const hay = `${c.title} ${c.short_description || ""} ${c.description || ""} ${c.category || ""}`.toLowerCase();
      return (
        (!debouncedQuery.trim() || hay.includes(debouncedQuery.toLowerCase())) &&
        (category === "All" || hay.includes(category.toLowerCase()))
      );
    });
    switch (sort) {
      case "popular":    result = [...result].sort((a, b) => (b.total_students || 0) - (a.total_students || 0)); break;
      case "price_low":  result = [...result].sort((a, b) => Number(a.price || 0) - Number(b.price || 0)); break;
      case "price_high": result = [...result].sort((a, b) => Number(b.price || 0) - Number(a.price || 0)); break;
      case "rating":     result = [...result].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)); break;
    }
    return result;
  }, [courses, debouncedQuery, category, sort]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero - green brand */}
      <section className="bg-primary text-white px-4 py-12">
        <div className="container-wide">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-3">Learn without limits</h1>
            <p className="text-lg text-white/80 mb-6">
              Start, switch, or advance your career with courses from expert instructors.
            </p>
            <div className="flex items-center gap-3 bg-white rounded-xl overflow-hidden pr-2 shadow-lg">
              <div className="flex items-center gap-2 flex-1 px-4 py-3">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder="Search for anything"
                  className="w-full bg-transparent text-gray-900 text-sm outline-none"
                />
              </div>
              <button className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category tabs - green active state */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
        <div className="container-wide">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setCategory(cat.label)}
                className={`flex items-center gap-1.5 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  category === cat.label
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-600 hover:text-primary"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-wide py-8">

        {/* Results bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{filtered.length} results</span>
            {category !== "All" && (
              <span className="flex items-center gap-1 text-primary">
                <ChevronRight size={14} /> {category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white outline-none focus:border-primary"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Featured row */}
        {category === "All" && !debouncedQuery && courses.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Featured Courses</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {courses.slice(0, 4).map(course => (
                <CourseCard key={course.id} course={course} featured />
              ))}
            </div>
          </div>
        )}

        {/* Main grid */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {debouncedQuery ? `Results for "${debouncedQuery}"` : category !== "All" ? category : "All Courses"}
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl bg-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-video bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-20 text-center">
              <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No courses found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {filtered.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

const CourseCard = ({ course, featured = false }: { course: any; featured?: boolean }) => (
  <Link
    to={`/courses/${course.slug}`}
    className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5"
  >
    {/* Thumbnail */}
    <div className="relative aspect-video overflow-hidden bg-gray-100">
      {course.thumbnail_url ? (
        <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/5">
          <BookOpen size={32} className="text-primary/30" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-white rounded-full p-2.5 shadow-lg">
          <PlayCircle size={20} className="text-primary" />
        </div>
      </div>
      {featured && (
        <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">
          FEATURED
        </span>
      )}
    </div>

    {/* Info */}
    <div className="p-3">
      <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug">
        {course.title}
      </h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
        {course.short_description || course.description}
      </p>

      {/* Rating */}
      <div className="flex items-center gap-1 mt-2">
        <span className="text-xs font-bold text-amber-700">{Number(course.rating || 4.5).toFixed(1)}</span>
        <div className="flex">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={11} className={i <= Math.round(Number(course.rating || 4.5)) ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
          ))}
        </div>
        <span className="text-xs text-gray-500">({course.total_students || 0})</span>
      </div>

      {/* Price */}
      <div className="mt-2 flex items-center gap-2">
        <span className="font-bold text-gray-900 text-sm">
          {Number(course.price || 0) === 0 ? (
            <span className="text-primary">Free</span>
          ) : (
            `$${Number(course.price).toFixed(2)}`
          )}
        </span>
        {Number(course.original_price || 0) > Number(course.price || 0) && (
          <span className="text-xs text-gray-400 line-through">${Number(course.original_price).toFixed(2)}</span>
        )}
      </div>
    </div>
  </Link>
);

export default Courses;
