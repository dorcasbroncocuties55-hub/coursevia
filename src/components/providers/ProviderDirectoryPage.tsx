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
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── HERO ── */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <div className="max-w-2xl space-y-6">
            <p className="text-sm font-semibold text-primary">{roleCopy.directoryLabel}</p>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">
              Find a <span className="text-primary">{singularWord}</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-lg">
              {pageCountry
                ? `Browse verified ${pluralWord.toLowerCase()} in ${pageCountry}.`
                : `Connect with verified ${pluralWord.toLowerCase()} near you.`}{" "}
              Compare profiles and book sessions instantly.
            </p>

            {/* Search card */}
            <div className="rounded-xl bg-white shadow-sm border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary transition sm:w-[200px]"
                >
                  <option value="">All countries</option>
                  {DIRECTORY_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { clearSuggestions(); setShowSuggestions(false); handleSearch(); } if (e.key === "Escape") setShowSuggestions(false); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="City, specialty, or name..."
                    className="w-full rounded-lg border border-border bg-background py-3 pl-9 pr-4 text-sm outline-none focus:border-primary transition placeholder:text-muted-foreground"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg overflow-hidden">
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
                          className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted transition border-b border-border last:border-0"
                        >
                          <MapPin size={14} className="text-primary shrink-0" />
                          <span className="text-sm text-foreground">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSearch}
                  className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleNearby}
                disabled={geoLoading}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary disabled:opacity-50 transition"
              >
                <MapPin className="h-4 w-4 text-primary" />
                {geoLoading ? "Detecting..." : "Find nearby"}
              </button>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs text-muted-foreground">Free to search · No signup required</span>
            </div>
            {geoError && <p className="text-sm text-red-600">{geoError}</p>}

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-semibold text-foreground">
                {loading ? "..." : `${providers.length}+`} Providers
              </span>
              <span className="rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-semibold text-foreground">
                {DIRECTORY_COUNTRIES.length} Countries
              </span>
              <span className="rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-semibold text-foreground">
                24/7 Booking
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12">
        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* ── RESULTS PAGE ── */}
        {isResultsPage ? (
          <div>
            <button
              onClick={() => navigate(roleCopy.routeBase)}
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition"
            >
              ← Back to {pluralWord}
            </button>

            {/* Heading + filters */}
            <div className="mb-8">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-foreground md:text-4xl">{headingPrimary}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {loading ? "Loading..." : (
                      <><span className="font-semibold text-primary">{filteredProviders.length}</span> {filteredProviders.length === 1 ? "result" : "results"} found</>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["all", "online", "in_person"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setServiceModeFilter(m)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition border ${
                        serviceModeFilter === m
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {m === "all" ? "All" : m === "online" ? "Online" : "In-Person"}
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
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition border ${
                        cityToSlug(pageCity) === c.slug
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
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
              <div className="rounded-xl border border-border bg-muted py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading {pluralWord.toLowerCase()}...</p>
              </div>
            ) : !filteredProviders.length ? (
              <div className="rounded-xl border border-dashed border-border bg-muted py-20 text-center">
                <p className="text-lg font-semibold text-foreground mb-1">{roleCopy.emptyTitle}</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">{roleCopy.emptyDescription}</p>
                <button
                  onClick={() => navigate(roleCopy.routeBase)}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  Browse All Countries
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      className="flex flex-col rounded-xl bg-white border border-border p-5 shadow-sm hover:shadow-md transition"
                    >
                      {/* Avatar + Info */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border">
                          {provider.avatar_url ? (
                            <img src={provider.avatar_url} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-base font-bold text-primary">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-foreground truncate">{name}</h3>
                            {verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {provider.headline || roleCopy.defaultHeadline}
                          </p>
                          {location && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 text-primary shrink-0" />
                              <span>{location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-foreground">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {getServiceModeLabel(provider.service_delivery_mode)}
                          </span>
                          {price > 0 && (
                            <span className="text-sm font-semibold text-foreground">${price.toFixed(0)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`${roleCopy.profileRouteBase}/${pId}`)}
                          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
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
            {/* Country grid — dark background */}
            <section className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111827" }}>
              <div className="px-6 py-12 md:px-10 md:py-14">
                <div className="mb-8">
                  <p className="text-xs font-semibold text-primary mb-1">Global Directory</p>
                  <h2 className="text-2xl font-bold text-white">Browse by Country</h2>
                  <p className="text-sm text-gray-400 mt-1">Find {pluralWord.toLowerCase()} in your region or explore worldwide</p>
                </div>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {DIRECTORY_COUNTRIES.slice(0, 24).map((c) => (
                    <button
                      key={c.code}
                      onClick={() => goToCountry(c.name)}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:bg-white/10 hover:border-primary/50 transition"
                    >
                      <span className="text-xl shrink-0">{c.flag}</span>
                      <span className="truncate text-xs font-medium text-white">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* How it works */}
            <section className="mt-16">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">How It Works</h2>
                <p className="text-sm text-muted-foreground mt-1">Three simple steps to find and book your {singularWord.toLowerCase()}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { num: "1", title: `Browse ${pluralWord}`, body: `Search by location, specialty, or availability. Compare profiles and credentials side by side.` },
                  { num: "2", title: "Book Your Session", body: `Choose online or in-person. Pick a time that works for you and confirm instantly.` },
                  { num: "3", title: "Start Your Journey", body: `Meet your ${singularWord.toLowerCase()} and begin working toward your goals with professional guidance.` },
                ].map((step) => (
                  <div key={step.num} className="rounded-xl border border-border bg-white p-6 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary mb-4">
                      {step.num}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section className="mt-16 grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Find {pluralWord} Anywhere</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Search by country, city, specialty, or availability. All profiles are structured consistently so you can compare before booking.
                </p>
                <div className="flex flex-wrap gap-2">
                  {DIRECTORY_COUNTRIES.slice(0, 18).map((c) => (
                    <button
                      key={c.code}
                      onClick={() => goToCountry(c.name)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Common Questions</h2>
                <div className="space-y-2">
                  {FAQ_ITEMS(singularWord).map((item, i) => (
                    <div key={i} className="rounded-lg border border-border bg-white overflow-hidden">
                      <button
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span className="text-sm font-medium text-foreground">{item.q}</span>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-primary transition-transform ${openFaq === i ? "rotate-90" : ""}`}
                        />
                      </button>
                      {openFaq === i && (
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          <p className="text-xs leading-relaxed text-muted-foreground">{item.a}</p>
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

