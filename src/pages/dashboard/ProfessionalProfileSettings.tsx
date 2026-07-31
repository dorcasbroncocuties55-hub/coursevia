import { useEffect, useState } from "react";
import { PageLoading } from "@/components/LoadingSpinner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ScrollableContent } from "@/components/ui/scrollable-content";

type Role = "coach" | "creator" | "therapist";

const ProfessionalProfileSettings = ({ role }: { role: Role }) => {
  const { user , loading: authLoading } = useAuth();
  const [profession, setProfession] = useState("");
  const [experience, setExperience] = useState("");
  const [certification, setCertification] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bookingPrice, setBookingPrice] = useState("");
  const [profileSlug, setProfileSlug] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
        supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setProfession((data as any).profession || "");
        setExperience((data as any).experience || "");
        setCertification((data as any).certification || "");
        setHourlyRate(String((data as any).hourly_rate || ""));
        setBookingPrice(String((data as any).booking_price || ""));
        setProfileSlug((data as any).profile_slug || "");
        setBio((data as any).bio || "");
      });
  }, [user]);

  const handleSave = async () => {
        setLoading(true);

    const fallbackSlug = `${role}-${user.id.slice(0, 8)}`;
    const { error } = await supabase
      .from("profiles")
      .update({
        role,
        profession,
        experience,
        certification,
        hourly_rate: Number(hourlyRate || 0),
        booking_price: Number(bookingPrice || 0),
        profile_slug: profileSlug || fallbackSlug,
        bio,
      } as any)
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Professional profile updated");
  };

  return (
    <DashboardLayout role={role}>
      <ScrollableContent maxHeight="h-full" className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Professional Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your public profile, pricing, credentials and booking display.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 bg-card border border-border rounded-lg p-6">
          <div>
            <Label>Profession</Label>
            <Input value={profession} onChange={(e) => setProfession(e.target.value)} />
          </div>
          <div>
            <Label>Experience</Label>
            <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 8 years" />
          </div>
          <div>
            <Label>Certification</Label>
            <Input value={certification} onChange={(e) => setCertification(e.target.value)} />
          </div>
          <div>
            <Label>Profile Link Slug</Label>
            <Input value={profileSlug} onChange={(e) => setProfileSlug(e.target.value)} placeholder="jane-doe-coach" />
          </div>
          <div>
            <Label>Hourly Rate</Label>
            <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
          </div>
          <div>
            <Label>Booking Price</Label>
            <Input type="number" value={bookingPrice} onChange={(e) => setBookingPrice(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Bio</Label>
            <Textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </ScrollableContent>
    </DashboardLayout>
  );
};

export default ProfessionalProfileSettings;

