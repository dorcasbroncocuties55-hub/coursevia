import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { getProviderRecord, loadProviderServices } from "@/lib/dashboardQueries";

const CoachServices = () => {
  const { user } = useAuth();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");

  const loadServices = async (providerProfileId: string, userId?: string) => {
    const data = await loadProviderServices("coach", providerProfileId, userId || providerProfileId);
    setServices(data || []);
  };

  useEffect(() => {
    if (!user) return;

    const bootstrap = async () => {
      setLoading(true);
      const { error: upsertError } = await (supabase as any)
        .from("coach_profiles")
        .upsert({ user_id: user.id, is_active: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

      if (upsertError) {
        toast.error(upsertError.message || "Could not prepare coach profile.");
        setLoading(false);
        return;
      }

      const providerRow = await getProviderRecord("coach", user.id);
      const resolvedId = providerRow?.id || user.id;
      setCoachId(resolvedId as string);
      await loadServices(resolvedId as string, user.id);
      setLoading(false);
    };

    bootstrap();
  }, [user?.id]);

  const addService = async () => {
    if (!coachId || !title.trim() || !price) return;
    const { error } = await (supabase as any).from("coach_services").insert({
      coach_id: coachId,
      title: title.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      duration_minutes: parseInt(duration, 10) || 60,
      is_active: true,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Service added");
      setShowForm(false);
      setTitle(""); setDescription(""); setPrice(""); setDuration("60");
      await loadServices(coachId, user?.id || undefined);
    }
  };

  const deleteService = async (id: string) => {
    const { error } = await (supabase as any).from("coach_services").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Could not remove service.");
      return;
    }
    setServices(prev => prev.filter(s => s.id !== id));
    toast.success("Service removed");
  };

  return (
    <DashboardLayout role="coach">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Services</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={16} className="mr-1" /> Add Service</Button>
      </div>
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6 max-w-lg space-y-4">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Price ($)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} /></div>
            <div><Label>Duration (min)</Label><Input type="number" value={duration} onChange={e => setDuration(e.target.value)} /></div>
          </div>
          <Button onClick={addService}>Save Service</Button>
        </div>
      )}
      {loading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center"><p className="text-muted-foreground">Loading services...</p></div>
      ) : services.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center"><p className="text-muted-foreground">No services yet.</p></div>
      ) : (
        <div className="space-y-3">
          {services.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.duration_minutes} min · <span className="font-mono">${Number(s.price).toFixed(2)}</span></p>
              </div>
              <button onClick={() => deleteService(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};
export default CoachServices;
