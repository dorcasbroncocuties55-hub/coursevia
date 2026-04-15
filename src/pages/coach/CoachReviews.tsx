import { useEffect, useState } from "react";
import { PageLoading } from "@/components/LoadingSpinner";`nimport DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";
import { toast } from "sonner";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: { full_name?: string | null } | null;
};

const CoachReviews = () => {
  const { user , loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
            try {
        setLoading(true);
        const { data: profile } = await supabase
          .from("coach_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile?.id) {
          setReviews([]);
          return;
        }

        const { data, error } = await supabase
          .from("reviews")
          .select("id,rating,comment,created_at, profiles:reviewer_id(full_name)")
          .eq("reviewable_id", profile.id)
          .eq("reviewable_type", "coach")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setReviews((data || []).map((row: any) => ({
          ...row,
          reviewer: row.profiles || null,
        })));
      } catch (error: any) {
        toast.error(error.message || "Could not load reviews.");
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [user]);

  return (
    <DashboardLayout role="coach">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Reviews</h1>
      <div className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading reviews...</p> : null}
        {!loading && reviews.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No verified reviews yet.</p>
          </div>
        ) : null}
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={14} className={star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{review.reviewer?.full_name || "Verified learner"}</span>
              <span className="text-xs text-muted-foreground">• {new Date(review.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-foreground">{review.comment || "No written comment."}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default CoachReviews;

