import { PageLoading } from "@/components/LoadingSpinner";`nimport DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/LoadingSpinner";`nimport { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";

type EditingState = {
  id: string;
  value: string;
} | null;

const CreatorContent = () => {
  const { user, roles , loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<EditingState>(null);

  const portalRole = useMemo(() => {
    if (roles.includes("coach")) return "coach";
    if (roles.includes("therapist")) return "therapist";
    return "creator";
  }, [roles]);

  const roleLabel = useMemo(() => {
    if (portalRole === "coach") return "Coach";
    if (portalRole === "therapist") return "Therapist";
    return "Creator";
  }, [portalRole]);

  const loadData = async () => {
        const { data } = await supabase
      .from("content_items" as any)
      .select("*, content_episodes(count)")
      .eq("owner_id", user.id)
      .eq("owner_role", portalRole)
      .order("created_at", { ascending: false });

    setItems((data as any[]) || []);
  };

  useEffect(() => {
    loadData();
  }, [user, portalRole]);

  const startEdit = (id: string, price: number) => {
    setEditing({ id, value: String(price ?? 0) });
  };

  const cancelEdit = () => setEditing(null);

  const savePrice = async () => {
    if (!editing) return;
    const nextPrice = parseFloat(editing.value);

    if (Number.isNaN(nextPrice) || nextPrice < 0) {
      toast.error("Enter a valid price.");
      return;
    }

    const { error } = await supabase
      .from("content_items" as any)
      .update({ price: nextPrice } as any)
      .eq("id", editing.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Price updated");
    setEditing(null);
    loadData();
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("content_items" as any)
      .update({ is_published: !current } as any)
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Content updated");
    loadData();
  };

  return (
    <DashboardLayout role={portalRole as any}>
      <h1 className="text-2xl font-bold text-foreground mb-6">{roleLabel} Content Manager</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Publish and manage single videos, episode series, and courses from your {roleLabel.toLowerCase()} portal.
      </p>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
            No unified content published yet.
          </div>
        ) : items.map((item) => (
          <div key={item.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary mb-2">
                  {String(item.content_type).replace("_", " ")}
                </p>
                <h2 className="font-semibold text-foreground">{item.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {editing?.id === item.id ? (
                  <>
                    <Input
                      className="w-28"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editing.value}
                      onChange={(e) =>
                        setEditing((prev) => (prev ? { ...prev, value: e.target.value } : prev))
                      }
                    />
                    <Button size="icon" variant="outline" onClick={savePrice}>
                      <Save size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEdit}>
                      <X size={16} />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-sm font-bold">
                      ${Number(item.price || 0).toFixed(2)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(item.id, item.price)}
                    >
                      <Pencil size={16} />
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => togglePublish(item.id, !!item.is_published)}>
                  {item.is_published ? "Unpublish" : "Publish"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default CreatorContent;

