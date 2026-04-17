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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground">
      <Navbar />

      {/* ── HERO ── */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-background relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="mx-auto max-w-[1100px] px-4 py-12 lg:py-16 relative z-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full">
                {roleCopy.directoryLabel}
              </span>
              <h1 className="text-[40px] font-bold leading-[1.1] text-foreground md:text-[56px] mb-4">
                Find a <span className="text-primary">{singularWord}</span>
                <br />
                {pageCountry ? `In ${pageCountry}` : "Near You"}
              </h1>
              <p className="max-w-[480px] text-base leading-relaxed text-muted-foreground">
                Search by country, city, or specialty. Browse verified profiles and book directly.
              </p>

              {/* Search bar */}
              <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl backdrop-blur-sm sm:flex-row sm:items-center">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition sm:w-[200px]"
                >
                  <option value="">All countries</option>
                  {DIRECTORY_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { clearSuggestions(); setShowSuggestions(false); handleSearch(); } if (e.key === "Escape") setShowSuggestions(false); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="City, specialty, name…"
                    className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
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
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-primary/5 transition border-b border-border last:border-0"
                        >
                          <MapPin size={14} className="text-primary shrink-0" />
                          <span className="text-foreground font-medium">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleSearch} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-primary/20">
                  Search
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button onClick={handleNearby} disabled={geoLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary hover:bg-primary/5 disabled:opacity-50 transition shadow-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  {geoLoading ? "Detecting…" : "Browse nearby"}
                </button>
                <span className="text-xs text-muted-foreground">Free to search · No account required</span>
              </div>
              {geoError && <p className="mt-2 text-sm text-destructive">{geoError}</p>}

              {/* Stats */}
              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { v: `${providers.length || 0}+`, l: "Listed profiles" },
                  { v: `${DIRECTORY_COUNTRIES.length}`, l: "Countries" },
                  { v: "Live", l: "Booking" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm px-5 py-4 shadow-sm hover:shadow-md transition">
                    <p className="text-2xl font-bold text-foreground">{s.v}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Illustration */}
            <div className="hidden lg:flex lg:justify-end">
              <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 shadow-2xl border border-border backdrop-blur-sm">
                <img src={illustration} alt={singularWord} className="mx-auto max-h-[380px] w-auto object-contain drop-shadow-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 py-12">
        {error && <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">{error}</div>}

        {/* ── RESULTS PAGE ── */}
        {isResultsPage ? (
          <div>
            <button onClick={() => navigate(roleCopy.routeBase)} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition font-medium">
              ← Back to {pluralWord}
            </button>

            {/* Heading + filters */}
            <div className="mb-8 border-b border-border pb-6">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <h2 className="text-[32px] font-bold text-foreground md:text-[44px] leading-tight">{headingPrimary}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{loading ? "Loading…" : `${filteredProviders.length} result${filteredProviders.length !== 1 ? "s" : ""}`}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["all", "online", "in_person"] as const).map((m) => (
                    <button key={m} onClick={() => setServiceModeFilter(m)}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition shadow-sm ${serviceModeFilter === m ? "bg-primary text-primary-foreground shadow-primary/20" : "border border-border bg-card text-foreground hover:border-primary hover:bg-primary/5"}`}>
                      {m === "all" ? "All" : m === "online" ? "Online" : "In person"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* City pills */}
            {pageCountry && cityOptions.length > 0 && (
              <div className="mb-8 flex flex-wrap gap-2">
                {cityOptions.map((c) => (
                  <button key={c.slug} onClick={() => goToCity(pageCountry, c.name)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition shadow-sm ${cityToSlug(pageCity) === c.slug ? "bg-primary text-primary-foreground shadow-primary/20" : "border border-border bg-card text-foreground hover:border-primary hover:bg-primary/5"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Cards */}
            {loading ? (
              <div className="rounded-2xl border border-border bg-muted/30 py-20 text-center text-muted-foreground">Loading {pluralWord.toLowerCase()}…</div>
            ) : !filteredProviders.length ? (
              <div className="rounded-2xl border border-border bg-muted/30 py-20 text-center">
                <p className="text-xl font-semibold text-foreground">{roleCopy.emptyTitle}</p>
                <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">{roleCopy.emptyDescription}</p>
                <button onClick={() => navigate(roleCopy.routeBase)} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-primary/20">Browse all countries</button>
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
                      className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:border-primary/50"
                    >
                      {/* Top: avatar + name */}
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-border shadow-md">
                            {provider.avatar_url
                              ? <img src={provider.avatar_url} alt={name} className="h-full w-full object-cover" />
                              : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-xl font-bold text-primary">{name.charAt(0).toUpperCase()}</div>}
                          </div>
                          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-emerald-500 shadow-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">{name}</h3>
                            {verified && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="h-3 w-3" /> Verified
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{provider.headline || roleCopy.defaultHeadline}</p>
                          {location && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0 text-primary" />{location}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {provider.bio && (
                        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{provider.bio}</p>
                      )}

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {tags.map((t) => (
                            <span key={t} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{t}</span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="rounded-full bg-muted px-3 py-1 font-medium">{getServiceModeLabel(provider.service_delivery_mode)}</span>
                          {price > 0 && <span className="font-bold text-foreground">${price.toFixed(2)}</span>}
                        </div>
                        <button
                          onClick={() => navigate(`${roleCopy.profileRouteBase}/${pId}`)}
                          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-md shadow-primary/20"
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
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-2xl">
              <div className="px-6 py-10 md:px-12 md:py-12">
                <div className="text-center mb-8">
                  <p className="text-sm font-medium text-primary-foreground/80 mb-2">Find Nearby {isTherapist ? "Psychologists" : "Business Coaches"}</p>
                  <h2 className="text-sm font-medium text-primary-foreground/80 mb-3">And {pluralWord}</h2>
                  <h2 className="text-[32px] font-bold md:text-[42px]">Browse by country</h2>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {DIRECTORY_COUNTRIES.slice(0, 24).map((c) => (
                    <button key={c.code} onClick={() => goToCountry(c.name)}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-foreground transition hover:-translate-y-1 hover:shadow-xl">
                      <span className="text-2xl">{c.flag}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">View profiles</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Start Here */}
            <section className="mt-16">
              <h2 className="mb-10 text-center text-[36px] font-bold text-foreground md:text-[48px]">
                Start <span className="text-primary">Here</span>
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { title: `Choose your ${singularWord.toLowerCase()}`, body: `Browse complete profiles with service focus, delivery mode, and experience details before you reach out.`, bg: "bg-gradient-to-br from-blue-50 to-blue-100/50", img: isTherapist ? "/therapist-hero-right.png" : "/coach-hero-right.png" },
                  { title: isTherapist ? "Attend your sessions" : "Schedule your sessions", body: `Move from search to profile to booking without losing context.`, bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50", img: "" },
                  { title: isTherapist ? "Track your progress" : "Stay aligned with your goals", body: `The platform keeps the public profile, contact action, and booking path consistent.`, bg: "bg-gradient-to-br from-amber-50 to-amber-100/50", img: "" },
                ].map((card) => (
                  <div key={card.title} className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg hover:shadow-2xl transition group">
                    <div className={`h-48 ${card.bg} flex items-center justify-center overflow-hidden relative`}>
                      {card.img ? <img src={card.img} alt="" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" /> : 
                      <div className="w-20 h-20 rounded-full bg-white/50 backdrop-blur-sm" />}
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-foreground">{card.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                      <button className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition">
                        Read more <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Stats banner */}
            <section className="mt-16 rounded-3xl bg-gradient-to-br from-primary/95 via-primary to-primary/90 px-6 py-12 text-primary-foreground shadow-2xl md:px-12 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
              
              <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center relative z-10">
                <div className="space-y-4">
                  {[
                    { v: "300+", l: "Profiles across multiple countries" },
                    { v: "300+", l: "City pages" },
                    { v: "70+", l: "Countries with active listings" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-2xl bg-card px-5 py-4 text-foreground shadow-lg backdrop-blur-sm border border-border">
                      <p className="text-2xl font-bold text-primary">{s.v}</p>
                      <p className="text-sm text-muted-foreground mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h2 className="text-[32px] font-bold leading-tight md:text-[48px]">
                    {isTherapist ? "Therapy" : "Coaching"}<br />Shaped Around You
                  </h2>
                  <p className="mt-5 text-base leading-relaxed text-primary-foreground/90">
                    Compare providers by location, specialty, availability, and delivery format, then move from the results page into a structured profile and a cleaner booking path.
                  </p>
                </div>
              </div>
            </section>

            {/* Find + FAQ */}
            <section className="mt-16 grid gap-10 lg:grid-cols-2">
              <div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900 shadow-sm">
                  If you need urgent support, local emergency services and crisis helplines remain the fastest route to immediate help. Use this directory to compare providers and book the right fit for ongoing care.
                </div>
                <h2 className="mt-10 text-[28px] font-bold text-foreground md:text-[36px]">
                  Find {pluralWord.toLowerCase()} near you, in your city, or anywhere
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {DIRECTORY_COUNTRIES.slice(0, 18).map((c) => (
                    <button key={c.code} onClick={() => goToCountry(c.name)} className="text-sm text-primary hover:underline font-medium">[{c.code}]</button>
                  ))}
                </div>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                  Search for a {singularWord.toLowerCase()} using country, city, service focus, or availability. Once you open a result, the public profile keeps the same structured sections for about, services, expertise, service areas, and contact actions.
                </p>
              </div>

              <div>
                <h2 className="mb-6 text-[28px] font-bold text-foreground md:text-[36px]">FAQ</h2>
                <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-lg">
                  {FAQ_ITEMS(singularWord).map((item, i) => (
                    <div key={i} className="px-6 py-5">
                      <button className="flex w-full items-center justify-between gap-4 text-left text-sm font-semibold text-foreground hover:text-primary transition"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                        {item.q}
                        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform text-primary ${openFaq === i ? "rotate-90" : ""}`} />
                      </button>
                      {openFaq === i && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>}
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

