import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BookOpen, Clock, Star, TrendingUp } from "lucide-react";
import { AlgoliaSearch } from "@/components/search/AlgoliaSearch";
import { isAlgoliaConfigured } from "@/lib/algolia";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fallback to original search if Algolia not configured
import CoursesOriginal from "./Courses";

const CoursesWithAlgolia = () => {
  const [courseCount, setCourseCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      const { data } = await supabase
        .from("content_items" as any)
        .select("id", { count: "exact", head: true })
        .eq("content_type", "course")
        .eq("is_published", true);

      setCourseCount(data?.length || 0);
    };
    loadCount();
  }, []);

  // Fallback to original if Algolia not configured
  if (!isAlgoliaConfigured()) {
    return <CoursesOriginal />;
  }

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
                  <BookOpen size={15} className="text-primary" /> {courseCount}+ courses
                </span>
                <span className="flex items-center gap-1.5">
                  <Star size={15} className="text-amber-500 fill-amber-500" /> Expert creators
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-primary" /> Self-paced
                </span>
              </div>
            </div>

            {/* Algolia Search Component */}
            <AlgoliaSearch />
          </div>
        </div>
      </section>

      {/* Results Section - Handled by AlgoliaSearch component */}
      <section className="container-wide py-12">
        {/* Results are rendered by InstantSearch inside AlgoliaSearch component */}
      </section>

      <Footer />
    </div>
  );
};

export default CoursesWithAlgolia;
