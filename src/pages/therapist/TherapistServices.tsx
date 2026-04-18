import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MIN_PROVIDER_PRICE, isValidProviderPrice } from "@/lib/pricingRules";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { getProviderRecord, loadProviderServices } from "@/lib/dashboardQueries";
import { ScrollableContent } from "@/components/ui/scrollable-content";
import { PageLoading } from "@/components/LoadingSpinner";

const TherapistServices = () => {
  const { user, loading: authLoading } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState("");

  const loadServices = async (currentProfileId: string, userId?: string) => {
    const data = await loadProviderServices("therapist", currentProfileId, userId || currentProfileId);
    setServices(data || []);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadProfileAndServices = async () => {
      setLoading(true);
      const { error } = await (supabase as any).from("therapist_profiles").upsert({ user_id: user.id, is_active: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const profileRow = await getProviderRecord("therapist", user.id);
      const resolvedId = profileRow?.id || user.id;
      setProfileId(resolvedId as string);
      await loadServices(resolvedId as string, user.id);
      setLoading(false);
    };

    loadProfileAndServices();
  }, [user]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setDuration("60");
    setShowForm(false);
  };

  const addService = async () => {
    if (!profileId || !title.trim()) {
      toast.error("Service title is required.");
      return;
    }

    const numericPrice = parseFloat(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      toast.error("Enter a valid service price.");
      return;
    }

    const { error } = await supabase.from("therapist_services").insert({
      therapist_id: profileId,
      title: title.trim(),
      description: description.trim(),
      price: numericPrice,
      duration_minutes: parseInt(duration, 10) || 60,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Therapy service added");
    resetForm();
    await loadServices(profileId, user?.id || undefined);
  };

  const savePrice = async (serviceId: string) => {
    const numericPrice = parseFloat(editingPrice);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      toast.error("Enter a valid service price.");
      return;
    }

    const { error } = await supabase
      .from("therapist_services")
      .update({ price: numericPrice })
      .eq("id", serviceId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setServices((prev) =>
      prev.map((service) =>
        service.id === serviceId ? { ...service, price: numericPrice } : service,
      ),
    );
    setEditingId(null);
    setEditingPrice("");
    toast.success("Therapist service price updated");
  };

  const deleteService = async (serviceId: string) => {
    const { error } = await supabase.from("therapist_services").delete().eq("id", serviceId);
    if (error) {
      toast.error(error.message);
      return;
    }

    setServices((prev) => prev.filter((service) => service.id !== serviceId));
    toast.success("Therapy service removed");
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout role="therapist">
      <ScrollableContent maxHeight="h-full" className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Therapy Services</h1>
        <Button size="sm" onClick={() => setShowForm((prev) => !prev)}>
          <Plus size={16} className="mr-1" /> Add Service
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6 max-w-lg space-y-4">
          <div>
            <Label>Service Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price ($)</Label>
              <Input type="number" step="0.01" min={String(MIN_PROVIDER_PRICE)} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          <Button onClick={addService}>Save Therapy Service</Button>
        </div>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Loading therapy services...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No therapy services yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="bg-card border border-border rounded-lg p-4 flex justify-between items-center gap-4">
              <div>
                <p className="font-medium text-foreground">{service.title}</p>
                <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
                {service.description ? (
                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editingId === service.id ? (
                  <>
                    <Input
                      className="w-28"
                      type="number"
                      step="0.01"
                      min={String(MIN_PROVIDER_PRICE)}
                      value={editingPrice}
                      onChange={(e) => setEditingPrice(e.target.value)}
                    />
                    <Button size="icon" variant="outline" onClick={() => savePrice(service.id)}>
                      <Save size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(null); setEditingPrice(""); }}>
                      <X size={16} />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="font-mono font-bold text-foreground">${Number(service.price).toFixed(2)}</span>
                    <Button size="icon" variant="outline" onClick={() => { setEditingId(service.id); setEditingPrice(String(service.price ?? 0)); }}>
                      <Pencil size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteService(service.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </ScrollableContent>
    </DashboardLayout>
  );
};

export default TherapistServices;
