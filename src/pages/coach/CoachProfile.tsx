import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Navigate } from 'react-router-dom';
import { PageLoading } from '@/components/LoadingSpinner';
import { Shield, ExternalLink, UserCircle2, UploadCloud, CheckCircle2, BadgeCheck } from "lucide-react";
import { createPersonaKycSession } from "@/lib/kycProvider";
import { ScrollableContent } from "@/components/ui/scrollable-content";

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const CoachProfile = () => {
  const { user, refreshAll, loading: authLoading } = useAuth();

  if (authLoading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;

  const [form, setForm] = useState({
    fullName: "", displayName: "", headline: "", profession: "",
    experience: "", certification: "", bio: "",
    phone: "", country: "", city: "",
    skills: "", languages: "", bookingPrice: "", hourlyRate: "",
    profileSlug: "", servicesOffered: "", worksWith: "",
    serviceAreas: "", serviceDeliveryMode: "online",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const previewAvatar

  // ? Handle auth loading state
  if (authLoading) {
    return <PageLoading />;
  }

  // ? Handle no user
  if (!user) {
    return <Navigate to="/login" replace />;
  }
 = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl, [avatarFile, avatarUrl]);
  useEffect(() => () => { if (avatarFile) URL.revokeObjectURL(previewAvatar); }, [avatarFile]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      const [profileRes, coachRes, verifyRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("coach_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("verification_requests").select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
      ]);

      const p = profileRes.data as any;
      const c = coachRes.data as any;

      if (p) {
        setAvatarUrl(p.avatar_url || "");
        setForm({
          fullName: p.full_name || "",
          displayName: p.display_name || "",
          headline: p.headline || c?.headline || "",
          profession: p.profession || "",
          experience: p.experience || "",
          certification: p.certification || "",
          bio: p.bio || "",
          phone: p.phone || "",
          country: p.country || "",
          city: p.city || "",
          skills: Array.isArray(p.skills) ? p.skills.join(", ") : (Array.isArray(c?.skills) ? c.skills.join(", ") : ""),
          languages: Array.isArray(p.languages) ? p.languages.join(", ") : (Array.isArray(c?.languages) ? c.languages.join(", ") : ""),
          bookingPrice: String(p.booking_price ?? ""),
          hourlyRate: String(c?.hourly_rate ?? ""),
          profileSlug: p.profile_slug || "",
          servicesOffered: p.business_name || "",
          worksWith: p.business_description || "",
          serviceAreas: p.business_address || "",
          serviceDeliveryMode: p.service_delivery_mode || "online",
        });
      }

      if (verifyRes.data?.length) setVerificationStatus((verifyRes.data[0] as any).status || null);
      setDataLoading(false);
    };
    load();
  }, [user?.id]);

  const uploadAvatar = async (): Promise<string> => {
    if (!user || !avatarFile) return avatarUrl;
    setUploading(true);
    try {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (error) throw error;
      return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
        if (!form.fullName.trim()) { toast.error("Full name is required."); return; }
    if (!form.headline.trim()) { toast.error("Headline is required."); return; }
    if (!form.bio.trim()) { toast.error("Bio is required."); return; }

    setLoading(true);
    try {
      const nextAvatar = avatarFile ? await uploadAvatar() : avatarUrl;
      const slug = slugify(form.profileSlug || form.displayName || form.fullName || `coach-${user.id.slice(0, 8)}`);
      const skillArr = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
      const langArr = form.languages.split(",").map((s) => s.trim()).filter(Boolean);

      const { error: pe } = await supabase.from("profiles").upsert({
        user_id: user.id, role: "coach", provider_type: "coach",
        full_name: form.fullName || null, display_name: form.displayName || null,
        avatar_url: nextAvatar || null, headline: form.headline || null,
        profession: form.profession || null, experience: form.experience || null,
        certification: form.certification || null, bio: form.bio || null,
        phone: form.phone || null, country: form.country || null, city: form.city || null,
        skills: skillArr, languages: langArr,
        booking_price: Math.max(6, Number(form.bookingPrice) || 6),
        profile_slug: slug,
        business_name: form.servicesOffered || null,
        business_description: form.worksWith || null,
        business_address: form.serviceAreas || null,
        service_delivery_mode: form.serviceDeliveryMode,
        onboarding_completed: true, updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });
      if (pe) throw pe;

      const { error: ce } = await supabase.from("coach_profiles").upsert({
        user_id: user.id, headline: form.headline || null,
        skills: skillArr, languages: langArr,
        hourly_rate: Number(form.hourlyRate) || 0,
        is_active: true, updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });
      if (ce) throw ce;

      setAvatarUrl(nextAvatar);
      setAvatarFile(null);
      await refreshAll?.();
      toast.success("Coach profile saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleKyc = async () => {
        setVerifying(true);
    try {
      const session = await createPersonaKycSession({ userId: user.id, email: user.email, fullName: form.fullName || null, country: form.country || null, phone: form.phone || null, role: "coach" });
      setVerificationStatus("pending");
      toast.success("KYC started.");
      if (session?.inquiryUrl) window.location.assign(session.inquiryUrl);
    } catch (err: any) {
      toast.error(err?.message || "Could not start KYC.");
    } finally {
      setVerifying(false);
    }
  };

  if (dataLoading) return (
    <DashboardLayout role="coach">
      <div className="py-16 text-center text-slate-400">Loading profile…</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout role="coach">
      <div className="space-y-6 max-w-4xl">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coach Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            This is your public profile. Keep it accurate — clients see this before they book you.
          </p>
        </div>

        {/* Avatar + core info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Profile Photo & Identity</h2>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-md">
                {previewAvatar
                  ? <img src={previewAvatar} alt="Avatar" className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center bg-slate-100"><UserCircle2 className="h-16 w-16 text-slate-300" /></div>}
              </div>
              <label className="cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-2 text-center text-sm text-slate-600 hover:border-[#0b7e84] hover:text-[#0b7e84]">
                <UploadCloud className="mx-auto mb-1 h-4 w-4" />
                {uploading ? "Uploading…" : avatarFile ? avatarFile.name : "Upload photo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
              </label>
              <p className="text-center text-xs text-slate-400">JPG, PNG or WEBP · max 5MB</p>
            </div>

            {/* Name fields */}
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <div><Label>Full Name *</Label><Input value={form.fullName} onChange={set("fullName")} placeholder="John Doe" /></div>
              <div><Label>Display Name</Label><Input value={form.displayName} onChange={set("displayName")} placeholder="John" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} placeholder="+234 800 000 0000" /></div>
              <div><Label>Country</Label><Input value={form.country} onChange={set("country")} placeholder="Nigeria" /></div>
              <div><Label>City</Label><Input value={form.city} onChange={set("city")} placeholder="Lagos" /></div>
              <div><Label>Profile Slug</Label><Input value={form.profileSlug} onChange={set("profileSlug")} placeholder="john-doe-coach" /></div>
            </div>
          </div>
        </div>

        {/* Professional info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Professional Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Headline *</Label><Input value={form.headline} onChange={set("headline")} placeholder="Executive Life Coach" /></div>
            <div><Label>Profession</Label><Input value={form.profession} onChange={set("profession")} placeholder="Certified Life Coach" /></div>
            <div><Label>Certification</Label><Input value={form.certification} onChange={set("certification")} placeholder="ICF ACC, NLP Practitioner" /></div>
            <div><Label>Hourly Rate (USD)</Label><Input type="number" min="0" value={form.hourlyRate} onChange={set("hourlyRate")} placeholder="50" /></div>
            <div><Label>Booking Price (USD)</Label><Input type="number" min="6" value={form.bookingPrice} onChange={set("bookingPrice")} placeholder="80" /></div>
            <div><Label>Skills / Expertise</Label><Input value={form.skills} onChange={set("skills")} placeholder="Leadership, Mindset, Productivity" /></div>
            <div><Label>Languages</Label><Input value={form.languages} onChange={set("languages")} placeholder="English, French" /></div>
            <div>
              <Label>Service Delivery</Label>
              <select value={form.serviceDeliveryMode} onChange={set("serviceDeliveryMode")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="online">Online only</option>
                <option value="in_person">In-person only</option>
                <option value="both">Online + In-person</option>
              </select>
            </div>
            <div className="sm:col-span-2"><Label>Experience / Approach</Label><Textarea rows={3} value={form.experience} onChange={set("experience")} placeholder="Describe your coaching style and approach…" /></div>
            <div className="sm:col-span-2"><Label>Bio *</Label><Textarea rows={4} value={form.bio} onChange={set("bio")} placeholder="Write a compelling bio that clients will read before booking…" /></div>
          </div>
        </div>

        {/* Public profile fields */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Public Profile Content</h2>
          <p className="mb-5 text-xs text-slate-400">These fields appear on your public coach profile page.</p>
          <div className="grid gap-4">
            <div>
              <Label>Services Offered <span className="text-xs text-slate-400">(comma separated)</span></Label>
              <Textarea rows={2} value={form.servicesOffered} onChange={set("servicesOffered")} placeholder="Life Coaching, Career Coaching, Online Sessions" />
            </div>
            <div>
              <Label>Who You Work With <span className="text-xs text-slate-400">(comma separated)</span></Label>
              <Textarea rows={2} value={form.worksWith} onChange={set("worksWith")} placeholder="Adults, Professionals, Entrepreneurs" />
            </div>
            <div>
              <Label>Service Areas <span className="text-xs text-slate-400">(comma separated)</span></Label>
              <Input value={form.serviceAreas} onChange={set("serviceAreas")} placeholder="Lagos, London, Online" />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading || uploading} className="w-full sm:w-auto">
          {loading || uploading ? "Saving…" : "Save Profile"}
        </Button>

        {/* KYC */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-[#0b7e84]" />
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">Identity Verification (KYC)</h2>
              <p className="mt-1 text-sm text-slate-500">
                Verified coaches get a badge on their public profile and can withdraw earnings. Verification is handled securely by our KYC provider.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {verificationStatus === "approved"
                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Verified</span>
                    : verificationStatus === "pending"
                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700"><BadgeCheck className="h-4 w-4" /> Pending review</span>
                    : verificationStatus === "rejected"
                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">Rejected — resubmit</span>
                    : <span className="text-sm text-slate-400">Not submitted</span>}
                </div>
                {verificationStatus !== "approved" && (
                  <Button onClick={handleKyc} disabled={verifying} variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {verifying ? "Opening KYC…" : "Start KYC Verification"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default CoachProfile;


