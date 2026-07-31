import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { createBooking } from "@/services/bookingService";
import { toast } from "sonner";
import {
  Calendar, Copy, Globe, MapPin, MessageCircle, ShieldCheck,
  Star, Play, Clock, DollarSign, Users, Award, ChevronRight,
  X, Loader2, Video, BookOpen, CheckCircle2,
} from "lucide-react";

const PENDING_BOOKING_KEY = "coursevia_pending_provider_booking";

const therapistServices = ["Counseling","Personal Development","Group Therapy","Relationship Counseling","Pain Management","Psych & Diagnostic Assessment","CBT","EMDR","Sex Therapy","Training"];
const coachServices = ["Life Coaching","Career Coaching","Business Coaching","Performance Coaching","Leadership Coaching","Accountability Sessions"];
const therapistExpertise = ["Abuse","Addiction","Anger","Anxiety","Relationship Issues","ADHD / Attention","Mood Disorder","Stress / Burnout"];
const coachExpertise = ["Growth","Productivity","Leadership","Mindset","Career Direction","Performance","Confidence","Business Strategy"];

const getRoleText = (role?: string | null) => {
  if (role === "therapist") {
    return {
      heading: "Licensed Clinical Psychologist",
      about: "As a licensed therapist, I use ethical, structured, evidence-based approaches to help clients navigate emotional, behavioural, and relational challenges with clarity and care.",
      approach: "My sessions are collaborative, practical, and grounded in measurable progress. We identify goals, build coping tools, and work through patterns in a way that fits real life.",
      services: therapistServices,
      expertise: therapistExpertise,
      worksWith: ["Adults","Couples","Individuals","Organisations"],
    };
  }
  return {
    heading: "Professional Coach",
    about: "I help individuals and professionals achieve clarity, growth, and measurable results through structured coaching conversations, practical systems, and accountability.",
    approach: "Sessions are designed to be results-focused, collaborative, and action-driven. We define the outcome, track progress, and apply practical next steps that fit your situation.",
    services: coachServices,
    expertise: coachExpertise,
    worksWith: ["Professionals","Founders","Teams","Individuals"],
  };
};

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
};

const getProviderRole = (value?: string | null) => value === "therapist" ? "therapist" : "coach";

// ── Stat pill ────────────────────────────────────────────────────────────────
const StatPill = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
      <Icon size={15} className="text-primary" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground leading-none mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

// ── Tag chip ─────────────────────────────────────────────────────────────────
const Tag = ({ label }: { label: string }) => (
  <span className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-foreground">
    {label}
  </span>
);

