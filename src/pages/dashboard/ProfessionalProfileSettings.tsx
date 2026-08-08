import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ScrollableContent } from "@/components/ui/scrollable-content";
import { Upload, User } from "lucide-react";

type Role = "coach" | "creator" | "therapist";

const DELIVERY_MODES = [
  { value: "online",    label: "Online only" },
  { value: "in_person", label: "In person only" },
  { value: "both",      label: "Online & in person" },
];

const ProfessionalProfileSettings = ({ role }: { role: Role }) => {
  const { user } = useAuth();

  // Personal info (editable here)
  const [fullName,           setFullName]           = useState("");
  const [city,               setCity]               = useState("");
  const [country,            setCountry]            = useState("");
  const [phone,              setPhone]              = useState("");

  // Public profile
  const [headline,           setHeadline]           = useState("");
  const [bio,                setBio]                = useState("");
  const [skills,             setSkills]             = useState("");      // comma-separated
  const [languages,          setLanguages]          = useState("");      // comma-separated
  const [serviceDeliveryMode,setServiceDeliveryMode]= useState("online");
  const [bookingPrice,       setBookingPrice]       = useState("");
  const [hourlyRate,         setHourlyRate]         = useState("");

  // Credentials
  const [profession,         setProfession]         = useState("");
  const [experience,         setExperience]         = useState("");
  const [certification,      setCertification]      = useState("");

  // Avatar
  const [avatarUrl,          setAvatarUrl]          = useState("");
  const [avatarFile,         setAvatarFile]         = useState<File | null>(null);
  const [avatarPreview,      setAvatarPreview]      = useState("");
  const [uploadingAvatar,    setUploadingAvatar]    = useState(false);

  const [loading, setLoading] = useState(false);

  // ── Load profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setFullName(d.full_name || "");
        setCity(d.city || "");
        setCountry(d.country || "");
        setPhone(d.phone || "");
        setHeadline(d.headline || "");
        setBio(d.bio || "");
        // skills / languages may be text[] or comma string
        const toStr = (v: any) => Array.isArray(v) ? v.join(", ") : (v || "");
        setSkills(toStr(d.skills || d.expertise_areas));
        setLanguages(toStr(d.languages));
        setServiceDeliveryMode(d.service_delivery_mode || "online");
        setBookingPrice(String(d.booking_price || d.session_price || ""));
        setHourlyRate(String(d.hourly_rate || ""));
        setProfession(d.profession || "");
        setExperience(d.experience || "");
        setCertification(d.certification || "");
        setAvatarUrl(d.avatar_url || "");
        setAvatarPreview(d.avatar_url || "");
      });
  }, [user]);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp","image/jpg"].includes(file.type)) {
      toast.error("Please select a JPG, PNG, or WebP image"); return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    setUploadingAvatar(true);
    try {
      const ext  = avatarFile.name.split(".").pop();
      const path = `${user.id}/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      return publicUrl;
    } catch (err: any) {
      toast.error(err?.message || "Avatar upload failed");
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    let finalAvatarUrl = avatarUrl;
    if (avatarFile) {
      const uploaded = await uploadAvatar();
      if (uploaded) { finalAvatarUrl = uploaded; setAvatarUrl(uploaded); }
    }

    // Convert comma strings → text arrays for Supabase
    const toArray = (v: string) =>
      v.split(",").map(s => s.trim()).filter(Boolean);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:             fullName.trim()   || null,
        city:                  city.trim()       || null,
        country:               country.trim()    || null,
        phone:                 phone.trim()      || null,
        headline:              headline.trim()   || null,
        bio:                   bio.trim()        || null,
        skills:                toArray(skills),
        expertise_areas:       skills.trim()     || null,   // keep in sync
        languages:             toArray(languages),
        service_delivery_mode: serviceDeliveryMode || "online",
        booking_price:         Number(bookingPrice || 0),
        session_price:         Number(bookingPrice || 0),   // keep in sync
        hourly_rate:           Number(hourlyRate   || 0),
        profession:            profession.trim()  || null,
        experience:            experience.trim()  || null,
        certification:         certification.trim() || null,
        avatar_url:            finalAvatarUrl    || null,
        updated_at:            new Date().toISOString(),
      } as any)
      .eq("user_id", user.id);

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated — changes are live on the directory");
    setAvatarFile(null);
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout role={role}>
      <ScrollableContent maxHeight="h-full" className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything here shows on your public directory card. Keep it complete so clients can find you.
          </p>
        </div>

        {/* ── Profile Photo ── */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Profile Photo</h2>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-10 w-10 text-slate-400" />
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition text-sm font-medium">
                  <Upload className="h-4 w-4" /> Upload Photo
                </div>
                <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />
              </Label>
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG or WebP · Max 5 MB · 400×400px recommended</p>
            </div>
          </div>
        </section>

        {/* ── Personal Info ── */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Personal Info</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Lagos" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Nigeria" />
            </div>
          </div>
        </section>

        {/* ── Public Profile (shows on directory card) ── */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Public Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">These fields show directly on your directory card</p>
          </div>

          <div>
            <Label>Headline / Title</Label>
            <Input
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder={role === "therapist" ? "Licensed Clinical Psychologist" : "Certified Life Coach"}
            />
            <p className="text-xs text-muted-foreground mt-1">Shown under your name on search results</p>
          </div>

          <div>
            <Label>Bio</Label>
            <Textarea
              rows={4}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Write 2–3 sentences about your approach, who you help, and your experience..."
            />
            <p className="text-xs text-muted-foreground mt-1">Shown as a preview on your directory card</p>
          </div>

          <div>
            <Label>Specialties / Skills</Label>
            <Input
              value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder={role === "therapist" ? "Anxiety, CBT, Trauma, Couples Therapy" : "Life Coaching, Career, Leadership, Mindset"}
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated — shown as tags on your card</p>
          </div>

          <div>
            <Label>Languages</Label>
            <Input
              value={languages}
              onChange={e => setLanguages(e.target.value)}
              placeholder="English, French, Yoruba"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
          </div>

          <div>
            <Label>Service Delivery</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DELIVERY_MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setServiceDeliveryMode(m.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium border transition ${
                    serviceDeliveryMode === m.value
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-foreground border-border hover:border-primary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Session Price (USD)</Label>
              <Input
                type="number"
                min="0"
                value={bookingPrice}
                onChange={e => setBookingPrice(e.target.value)}
                placeholder="e.g. 80"
              />
              <p className="text-xs text-muted-foreground mt-1">Shown on your directory card. Set 0 for free.</p>
            </div>
            <div>
              <Label>Hourly Rate (USD)</Label>
              <Input
                type="number"
                min="0"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
          </div>
        </section>

        {/* ── Credentials ── */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Credentials</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Profession</Label>
              <Input value={profession} onChange={e => setProfession(e.target.value)} placeholder="Clinical Psychologist" />
            </div>
            <div>
              <Label>Years of Experience</Label>
              <Input value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. 8 years" />
            </div>
            <div className="md:col-span-2">
              <Label>Certification / License</Label>
              <Input value={certification} onChange={e => setCertification(e.target.value)} placeholder="e.g. Licensed by NACP, APA member" />
            </div>
          </div>
        </section>

        <div className="pb-6">
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto px-8">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </ScrollableContent>
    </DashboardLayout>
  );
};

export default ProfessionalProfileSettings;
