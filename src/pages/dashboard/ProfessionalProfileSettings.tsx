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
import { Upload, User } from "lucide-react";
import ProfileAvatar from "@/components/shared/ProfileAvatar";

type Role = "coach" | "creator" | "therapist";

const ProfessionalProfileSettings = ({ role }: { role: Role }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const [profession, setProfession] = useState("");
  const [experience, setExperience] = useState("");
  const [certification, setCertification] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bookingPrice, setBookingPrice] = useState("");
  const [profileSlug, setProfileSlug] = useState("");
  const [bio, setBio] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
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
        setFullName((data as any).full_name || "");
        setPhone((data as any).phone || "");
        setCountry((data as any).country || "");
        setCity((data as any).city || "");
        setAvatarUrl((data as any).avatar_url || "");
        setAvatarPreview((data as any).avatar_url || "");
      });
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image (JPG, PNG, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setUploadingAvatar(false);
      return publicUrl;
    } catch (error: any) {
      setUploadingAvatar(false);
      console.error('Avatar upload error:', error);
      toast.error(error?.message || "Failed to upload avatar");
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    // Upload avatar if a new file was selected
    let finalAvatarUrl = avatarUrl;
    if (avatarFile) {
      const uploaded = await uploadAvatar();
      if (uploaded) {
        finalAvatarUrl = uploaded;
        setAvatarUrl(uploaded);
      }
    }

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
        avatar_url: finalAvatarUrl,
      } as any)
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Professional profile updated");
    setAvatarFile(null); // Clear the file after successful upload
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

        {/* Profile Picture Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Profile" 
                  className="h-24 w-24 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-12 w-12 text-slate-400" />
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Upload Photo</span>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG or WebP. Max 5MB. Recommended: 400x400px
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information Display */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Full Name</Label>
              <p className="text-foreground font-medium mt-1">{fullName || profile?.full_name || "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-foreground font-medium mt-1">{user?.email || "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="text-foreground font-medium mt-1">{phone || profile?.phone || "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Location</Label>
              <p className="text-foreground font-medium mt-1">
                {city && country ? `${city}, ${country}` : country || city || profile?.country || "Not set"}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            To update personal information, please contact support or update through your main profile page.
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

