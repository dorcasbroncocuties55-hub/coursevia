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
  ChevronDown, ChevronUp, MapPin, Search, MessageCircle,
  SlidersHorizontal, X, Users, BadgeCheck,
} from "lucide-react";

// ─── constants ───────────────────────────────────────────────────────────────
const MAX_SUGGESTIONS     = 8;
const MAX_AUTOCOMPLETE    = 5;
const MAX_TAG_PREVIEW     = 2;
const MAX_CITIES_SIDEBAR  = 12;
const MAX_COUNTRIES_GRID  = 24;
const MAX_COUNTRIES_LINKS = 32;
const MAX_SPECIALTIES_DL  = 30;
const MAX_LANGUAGES_DL    = 20;
const DEBOUNCE_MS         = 300;

// ─── helpers ─────────────────────────────────────────────────────────────────
const normalizeText = (v?: string | null) =>
  (v || "").toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

const cityToSlug = (v?: string | null) =>
  normalizeText(v).replace(/\s+/g, "-");

const cityNameFromSlug = (v?: string) =>
  (v || "").split("-").filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

const asTagList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean);
  return [];
};

const isVerified = (p: Provider) =>
  String(p.kyc_status || p.verification_status || "").toLowerCase() === "approved" ||
  Boolean(p.is_verified);

// ─── Nominatim city autocomplete ─────────────────────────────────────────────
type NominatimResult = {
  address: {
    city?: string; town?: string; village?: string;
    county?: string; country?: string;
  };
};

const useLocationAutocomplete = (query: string, country: string) => {
  const [suggestions, setSuggestions] = useState<
    { label: string; city: string; country: string }[]
  >([]);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(async () => {
      try {
        const cc = country
          ? DIRECTORY_COUNTRIES.find(c => c.name === country)?.code?.toLowerCase()
          : "";
        const params = new URLSearchParams({
          q: query, format: "json", addressdetails: "1",
          limit: String(MAX_AUTOCOMPLETE), featuretype: "city",
          ...(cc ? { countrycodes: cc } : {}),
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "Accept-Language": "en", "User-Agent": "Coursevia/1.0" } },
        );
        const data: NominatimResult[] = await res.json();
        const seen = new Set<string>();
        setSuggestions(
          data.map(r => {
            const city = r.address.city || r.address.town || r.address.village || r.address.county || "";
            const cn   = r.address.country || "";
            return { label: [city, cn].filter(Boolean).join(", "), city, country: cn };
          }).filter(r => {
            if (!r.city || seen.has(r.label)) return false;
            seen.add(r.label);
            return true;
          }),
        );
      } catch { setSuggestions([]); }
    }, DEBOUNCE_MS);
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [query, country]);

  return { suggestions, clear: () => setSuggestions([]) };
};

