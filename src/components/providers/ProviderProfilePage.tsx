import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BookingModal from "@/components/BookingModal";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { getCountryOption, getRoleCopy, ProviderRole } from "@/lib/providerDirectory";
import { getProfileRecord, getProviderRecord, loadProviderAvailability, loadProviderServices } from "@/lib/dashboardQueries";
import { getServiceModeLabel } from "@/lib/providerModes";
import {
  MapPin, MessageCircle, ShieldCheck, ChevronRight,
  CalendarDays, Globe, Languages, Clock, Star, ArrowLeft, X
} from "lucide-react";

const asList = (v: any): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProviderProfilePage() {
  const { role = "coach", id } = useParams();
  const navigate = useNavigate();
  const providerRole = (role === "therapists" || role === "therapist" ? "therapist" : "coach") as ProviderRole;
  const roleCopy = getRoleCopy(providerRole);

  const [profile, setProfile] = useState<any>(null);
  const [providerRecord, setProviderRecord] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const isVerified = useMemo(() =>
    String(providerRecord?.kyc_status || providerRecord?.verification_status ||
      profile?.kyc_status || profile?.verification_status || "").toLowerCase() === "approved" ||
    Boolean(providerRecord?.is_verified || profile?.is_verified),
    [profile, providerRecord]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError("");
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUser(authData?.user || null);

      let p = await getProfileRecord(id);
      if (!p) {
        const r = await supabase.from("profiles").select("*").eq("profile_slug", id).maybeSingle();
        p = r.data || null;
      }
      if (!p) { setLoadError("Provider not found."); setLoading(false); return; }

      setProfile(p);
      const uid = p.user_id || p.id;
      const prov = await getProviderRecord(providerRole, uid);
      setProviderRecord(prov || null);

      const pid = prov?.id || null;
      const [svcs, avail] = await Promise.all([
        loadProviderServices(providerRole, pid, uid),
        loadProviderAvailability(providerRole, pid, uid),
      ]);
      setServices((svcs || []).filter((r: any) => r?.is_active !== false));
      setAvailability(avail || []);
      setLoading(false);
    };
    load();
  }, [id, providerRole]);

  const requireLogin = () =>
    navigate("/login", { state: { returnTo: `/directory/${providerRole === "therapist" ? "therapists" : "coaches"}/${id}` } });

  const handleMessage = () => {
    if (!currentUser?.id) return requireLogin();
    navigate(`/dashboard/messages?user=${profile?.user_id || providerRecord?.user_id || id}`);
  };
  const handleBook = (svc?: any) => {
    if (!currentUser?.id) return requireLogin();
    setSelectedService(svc || null);
    setShowBooking(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="space-y-4 animate-pulse">
          <div className="h-40 rounded-3xl bg-slate-200" />
          <div className="h-6 w-1/3 rounded-xl bg-slate-200" />
          <div className="h-4 w-1/2 rounded-xl bg-slate-200" />
        </div>
      </div>
      <Footer />
    </div>
  );

  if (loadError || !profile) return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-20 text-slate-500">{loadError || "Provider not found."}</div>
      <Footer />
    </div>
  );

  const merged = { ...profile, ...providerRecord };
  const countryOption = getCountryOption(merged.country || merged.country_code || "");
  const countryName = countryOption?.name || merged.country || "";
  const displayName = merged.full_name || merged.display_name || merged.username || roleCopy.singular;
  const firstName = displayName.split(" ")[0];
  const profession = merged.profession || merged.headline || roleCopy.singular;
  const bioText = merged.bio || `This ${roleCopy.singular.toLowerCase()} is available for guided bookings.`;
  const approachText = merged.experience || merged.approach || `Sessions are tailored to the client's goals and preferred format.`;
  const languages = asList(merged.languages);
  const specialties = asList(merged.skills);
  const certifications = asList(merged.certification);
  const cityCountry = [merged.city, countryName].filter(Boolean).join(", ");
  const mapQuery = encodeURIComponent(cityCountry || countryName || displayName);
  const sessionRate = Number(merged.booking_price ?? merged.session_price ?? merged.hourly_rate ?? 0);

  const servicesOffered = services.length
    ? services.map((s) => s.title)
    : asList(merged.services_offered || merged.business_name).length
      ? asList(merged.services_offered || merged.business_name)
      : providerRole === "therapist"
        ? ["Online Therapy", "Individual Therapy", "Free Consultation", "Counselling"]
        : ["1-on-1 Coaching", "Goal Setting", "Strategy Session", "Free Discovery Call"];

  const worksWith = asList(merged.works_with || merged.business_description).length
    ? asList(merged.works_with || merged.business_description)
    : ["Adults", "Adolescents", "All ages", "Individuals"];

  const scopeItems = specialties.length ? specialties
    : providerRole === "therapist"
      ? ["Identity & Self-Image", "Grief & Loss", "Relationship Issues", "Stress / Burnout", "Anxiety"]
      : ["Leadership", "Career Growth", "Business Strategy", "Mindset", "Productivity"];

  const rawAreas = asList(merged.service_areas || merged.office_locations || merged.business_address);
  const serviceAreas = rawAreas.length ? rawAreas : [cityCountry || "Online"].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      {/* ── HERO BANNER ── */}
      <div className="bg-gradient-to-br from-[#0b7e84] to-[#0a6b70] text-white">
        <div className="mx-auto max-w-5xl px-4 py-8 md:py-10">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition"
          >
            <ArrowLeft size={15} /> Back to results
          </button>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Avatar + identity */}
            <div className="flex gap-5">
              <div className="relative shrink-0">
                <div className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-white/30 shadow-lg lg:h-28 lg:w-28">
                  {merged.avatar_url
                    ? <img src={merged.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center bg-white/20 text-3xl font-bold text-white">{displayName.charAt(0).toUpperCase()}</div>}
                </div>
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0b7e84] bg-emerald-400 shadow" />
              </div>

              <div className="pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-white md:text-3xl">{displayName}</h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-white/80">{profession}</p>
                {cityCountry && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/60">
                    <MapPin size={13} /> {cityCountry}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
                    {getServiceModeLabel(merged.service_delivery_mode)}
                  </span>
                  {sessionRate > 0 && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      From ${sessionRate.toFixed(2)}
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
                    <Star size={11} className="fill-amber-300 text-amber-300" /> 5.0
                  </span>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
              <button
                onClick={() => handleBook()}
                className="rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-[#0b7e84] shadow hover:bg-white/90 transition"
              >
                Book a Session
              </button>
              <button
                onClick={handleMessage}
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition"
              >
                <span className="flex items-center gap-2"><MessageCircle size={15} /> Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BREADCRUMB ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-2.5 text-xs text-slate-400">
          <span>Home</span><ChevronRight size={12} />
          <span>{countryName || "Directory"}</span><ChevronRight size={12} />
          <span>{merged.city || roleCopy.plural}</span><ChevronRight size={12} />
          <span className="font-medium text-slate-700">{displayName}</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">

            {/* About */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                {providerRole === "therapist" ? "About Me" : "About"}
              </h2>
              <p className="text-[15px] leading-8 text-slate-700">{bioText}</p>
              {approachText !== bioText && (
                <>
                  <h3 className="mt-5 mb-2 font-semibold text-slate-800">Approach</h3>
                  <p className="text-[15px] leading-8 text-slate-600">{approachText}</p>
                </>
              )}
            </div>

            {/* Expertise */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                {providerRole === "therapist" ? "Scope of Practice" : "Focus Areas"}
              </h2>
              <div className="flex flex-wrap gap-2">
                {scopeItems.map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Services</h2>
              <p className="mb-5 text-sm text-slate-500">
                {merged.services_description ||
                  `${providerRole === "therapist"
                    ? "Focused on emotional wellbeing, personal growth, and life challenges."
                    : "Helping clients achieve goals through structured, results-driven sessions."}`}
              </p>

              {services.length > 0 ? (
                <div className="space-y-3">
                  {services.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{svc.title}</p>
                        {svc.description && (
                          <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{svc.description}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Clock size={11} /> {svc.duration_minutes || 60} mins</span>
                          <span>{getServiceModeLabel(svc.service_delivery_mode || merged.service_delivery_mode)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-lg font-bold text-slate-900">
                          ${Number(svc.price || merged.booking_price || 0).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleBook(svc)}
                          className="rounded-xl bg-[#0b7e84] px-4 py-2 text-sm font-semibold text-white hover:bg-[#096a70] transition"
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Services Offered</p>
                    <ul className="space-y-1.5 text-sm text-slate-600">
                      {servicesOffered.map((item) => <li key={item} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#0b7e84]" />{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Works With</p>
                    <ul className="space-y-1.5 text-sm text-slate-600">
                      {worksWith.map((item) => <li key={item} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#0b7e84]" />{item}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Qualifications */}
            {certifications.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-900">Qualifications</h2>
                <ul className="space-y-2">
                  {certifications.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-sm text-slate-700">
                      <ShieldCheck size={15} className="shrink-0 text-emerald-600" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Service Area + Map */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Service Area</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                {serviceAreas.map((area) => (
                  <span key={area} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
                    <MapPin size={12} className="text-[#0b7e84]" /> {area}
                  </span>
                ))}
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  title="Provider location"
                  src={`https://www.google.com/maps?q=${mapQuery}&z=12&output=embed`}
                  className="h-[240px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <aside className="space-y-4">

            {/* Book CTA card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-100">
                  {merged.avatar_url
                    ? <img src={merged.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center bg-[#e8f4f5] text-lg font-bold text-[#0b7e84]">{displayName.charAt(0)}</div>}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{firstName}</p>
                  <p className="flex items-center gap-1 text-xs text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available
                  </p>
                </div>
              </div>
              {sessionRate > 0 && (
                <p className="mb-3 text-2xl font-bold text-slate-900">
                  ${sessionRate.toFixed(2)} <span className="text-sm font-normal text-slate-400">/ session</span>
                </p>
              )}
              <button
                onClick={() => handleBook()}
                className="w-full rounded-xl bg-[#0b7e84] py-3 text-sm font-bold text-white hover:bg-[#096a70] transition"
              >
                Book a Session
              </button>
              <button
                onClick={handleMessage}
                className="mt-2 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Send a Message
              </button>
            </div>

            {/* Info card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <p className="font-semibold text-slate-900">Details</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5 text-slate-600">
                  <Globe size={15} className="mt-0.5 shrink-0 text-[#0b7e84]" />
                  <span>{getServiceModeLabel(merged.service_delivery_mode)}</span>
                </div>
                {cityCountry && (
                  <div className="flex items-start gap-2.5 text-slate-600">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-[#0b7e84]" />
                    <span>{cityCountry}</span>
                  </div>
                )}
                <div className="flex items-start gap-2.5 text-slate-600">
                  <Languages size={15} className="mt-0.5 shrink-0 text-[#0b7e84]" />
                  <span>{languages.length ? languages.join(", ") : "English"}</span>
                </div>
              </div>
            </div>

            {/* Availability */}
            {availability.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                  <CalendarDays size={15} className="text-[#0b7e84]" /> Availability
                </p>
                <div className="space-y-2">
                  {availability.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{DAYS[slot.day_of_week] ?? `Day ${slot.day_of_week}`}</span>
                      <span className="text-slate-500">{slot.start_time} – {slot.end_time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <Footer />

      {/* ── BOOKING OVERLAY ── */}
      {showBooking && currentUser?.id && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Book a session with {firstName}</h3>
              <button
                onClick={() => setShowBooking(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <BookingModal
                provider={{
                  id: merged.user_id || profile.user_id || id || "",
                  provider_type: providerRole,
                  coach_profile_id: providerRole === "coach" ? providerRecord?.id || null : null,
                  user_id: merged.user_id || profile.user_id || id || "",
                  service_delivery_mode: merged.service_delivery_mode,
                  calendar_mode: merged.calendar_mode,
                  phone: merged.phone || null,
                  phone_visible_after_booking: merged.phone_visible_after_booking || false,
                }}
                learner={{ id: currentUser.id }}
                selectedService={selectedService}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
