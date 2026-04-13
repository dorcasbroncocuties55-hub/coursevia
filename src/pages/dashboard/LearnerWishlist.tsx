import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const LearnerWishlist = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!user) return;
    const { data } = await supabase.from("wishlists").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWishlist(); }, [user]);

  const removeItem = async (id: string) => {
    await supabase.from("wishlists").delete().eq("id", id);
    toast.success("Removed from wishlist");
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <DashboardLayout role="learner">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wishlist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
              <Heart size={24} className="text-rose-400" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Your wishlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">Save courses and videos you want to come back to</p>
            <Button asChild><Link to="/courses">Browse Courses</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Heart size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground capitalize">{String(item.content_type || "content").replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.content_id?.slice(0, 16)}…</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/${item.content_type?.includes("video") ? "videos" : "courses"}/${item.content_id}`}>
                      <ExternalLink size={14} />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default LearnerWishlist;