// ─── Provider card ────────────────────────────────────────────────────────────
const ProviderCard = ({
  provider, role, singularWord, defaultHeadline, onNavigate,
}: {
  provider: Provider;
  role: ProviderRole;
  singularWord: string;
  defaultHeadline: string;
  onNavigate: (path: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  const name     = provider.full_name || provider.display_name || provider.username || singularWord;
  const verified = isVerified(provider);
  const co       = getCountryOption(provider.country || provider.country_code || "");
  const location = [provider.city, co?.name || provider.country].filter(Boolean).join(", ");

  const row1   = asTagList(provider.skills).length > 0
    ? asTagList(provider.skills)
    : asTagList((provider as Provider & { expertise_areas?: unknown }).expertise_areas);
  const row2   = asTagList(provider.skills).length > 0 &&
    asTagList((provider as Provider & { expertise_areas?: unknown }).expertise_areas).length > 0
    ? asTagList((provider as Provider & { expertise_areas?: unknown }).expertise_areas)
    : [];

  const r1Show  = row1.slice(0, MAX_TAG_PREVIEW);
  const r1Extra = row1.length > MAX_TAG_PREVIEW ? row1.length - MAX_TAG_PREVIEW : 0;
  const r2Show  = row2.slice(0, MAX_TAG_PREVIEW);
  const r2Extra = row2.length > MAX_TAG_PREVIEW ? row2.length - MAX_TAG_PREVIEW : 0;

  const langs = asTagList(provider.languages);
  const bio   = provider.bio?.trim() || "";
  const mode  = (provider.service_delivery_mode || "").toLowerCase();
  const modeLabel = mode.includes("both")   ? "In person & online"
    : mode.includes("online")  ? "Online"
    : mode.includes("person")  ? "In person"
    : getServiceModeLabel(provider.service_delivery_mode);

  const profilePath = providerProfilePath(role, provider);
  const messageHref = `/dashboard/messages?user=${provider.user_id || provider.id}`;

  return (
    <a
      href={profilePath}
      onClick={e => { e.preventDefault(); onNavigate(profilePath); }}
      onKeyDown={e => e.key === "Enter" && onNavigate(profilePath)}
      aria-label={`View profile of ${name}`}
      className="block bg-card text-card-foreground shadow-sm mx-0 rounded-md border border-border hover:shadow-md transition-shadow no-underline"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[168px_2fr_auto] gap-3 md:gap-6 items-start p-4 md:p-0">

        {/* Photo */}
        <div className="relative ml-10 md:mx-auto lg:mx-0 lg:self-start md:mt-5 md:ml-4">
          {provider.avatar_url ? (
            <img
              src={provider.avatar_url}
              alt={name}
              width={170}
              height={158}
              loading="lazy"
              className="rounded-md object-cover w-[140px] h-[130px] md:w-[170px] md:h-[158px]"
            />
          ) : (
            <div className="rounded-md bg-primary/10 flex items-center justify-center w-[140px] h-[130px] md:w-[170px] md:h-[158px]">
              <span className="text-4xl font-bold text-primary/40">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 ml-[15px] mb-5 mr-[37px] md:ml-0 md:mr-0 md:mt-5">
          {/* Name + badge */}
          <div className="flex flex-wrap items-center gap-1">
            <h2 className="font-bold text-lg ml-3 md:ml-0 md:text-2xl leading-none">{name}</h2>
            {verified && (
              <div className="flex items-center gap-1 text-xs text-green-800">
                <BadgeCheck className="h-6 w-6 relative -top-[2px]" />
              </div>
            )}
          </div>

          {/* Headline */}
          <p className="ml-3 md:ml-0 mt-1 text-foreground font-normal text-sm">
            {provider.headline || defaultHeadline}
          </p>

          {/* 2-col grid: specialties + meta */}
          <div className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr] gap-2 md:gap-1 lg:mt-3">
            <div className="flex items-center gap-1.5 font-normal text-sm md:order-2 lg:order-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              {modeLabel || "Online"}
            </div>

            {r1Show.length > 0 && (
              <div className="flex items-start gap-1.5 md:order-1 lg:order-1">
                <span className="w-4 text-center text-muted-foreground/60 shrink-0 leading-none mt-[2px]">–</span>
                <span className="font-normal text-sm">
                  {r1Show.join(", ")}
                  {r1Extra > 0 && <span className="font-normal text-primary text-sm"> +{r1Extra}</span>}
                </span>
              </div>
            )}

            {langs.length > 0 && (
              <div className="flex items-start gap-1.5 text-sm md:order-5 lg:order-5">
                <span className="w-4 text-center text-muted-foreground/60 shrink-0 leading-none mt-[2px]">–</span>
                <span className="font-normal text-sm">{langs.slice(0, MAX_TAG_PREVIEW).join(", ")}</span>
              </div>
            )}

            {r2Show.length > 0 && (
              <div className="flex items-start gap-1.5 md:order-3 lg:order-3">
                <span className="w-4 text-center text-muted-foreground/60 shrink-0 leading-none mt-[2px]">–</span>
                <span className="font-normal text-sm">
                  {r2Show.join(", ")}
                  {r2Extra > 0 && <span className="font-normal text-primary text-sm"> +{r2Extra}</span>}
                </span>
              </div>
            )}

            {location && (
              <div className="flex items-start gap-1.5 text-sm md:order-4 lg:order-4">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-[2px]" aria-hidden />
                <span className="font-normal text-sm">{location}</span>
              </div>
            )}
          </div>

          <hr className="my-4 border-border" />

          {bio && (
            <div className="flex flex-col items-start gap-1">
              <p className={`font-normal leading-relaxed text-sm ${expanded ? "" : "line-clamp-3"}`}>
                {bio}
              </p>
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(v => !v); }}
                className="text-sm text-primary hover:underline cursor-pointer"
              >
                {expanded ? "See less ←" : "See more →"}
              </button>
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div
          className="flex flex-col gap-4 w-full min-w-[140px] lg:min-w-[160px] p-4 md:pr-6 md:pt-6 md:pb-6"
          onClick={e => e.preventDefault()}
        >
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onNavigate(messageHref); }}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white h-10 w-full text-xs md:text-sm rounded-md font-medium transition px-4 py-2"
          >
            <MessageCircle className="w-4 h-4" />
            Message Now
          </button>

          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onNavigate(profilePath); }}
            className="inline-flex items-center justify-center gap-2 border border-primary bg-background hover:bg-accent hover:text-accent-foreground h-10 w-full text-xs sm:text-sm rounded-md font-medium transition px-4 py-2"
          >
            Profile
          </button>

          <div className="flex items-center justify-center gap-2 text-xs md:text-sm h-10 w-full rounded-md border font-medium bg-green-50 text-green-800 border-green-200">
            <div className="rounded-full w-2 h-2 flex-shrink-0 bg-green-500" />
            <span>Available Now</span>
          </div>
        </div>

      </div>
    </a>
  );
};