// ── Video card ───────────────────────────────────────────────────────────────
const VideoCard = ({ video }: { video: any }) => (
  <Link
    to={`/videos/${video.slug}`}
    className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
  >
    <div className="relative aspect-video bg-slate-100 overflow-hidden">
      {video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
          <Video size={32} className="text-slate-400" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
          <Play size={18} className="text-slate-900 ml-0.5" />
        </div>
      </div>
      {video.price > 0 && (
        <div className="absolute top-2.5 right-2.5 rounded-full bg-black/70 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
          ${Number(video.price).toFixed(2)}
        </div>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-foreground text-sm line-clamp-2 leading-snug">{video.title}</h3>
      {video.description && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{video.description}</p>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium">
        Watch now <ChevronRight size={12} />
      </div>
    </div>
  </Link>
);

// ── Booking modal ─────────────────────────────────────────────────────────────
const BookingModal = ({
  profile, services, selectedServiceId, setSelectedServiceId,
  bookingDate, setBookingDate, bookingNotes, setBookingNotes,
  bookingLoading, onBook, onClose, user,
}: any) => {
  const selectedService = services.find((s: any) => s.id === selectedServiceId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calendar size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Book a Session</h2>
              <p className="text-xs text-muted-foreground">with {profile.full_name?.split(" ")?.[0] || "this professional"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {services.length > 0 && (
            <div>
              <Label className="mb-2 block text-sm font-medium">Select service</Label>
              <div className="space-y-2">
                {services.map((service: any) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                      selectedServiceId === service.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{service.title}</p>
                      {service.duration_minutes && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {service.duration_minutes} min
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {service.price > 0 && (
                        <span className="text-sm font-bold text-foreground">${Number(service.price).toFixed(2)}</span>
                      )}
                      {selectedServiceId === service.id && (
                        <CheckCircle2 size={16} className="text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block text-sm font-medium">Date & Time</Label>
            <Input
              type="datetime-local"
              className="rounded-xl h-11 border-border"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              className="rounded-xl border-border resize-none"
              rows={3}
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="Share your goal, concern, or anything helpful for the session."
            />
          </div>

          <Button
            className="h-12 w-full rounded-2xl gap-2 text-base"
            onClick={onBook}
            disabled={bookingLoading}
          >
            {bookingLoading ? (
              <><Loader2 size={16} className="animate-spin" /> Creating booking…</>
            ) : user ? (
              <><CheckCircle2 size={16} /> Confirm Booking</>
            ) : (
              <>Continue to Login</>
            )}
          </Button>
          {!user && (
            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected back here after login to complete the booking.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ProfilePreview = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "services" | "videos">("about");

  // Realtime: subscribe to profile changes while page is open
  useEffect(() => {
    if (!profile?.user_id) return;
    const channel = supabase
      .channel(`profile-preview-${profile.user_id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `user_id=eq.${profile.user_id}`,
      }, (payload) => {
        setProfile((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id]);

  const providerRole = useMemo(
    () => getProviderRole(profile?.role || profile?.provider_type),
    [profile?.role, profile?.provider_type]
  );
  const roleText = useMemo(() => getRoleText(providerRole), [providerRole]);

  const messagePath = useMemo(() => {
    if (!profile?.user_id || !user) return "/login";
    if (primaryRole === "coach") return `/coach/messages?user=${profile.user_id}`;
    if (primaryRole === "creator") return `/creator/messages?user=${profile.user_id}`;
    if (primaryRole === "therapist") return `/therapist/messages?user=${profile.user_id}`;
    return `/dashboard/messages?user=${profile.user_id}`;
  }, [profile?.user_id, primaryRole, user]);

  const savedServices = useMemo(() => asList(providerProfile?.services_offered || profile?.services_offered), [profile?.services_offered, providerProfile?.services_offered]);
  const savedWorksWith = useMemo(() => asList(providerProfile?.works_with || profile?.works_with), [profile?.works_with, providerProfile?.works_with]);
  const savedExpertise = useMemo(() => asList(providerProfile?.skills || profile?.skills), [profile?.skills, providerProfile?.skills]);
  const savedLanguages = useMemo(() => asList(providerProfile?.languages || profile?.languages), [profile?.languages, providerProfile?.languages]);
  const savedServiceAreas = useMemo(() => asList(providerProfile?.service_areas || profile?.service_areas || profile?.business_address || profile?.office_address), [profile, providerProfile]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const loadProfile = async () => {
      let profileQuery = await supabase.from("profiles").select("*").eq("profile_slug", slug).maybeSingle();
      if (!profileQuery.data) {
        profileQuery = await supabase.from("profiles").select("*").eq("user_id", slug).maybeSingle();
      }
      const data = profileQuery.data;
      setProfile(data || null);
      if (!data?.user_id) { setLoading(false); return; }

      const resolvedRole = getProviderRole(data.role || data.provider_type);
      const providerTable = resolvedRole === "therapist" ? "therapist_profiles" : "coach_profiles";
      const serviceTable = resolvedRole === "therapist" ? "therapist_services" : "coach_services";
      const serviceKey = resolvedRole === "therapist" ? "therapist_id" : "coach_id";

      const [{ data: providerData }, { data: videoData }] = await Promise.all([
        (supabase as any).from(providerTable).select("*").eq("user_id", data.user_id).maybeSingle(),
        supabase.from("videos").select("*").eq("creator_id", data.user_id).eq("status", "published").order("created_at", { ascending: false }),
      ]);

      setProviderProfile(providerData || null);
      setVideos(videoData || []);

      if (providerData?.id) {
        const { data: serviceData } = await (supabase as any)
          .from(serviceTable).select("*").eq(serviceKey, providerData.id)
          .eq("is_active", true).order("created_at", { ascending: false });
        setServices(serviceData || []);
        if (serviceData?.[0]?.id) setSelectedServiceId(serviceData[0].id);
      }
      setLoading(false);
    };
    loadProfile();
  }, [slug]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("intent") === "booking") setBookingOpen(true);
  }, [location.search]);

  useEffect(() => {
    if (!user || !profile?.user_id) return;
    const raw = window.sessionStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw);
      if (pending?.providerSlug !== (profile.profile_slug || profile.user_id)) return;
      setBookingDate(pending.bookingDate || "");
      setBookingNotes(pending.bookingNotes || "");
      setSelectedServiceId(pending.serviceId || selectedServiceId);
      setBookingOpen(true);
      window.sessionStorage.removeItem(PENDING_BOOKING_KEY);
    } catch { window.sessionStorage.removeItem(PENDING_BOOKING_KEY); }
  }, [user, profile?.user_id, profile?.profile_slug]);

  const handleBook = async () => {
    if (!profile?.user_id) return;
    if (!bookingDate) { toast.error("Please choose a date and time."); return; }
    if (!user) {
      window.sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({
        providerSlug: profile.profile_slug || profile.user_id,
        bookingDate, bookingNotes, serviceId: selectedServiceId || null,
      }));
      navigate("/login", { state: { from: `${location.pathname}?intent=booking` } });
      return;
    }
    try {
      setBookingLoading(true);
      const selectedService = services.find((s) => s.id === selectedServiceId) || null;
      await createBooking({
        provider_id: profile.user_id, learner_id: user.id,
        service_id: selectedService?.id || null,
        coach_profile_id: providerProfile?.id || null,
        booking_type: "scheduled",
        scheduled_time: new Date(bookingDate).toISOString(),
        duration: Number(selectedService?.duration_minutes || 60),
        notes: bookingNotes || undefined,
        provider_type: profile.role || profile.provider_type || undefined,
      });
      toast.success("Booking confirmed! Check your bookings for session details.");
      setBookingOpen(false);
      navigate("/dashboard/bookings");
    } catch (error: any) {
      toast.error(error?.message || "Could not create booking.");
    } finally { setBookingLoading(false); }
  };

  const handleMessage = () => {
    if (!user) { navigate("/login", { state: { from: `${location.pathname}?intent=message` } }); return; }
    navigate(messagePath);
  };

  const handleCopyPhone = async () => {
    if (!profile?.phone) { toast.info("Phone not available. Send a message instead."); return; }
    try { await navigator.clipboard.writeText(profile.phone); toast.success("Phone number copied."); }
    catch { toast.error("Could not copy phone number."); }
  };

  const tabs = [
    { id: "about", label: "About", icon: BookOpen },
    { id: "services", label: "Services", icon: Award },
    { id: "videos", label: `Videos${videos.length > 0 ? ` (${videos.length})` : ""}`, icon: Video },
  ] as const;

  const rate = Number(providerProfile?.hourly_rate || profile?.hourly_rate || 0);
  const rating = Number(providerProfile?.rating || profile?.rating || 5).toFixed(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fb]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f7f8fb]">
        <Navbar />
        <div className="container max-w-2xl py-24 text-center">
          <div className="rounded-3xl border border-border bg-white p-16">
            <p className="text-2xl font-bold text-foreground mb-2">Profile not found</p>
            <p className="text-muted-foreground">This profile may have been removed or the link is incorrect.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f9]">
      <Navbar />

      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 75% 20%, #0ea5e9 0%, transparent 50%)" }} />
        <div className="relative container max-w-6xl mx-auto px-4 py-14 sm:py-20">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-3xl overflow-hidden ring-4 ring-white/20 shadow-2xl">
                <ProfileAvatar src={profile.avatar_url} name={profile.full_name} className="h-full w-full" />
              </div>
              {profile.is_verified && (
                <div className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg">
                  <ShieldCheck size={16} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Available
                </span>
                <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/80 capitalize">
                  {providerRole}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-1">
                {profile.full_name || "Professional Profile"}
              </h1>
              <p className="text-lg text-white/70 mb-4">
                {profile.profession || providerProfile?.headline || roleText.heading}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {profile.city || profile.location || profile.country || "Online"}</span>
                <span className="flex items-center gap-1.5"><Globe size={14} /> {savedLanguages.length > 0 ? savedLanguages.join(", ") : "English"}</span>
                <span className="flex items-center gap-1.5"><Star size={14} className="text-amber-400" /> {rating} rating</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Button size="lg" className="rounded-2xl gap-2 bg-white text-slate-900 hover:bg-white/90 shadow-lg" onClick={() => setBookingOpen(true)}>
                <Calendar size={16} /> Book Session
              </Button>
              <Button size="lg" variant="outline" className="rounded-2xl gap-2 border-white/30 text-white hover:bg-white/10" onClick={handleMessage}>
                <MessageCircle size={16} /> Message
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-3">
            {rate > 0 && <StatPill icon={DollarSign} label="Hourly rate" value={`$${rate.toFixed(2)}`} />}
            <StatPill icon={Star} label="Rating" value={`${rating} / 5`} />
            <StatPill icon={Clock} label="Session mode" value={profile.service_delivery_mode === "in_person" ? "In person" : profile.service_delivery_mode === "both" ? "Online & In person" : "Online"} />
            {services.length > 0 && <StatPill icon={Award} label="Services" value={`${services.length} available`} />}
            {videos.length > 0 && <StatPill icon={Video} label="Videos" value={`${videos.length} published`} />}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container max-w-6xl mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

          {/* Left column */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 rounded-2xl bg-white border border-border p-1.5 shadow-sm w-fit">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* About tab */}
            {activeTab === "about" && (
              <div className="space-y-5">
                <div className="rounded-3xl border border-border bg-white p-7 shadow-sm">
                  <h2 className="text-xl font-bold text-foreground mb-4">About</h2>
                  <p className="text-base leading-8 text-muted-foreground">{profile.bio || roleText.about}</p>
                </div>
                <div className="rounded-3xl border border-border bg-white p-7 shadow-sm">
                  <h2 className="text-xl font-bold text-foreground mb-4">Approach</h2>
                  <p className="text-base leading-8 text-muted-foreground">{providerProfile?.headline || roleText.approach}</p>
                </div>
                <div className="rounded-3xl border border-border bg-white p-7 shadow-sm">
                  <h2 className="text-xl font-bold text-foreground mb-5">Area of Expertise</h2>
                  <div className="flex flex-wrap gap-2">
                    {(savedExpertise.length > 0 ? savedExpertise : roleText.expertise).map((item) => (
                      <Tag key={item} label={item} />
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-white p-7 shadow-sm">
                  <h2 className="text-xl font-bold text-foreground mb-5">Works With</h2>
                  <div className="flex flex-wrap gap-2">
                    {(savedWorksWith.length > 0 ? savedWorksWith : roleText.worksWith).map((item) => (
                      <Tag key={item} label={item} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Services tab */}
            {activeTab === "services" && (
              <div className="space-y-4">
                {services.length > 0 ? services.map((service) => (
                  <div key={service.id} className="rounded-3xl border border-border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{service.title}</h3>
                        {service.description && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{service.description}</p>}
                        <div className="flex flex-wrap gap-3 mt-3">
                          {service.duration_minutes && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-full px-3 py-1">
                              <Clock size={11} /> {service.duration_minutes} min
                            </span>
                          )}
                          {service.delivery_mode && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-full px-3 py-1">
                              <Globe size={11} /> {service.delivery_mode}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {service.price > 0 && (
                          <p className="text-2xl font-bold text-foreground">${Number(service.price).toFixed(2)}</p>
                        )}
                        <Button size="sm" className="mt-2 rounded-xl" onClick={() => { setSelectedServiceId(service.id); setBookingOpen(true); }}>
                          Book
                        </Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-3xl border border-border bg-white p-10 text-center">
                    <Award size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-medium text-foreground">Services listed soon</p>
                    <p className="text-sm text-muted-foreground mt-1">Message this professional to discuss available services.</p>
                    <Button className="mt-4 rounded-xl" onClick={handleMessage}>Send a message</Button>
                  </div>
                )}
              </div>
            )}

            {/* Videos tab */}
            {activeTab === "videos" && (
              <div>
                {videos.length > 0 ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {videos.map((video) => <VideoCard key={video.id} video={video} />)}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-border bg-white p-12 text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-3xl bg-primary/5 flex items-center justify-center">
                      <Video size={28} className="text-primary/40" />
                    </div>
                    <p className="font-semibold text-foreground">No videos yet</p>
                    <p className="text-sm text-muted-foreground mt-1">This professional hasn't published any videos yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Contact card */}
            <div className="sticky top-24 space-y-4">
              <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <h3 className="font-bold text-foreground text-lg mb-1">Book a session</h3>
                <p className="text-sm text-muted-foreground mb-5">Choose a time that works for you.</p>
                <div className="space-y-3">
                  <Button className="w-full rounded-2xl h-11 gap-2" onClick={() => setBookingOpen(true)}>
                    <Calendar size={16} /> Book Session
                  </Button>
                  <Button variant="outline" className="w-full rounded-2xl h-11 gap-2" onClick={handleMessage}>
                    <MessageCircle size={16} /> Send Message
                  </Button>
                  <Button variant="ghost" className="w-full rounded-2xl h-11 gap-2 text-muted-foreground" onClick={handleCopyPhone}>
                    <Copy size={16} /> Request Phone
                  </Button>
                </div>
              </div>

              {/* Info card */}
              <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-foreground">Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Languages</span>
                    <span className="font-medium text-foreground text-right">{savedLanguages.length > 0 ? savedLanguages.join(", ") : "English"}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium text-foreground">{profile.city || profile.country || "Online"}</span>
                  </div>
                  <div className="h-px bg-border" />
                  {rate > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-bold text-foreground">${rate.toFixed(2)}/hr</span>
                      </div>
                      <div className="h-px bg-border" />
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Booking</span>
                    <span className="font-medium text-foreground">{profile.calendar_mode === "open_schedule" ? "Open schedule" : "Calendar"}</span>
                  </div>
                  {savedServiceAreas.length > 0 && (
                    <>
                      <div className="h-px bg-border" />
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">Service areas</span>
                        <span className="font-medium text-foreground text-right">{savedServiceAreas.join(", ")}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Verified badge */}
              {profile.is_verified && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-3">
                  <ShieldCheck size={22} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Verified by Coursevia</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Identity and credentials confirmed.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {bookingOpen && (
        <BookingModal
          profile={profile}
          services={services}
          selectedServiceId={selectedServiceId}
          setSelectedServiceId={setSelectedServiceId}
          bookingDate={bookingDate}
          setBookingDate={setBookingDate}
          bookingNotes={bookingNotes}
          setBookingNotes={setBookingNotes}
          bookingLoading={bookingLoading}
          onBook={handleBook}
          onClose={() => setBookingOpen(false)}
          user={user}
        />
      )}

      <Footer />
    </div>
  );
};

export default ProfilePreview;
