import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollableContent } from "@/components/ui/scrollable-content";

const LearnerVideos = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const [{ data: accessRows }, { data: completedPayments }, { data: approvedPurchases }] =
        await Promise.all([
          supabase
            .from("content_access")
            .select("content_id")
            .eq("user_id", user.id)
            .eq("content_type", "video"),
          supabase
            .from("payments")
            .select("reference_id")
            .eq("payer_id", user.id)
            .eq("payment_type", "video")
            .eq("status", "completed"),
          supabase
            .from("video_purchases")
            .select("video_id")
            .eq("user_id", user.id)
            .eq("status", "approved"),
        ]);

      const ids = Array.from(
        new Set([
          ...(accessRows || []).map((row: any) => row.content_id),
          ...(completedPayments || []).map((row: any) => row.reference_id),
          ...(approvedPurchases || []).map((row: any) => row.video_id),
        ].filter(Boolean)),
      );

      if (ids.length === 0) {
        setItems([]);
        return;
      }

      const { data: unifiedItems } = await supabase
        .from("content_items" as any)
        .select("id, title, slug, thumbnail_url, price, content_type")
        .in("id", ids)
        .order("created_at", { ascending: false });

      const unified = (unifiedItems as any[]) || [];
      const unifiedIds = new Set(unified.map((item) => item.id));
      const fallbackIds = ids.filter((id) => !unifiedIds.has(id));

      let fallback: any[] = [];
      if (fallbackIds.length > 0) {
        const { data } = await supabase
          .from("videos")
          .select("id, title, slug, thumbnail_url, price")
          .in("id", fallbackIds)
          .order("created_at", { ascending: false });

        fallback = ((data as any[]) || []).map((item) => ({
          ...item,
          content_type: "single_video",
        }));
      }

      setItems([...unified, ...fallback]);
    };

    load();
  }, [user]);

  return (
    <DashboardLayout role="learner">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Videos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{items.length} purchased video{items.length !== 1 ? "s" : ""}</p>
          </div>
          <a href="/videos" className="text-sm text-primary hover:underline font-medium">Browse more →</a>
        </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">You have not unlocked any videos yet.</p>
          <a href="/videos" className="text-primary hover:underline text-sm mt-2 inline-block">Browse videos</a>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link key={item.id} to={`/videos/${item.slug}`}
              className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
              {item.thumbnail_url
                ? <img src={item.thumbnail_url} alt={item.title} className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="aspect-video bg-primary/5 flex items-center justify-center"><span className="text-3xl">🎬</span></div>
              }
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-primary mb-1 font-medium">
                  {item.content_type === "episode_series" ? "Episode Series" : "Single Video"}
                </p>
                <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-xs text-primary font-medium mt-2">Watch now →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default LearnerVideos;
