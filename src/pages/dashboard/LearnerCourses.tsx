import { PageLoading } from "@/components/LoadingSpinner";`nimport DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";`nimport { Navigate, Navigate } from "react-router-dom";
import { BookOpen, PlayCircle, ArrowRight } from "lucide-react";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { Button } from "@/components/ui/button";

const LearnerCourses = () => {
  const { user , loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
        const load = async () => {
      const { data } = await supabase
        .from("content_access")
        .select("content_id, content_type, created_at")
        .eq("user_id", user.id)
        .eq("content_type", "course");

      if (!data?.length) { setLoading(false); return; }

      const ids = data.map(d => d.content_id);
      const { data: items } = await supabase
        .from("content_items" as any)
        .select("id, title, slug, thumbnail_url, description")
        .in("id", ids);

      setCourses(items || []);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <DashboardLayout role="learner">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{courses.length} enrolled course{courses.length !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild size="sm">
            <Link to="/courses">Browse More <ArrowRight size={14} className="ml-1" /></Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen size={24} className="text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No courses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Enroll in a course to start learning</p>
            <Button asChild><Link to="/courses">Browse Courses</Link></Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <Link key={c.id} to={`/courses/${c.slug}`}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {c.thumbnail_url
                    ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center bg-primary/5"><BookOpen size={32} className="text-primary/30" /></div>
                  }
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white rounded-full p-2.5 shadow"><PlayCircle size={20} className="text-primary" /></div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{c.title}</h3>
                  {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                  <p className="text-xs text-primary font-medium mt-3">Continue learning →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default LearnerCourses;