// ─── Filter state type ────────────────────────────────────────────────────────
type FilterState = {
  selectedCountry: string;
  pageCity: string;
  searchInput: string;
  querySearch: string;
  serviceModeFilter: "all" | "online" | "in_person";
  advSpecialty: string;
  advLanguage: string;
  advMinPrice: string;
  advMaxPrice: string;
  advVerified: boolean;
};

// ─── Pure filter function (outside component for testability) ─────────────────
function applyFilters(providers: Provider[], f: FilterState): Provider[] {
  let r = [...providers];

  if (f.selectedCountry) r = filterProviders(r, { selectedCountry: f.selectedCountry });

  if (f.pageCity) {
    r = r.filter(p =>
      normalizeText(p.city) === normalizeText(f.pageCity) ||
      cityToSlug(p.city)    === cityToSlug(f.pageCity),
    );
  }

  if (f.searchInput.trim() && !f.pageCity)
    r = filterProviders(r, { search: f.searchInput.trim() });

  if (f.querySearch)
    r = filterProviders(r, { search: f.querySearch });

  if (f.serviceModeFilter !== "all") {
    r = r.filter(p => {
      const m = normalizeText(p.service_delivery_mode);
      return f.serviceModeFilter === "online"
        ? m.includes("online") || m.includes("both")
        : m.includes("person") || m.includes("both");
    });
  }

  if (f.advSpecialty.trim()) {
    const s = f.advSpecialty.toLowerCase();
    r = r.filter(p => {
      const hay = [
        asTagList(p.skills).join(" "),
        asTagList((p as Provider & { expertise_areas?: unknown }).expertise_areas).join(" "),
        p.headline || "",
        p.bio || "",
      ].join(" ").toLowerCase();
      return hay.includes(s);
    });
  }

  if (f.advLanguage.trim()) {
    const l = f.advLanguage.toLowerCase();
    r = r.filter(p => asTagList(p.languages).join(" ").toLowerCase().includes(l));
  }

  if (f.advMinPrice)
    r = r.filter(p => Number(p.booking_price ?? p.session_price ?? p.hourly_rate ?? 0) >= Number(f.advMinPrice));

  if (f.advMaxPrice)
    r = r.filter(p => Number(p.booking_price ?? p.session_price ?? p.hourly_rate ?? 0) <= Number(f.advMaxPrice));

  if (f.advVerified) r = r.filter(isVerified);

  return r;
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Props = { role: ProviderRole };

const ProviderDirectoryPage = ({ role }: Props) => {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { country, city } = useParams();

  const roleCopy     = useMemo(() => getRoleCopy(role), [role]);
  const singularWord = role === "therapist" ? "Therapist" : "Coach";
  const pluralWord   = role === "therapist" ? "Therapists" : "Coaches";

  const routeCountry  = countryNameFromSlug(country);
  const routeCity     = cityNameFromSlug(city);
  const querySearch   = searchParams.get("q") || "";
  const nearbyCountry = searchParams.get("country") || "";
  const pageCountry   = routeCountry || nearbyCountry;
  const pageCity      = routeCity;

  const [providers,         setProviders]         = useState<Provider[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState("");
  const [geoLoading,        setGeoLoading]        = useState(false);
  const [searchInput,       setSearchInput]       = useState(pageCity || querySearch || "");
  const [selectedCountry,   setSelectedCountry]   = useState(pageCountry);
  const [serviceModeFilter, setServiceModeFilter] = useState<"all" | "online" | "in_person">("all");
  const [showSuggestions,   setShowSuggestions]   = useState(false);
  const [showAdvanced,      setShowAdvanced]      = useState(false);
  const [advSpecialty,      setAdvSpecialty]      = useState("");
  const [advLanguage,       setAdvLanguage]       = useState("");
  const [advMinPrice,       setAdvMinPrice]       = useState("");
  const [advMaxPrice,       setAdvMaxPrice]       = useState("");
  const [advVerified,       setAdvVerified]       = useState(false);

  const { suggestions: locationSuggestions, clear: clearLocationSuggestions } =
    useLocationAutocomplete(searchInput, selectedCountry);

  // Smart DB-driven suggestions
  const dbSuggestions = useMemo(() => {
    const q = searchInput.trim();
    if (q.length < 2) return [];
    const lower = q.toLowerCase();
    const results: { label: string; type: "name" | "city" | "specialty"; value: string; country?: string }[] = [];
    const seen = new Set<string>();

    for (const p of providers) {
      const name = p.full_name || p.display_name || "";
      if (name.toLowerCase().includes(lower) && !seen.has(name)) {
        seen.add(name);
        results.push({ label: name, type: "name", value: name });
      }

      const cityVal = p.city || "";
      const cityKey = `city:${cityVal.toLowerCase()}`;
      if (cityVal.toLowerCase().includes(lower) && !seen.has(cityKey)) {
        seen.add(cityKey);
        results.push({ label: `${cityVal}${p.country ? `, ${p.country}` : ""}`, type: "city", value: cityVal, country: p.country ?? undefined });
      }

      const allTags = [
        ...asTagList(p.skills),
        ...asTagList((p as Provider & { expertise_areas?: unknown }).expertise_areas),
      ];
      for (const tag of allTags) {
        const tagKey = `skill:${tag.toLowerCase()}`;
        if (tag.toLowerCase().includes(lower) && !seen.has(tagKey)) {
          seen.add(tagKey);
          results.push({ label: tag, type: "specialty", value: tag });
        }
      }

      if (p.headline?.toLowerCase().includes(lower)) {
        const hKey = `hl:${p.headline}`;
        if (!seen.has(hKey)) {
          seen.add(hKey);
          results.push({ label: p.headline, type: "specialty", value: p.headline });
        }
      }

      if (results.length >= MAX_SUGGESTIONS) break;
    }

    return results.slice(0, MAX_SUGGESTIONS);
  }, [searchInput, providers]);

  // Load providers
  useEffect(() => {
    loadProviders(role).then(r => {
      setProviders(r.data || []);
      setError(r.error || "");
      setLoading(false);
    });
  }, [role]);

  // Auto-detect country on first load
  useEffect(() => {
    if (pageCountry) return;
    detectLocation().then(r => { if (r.inferredCountry) setSelectedCountry(r.inferredCountry); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL state
  useEffect(() => {
    if (pageCountry) setSelectedCountry(pageCountry);
    if (pageCity || querySearch) setSearchInput(pageCity || querySearch || "");
  }, [pageCountry, pageCity, querySearch]);

  const filteredProviders = useMemo(() =>
    applyFilters(providers, {
      selectedCountry, pageCity, searchInput, querySearch,
      serviceModeFilter, advSpecialty, advLanguage,
      advMinPrice, advMaxPrice, advVerified,
    }),
    [providers, selectedCountry, pageCity, searchInput, querySearch,
     serviceModeFilter, advSpecialty, advLanguage, advMinPrice, advMaxPrice, advVerified],
  );

  const hasFilters = !!(advSpecialty || advLanguage || advMinPrice || advMaxPrice || advVerified || serviceModeFilter !== "all");

  const clearFilters = () => {
    setAdvSpecialty(""); setAdvLanguage(""); setAdvMinPrice("");
    setAdvMaxPrice(""); setAdvVerified(false); setServiceModeFilter("all");
  };

  const cityOptions = useMemo(() => {
    const base = selectedCountry ? filterProviders(providers, { selectedCountry }) : providers;
    const map  = new Map<string, string>();
    base.forEach(p => { if (p.city) map.set(cityToSlug(p.city), String(p.city).trim()); });
    return Array.from(map.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [providers, selectedCountry]);

  const goToCountry = (name: string) => {
    setSelectedCountry(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToCity = (cName: string, cityName: string) =>
    navigate(`${roleCopy.routeBase}/${countryToSlug(cName)}/${cityToSlug(cityName)}`);

  const handleSearch = () => {
    const q = searchInput.trim();
    if (selectedCountry && q) {
      const match = cityOptions.find(c => normalizeText(c.name) === normalizeText(q));
      if (match) {
        navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}/${match.slug}`);
        return;
      }
      navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}?q=${encodeURIComponent(q)}`);
      return;
    }
    if (selectedCountry) { navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}`); return; }
    if (q) navigate(`${roleCopy.routeBase}/results?q=${encodeURIComponent(q)}`);
  };

  const handleNearby = async () => {
    setGeoLoading(true);
    const r = await detectLocation();
    if (r.inferredCountry) setSelectedCountry(r.inferredCountry);
    setGeoLoading(false);
  };

  const locationLabel = selectedCountry || "Worldwide";

  // Unique specialties & languages for datalists
  const allSpecialties = useMemo(() =>
    Array.from(new Set(providers.flatMap(p => [
      ...asTagList(p.skills),
      ...asTagList((p as Provider & { expertise_areas?: unknown }).expertise_areas),
    ]).filter(Boolean))).slice(0, MAX_SPECIALTIES_DL),
  [providers]);

  const allLanguages = useMemo(() =>
    Array.from(new Set(providers.flatMap(p => asTagList(p.languages)).filter(Boolean)))
      .slice(0, MAX_LANGUAGES_DL),
  [providers]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* HERO */}
      <div className="bg-primary text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 lg:py-20">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium">
              <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
              {loading ? "Loading..." : `${providers.length} ${pluralWord.toLowerCase()} available`}
            </div>

            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Find a {singularWord}<br />
              <span className="text-white/80 text-3xl sm:text-4xl font-semibold">{locationLabel}</span>
            </h1>

            <p className="text-lg text-white/75 max-w-lg leading-relaxed">
              {role === "therapist"
                ? "Connect with qualified therapists for anxiety, depression, relationships and more — online or in person."
                : "Work with expert coaches who help you grow your career, business, mindset and performance."}
            </p>

            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                  onKeyDown={e => { if (e.key === "Enter") { setShowSuggestions(false); handleSearch(); } }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search by name, specialty, or city..."
                  className="w-full rounded-2xl bg-white text-slate-900 py-4 pl-12 pr-4 text-sm font-medium outline-none placeholder:text-slate-400 shadow-lg"
                />

                {/* DB-driven suggestions */}
                {showSuggestions && dbSuggestions.length > 0 && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                    {dbSuggestions.map((s, i) => (
                      <button
                        key={i} type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setSearchInput(s.value);
                          if (s.type === "city" && s.country && !selectedCountry) {
                            const m = DIRECTORY_COUNTRIES.find(c => c.name.toLowerCase() === s.country!.toLowerCase());
                            if (m) setSelectedCountry(m.name);
                          }
                          setShowSuggestions(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          s.type === "name"      ? "bg-blue-100 text-blue-600" :
                          s.type === "city"      ? "bg-emerald-100 text-emerald-600" :
                                                   "bg-primary/10 text-primary"
                        }`}>
                          {s.type === "name" ? "Name" : s.type === "city" ? "City" : "Specialty"}
                        </span>
                        <span className="text-sm text-slate-700">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Location autocomplete fallback */}
                {showSuggestions && dbSuggestions.length === 0 && locationSuggestions.length > 0 && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                    {locationSuggestions.map((s, i) => (
                      <button
                        key={i} type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setSearchInput(s.city);
                          if (s.country && !selectedCountry) {
                            const m = DIRECTORY_COUNTRIES.find(c => c.name.toLowerCase() === s.country.toLowerCase());
                            if (m) setSelectedCountry(m.name);
                          }
                          clearLocationSuggestions();
                          setShowSuggestions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <MapPin size={13} className="text-primary shrink-0" />
                        <span className="text-sm text-slate-700">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="rounded-2xl bg-white text-slate-700 px-4 py-4 text-sm font-medium outline-none shadow-lg sm:w-[200px]"
              >
                <option value="">All Countries</option>
                {DIRECTORY_COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>

              <button
                onClick={handleSearch}
                className="rounded-2xl bg-white text-primary font-bold px-8 py-4 text-sm hover:bg-slate-50 transition shadow-lg shrink-0"
              >
                Search
              </button>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
              <button
                onClick={handleNearby}
                disabled={geoLoading}
                className="flex items-center gap-1.5 hover:text-white transition disabled:opacity-50"
              >
                <MapPin size={14} /> {geoLoading ? "Detecting..." : "Use my location"}
              </button>
              <span>·</span>
              <span>Free to search · No account needed</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="sticky top-16 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          {(["all", "in_person", "online"] as const).map(m => (
            <button
              key={m}
              onClick={() => setServiceModeFilter(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold border-2 transition ${
                serviceModeFilter === m
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
              }`}
            >
              {m === "all" ? "All" : m === "in_person" ? "In person" : "Online"}
            </button>
          ))}

          <span className="text-sm text-slate-500 ml-1">
            {loading
              ? "Loading..."
              : <><strong className="text-slate-900">{filteredProviders.length}</strong> {filteredProviders.length === 1 ? singularWord.toLowerCase() : pluralWord.toLowerCase()} found</>
            }
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-sm font-semibold transition ${
                showAdvanced
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 text-slate-600 hover:border-primary"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-full px-3 py-1.5"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="border-t border-slate-100 bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <input
                value={advSpecialty}
                onChange={e => setAdvSpecialty(e.target.value)}
                placeholder={role === "therapist" ? "Specialty (e.g. CBT)" : "Focus (e.g. Career)"}
                list={`specialty-list-${role}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <datalist id={`specialty-list-${role}`}>
                {allSpecialties.map((s, i) => <option key={i} value={s} />)}
              </datalist>

              <input
                value={advLanguage}
                onChange={e => setAdvLanguage(e.target.value)}
                placeholder="Language"
                list={`language-list-${role}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <datalist id={`language-list-${role}`}>
                {allLanguages.map((l, i) => <option key={i} value={l} />)}
              </datalist>

              <input
                type="number" min="0"
                value={advMinPrice}
                onChange={e => setAdvMinPrice(e.target.value)}
                placeholder="Min price $"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="number" min="0"
                value={advMaxPrice}
                onChange={e => setAdvMaxPrice(e.target.value)}
                placeholder="Max price $"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-slate-200 bg-white">
                <input
                  type="checkbox"
                  checked={advVerified}
                  onChange={e => setAdvVerified(e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-sm font-medium text-slate-700">Verified only</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Country</h3>
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">All Countries</option>
                {DIRECTORY_COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            {selectedCountry && cityOptions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">City</h3>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => navigate(`${roleCopy.routeBase}/${countryToSlug(selectedCountry)}`)}
                    className={`text-left text-sm px-3 py-1.5 rounded-lg transition ${
                      !pageCity ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    All cities
                  </button>
                  {cityOptions.map(c => (
                    <button
                      key={c.slug}
                      onClick={() => goToCity(selectedCountry, c.name)}
                      className={`text-left text-sm px-3 py-1.5 rounded-lg transition ${
                        cityToSlug(pageCity) === c.slug
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Browse</h3>
              <div className="flex flex-col gap-1">
                {DIRECTORY_COUNTRIES.slice(0, MAX_CITIES_SIDEBAR).map(c => (
                  <button
                    key={c.code}
                    onClick={() => goToCountry(c.name)}
                    className={`text-left text-sm px-3 py-1.5 rounded-lg transition flex items-center gap-2 ${
                      selectedCountry === c.name
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 animate-pulse">
                    <div className="w-[150px] h-[180px] bg-slate-200 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-3 py-2">
                      <div className="h-6 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/4" />
                      <div className="flex gap-2">
                        {[1, 2, 3].map(j => <div key={j} className="h-5 w-20 bg-slate-200 rounded-full" />)}
                      </div>
                      <div className="h-14 bg-slate-200 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-20 text-center">
                <p className="text-lg font-bold text-slate-800 mb-2">No {pluralWord.toLowerCase()} found</p>
                <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
                  {hasFilters
                    ? "Try adjusting your filters."
                    : selectedCountry
                      ? `No ${pluralWord.toLowerCase()} in ${selectedCountry} yet.`
                      : `Select a country to browse ${pluralWord.toLowerCase()}.`}
                </p>
                <button
                  onClick={() => { clearFilters(); setSelectedCountry(""); }}
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
                >
                  Browse All
                </button>
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
          </div>
        </div>

        {/* Country Grid */}
        <section className="mt-16">
          <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0d1b2a 0%,#1a3a5c 100%)" }}>
            <div className="px-8 py-12 md:px-12">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Global Directory</p>
                  <h2 className="text-2xl font-bold text-white">
                    Find {role === "therapist" ? "Psychologists & Therapists" : "Coaches & Mentors"}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Browse verified {pluralWord.toLowerCase()} by country</p>
                </div>
                <p className="text-slate-400 text-sm">{DIRECTORY_COUNTRIES.length} countries · {providers.length}+ providers</p>
              </div>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {DIRECTORY_COUNTRIES.slice(0, MAX_COUNTRIES_GRID).map(c => (
                  <button
                    key={c.code}
                    onClick={() => goToCountry(c.name)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                      selectedCountry === c.name
                        ? "border-primary bg-primary/20 text-white"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-primary/50"
                    }`}
                  >
                    <span className="text-lg shrink-0">{c.flag}</span>
                    <span className="truncate text-xs font-medium">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">How It Works</h2>
            <p className="text-slate-500 text-sm mt-1">Find and book your {singularWord.toLowerCase()} in 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Search & Filter", desc: `Browse ${pluralWord.toLowerCase()} by location, specialty, language, and price. Use filters to narrow down exactly what you need.`, icon: "🔍" },
              { step: "02", title: "View Profiles",   desc: `Read full bios, check specialties, see reviews, and compare ${pluralWord.toLowerCase()} side by side before making a decision.`, icon: "👤" },
              { step: "03", title: "Book a Session",  desc: "Message directly or book a session instantly. Pay securely through your wallet and get started right away.", icon: "📅" },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-xl">{s.icon}</div>
                  <span className="text-xs font-bold text-primary/50 tracking-widest">STEP {s.step}</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 mb-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Common Questions</h2>
              <p className="text-slate-500 text-sm mb-6">Everything you need to know before booking your first session.</p>
              <div className="space-y-3">
                {[
                  [`How do I choose the right ${singularWord.toLowerCase()}?`, `Look at their specialties, bio, and delivery mode. Read their profile carefully and message them before booking if you have questions.`],
                  ["Can I book online sessions?", "Yes. Many providers offer online video sessions. Filter by 'Online Services' to see only remote providers."],
                  ["Is it free to search?", "Completely free. You only need an account when you're ready to book or send a message."],
                  ["How do I know if a provider is verified?", "Verified providers have completed identity verification and display a green Verified badge on their profile card."],
                  ["What if I need to cancel?", "Check the provider's cancellation policy on their profile. Most offer flexible rescheduling."],
                ].map(([q, a], i) => (
                  <details key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden group">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-slate-800 list-none select-none hover:bg-slate-50">
                      {q}
                      <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg shrink-0 ml-2">+</span>
                    </summary>
                    <p className="px-5 pb-4 pt-0 text-sm text-slate-500 leading-relaxed border-t border-slate-100">{a}</p>
                  </details>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white">
                <h3 className="text-lg font-bold mb-2">Are you a {singularWord}?</h3>
                <p className="text-sm text-white/80 mb-4 leading-relaxed">
                  Join thousands of {pluralWord.toLowerCase()} on Coursevia. Create your profile, set your availability and start getting bookings today.
                </p>
                <button
                  onClick={() => navigate("/signup")}
                  className="rounded-xl bg-white text-primary font-bold text-sm px-5 py-2.5 hover:bg-white/90 transition"
                >
                  Join as a {singularWord}
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-3 text-sm">Browse by Country</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {DIRECTORY_COUNTRIES.slice(0, MAX_COUNTRIES_LINKS).map(c => (
                    <button
                      key={c.code}
                      onClick={() => goToCountry(c.name)}
                      className={`text-xs hover:underline transition ${
                        selectedCountry === c.name
                          ? "text-primary font-bold"
                          : "text-slate-500 hover:text-primary"
                      }`}
                    >
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
