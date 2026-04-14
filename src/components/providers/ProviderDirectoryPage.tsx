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
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      {/* ── HERO ── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1100px] px-4 py-10 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#0b7e84]">
                {roleCopy.directoryLabel}
              </p>
              <h1 className="text-[36px] font-bold leading-tight text-slate-900 md:text-[52px]">
                Find a <span className="text-[#1694b4]">{singularWord}</span>
                <br />
                {pageCountry ? `In ${pageCountry}` : "Near You"}
              </h1>
              <p className="mt-4 max-w-[480px] text-[15px] leading-7 text-slate-500">
                Search by country, city, or specialty. Browse verified profiles and book directly.
              </p>

              {/* Search bar */}
              <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-md sm:flex-row sm:items-center">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none sm:w-[180px]"
                >
                  <option value="">All countries</option>
                  {DIRECTORY_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { clearSuggestions(); setShowSuggestions(false); handleSearch(); } if (e.key === "Escape") setShowSuggestions(false); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="City, specialty, name…"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
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
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                        >
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="text-slate-800">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleSearch} className="rounded-xl bg-[#0b7e84] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#096a70]">
                  Search
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button onClick={handleNearby} disabled={geoLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-[#0b7e84] hover:text-[#0b7e84] disabled:opacity-50">
                  <MapPin className="h-3.5 w-3.5" />
                  {geoLoading ? "Detecting…" : "Browse nearby"}
                </button>
                <span className="text-xs text-slate-400">Free to search · No account required</span>
              </div>
              {geoError && <p className="mt-2 text-xs text-red-500">{geoError}</p>}

              {/* Stats */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { v: `${providers.length || 0}+`, l: "Listed profiles" },
                  { v: `${DIRECTORY_COUNTRIES.length}`, l: "Countries" },
                  { v: "Live", l: "Booking" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-xl font-bold text-slate-900">{s.v}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-400">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Illustration */}
            <div className="hidden lg:flex lg:justify-end">
              <div className="relative rounded-[28px] bg-[radial-gradient(circle_at_top_left,#fff_0%,#f0f7f8_60%,#e8f4f5_100%)] p-6 shadow-lg border border-slate-100">
                <img src={illustration} alt={singularWord} className="mx-auto max-h-[360px] w-auto object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 py-10">
        {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* ── RESULTS PAGE ── */}
        {isResultsPage ? (
          <div>
            <button onClick={() => navigate(roleCopy.routeBase)} className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
              ← Back to {pluralWord}
            </button>

            {/* Heading + filters */}
            <div className="mb-6 border-b border-slate-200 pb-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-bold text-slate-900 md:text-[38px]">{headingPrimary}</h2>
                  <p className="mt-1 text-sm text-slate-400">{loading ? "Loading…" : `${filteredProviders.length} result${filteredProviders.length !== 1 ? "s" : ""}`}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["all", "online", "in_person"] as const).map((m) => (
                    <button key={m} onClick={() => setServiceModeFilter(m)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${serviceModeFilter === m ? "bg-[#0b7e84] text-white" : "border border-slate-200 text-slate-600 hover:border-[#0b7e84]"}`}>
                      {m === "all" ? "All" : m === "online" ? "Online" : "In person"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* City pills */}
            {pageCountry && cityOptions.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {cityOptions.map((c) => (
                  <button key={c.slug} onClick={() => goToCity(pageCountry, c.name)}
                    className={`rounded-full px-3 py-1.5 text-sm ${cityToSlug(pageCity) === c.slug ? "bg-[#0b7e84] text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-[#0b7e84]"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Cards */}
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 py-16 text-center text-slate-400">Loading {pluralWord.toLowerCase()}…</div>
            ) : !filteredProviders.length ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 py-16 text-center">
                <p className="text-lg font-semibold text-slate-900">{roleCopy.emptyTitle}</p>
                <p className="mt-2 text-sm text-slate-500">{roleCopy.emptyDescription}</p>
                <button onClick={() => navigate(roleCopy.routeBase)} className="mt-5 rounded-full bg-[#0b7e84] px-5 py-2.5 text-sm font-semibold text-white">Browse all countries</button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {/* Top: avatar + name */}
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                            {provider.avatar_url
                              ? <img src={provider.avatar_url} alt={name} className="h-full w-full object-cover" />
                              : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e8f4f5] to-[#d0ecee] text-xl font-bold text-[#0b7e84]">{name.charAt(0).toUpperCase()}</div>}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-[#0b7e84] transition">{name}</h3>
                            {verified && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                <ShieldCheck className="h-3 w-3" /> Verified
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] text-slate-500 line-clamp-1">{provider.headline || roleCopy.defaultHeadline}</p>
                          {location && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                              <MapPin className="h-3 w-3 shrink-0" />{location}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {provider.bio && (
                        <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-slate-600">{provider.bio}</p>
                      )}

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600">{t}</span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-3 text-[12px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5">{getServiceModeLabel(provider.service_delivery_mode)}</span>
                          {price > 0 && <span className="font-semibold text-slate-800">${price.toFixed(2)}</span>}
                        </div>
                        <button
                          onClick={() => navigate(`${roleCopy.profileRouteBase}/${pId}`)}
                          className="rounded-xl bg-[#0b7e84] px-4 py-2 text-xs font-semibold text-white hover:bg-[#096a70] transition"
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
            <section className="overflow-hidden rounded-[28px] bg-[#163c63] text-white shadow-lg">
              <div className="px-6 py-8 md:px-10 md:py-10">
                <p className="mb-1 text-center text-base font-medium text-white/70">Find Nearby {isTherapist ? "Psychologists" : "Business Coaches"}</p>
                <h2 className="mb-2 text-center text-base font-medium text-white/70">And {pluralWord}</h2>
                <h2 className="mb-6 text-center text-[28px] font-bold md:text-[36px]">Browse by country</h2>
                <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {DIRECTORY_COUNTRIES.slice(0, 24).map((c) => (
                    <button key={c.code} onClick={() => goToCountry(c.name)}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white px-3 py-2.5 text-left text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className="text-xl">{c.flag}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold">{c.name}</span>
                        <span className="block text-[10px] text-slate-400">Open results</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Start Here */}
            <section className="mt-14">
              <h2 className="mb-8 text-center text-[30px] font-bold text-slate-900 md:text-[40px]">
                Start <span className="text-slate-400">Here</span>
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { title: `Choose your ${singularWord.toLowerCase()}`, body: `Browse complete profiles with service focus, delivery mode, and experience details before you reach out.`, bg: "bg-[#dde8ef]", img: isTherapist ? "/therapist-hero-right.png" : "/coach-hero-right.png" },
                  { title: isTherapist ? "Attend your sessions" : "Schedule your sessions", body: `Move from search to profile to booking without losing context.`, bg: "bg-[#e9ece6]", img: "" },
                  { title: isTherapist ? "Track your progress" : "Stay aligned with your goals", body: `The platform keeps the public profile, contact action, and booking path consistent.`, bg: "bg-[#efe3d7]", img: "" },
                ].map((card) => (
                  <div key={card.title} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                    <div className={`h-44 ${card.bg} flex items-center justify-center overflow-hidden`}>
                      {card.img ? <img src={card.img} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="p-5">
                      <h3 className="text-[17px] font-bold text-slate-900">{card.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{card.body}</p>
                      <button className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#0b7e84] px-4 py-1.5 text-sm font-semibold text-[#0b7e84]">
                        Read more <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Stats banner */}
            <section className="mt-14 rounded-[28px] bg-[#284a74] px-6 py-10 text-white md:px-10">
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div className="space-y-3">
                  {[
                    { v: "300+", l: "Profiles across multiple countries" },
                    { v: "300+", l: "City pages" },
                    { v: "70+", l: "Countries with active listings" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl bg-white px-4 py-3 text-slate-900 shadow-sm">
                      <p className="text-xl font-bold text-[#0b7e84]">{s.v}</p>
                      <p className="text-xs text-slate-500">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h2 className="text-[28px] font-bold leading-tight md:text-[42px]">
                    {isTherapist ? "Therapy" : "Coaching"}<br />Shaped Around You
                  </h2>
                  <p className="mt-4 text-sm leading-8 text-white/80">
                    Compare providers by location, specialty, availability, and delivery format, then move from the results page into a structured profile and a cleaner booking path.
                  </p>
                </div>
              </div>
            </section>

            {/* Find + FAQ */}
            <section className="mt-14 grid gap-10 lg:grid-cols-2">
              <div>
                <div className="rounded-xl border border-[#f0d7a5] bg-[#fff8e8] p-4 text-sm leading-7 text-[#7c5b1f]">
                  If you need urgent support, local emergency services and crisis helplines remain the fastest route to immediate help. Use this directory to compare providers and book the right fit for ongoing care.
                </div>
                <h2 className="mt-8 text-[24px] font-bold text-slate-900 md:text-[32px]">
                  Find {pluralWord.toLowerCase()} near you, in your city, or anywhere
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DIRECTORY_COUNTRIES.slice(0, 18).map((c) => (
                    <button key={c.code} onClick={() => goToCountry(c.name)} className="text-sm text-[#0b7e84] hover:underline">[{c.code}]</button>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-8 text-slate-600">
                  Search for a {singularWord.toLowerCase()} using country, city, service focus, or availability. Once you open a result, the public profile keeps the same structured sections for about, services, expertise, service areas, and contact actions.
                </p>
              </div>

              <div>
                <h2 className="mb-4 text-[24px] font-bold text-slate-900 md:text-[32px]">FAQ</h2>
                <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                  {FAQ_ITEMS(singularWord).map((item, i) => (
                    <div key={i} className="px-5 py-4">
                      <button className="flex w-full items-center justify-between gap-4 text-left text-[14px] font-semibold text-slate-900"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                        {item.q}
                        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
                      </button>
                      {openFaq === i && <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>}
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

