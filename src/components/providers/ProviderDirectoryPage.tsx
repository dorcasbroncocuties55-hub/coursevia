import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  DIRECTORY_COUNTRIES,
  detectLocation,
  filterProviders,
  getCountryOption,
  getRoleCopy,
  loadProviders,
  ProviderRole,
  countryNameFromSlug,
  countryToSlug,
} from "@/lib/providerDirectory";
import { getServiceModeLabel } from "@/lib/providerModes";
import { ChevronRight, MapPin, Search, ShieldCheck, ArrowRight } from "lucide-react";

const normalizeText = (v?: string | null) =>
  (v || "").toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
const cityToSlug = (v?: string | null) => normalizeText(v).replace(/\s+/g, "-");
const cityNameFromSlug = (v?: string) =>
  (v || "").split("-").filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
const asTagList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean).map(String).slice(0, 5);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  return [];
};

// Nominatim location autocomplete (OpenStreetMap, no API key needed)
type NominatimResult = { display_name: string; address: { city?: string; town?: string; village?: string; county?: string; country?: string; country_code?: string } };

const useLocationAutocomplete = (query: string, country: string) => {
  const [suggestions, setSuggestions] = useState<{ label: string; city: string; country: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const countryCode = country ? DIRECTORY_COUNTRIES.find(c => c.name === country)?.code?.toLowerCase() : "";
        const params = new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "6",
          featuretype: "city",
          ...(countryCode ? { countrycodes: countryCode } : {}),
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { "Accept-Language": "en", "User-Agent": "Coursevia/1.0" },
        });
        const data: NominatimResult[] = await res.json();
        const seen = new Set<string>();
        const results = data
          .map((r) => {
            const city = r.address.city || r.address.town || r.address.village || r.address.county || "";
            const countryName = r.address.country || "";
            const label = [city, countryName].filter(Boolean).join(", ");
            return { label, city, country: countryName };
          })
          .filter((r) => {
            if (!r.city || seen.has(r.label)) return false;
            seen.add(r.label);
            return true;
          });
        setSuggestions(results);
      } catch { setSuggestions([]); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, country]);

  return { suggestions, clear: () => setSuggestions([]) };
};

const FAQ_ITEMS = (label: string) => [
  { q: `How do I choose the right ${label.toLowerCase()}?`, a: `Review the profile summary, service focus, languages, and delivery options. Open the full profile to compare approach, areas of expertise, and booking options before reaching out.` },
  { q: `Can I book online and in person?`, a: `Yes. Providers who offer both will show the correct service delivery options on their profile and during booking.` },
  { q: `Why should I use this directory?`, a: `All profiles are structured consistently so you can compare providers side by side before booking.` },
  { q: `How do I know a provider is verified?`, a: `Verified providers have completed identity verification. Look for the verified badge on their profile card.` },
  { q: `What if no providers are listed in my city?`, a: `Try searching by country or use the nearby feature. Many providers offer online sessions and can work with clients anywhere.` },
  { q: `How do I book a session?`, a: `Open a provider profile, choose a service, pick a date and time, then complete the booking flow.` },
  { q: `Is there a subscription required to search?`, a: `No. Search and browsing are free. You only need an account to book a session.` },
  { q: `What types of sessions are available?`, a: `Providers offer online video sessions, in-person appointments, or both depending on their settings.` },
];

type Props = { role: ProviderRole };

