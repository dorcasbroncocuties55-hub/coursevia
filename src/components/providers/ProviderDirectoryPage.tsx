import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  DIRECTORY_COUNTRIES, detectLocation, filterProviders,
  getCountryOption, getRoleCopy, loadProviders,
  ProviderRole, Provider, countryNameFromSlug, countryToSlug,
  providerProfilePath,
} from "@/lib/providerDirectory";
import { getServiceModeLabel } from "@/lib/providerModes";
import {
  ChevronDown, ChevronUp, MapPin, Search, ArrowRight,
  MessageCircle, User, CheckCircle, SlidersHorizontal, X,
} from "lucide-react";

const normalizeText = (v?: string | null) =>
  (v || "").toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
const cityToSlug    = (v?: string | null) => normalizeText(v).replace(/\s+/g, "-");
const cityNameFromSlug = (v?: string) =>
  (v || "").split("-").filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
const asTagList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean);
  return [];
};

// ── Nominatim autocomplete ────────────────────────────────────────────────────
type NominatimResult = { address: { city?: string; town?: string; village?: string; county?: string; country?: string } };
const useLocationAutocomplete = (query: string, country: string) => {
  const [suggestions, setSuggestions] = useState<{ label: string; city: string; country: string }[]>([]);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(async () => {
      try {
        const cc = country ? DIRECTORY_COUNTRIES.find(c => c.name === country)?.code?.toLowerCase() : "";
        const p = new URLSearchParams({ q: query, format: "json", addressdetails: "1", limit: "6", featuretype: "city", ...(cc ? { countrycodes: cc } : {}) });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${p}`, { headers: { "Accept-Language": "en", "User-Agent": "Coursevia/1.0" } });
        const data: NominatimResult[] = await res.json();
        const seen = new Set<string>();
        setSuggestions(data.map(r => {
          const city = r.address.city || r.address.town || r.address.village || r.address.county || "";
          const countryName = r.address.country || "";
          return { label: [city, countryName].filter(Boolean).join(", "), city, country: countryName };
        }).filter(r => { if (!r.city || seen.has(r.label)) return false; seen.add(r.label); return true; }));
      } catch { setSuggestions([]); }
    }, 300);
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [query, country]);
  return { suggestions, clear: () => setSuggestions([]) };
};

// ── ProviderCard ─────────────────────────────────────────────────────────────
const BIO_LIMIT = 200;

const ProviderCard = ({ provider, role, singularWord, defaultHeadline, onNavigate }: {
  provider: Provider; role: ProviderRole; singularWord: string;
  defaultHeadline: string; onNavigate: (p: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const name     = provider.full_name || provider.display_name || provider.username || singularWord;
  const verified = String(provider.kyc_status || provider.verification_status || "").toLowerCase() === "approved" || Boolean(provider.is_verified);
  const co       = getCountryOption(provider.country || provider.country_code || "");
  const location = [provider.city, co?.name || provider.country].filter(Boolean).join(", ");
  const tags     = asTagList(provider.skills || (provider as any).expertise_areas);
  const langs    = asTagList(provider.languages);
  const price    = Number(provider.booking_price ?? provider.session_price ?? provider.hourly_rate ?? 0);
  const bio      = provider.bio?.trim() || "";
  const bioShort = bio.length > BIO_LIMIT ? bio.slice(0, BIO_LIMIT).trimEnd() + "…" : bio;
  const mode     = (provider.service_delivery_mode || "").toLowerCase();
  const modeLabel = mode.includes("both") ? "In person & online" : mode.includes("online") ? "Online" : mode.includes("person") ? "In person" : getServiceModeLabel(provider.service_delivery_mode);
  const profilePath = providerProfilePath(role, provider);

  return (
    <div className="flex flex-col sm:flex-row rounded-xl bg-white border border-border shadow-sm hover:shadow-md transition overflow-hidden">
      {/* Photo */}
      <div className="sm:w-[140px] w-full min-h-[160px] sm:min-h-[220px] shrink-0 cursor-pointer overflow-hidden bg-slate-100" onClick={() => onNavigate(profilePath)}>
        {provider.avatar_url
          ? <img src={provider.avatar_url} alt={name} className="h-full w-full object-cover object-top" />
          : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-4xl font-bold text-primary">{name.charAt(0).toUpperCase()}</div>}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-5 gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onNavigate(profilePath)} className="text-lg font-bold text-[#0b7e84] hover:underline leading-tight text-left">{name}</button>
          {verified && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"><CheckCircle size={11} /> Verified</span>}
        </div>
        <p className="text-sm text-muted-foreground -mt-1">{provider.headline || defaultHeadline}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-foreground">
            {tags.slice(0, 5).map((t, i) => (
              <span key={t} className="flex items-center gap-1">
                <span className="text-muted-foreground">–</span>{t}
                {i === 3 && tags.length > 5 && <span className="text-primary text-xs ml-1">+{tags.length - 4}</span>}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {modeLabel && <span className="flex items-center gap-1.5"><User size={12} className="text-primary shrink-0" />{modeLabel}</span>}
          {location && <span className="flex items-center gap-1.5"><MapPin size={12} className="text-primary shrink-0" />{location}</span>}
          {langs.length > 0 && <span>{langs.slice(0, 2).join(", ")}</span>}
        </div>
        {bio && (
          <p className="text-sm text-foreground/80 leading-relaxed">
            {expanded ? bio : bioShort}
            {bio.length > BIO_LIMIT && (
              <button onClick={() => setExpanded(v => !v)} className="ml-1 text-primary font-medium hover:underline text-xs">
                {expanded ? "See less" : "See more →"}
              </button>
            )}
          </p>
        )}
        {price > 0 && <p className="text-xs text-muted-foreground mt-auto">From <span className="font-semibold text-foreground">${price.toFixed(0)}</span></p>}
      </div>

      {/* Actions */}
      <div className="flex sm:flex-col items-center justify-end sm:justify-start gap-2 p-4 sm:pt-5 sm:w-[160px] shrink-0 border-t sm:border-t-0 sm:border-l border-border">
        <button onClick={() => onNavigate(`/dashboard/messages?user=${provider.user_id || provider.id}`)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition w-full justify-center">
          <MessageCircle size={13} /> Message Now
        </button>
        <button onClick={() => onNavigate(profilePath)}
          className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition w-full">
          Profile
        </button>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 mt-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Available Now
        </span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
type Props = { role: ProviderRole };

const ProviderDirectoryPage = ({ role }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { country, city } = useParams();
  const roleCopy    = useMemo(() => getRoleCopy(role), [role]);
  const singularWord = role === "therapist" ? "Therapist" : "Coach";
  const pluralWord   = role === "therapist" ? "Therapists" : "Coaches";

  const routeCountry = countryNameFromSlug(country);
  const routeCity    = cityNameFromSlug(city);
  const querySearch  = searchParams.get("q") || "";
  const nearbyCountry = searchParams.get("country") || "";
  const pageCountry  = routeCountry || nearbyCountry;
  const pageCity     = routeCity;

  // state
  const [providers,         setProviders]         = useState<any[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState("");
  const [geoLoading,        setGeoLoading]        = useState(false);
  const [geoError,          setGeoError]          = useState("");
  const [searchInput,       setSearchInput]       = useState(pageCity || querySearch || "");
  const [selectedCountry,   setSelectedCountry]   = useState(pageCountry);
  const [serviceModeFilter, setServiceModeFilter] = useState<"all"|"online"|"in_person">("all");
  const [showSuggestions,   setShowSuggestions]   = useState(false);
  const [showAdvanced,      setShowAdvanced]      = useState(false);

  // advanced search state
  const [advSpecialty,  setAdvSpecialty]  = useState("");
  const [advLanguage,   setAdvLanguage]   = useState("");
  const [advMinPrice,   setAdvMinPrice]   = useState("");
  const [advMaxPrice,   setAdvMaxPrice]   = useState("");
  const [advVerified,   setAdvVerified]   = useState(false);

  const { suggestions, clear: clearSuggestions } = useLocationAutocomplete(searchInput, selectedCountry);

  // load providers
  useEffect(() => {
    loadProviders(role).then(r => { setProviders(r.data || []); setError(r.error || ""); setLoading(false); });
  }, [role]);

  // auto-detect location on first load (IP-based, no permission needed)
  useEffect(() => {
    if (pageCountry) return; // already have country from URL
    detectLocation().then(r => {
      if (r.inferredCountry) setSelectedCountry(r.inferredCountry);
    });
  }, []);

  // sync URL-driven state
  useEffect(() => {
    if (pageCountry) setSelectedCountry(pageCountry);
    if (pageCity || querySearch) setSearchInput(pageCity || querySearch || "");
  }, [pageCountry, pageCity, querySearch]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredProviders = useMemo(() => {
    let r = [...providers];

    // country filter
    if (selectedCountry) r = filterProviders(r, { selectedCountry });

    // city filter
    if (pageCity) r = r.filter(p => normalizeText(p.city) === normalizeText(pageCity) || cityToSlug(p.city) === cityToSlug(pageCity));

    // text search
    if (searchInput.trim() && !pageCity) r = filterProviders(r, { search: searchInput.trim() });
    if (querySearch) r = filterProviders(r, { search: querySearch });

    // delivery mode
    if (serviceModeFilter !== "all") r = r.filter(p => {
      const m = normalizeText(p.service_delivery_mode);
      return serviceModeFilter === "online" ? m.includes("online") || m.includes("both") : m.includes("person") || m.includes("both");
    });

    // advanced: specialty
    if (advSpecialty.trim()) {
      const s = advSpecialty.toLowerCase();
      r = r.filter(p => {
        const hay = [p.skills, p.expertise_areas, p.headline, p.bio, p.specialization_type].map(v => Array.isArray(v) ? v.join(" ") : (v || "")).join(" ").toLowerCase();
        return hay.includes(s);
      });
    }

    // advanced: language
    if (advLanguage.trim()) {
      const l = advLanguage.toLowerCase();
      r = r.filter(p => {
        const langs = Array.isArray(p.languages) ? p.languages.join(" ") : (p.languages || "");
        return langs.toLowerCase().includes(l);
      });
    }

    // advanced: price range
    if (advMinPrice) r = r.filter(p => Number(p.booking_price ?? p.session_price ?? p.hourly_rate ?? 0) >= Number(advMinPrice));
    if (advMaxPrice) r = r.filter(p => Number(p.booking_price ?? p.session_price ?? p.hourly_rate ?? 0) <= Number(advMaxPrice));

    // advanced: verified only
    if (advVerified) r = r.filter(p => String(p.kyc_status || p.verification_status || "").toLowerCase() === "approved" || Boolean(p.is_verified));

    return r;
  }, [providers, selectedCountry, pageCity, searchInput, querySearch, serviceModeFilter, advSpecialty, advLanguage, advMinPrice, advMaxPrice, advVerified]);

  const hasActiveFilters = advSpecialty || advLanguage || advMinPrice || advMaxPrice || advVerified || serviceModeFilter !== "all";

  const clearAdvanced = () => {
    setAdvSpecialty(""); setAdvLanguage(""); setAdvMinPrice(""); setAdvMaxPrice(""); setAdvVerified(false); setServiceModeFilter("all");
  };

  const cityOptions = useMemo(() => {
    const base = selectedCountry ? filterProviders(providers, { selectedCountry }) : providers;
    const map = new Map<string, string>();
    base.forEach(p => { if (p.city) map.set(cityToSlug(p.city), String(p.city).trim()); });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [providers, selectedCountry]);

  const goToCountry = (name: string) => navigate(`${roleCopy.routeBase}/${countryToSlug(name)}`);
  const goToCity    = (cName: string, cityName: string) => navigate(`${roleCopy.routeBase}/${countryToSlug(cName)}/${cityToSlug(cityName)}`);

  const handleSearch = () => {
    const q = searchInput.trim();
    if (selectedCountry && q) {
      const m = cityOptions.find(c => normalizeText(c.name) === normalizeText(q));
      if (m) { navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}/${m.slug}`); return; }
      navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}?q=${encodeURIComponent(q)}`); return;
    }
    if (selectedCountry) { goToCountry(selectedCountry); return; }
    if (q) { navigate(`${roleCopy.routeBase}/results?q=${encodeURIComponent(q)}`); return; }
  };

  const handleNearby = async () => {
    setGeoLoading(true); setGeoError("");
    const r = await detectLocation();
    if (r.inferredCountry) { setSelectedCountry(r.inferredCountry); setGeoLoading(false); return; }
    setGeoError(r.error || "Could not detect location."); setGeoLoading(false);
  };

  const headingTitle = pageCity ? `${pluralWord} in ${pageCity}, ${pageCountry}`
    : pageCountry ? `${pluralWord} in ${pageCountry}`
    : querySearch  ? `${pluralWord}: "${querySearch}"`
    : `Find a ${singularWord}`;

  const locationLabel = selectedCountry ? `In ${selectedCountry}` : "Near You";

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Navbar />

      {/* ── HERO HEADER ── */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Left: title + search */}
            <div className="flex-1 space-y-5">
              {/* Breadcrumb */}
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-semibold">{pluralWord}</span>
                {selectedCountry && <> / {selectedCountry}</>}
                {pageCity && <> / {pageCity}</>}
              </p>

              {/* Big title */}
              <div>
                <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
                  {pluralWord}{" "}
                  <span className="text-primary">{locationLabel}</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {loading
                    ? "Loading..."
                    : <><span className="font-semibold text-primary">{filteredProviders.length}</span> {singularWord.toLowerCase()}{filteredProviders.length !== 1 ? "s" : ""} found</>}
                </p>
              </div>

              {/* Delivery mode tabs */}
              <div className="flex flex-wrap gap-2">
                {(["all","in_person","online"] as const).map(m => (
                  <button key={m} onClick={() => setServiceModeFilter(m)}
                    className={`rounded-full px-5 py-1.5 text-sm font-medium border transition ${
                      serviceModeFilter === m
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:border-primary hover:text-primary"
                    }`}>
                    {m === "all" ? "All" : m === "in_person" ? "In person" : "Online Services"}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary sm:w-[180px]">
                  <option value="">All countries</option>
                  {DIRECTORY_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                </select>

                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={searchInput}
                    onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                    onKeyDown={e => { if (e.key === "Enter") { clearSuggestions(); setShowSuggestions(false); handleSearch(); } }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder={`Name, city or specialty...`}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary transition" />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                      {suggestions.map((s, i) => (
                        <button key={i} type="button" onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setSearchInput(s.city);
                            if (s.country && !selectedCountry) {
                              const m = DIRECTORY_COUNTRIES.find(c => c.name.toLowerCase() === s.country.toLowerCase());
                              if (m) setSelectedCountry(m.name);
                            }
                            clearSuggestions(); setShowSuggestions(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0">
                          <MapPin size={13} className="text-primary shrink-0" />
                          <span className="text-sm">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={handleSearch}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
                  Search
                </button>

                <button onClick={() => setShowAdvanced(v => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition whitespace-nowrap ${
                    showAdvanced ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-300 text-slate-700 hover:border-primary"
                  }`}>
                  <SlidersHorizontal size={15} />
                  Advanced Search
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Find nearby / clear filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={handleNearby} disabled={geoLoading}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary disabled:opacity-50 transition">
                  <MapPin className="h-4 w-4 text-primary" />
                  {geoLoading ? "Detecting..." : "Use my location"}
                </button>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-xs text-slate-500">Free to search · No signup required</span>
                {hasActiveFilters && (
                  <button onClick={clearAdvanced}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-full px-3 py-1 hover:bg-primary/5">
                    <X size={11} /> Clear filters
                  </button>
                )}
              </div>
              {geoError && <p className="text-sm text-red-500">{geoError}</p>}
            </div>

            {/* Right: illustration */}
            <div className="hidden md:flex items-center justify-center w-48 shrink-0">
              <img
                src={role === "therapist" ? "/therapist-directory-hero.png" : "/coach-directory-hero.png"}
                alt={pluralWord}
                className="w-full max-w-[160px] object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── ADVANCED SEARCH PANEL ── */}
      {showAdvanced && (
        <section className="bg-slate-50 border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  {role === "therapist" ? "Therapy Type / Focus" : "Coaching Specialty"}
                </label>
                <input value={advSpecialty} onChange={e => setAdvSpecialty(e.target.value)}
                  placeholder={role === "therapist" ? "e.g. Anxiety, CBT, Trauma" : "e.g. Career, Leadership"}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Language</label>
                <input value={advLanguage} onChange={e => setAdvLanguage(e.target.value)}
                  placeholder="e.g. English, French"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Min Price ($)</label>
                <input type="number" min="0" value={advMinPrice} onChange={e => setAdvMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Max Price ($)</label>
                <input type="number" min="0" value={advMaxPrice} onChange={e => setAdvMaxPrice(e.target.value)}
                  placeholder="Any"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={advVerified} onChange={e => setAdvVerified(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded" />
                <span className="text-sm font-medium text-slate-700">Verified only</span>
              </label>
              <button onClick={clearAdvanced} className="text-xs text-slate-500 hover:text-primary underline">Reset all filters</button>
            </div>
          </div>
        </section>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* City pills */}
        {selectedCountry && cityOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}`)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${!pageCity ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-300 hover:border-primary"}`}>
              All
            </button>
            {cityOptions.map(c => (
              <button key={c.slug} onClick={() => goToCity(selectedCountry, c.name)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${cityToSlug(pageCity) === c.slug ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-300 hover:border-primary"}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 p-5 flex gap-4 animate-pulse">
                <div className="w-[130px] h-[180px] bg-slate-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-12 bg-slate-200 rounded w-full" />
                </div>
                <div className="w-[140px] shrink-0 space-y-2">
                  <div className="h-9 bg-slate-200 rounded-lg" />
                  <div className="h-9 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <p className="text-lg font-semibold text-slate-900 mb-1">No {pluralWord.toLowerCase()} found</p>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
              {hasActiveFilters ? "Try adjusting your filters." : selectedCountry ? `No ${pluralWord.toLowerCase()} in ${selectedCountry} yet. Try browsing all countries.` : "Select a country to browse providers."}
            </p>
            {(hasActiveFilters || selectedCountry) && (
              <button onClick={() => { clearAdvanced(); setSelectedCountry(""); setSearchInput(""); }}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
                Show All {pluralWord}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProviders.map(provider => (
              <ProviderCard
                key={provider.user_id || provider.id}
                provider={provider}
                role={role}
                singularWord={singularWord}
                defaultHeadline={roleCopy.defaultHeadline}
                onNavigate={navigate}
              />
            ))}
          </div>
        )}

        {/* Country grid — dark */}
        <section className="mt-16 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0d1b2a 0%,#1a2f4a 100%)" }}>
          <div className="px-6 py-10 md:px-10">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Global Directory</p>
            <h2 className="text-xl font-bold text-white mb-1">
              Find {singularWord === "Therapist" ? "Psychologists" : "Coaches"} &amp; {pluralWord}
            </h2>
            <p className="text-sm text-slate-400 mb-6">Browse by country to find {pluralWord.toLowerCase()} near you</p>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {DIRECTORY_COUNTRIES.slice(0, 24).map(c => (
                <button key={c.code} onClick={() => { setSelectedCountry(c.name); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 hover:bg-white/10 hover:border-primary/50 transition text-left">
                  <span className="text-lg shrink-0">{c.flag}</span>
                  <span className="truncate text-xs font-medium text-white">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Find {pluralWord} {selectedCountry ? `in ${selectedCountry}` : "Anywhere"}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            All profiles are structured consistently so you can compare before booking. Search by location, specialty, or language.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              {[
                [`How do I choose the right ${singularWord.toLowerCase()}?`, `Review the profile summary, service focus, languages, and delivery options. Open the full profile to compare approach and expertise.`],
                [`Can I book online and in person?`, `Yes. Providers who offer both will show the delivery options on their profile during booking.`],
                [`Is there a subscription required to search?`, `No. Search and browsing are completely free. You only need an account to book a session.`],
                [`How do I know a provider is verified?`, `Verified providers have completed identity verification and show a verified badge on their profile card.`],
              ].map(([q, a], i) => (
                <details key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-slate-900 list-none hover:bg-slate-50">
                    {q}
                    <ChevronDown size={16} className="text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-2" />
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
            <div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Browse {pluralWord} by Country</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {DIRECTORY_COUNTRIES.slice(0, 30).map(c => (
                    <button key={c.code} onClick={() => { setSelectedCountry(c.name); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="text-xs text-primary hover:underline">
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default ProviderDirectoryPage;

      {/* ── HEADER ── */}
      <section className="bg-white border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {headingTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Loading..." : <><span className="font-semibold text-primary">{filteredProviders.length}</span> {singularWord.toLowerCase()}{filteredProviders.length !== 1 ? "s" : ""} found</>}
            </p>
          </div>

          {/* Delivery mode tabs — like therapyroute */}
          <div className="flex flex-wrap gap-2">
            {(["all", "in_person", "online"] as const).map(m => (
              <button key={m} onClick={() => setServiceModeFilter(m)}
                className={`rounded-full px-5 py-1.5 text-sm font-medium border transition ${serviceModeFilter === m ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary"}`}>
                {m === "all" ? "All" : m === "in_person" ? "In person" : "Online Services"}
              </button>
            ))}
          </div>

          {/* Search bar row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}
              className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-primary transition sm:w-[190px]">
              <option value="">All countries</option>
              {DIRECTORY_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
            </select>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                onKeyDown={e => { if (e.key === "Enter") { clearSuggestions(); setShowSuggestions(false); handleSearch(); } }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="City, specialty, or name..."
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary transition" />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onMouseDown={e => e.preventDefault()}
                      onClick={() => { setSearchInput(s.city); if (s.country && !selectedCountry) { const m = DIRECTORY_COUNTRIES.find(c => c.name.toLowerCase() === s.country.toLowerCase()); if (m) setSelectedCountry(m.name); } clearSuggestions(); setShowSuggestions(false); }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted transition border-b border-border last:border-0">
                      <MapPin size={13} className="text-primary shrink-0" />
                      <span className="text-sm">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleSearch} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">Search</button>

            {/* Advanced Search toggle */}
            <button onClick={() => setShowAdvanced(v => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${showAdvanced ? "bg-primary/10 border-primary text-primary" : "bg-white border-border text-foreground hover:border-primary"}`}>
              <SlidersHorizontal size={15} /> Advanced Search {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Find nearby */}
          <div className="flex items-center gap-3">
            <button onClick={handleNearby} disabled={geoLoading}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary disabled:opacity-50 transition">
              <MapPin className="h-4 w-4 text-primary" />
              {geoLoading ? "Detecting..." : "Find nearby"}
            </button>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-xs text-muted-foreground">Free to search · No signup required</span>
            {hasActiveFilters && (
              <button onClick={clearAdvanced} className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
          {geoError && <p className="text-sm text-red-600">{geoError}</p>}
        </div>
      </section>

      {/* ── ADVANCED SEARCH PANEL ── */}
      {showAdvanced && (
        <section className="bg-white border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Specialty / Focus</label>
                <input value={advSpecialty} onChange={e => setAdvSpecialty(e.target.value)}
                  placeholder={role === "therapist" ? "e.g. Anxiety, CBT" : "e.g. Leadership, Career"}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Language</label>
                <input value={advLanguage} onChange={e => setAdvLanguage(e.target.value)}
                  placeholder="e.g. English, French"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Min Price ($)</label>
                <input type="number" min="0" value={advMinPrice} onChange={e => setAdvMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Max Price ($)</label>
                <input type="number" min="0" value={advMaxPrice} onChange={e => setAdvMaxPrice(e.target.value)}
                  placeholder="Any"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={advVerified} onChange={e => setAdvVerified(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary accent-primary" />
                <span className="text-sm font-medium text-foreground">Verified only</span>
              </label>
              <button onClick={clearAdvanced} className="ml-auto text-xs text-muted-foreground hover:text-primary transition">
                Reset filters
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── RESULTS ── */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* City pills */}
        {selectedCountry && cityOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {cityOptions.map(c => (
              <button key={c.slug} onClick={() => goToCity(selectedCountry, c.name)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${cityToSlug(pageCity) === c.slug ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary"}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-xl bg-white border border-border p-5 flex gap-4 animate-pulse">
                <div className="w-[140px] h-[180px] bg-slate-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-12 bg-slate-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white py-20 text-center">
            <p className="text-lg font-semibold text-foreground mb-1">No {pluralWord.toLowerCase()} found</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
              {hasActiveFilters ? "Try adjusting your filters." : "Try a different country or search term."}
            </p>
            {hasActiveFilters && (
              <button onClick={clearAdvanced} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProviders.map(provider => (
              <ProviderCard
                key={provider.user_id || provider.id}
                provider={provider}
                role={role}
                singularWord={singularWord}
                defaultHeadline={roleCopy.defaultHeadline}
                onNavigate={navigate}
              />
            ))}
          </div>
        )}

        {/* Country browse (shown when no country selected) */}
        {!loading && !selectedCountry && filteredProviders.length === 0 && (
          <section className="mt-10 rounded-xl overflow-hidden" style={{ backgroundColor: "#111827" }}>
            <div className="px-6 py-10 md:px-10">
              <h2 className="text-xl font-bold text-white mb-6">Browse by Country</h2>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {DIRECTORY_COUNTRIES.slice(0, 24).map(c => (
                  <button key={c.code} onClick={() => goToCountry(c.name)}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 hover:bg-white/10 hover:border-primary/50 transition">
                    <span className="text-xl shrink-0">{c.flag}</span>
                    <span className="truncate text-xs font-medium text-white">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ProviderDirectoryPage;
