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
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { ScrollableContent } from "@/components/ui/scrollable-content";
import { PageLoading } from "@/components/LoadingSpinner";

const TherapistServices = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading,       setLoading]      = useState(true);
  const [services,      setServices]     = useState<any[]>([]);
  const [therapistId,   setTherapistId]  = useState<string | null>(null);
  const [profile,       setProfile]      = useState<any>(null);
  const [showForm,      setShowForm]     = useState(false);
  const [title,         setTitle]        = useState("");
  const [description,   setDescription]  = useState("");
  const [price,         setPrice]        = useState("");
  const [duration,      setDuration]     = useState("60");
  const [editingId,     setEditingId]    = useState<string | null>(null);
  const [editingPrice,  setEditingPrice] = useState("");

  const loadServices = async (tId: string) => {
    const { data } = await (supabase as any)
      .from("therapist_services")
      .select("*")
      .eq("therapist_id", tId)
      .order("created_at", { ascending: false });
    setServices(data || []);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    const init = async () => {
      setLoading(true);
      try {
        // 1. Read profile info
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,headline,booking_price,service_delivery_mode,city,country")
          .eq("user_id", user.id)
          .maybeSingle();
        setProfile(prof || null);

        // 2. Get or create therapist_profiles row
        let { data: tp } = await (supabase as any)
          .from("therapist_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!tp?.id) {
          const { data: newTp, error: tpErr } = await (supabase as any)
            .from("therapist_profiles")
            .insert({ user_id: user.id, is_active: true })
            .select("id")
            .single();
          if (tpErr) throw new Error(tpErr.message);
          tp = newTp;
        }

        setTherapistId(tp.id);
        await loadServices(tp.id);
      } catch (err: any) {
        toast.error(err?.message || "Could not load services");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, authLoading]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setPrice(""); setDuration("60");
    setShowForm(false);
  };

  const addService = async () => {
    if (!therapistId || !title.trim()) { toast.error("Service title is required"); return; }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) { toast.error("Enter a valid price"); return; }
    const { error } = await (supabase as any).from("therapist_services").insert({
      therapist_id: therapistId, title: title.trim(),
      description: description.trim() || null,
      price: numPrice, duration_minutes: parseInt(duration, 10) || 60,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Service added");
    resetForm();
    await loadServices(therapistId);
  };

  const savePrice = async (serviceId: string) => {
    const numPrice = parseFloat(editingPrice);
    if (isNaN(numPrice) || numPrice < 0) { toast.error("Enter a valid price"); return; }
    const { error } = await (supabase as any).from("therapist_services").update({ price: numPrice }).eq("id", serviceId);
    if (error) { toast.error(error.message); return; }
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, price: numPrice } : s));
    setEditingId(null); setEditingPrice("");
    toast.success("Price updated");
  };

  const deleteService = async (id: string) => {
    const { error } = await (supabase as any).from("therapist_services").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setServices(prev => prev.filter(s => s.id !== id));
    toast.success("Service removed");
  };

  if (authLoading || loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <DashboardLayout role="therapist">
      <ScrollableContent maxHeight="h-full" className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Therapy Services</h1>
            {profile && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile.headline || "Therapist"}{[profile.city, profile.country].filter(Boolean).length > 0 && ` · ${[profile.city, profile.country].filter(Boolean).join(", ")}`}
                {Number(profile.booking_price) > 0 && ` · From $${Number(profile.booking_price).toFixed(0)}/session`}
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus size={16} className="mr-1" /> Add Service
          </Button>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6 max-w-lg space-y-4">
            <div><Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Individual CBT Session" />
            </div>
            <div><Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Price (USD)</Label>
                <Input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
              </div>
              <div><Label>Duration (min)</Label>
                <Input type="number" min="15" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addService}>Save Service</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {services.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
            <p className="text-muted-foreground text-sm">No services yet. Click "Add Service" to create your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-lg p-4 flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.duration_minutes} min</p>
                  {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingId === s.id ? (
                    <>
                      <Input className="w-24" type="number" min="0" value={editingPrice} onChange={e => setEditingPrice(e.target.value)} />
                      <Button size="icon" variant="outline" onClick={() => savePrice(s.id)}><Save size={15} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingId(null); setEditingPrice(""); }}><X size={15} /></Button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-bold text-foreground">${Number(s.price).toFixed(2)}</span>
                      <Button size="icon" variant="outline" onClick={() => { setEditingId(s.id); setEditingPrice(String(s.price ?? 0)); }}><Pencil size={15} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteService(s.id)}><Trash2 size={15} /></Button>
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