const ProviderDirectoryPage = ({ role }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { country, city } = useParams();
  const roleCopy = useMemo(() => getRoleCopy(role), [role]);

  const isTherapist = role === "therapist";
  const singularWord = isTherapist ? "Therapist" : "Coach";
  const pluralWord = isTherapist ? "Therapists" : "Coaches";
  const illustration = isTherapist ? "/therapist-directory-hero.png" : "/coach-directory-hero.png";

  const routeCountry = countryNameFromSlug(country);
  const routeCity = cityNameFromSlug(city);
  const querySearch = searchParams.get("q") || "";
  const nearbyLabel = searchParams.get("nearby") === "1";
  const nearbyCountry = searchParams.get("country") || "";
  const pageCountry = routeCountry || nearbyCountry;
  const pageCity = routeCity;
  const isResultsPage = Boolean(country || city || querySearch || nearbyLabel);

  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [searchInput, setSearchInput] = useState(pageCity || querySearch || "");
  const [selectedCountry, setSelectedCountry] = useState(pageCountry);
  const [serviceModeFilter, setServiceModeFilter] = useState<"all" | "online" | "in_person">("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, clear: clearSuggestions } = useLocationAutocomplete(searchInput, selectedCountry);

  useEffect(() => {
    loadProviders(role).then((r) => { setProviders(r.data || []); setError(r.error || ""); setLoading(false); });
  }, [role]);

  useEffect(() => {
    setSelectedCountry(pageCountry);
    setSearchInput(pageCity || querySearch || "");
  }, [pageCountry, pageCity, querySearch]);

  const countryScopedProviders = useMemo(() =>
    pageCountry ? filterProviders(providers, { selectedCountry: pageCountry }) : providers,
    [providers, pageCountry]);

  const cityOptions = useMemo(() => {
    const map = new Map<string, string>();
    countryScopedProviders.forEach((p) => { if (p.city) map.set(cityToSlug(p.city), String(p.city).trim()); });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [countryScopedProviders]);

  const filteredProviders = useMemo(() => {
    let r = [...countryScopedProviders];
    if (pageCity) r = r.filter((p) => normalizeText(p.city) === normalizeText(pageCity) || cityToSlug(p.city) === cityToSlug(pageCity));
    if (querySearch) r = filterProviders(r, { search: querySearch });
    if (serviceModeFilter !== "all") r = r.filter((p) => {
      const m = normalizeText(p.service_delivery_mode);
      return serviceModeFilter === "online" ? m.includes("online") || m === "both" : m.includes("person") || m === "both";
    });
    return r;
  }, [countryScopedProviders, pageCity, querySearch, serviceModeFilter]);

  const goToCountry = (name: string) => navigate(`${roleCopy.routeBase}/${countryToSlug(name)}`);
  const goToCity = (cName: string, cityName: string) => navigate(`${roleCopy.routeBase}/${countryToSlug(cName)}/${cityToSlug(cityName)}`);

  const handleSearch = () => {
    const q = searchInput.trim();
    if (selectedCountry && q) {
      const m = cityOptions.find((c) => normalizeText(c.name) === normalizeText(q));
      if (m) { navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}/${m.slug}`); return; }
      navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}?q=${encodeURIComponent(q)}`); return;
    }
    if (selectedCountry) { goToCountry(selectedCountry); return; }
    if (q) { navigate(`${roleCopy.routeBase}/results?q=${encodeURIComponent(q)}`); return; }
    navigate(roleCopy.routeBase);
  };

  const handleNearby = async () => {
    setGeoLoading(true); setGeoError("");
    const r = await detectLocation();
    if (r.inferredCountry) { navigate(`${roleCopy.routeBase}/results?nearby=1&country=${encodeURIComponent(r.inferredCountry)}`); setGeoLoading(false); return; }
    if (!r.ok) { setGeoError(r.error || "Could not get location."); setGeoLoading(false); return; }
    navigate(`${roleCopy.routeBase}/results?nearby=1`); setGeoLoading(false);
  };

  const headingPrimary = pageCity ? `${pluralWord} in ${pageCity}, ${pageCountry}`
    : pageCountry ? `${pluralWord} in ${pageCountry}`
    : querySearch ? `${pluralWord} Search Results`
    : `${pluralWord} Near You`;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        {/* Animated gradient orbs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-200/30 to-emerald-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 shadow-lg border border-emerald-100">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-900">{roleCopy.directoryLabel}</span>
              </div>
              
              <h1 className="text-5xl font-black leading-[1.1] text-slate-900 md:text-7xl">
                Find Your
                <br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {singularWord}
                </span>
              </h1>
              
              <p className="text-lg leading-relaxed text-slate-600 max-w-xl">
                {pageCountry ? `Discover verified ${pluralWord.toLowerCase()} in ${pageCountry}` : `Connect with verified ${pluralWord.toLowerCase()} near you`}. Browse profiles, compare expertise, and book sessions instantly.
              </p>

              {/* Search bar */}
              <div className="relative">
                <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-2xl border border-slate-200 sm:flex-row sm:items-center">
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white transition sm:w-[220px]"
                  >
                    <option value="">🌍 All countries</option>
                    {DIRECTORY_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                  
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { clearSuggestions(); setShowSuggestions(false); handleSearch(); } if (e.key === "Escape") setShowSuggestions(false); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Search by city, specialty, or name..."
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-14 pr-5 text-sm font-medium outline-none focus:border-emerald-500 focus:bg-white transition placeholder:text-slate-400"
                      autoComplete="off"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearchInput(s.city);
                              if (s.country && !selectedCountry) {
                                const match = DIRECTORY_COUNTRIES.find(c => c.name.toLowerCase() === s.country.toLowerCase());
                                if (match) setSelectedCountry(match.name);
                              }
                              clearSuggestions();
                              setShowSuggestions(false);
                            }}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-emerald-50 transition border-b border-slate-100 last:border-0"
                          >
                            <MapPin size={16} className="text-emerald-600 shrink-0" />
                            <span className="text-sm font-medium text-slate-900">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleSearch} 
                    className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 text-sm font-bold text-white hover:from-emerald-700 hover:to-teal-700 transition shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button 
                  onClick={handleNearby} 
                  disabled={geoLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-md border border-slate-200"
                >
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  {geoLoading ? "Detecting..." : "Find nearby"}
                </button>
                <span className="text-sm text-slate-500">✨ Free to search • No signup required</span>
              </div>
              {geoError && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{geoError}</p>}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { v: loading ? "..." : `${providers.length}+`, l: "Verified Profiles", icon: "👥" },
                  { v: `${DIRECTORY_COUNTRIES.length}`, l: "Countries", icon: "🌍" },
                  { v: "24/7", l: "Booking", icon: "⚡" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-white/80 backdrop-blur-sm px-5 py-4 shadow-lg border border-slate-200 hover:shadow-xl transition">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <p className="text-2xl font-black text-slate-900">{s.v}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Illustration */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-[3rem] blur-2xl" />
                <div className="relative rounded-[3rem] bg-gradient-to-br from-white to-emerald-50/50 p-8 shadow-2xl border border-white/50 backdrop-blur-sm">
                  <img 
                    src={illustration} 
                    alt={singularWord} 
                    className="mx-auto max-h-[450px] w-auto object-contain drop-shadow-2xl" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-16">
        {error && <div className="mb-8 rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">{error}</div>}

        {/* ── RESULTS PAGE ── */}
        {isResultsPage ? (
          <div>
            <button 
              onClick={() => navigate(roleCopy.routeBase)} 
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition group"
            >
              <span className="group-hover:-translate-x-1 transition">←</span> Back to {pluralWord}
            </button>

            {/* Heading + filters */}
            <div className="mb-10">
              <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 md:text-5xl mb-2">{headingPrimary}</h2>
                  <p className="text-base text-slate-600">
                    {loading ? "Loading..." : (
                      <>
                        <span className="font-bold text-emerald-600">{filteredProviders.length}</span> {filteredProviders.length === 1 ? 'result' : 'results'} found
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(["all", "online", "in_person"] as const).map((m) => (
                    <button 
                      key={m} 
                      onClick={() => setServiceModeFilter(m)}
                      className={`rounded-full px-6 py-3 text-sm font-bold transition shadow-md ${
                        serviceModeFilter === m 
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/30" 
                          : "bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200"
                      }`}
                    >
                      {m === "all" ? "All Sessions" : m === "online" ? "🌐 Online" : "📍 In-Person"}
                    </button>
                  ))}
                </div>
              </div>

              {/* City pills */}
              {pageCountry && cityOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {cityOptions.map((c) => (
                    <button 
                      key={c.slug} 
                      onClick={() => goToCity(pageCountry, c.name)}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition shadow-sm ${
                        cityToSlug(pageCity) === c.slug 
                          ? "bg-emerald-600 text-white shadow-emerald-500/30" 
                          : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cards */}
            {loading ? (
              <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 py-24 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-600 mb-4" />
                <p className="text-slate-600 font-medium">Loading {pluralWord.toLowerCase()}...</p>
              </div>
            ) : !filteredProviders.length ? (
              <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 py-24 text-center border-2 border-dashed border-slate-300">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-2xl font-bold text-slate-900 mb-2">{roleCopy.emptyTitle}</p>
                <p className="text-slate-600 max-w-md mx-auto mb-6">{roleCopy.emptyDescription}</p>
                <button 
                  onClick={() => navigate(roleCopy.routeBase)} 
                  className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 text-sm font-bold text-white hover:from-emerald-700 hover:to-teal-700 transition shadow-lg shadow-emerald-500/30"
                >
                  Browse All Countries
                </button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProviders.map((provider) => {
                  const pId = provider.user_id || provider.id;
                  const name = provider.full_name || provider.display_name || provider.username || singularWord;
                  const verified = String(provider.kyc_status || provider.verification_status || "").toLowerCase() === "approved" || Boolean(provider.is_verified);
                  const co = getCountryOption(provider.country || provider.country_code || "");
                  const location = [provider.city, co?.name || provider.country].filter(Boolean).join(", ");
                  const tags = asTagList(provider.skills);
                  const price = Number(provider.booking_price ?? provider.session_price ?? provider.hourly_rate ?? 0);

                  return (
                    <div
                      key={pId}
                      className="group relative flex flex-col rounded-3xl bg-white p-6 shadow-lg border-2 border-slate-100 transition hover:-translate-y-2 hover:shadow-2xl hover:border-emerald-200"
                    >
                      {/* Verified badge */}
                      {verified && (
                        <div className="absolute -top-3 -right-3 z-10">
                          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 shadow-lg">
                            <ShieldCheck className="h-4 w-4 text-white" />
                            <span className="text-xs font-bold text-white">Verified</span>
                          </div>
                        </div>
                      )}

                      {/* Avatar + Info */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative shrink-0">
                          <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-white shadow-xl ring-2 ring-slate-100">
                            {provider.avatar_url ? (
                              <img src={provider.avatar_url} alt={name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-400 text-2xl font-black text-white">
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 shadow-md" />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition mb-1">
                            {name}
                          </h3>
                          <p className="text-xs font-medium text-slate-500 line-clamp-1 mb-2">
                            {provider.headline || roleCopy.defaultHeadline}
                          </p>
                          {location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="font-medium">{location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {provider.bio && (
                        <p className="text-sm leading-relaxed text-slate-600 line-clamp-2 mb-4">
                          {provider.bio}
                        </p>
                      )}

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tags.slice(0, 3).map((t) => (
                            <span 
                              key={t} 
                              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-auto pt-4 border-t-2 border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                            {getServiceModeLabel(provider.service_delivery_mode)}
                          </span>
                          {price > 0 && (
                            <span className="text-lg font-black text-slate-900">
                              ${price.toFixed(0)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`${roleCopy.profileRouteBase}/${pId}`)}
                          className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:from-emerald-700 hover:to-teal-700 transition shadow-md shadow-emerald-500/30 hover:shadow-lg"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : (
          /* ── HOME PAGE ── */
          <>
            {/* Country grid */}
            <section className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
              
              <div className="relative z-10 px-8 py-14 md:px-14 md:py-16">
                <div className="text-center mb-10">
                  <p className="text-sm font-semibold text-emerald-400 mb-2">🌍 Global Directory</p>
                  <h2 className="text-4xl font-black md:text-5xl mb-3">
                    Browse by Country
                  </h2>
                  <p className="text-slate-300 max-w-2xl mx-auto">
                    Find {pluralWord.toLowerCase()} in your region or explore worldwide
                  </p>
                </div>
                
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {DIRECTORY_COUNTRIES.slice(0, 24).map((c) => (
                    <button 
                      key={c.code} 
                      onClick={() => goToCountry(c.name)}
                      className="group flex items-center gap-3 rounded-2xl bg-white p-4 text-left transition hover:-translate-y-1 hover:shadow-2xl"
                    >
                      <span className="text-3xl group-hover:scale-110 transition">{c.flag}</span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition">
                          {c.name}
                        </span>
                        <span className="block text-xs text-slate-500">Explore →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* How it works */}
            <section className="mt-20">
              <div className="text-center mb-12">
                <span className="inline-block text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full mb-4">
                  ⚡ Simple Process
                </span>
                <h2 className="text-4xl font-black text-slate-900 md:text-5xl">
                  How It Works
                </h2>
              </div>
              
              <div className="grid gap-8 md:grid-cols-3">
                {[
                  { 
                    num: "1", 
                    title: `Browse ${pluralWord}`, 
                    body: `Search by location, specialty, or availability. Compare profiles with verified credentials and real reviews.`, 
                    gradient: "from-blue-500 to-cyan-500",
                    icon: "🔍"
                  },
                  { 
                    num: "2", 
                    title: "Book Your Session", 
                    body: `Choose online or in-person. Pick a time that works for you. Secure payment with instant confirmation.`, 
                    gradient: "from-emerald-500 to-teal-500",
                    icon: "📅"
                  },
                  { 
                    num: "3", 
                    title: "Start Your Journey", 
                    body: `Meet your ${singularWord.toLowerCase()}. Track progress. Achieve your goals with professional guidance.`, 
                    gradient: "from-purple-500 to-pink-500",
                    icon: "🚀"
                  },
                ].map((step) => (
                  <div key={step.num} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition rounded-3xl blur-xl" style={{ background: `linear-gradient(to bottom right, ${step.gradient})` }} />
                    <div className="relative rounded-3xl bg-white p-8 shadow-lg border-2 border-slate-100 hover:border-transparent transition">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} text-white text-2xl font-black mb-6 shadow-lg`}>
                        {step.icon}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-3">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Stats banner */}
            <section className="mt-20 relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-8 py-16 text-white shadow-2xl md:px-14">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              
              <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
                <div className="space-y-5">
                  {[
                    { v: "300+", l: "Verified Professionals", icon: "👥" },
                    { v: "300+", l: "Cities Worldwide", icon: "🌆" },
                    { v: "70+", l: "Countries Covered", icon: "🌍" },
                  ].map((s) => (
                    <div key={s.l} className="flex items-center gap-5 rounded-2xl bg-white/10 backdrop-blur-md px-6 py-5 border border-white/20 hover:bg-white/20 transition">
                      <div className="text-4xl">{s.icon}</div>
                      <div>
                        <p className="text-3xl font-black">{s.v}</p>
                        <p className="text-sm font-medium text-white/80">{s.l}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div>
                  <h2 className="text-4xl font-black leading-tight md:text-5xl mb-6">
                    {isTherapist ? "Mental Wellness" : "Professional Growth"}
                    <br />
                    Made Simple
                  </h2>
                  <p className="text-lg leading-relaxed text-white/90 mb-8">
                    Compare {pluralWord.toLowerCase()} by location, specialty, and availability. Book sessions that fit your schedule. Start your journey today.
                  </p>
                  <button 
                    onClick={() => handleSearch()}
                    className="rounded-full bg-white px-8 py-4 text-sm font-bold text-emerald-600 hover:bg-slate-50 transition shadow-xl"
                  >
                    Get Started Now →
                  </button>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section className="mt-20 grid gap-12 lg:grid-cols-2">
              <div>
                <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-6 mb-8">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-bold text-amber-900 mb-2">Need Urgent Support?</p>
                      <p className="text-sm leading-relaxed text-amber-800">
                        For immediate help, contact local emergency services or crisis helplines. This directory is for ongoing care and scheduled sessions.
                      </p>
                    </div>
                  </div>
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 md:text-4xl mb-4">
                  Find {pluralWord} Anywhere
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Search by country, city, specialty, or availability. Browse verified profiles with consistent information across all listings.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {DIRECTORY_COUNTRIES.slice(0, 18).map((c) => (
                    <button 
                      key={c.code} 
                      onClick={() => goToCountry(c.name)} 
                      className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-black text-slate-900 md:text-4xl mb-6">
                  Common Questions
                </h2>
                <div className="space-y-3">
                  {FAQ_ITEMS(singularWord).map((item, i) => (
                    <div key={i} className="rounded-2xl bg-white border-2 border-slate-100 overflow-hidden hover:border-emerald-200 transition">
                      <button 
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span className="text-sm font-bold text-slate-900">{item.q}</span>
                        <ChevronRight 
                          className={`h-5 w-5 shrink-0 text-emerald-600 transition-transform ${openFaq === i ? "rotate-90" : ""}`} 
                        />
                      </button>
                      {openFaq === i && (
                        <div className="px-6 pb-5">
                          <p className="text-sm leading-relaxed text-slate-600 border-t-2 border-slate-100 pt-4">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ProviderDirectoryPage;

