import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { BookOpen, Clock, PlayCircle, Star, TrendingUp } from "lucide-react";
import { SiteSearch360 } from "@/components/search/SiteSearch360";

const SITE_SEARCH_360_ID = "57286"; // Your Site Search 360 ID

const Courses = () => {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("content_items" as any)
        .select("*")
        .eq("content_type", "course")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) { 
        setCourses(data as any[]); 
        return; 
      }

      const fallback = await supabase
        .from("courses")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setCourses(fallback.data || []);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white px-4 py-14 lg:py-20">
        <div className="container-wide">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <TrendingUp size={14} /> Course Marketplace
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Learn on your schedule with{" "}
                <span className="text-primary">premium video-first courses.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-slate-600">
                Structured learning products from expert creators. Browse by category, preview for free, and own your progress.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={15} className="text-primary" /> {courses.length}+ courses
                </span>
                <span className="flex items-center gap-1.5">
                  <Star size={15} className="text-amber-500 fill-amber-500" /> Expert creators
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-primary" /> Self-paced
                </span>
              </div>
            </div>

            {/* Site Search 360 Search Box */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Find your next course
              </label>
              <SiteSearch360 siteId={SITE_SEARCH_360_ID} />
            </div>
          </div>
        </div>
      </section>

      {/* Course Grid */}
      <section className="container-wide py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            All Courses{" "}
            <span className="ml-1 text-base font-normal text-slate-400">
              ({courses.length})
            </span>
          </h2>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center text-slate-400 shadow-sm">
            No courses found.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <BookOpen size={32} className="text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-primary shadow">
                      <PlayCircle size={22} />
                    </div>
                  </div>
                  {course.category && (
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      {course.category}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-primary transition">
                    {course.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                    {course.short_description || course.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-sm">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span className="font-medium text-slate-800">
                      {Number(course.rating || 5).toFixed(1)}
                    </span>
                    <span className="text-slate-400">
                      · {course.total_students || 0} students
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-lg font-bold text-slate-950">
                      {Number(course.price || 0) === 0 ? (
                        <span className="text-emerald-600">Free</span>
                      ) : (
                        `$${Number(course.price).toFixed(2)}`
                      )}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      View course →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Courses;
