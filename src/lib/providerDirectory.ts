import { supabase } from "@/integrations/supabase/client";

export type ProviderRole = "therapist" | "coach";

export type Provider = {
  id: string;
  user_id?: string;
  full_name?: string | null;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  bio?: string | null;
  role?: string | null;
  onboarding_completed?: boolean | null;
  country?: string | null;
  country_code?: string | null;
  city?: string | null;
  updated_at?: string | null;
  hourly_rate?: number | null;
  session_price?: number | null;
  booking_price?: number | null;
  rating?: number | null;
  total_reviews?: number | null;
  is_verified?: boolean | null;
  verification_status?: string | null;
  kyc_status?: string | null;
  service_delivery_mode?: string | null;
  calendar_mode?: string | null;
  skills?: string[] | string | null;
  languages?: string[] | string | null;
};

export type ProviderDirectoryResult = {
  data: Provider[];
  error: string | null;
};

export type GeolocationResult = {
  ok: boolean;
  latitude?: number;
  longitude?: number;
  inferredCountry?: string;
  error?: string;
};

export type DirectoryCountry = {
  code: string;
  name: string;
  slug: string;
  flag: string;
};

const createCountry = (code: string, name: string, flag: string): DirectoryCountry => ({
  code,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  flag,
});

export const DIRECTORY_COUNTRIES: DirectoryCountry[] = [
  createCountry("AF", "Afghanistan", "🇦🇫"),
  createCountry("AL", "Albania", "🇦🇱"),
  createCountry("DZ", "Algeria", "🇩🇿"),
  createCountry("AD", "Andorra", "🇦🇩"),
  createCountry("AO", "Angola", "🇦🇴"),
  createCountry("AG", "Antigua and Barbuda", "🇦🇬"),
  createCountry("AR", "Argentina", "🇦🇷"),
  createCountry("AM", "Armenia", "🇦🇲"),
  createCountry("AU", "Australia", "🇦🇺"),
  createCountry("AT", "Austria", "🇦🇹"),
  createCountry("AZ", "Azerbaijan", "🇦🇿"),
  createCountry("BS", "Bahamas", "🇧🇸"),
  createCountry("BH", "Bahrain", "🇧🇭"),
  createCountry("BD", "Bangladesh", "🇧🇩"),
  createCountry("BB", "Barbados", "🇧🇧"),
  createCountry("BY", "Belarus", "🇧🇾"),
  createCountry("BE", "Belgium", "🇧🇪"),
  createCountry("BZ", "Belize", "🇧🇿"),
  createCountry("BJ", "Benin", "🇧🇯"),
  createCountry("BT", "Bhutan", "🇧🇹"),
  createCountry("BO", "Bolivia", "🇧🇴"),
  createCountry("BA", "Bosnia and Herzegovina", "🇧🇦"),
  createCountry("BW", "Botswana", "🇧🇼"),
  createCountry("BR", "Brazil", "🇧🇷"),
  createCountry("BN", "Brunei", "🇧🇳"),
  createCountry("BG", "Bulgaria", "🇧🇬"),
  createCountry("BF", "Burkina Faso", "🇧🇫"),
  createCountry("BI", "Burundi", "🇧🇮"),
  createCountry("CV", "Cabo Verde", "🇨🇻"),
  createCountry("KH", "Cambodia", "🇰🇭"),
  createCountry("CM", "Cameroon", "🇨🇲"),
  createCountry("CA", "Canada", "🇨🇦"),
  createCountry("CF", "Central African Republic", "🇨🇫"),
  createCountry("TD", "Chad", "🇹🇩"),
  createCountry("CL", "Chile", "🇨🇱"),
  createCountry("CN", "China", "🇨🇳"),
  createCountry("CO", "Colombia", "🇨🇴"),
  createCountry("KM", "Comoros", "🇰🇲"),
  createCountry("CG", "Congo", "🇨🇬"),
  createCountry("CD", "Congo, Democratic Republic of the", "🇨🇩"),
  createCountry("CR", "Costa Rica", "🇨🇷"),
  createCountry("CI", "Cote d'Ivoire", "🇨🇮"),
  createCountry("HR", "Croatia", "🇭🇷"),
  createCountry("CU", "Cuba", "🇨🇺"),
  createCountry("CY", "Cyprus", "🇨🇾"),
  createCountry("CZ", "Czech Republic", "🇨🇿"),
  createCountry("DK", "Denmark", "🇩🇰"),
  createCountry("DJ", "Djibouti", "🇩🇯"),
  createCountry("DM", "Dominica", "🇩🇲"),
  createCountry("DO", "Dominican Republic", "🇩🇴"),
  createCountry("EC", "Ecuador", "🇪🇨"),
  createCountry("EG", "Egypt", "🇪🇬"),
  createCountry("SV", "El Salvador", "🇸🇻"),
  createCountry("GQ", "Equatorial Guinea", "🇬🇶"),
  createCountry("ER", "Eritrea", "🇪🇷"),
  createCountry("EE", "Estonia", "🇪🇪"),
  createCountry("SZ", "Eswatini", "🇸🇿"),
  createCountry("ET", "Ethiopia", "🇪🇹"),
  createCountry("FJ", "Fiji", "🇫🇯"),
  createCountry("FI", "Finland", "🇫🇮"),
  createCountry("FR", "France", "🇫🇷"),
  createCountry("GA", "Gabon", "🇬🇦"),
  createCountry("GM", "Gambia", "🇬🇲"),
  createCountry("GE", "Georgia", "🇬🇪"),
  createCountry("DE", "Germany", "🇩🇪"),
  createCountry("GH", "Ghana", "🇬🇭"),
  createCountry("GR", "Greece", "🇬🇷"),
  createCountry("GD", "Grenada", "🇬🇩"),
  createCountry("GT", "Guatemala", "🇬🇹"),
  createCountry("GN", "Guinea", "🇬🇳"),
  createCountry("GW", "Guinea-Bissau", "🇬🇼"),
  createCountry("GY", "Guyana", "🇬🇾"),
  createCountry("HT", "Haiti", "🇭🇹"),
  createCountry("HN", "Honduras", "🇭🇳"),
  createCountry("HU", "Hungary", "🇭🇺"),
  createCountry("IS", "Iceland", "🇮🇸"),
  createCountry("IN", "India", "🇮🇳"),
  createCountry("ID", "Indonesia", "🇮🇩"),
  createCountry("IR", "Iran", "🇮🇷"),
  createCountry("IQ", "Iraq", "🇮🇶"),
  createCountry("IE", "Ireland", "🇮🇪"),
  createCountry("IL", "Israel", "🇮🇱"),
  createCountry("IT", "Italy", "🇮🇹"),
  createCountry("JM", "Jamaica", "🇯🇲"),
  createCountry("JP", "Japan", "🇯🇵"),
  createCountry("JO", "Jordan", "🇯🇴"),
  createCountry("KZ", "Kazakhstan", "🇰🇿"),
  createCountry("KE", "Kenya", "🇰🇪"),
  createCountry("KI", "Kiribati", "🇰🇮"),
  createCountry("KW", "Kuwait", "🇰🇼"),
  createCountry("KG", "Kyrgyzstan", "🇰🇬"),
  createCountry("LA", "Laos", "🇱🇦"),
  createCountry("LV", "Latvia", "🇱🇻"),
  createCountry("LB", "Lebanon", "🇱🇧"),
  createCountry("LS", "Lesotho", "🇱🇸"),
  createCountry("LR", "Liberia", "🇱🇷"),
  createCountry("LY", "Libya", "🇱🇾"),
  createCountry("LI", "Liechtenstein", "🇱🇮"),
  createCountry("LT", "Lithuania", "🇱🇹"),
  createCountry("LU", "Luxembourg", "🇱🇺"),
  createCountry("MG", "Madagascar", "🇲🇬"),
  createCountry("MW", "Malawi", "🇲🇼"),
  createCountry("MY", "Malaysia", "🇲🇾"),
  createCountry("MV", "Maldives", "🇲🇻"),
  createCountry("ML", "Mali", "🇲🇱"),
  createCountry("MT", "Malta", "🇲🇹"),
  createCountry("MH", "Marshall Islands", "🇲🇭"),
  createCountry("MR", "Mauritania", "🇲🇷"),
  createCountry("MU", "Mauritius", "🇲🇺"),
  createCountry("MX", "Mexico", "🇲🇽"),
  createCountry("FM", "Micronesia", "🇫🇲"),
  createCountry("MD", "Moldova", "🇲🇩"),
  createCountry("MC", "Monaco", "🇲🇨"),
  createCountry("MN", "Mongolia", "🇲🇳"),
  createCountry("ME", "Montenegro", "🇲🇪"),
  createCountry("MA", "Morocco", "🇲🇦"),
  createCountry("MZ", "Mozambique", "🇲🇿"),
  createCountry("MM", "Myanmar", "🇲🇲"),
  createCountry("NA", "Namibia", "🇳🇦"),
  createCountry("NR", "Nauru", "🇳🇷"),
  createCountry("NP", "Nepal", "🇳🇵"),
  createCountry("NL", "Netherlands", "🇳🇱"),
  createCountry("NZ", "New Zealand", "🇳🇿"),
  createCountry("NI", "Nicaragua", "🇳🇮"),
  createCountry("NE", "Niger", "🇳🇪"),
  createCountry("NG", "Nigeria", "🇳🇬"),
  createCountry("KP", "North Korea", "🇰🇵"),
  createCountry("MK", "North Macedonia", "🇲🇰"),
  createCountry("NO", "Norway", "🇳🇴"),
  createCountry("OM", "Oman", "🇴🇲"),
  createCountry("PK", "Pakistan", "🇵🇰"),
  createCountry("PW", "Palau", "🇵🇼"),
  createCountry("PS", "Palestine", "🇵🇸"),
  createCountry("PA", "Panama", "🇵🇦"),
  createCountry("PG", "Papua New Guinea", "🇵🇬"),
  createCountry("PY", "Paraguay", "🇵🇾"),
  createCountry("PE", "Peru", "🇵🇪"),
  createCountry("PH", "Philippines", "🇵🇭"),
  createCountry("PL", "Poland", "🇵🇱"),
  createCountry("PT", "Portugal", "🇵🇹"),
  createCountry("QA", "Qatar", "🇶🇦"),
  createCountry("RO", "Romania", "🇷🇴"),
  createCountry("RU", "Russia", "🇷🇺"),
  createCountry("RW", "Rwanda", "🇷🇼"),
  createCountry("KN", "Saint Kitts and Nevis", "🇰🇳"),
  createCountry("LC", "Saint Lucia", "🇱🇨"),
  createCountry("VC", "Saint Vincent and the Grenadines", "🇻🇨"),
  createCountry("WS", "Samoa", "🇼🇸"),
  createCountry("SM", "San Marino", "🇸🇲"),
  createCountry("ST", "Sao Tome and Principe", "🇸🇹"),
  createCountry("SA", "Saudi Arabia", "🇸🇦"),
  createCountry("SN", "Senegal", "🇸🇳"),
  createCountry("RS", "Serbia", "🇷🇸"),
  createCountry("SC", "Seychelles", "🇸🇨"),
  createCountry("SL", "Sierra Leone", "🇸🇱"),
  createCountry("SG", "Singapore", "🇸🇬"),
  createCountry("SK", "Slovakia", "🇸🇰"),
  createCountry("SI", "Slovenia", "🇸🇮"),
  createCountry("SB", "Solomon Islands", "🇸🇧"),
  createCountry("SO", "Somalia", "🇸🇴"),
  createCountry("ZA", "South Africa", "🇿🇦"),
  createCountry("KR", "South Korea", "🇰🇷"),
  createCountry("SS", "South Sudan", "🇸🇸"),
  createCountry("ES", "Spain", "🇪🇸"),
  createCountry("LK", "Sri Lanka", "🇱🇰"),
  createCountry("SD", "Sudan", "🇸🇩"),
  createCountry("SR", "Suriname", "🇸🇷"),
  createCountry("SE", "Sweden", "🇸🇪"),
  createCountry("CH", "Switzerland", "🇨🇭"),
  createCountry("SY", "Syria", "🇸🇾"),
  createCountry("TW", "Taiwan", "🇹🇼"),
  createCountry("TJ", "Tajikistan", "🇹🇯"),
  createCountry("TZ", "Tanzania", "🇹🇿"),
  createCountry("TH", "Thailand", "🇹🇭"),
  createCountry("TL", "Timor-Leste", "🇹🇱"),
  createCountry("TG", "Togo", "🇹🇬"),
  createCountry("TO", "Tonga", "🇹🇴"),
  createCountry("TT", "Trinidad and Tobago", "🇹🇹"),
  createCountry("TN", "Tunisia", "🇹🇳"),
  createCountry("TR", "Turkey", "🇹🇷"),
  createCountry("TM", "Turkmenistan", "🇹🇲"),
  createCountry("TV", "Tuvalu", "🇹🇻"),
  createCountry("UG", "Uganda", "🇺🇬"),
  createCountry("UA", "Ukraine", "🇺🇦"),
  createCountry("AE", "United Arab Emirates", "🇦🇪"),
  createCountry("GB", "United Kingdom", "🇬🇧"),
  createCountry("US", "United States", "🇺🇸"),
  createCountry("UY", "Uruguay", "🇺🇾"),
  createCountry("UZ", "Uzbekistan", "🇺🇿"),
  createCountry("VU", "Vanuatu", "🇻🇺"),
  createCountry("VA", "Vatican City", "🇻🇦"),
  createCountry("VE", "Venezuela", "🇻🇪"),
  createCountry("VN", "Vietnam", "🇻🇳"),
  createCountry("YE", "Yemen", "🇾🇪"),
  createCountry("ZM", "Zambia", "🇿🇲"),
  createCountry("ZW", "Zimbabwe", "🇿🇼"),
];

export const normalizeCountry = (value?: string | null): string => {
  if (!value) return "";
  return value.toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
};

export const countryToSlug = (value?: string | null): string => {
  if (!value) return "";
  return normalizeCountry(value).replace(/\s+/g, "-");
};

export const countryNameFromSlug = (value?: string): string => {
  if (!value) return "";
  const found = DIRECTORY_COUNTRIES.find((item) => item.slug === value);
  if (found) return found.name;
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const getCountryOption = (value?: string | null): DirectoryCountry | null => {
  if (!value) return null;
  const normalized = normalizeCountry(value);
  const slug = countryToSlug(value);
  return DIRECTORY_COUNTRIES.find(
    (country) =>
      normalizeCountry(country.name) === normalized ||
      normalizeCountry(country.code) === normalized ||
      country.slug === slug,
  ) || null;
};

export const getProviderTitle = (type: ProviderRole): string => (type === "therapist" ? "Therapists" : "Coaches");

export const getRoleCopy = (type: ProviderRole) => {
  if (type === "therapist") {
    return {
      singular: "Therapist",
      plural: "Therapists",
      routeBase: "/therapists",
      profileRouteBase: "/directory/therapists",
      directoryLabel: "Global directory · Therapists",
      heroTitle: "Find a therapist near you.",
      heroDescription: "Search all countries, browse by flag, and view verified therapist profiles with the same structured detail flow used across coaching, creators, and courses.",
      emptyTitle: "No therapists found",
      emptyDescription: "Try changing the country or search term to find a therapist.",
      defaultHeadline: "Therapist profile",
      profileCta: "Message now",
      numberCta: "Request number",
    };
  }

  return {
    singular: "Coach",
    plural: "Coaches",
    routeBase: "/coaches",
    profileRouteBase: "/directory/coaches",
    directoryLabel: "Global directory · Coaches",
    heroTitle: "Find a coach near you.",
    heroDescription: "Search all countries, browse by flag, and view verified profiles with the same details structure used across coaches, therapists, creators, and courses.",
    emptyTitle: "No coaches found",
    emptyDescription: "Try changing the country or search term to find a coach.",
    defaultHeadline: "Coach profile",
    profileCta: "Message now",
    numberCta: "Request number",
  };
};

export const loadProviders = async (type: ProviderRole): Promise<ProviderDirectoryResult> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("onboarding_completed", true)
      .or(`role.eq.${type},provider_type.eq.${type}`)
      .order("updated_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message || `Failed to load ${getProviderTitle(type).toLowerCase()}.` };
    }

    return { data: (data as Provider[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || `Failed to load ${getProviderTitle(type).toLowerCase()}.` };
  }
};

export const filterProviders = (
  providers: Provider[],
  options?: { search?: string; selectedCountry?: string },
): Provider[] => {
  const search = options?.search?.trim().toLowerCase() || "";
  const selectedCountry = options?.selectedCountry?.trim() || "";
  let result = [...providers];

  if (selectedCountry) {
    const normalizedCountry = normalizeCountry(selectedCountry);
    const slug = countryToSlug(selectedCountry);
    result = result.filter((provider) => {
      const providerCountry = normalizeCountry(provider.country);
      const providerCode = normalizeCountry(provider.country_code);
      return providerCountry === normalizedCountry || providerCode === normalizedCountry || countryToSlug(provider.country) === slug;
    });
  }

  if (search) {
    result = result.filter((provider) => {
      const textParts = [
        provider.full_name,
        provider.display_name,
        provider.username,
        provider.headline,
        provider.bio,
        provider.country,
        provider.city,
        typeof provider.skills === "string" ? provider.skills : Array.isArray(provider.skills) ? provider.skills.join(" ") : "",
        typeof provider.languages === "string" ? provider.languages : Array.isArray(provider.languages) ? provider.languages.join(" ") : "",
      ];

      return textParts.filter(Boolean).join(" ").toLowerCase().includes(search);
    });
  }

  return result;
};

const inferCountryFromBrowser = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  const localeRegion = navigator.language?.split("-")[1]?.toUpperCase();
  if (localeRegion) {
    const localeMatch = DIRECTORY_COUNTRIES.find((item) => item.code === localeRegion);
    if (localeMatch) return localeMatch.name;
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const timezoneCountryMap: Record<string, string> = {
    Lagos: "Nigeria",
    London: "United Kingdom",
    Accra: "Ghana",
    Nairobi: "Kenya",
    Johannesburg: "South Africa",
    Cairo: "Egypt",
    Toronto: "Canada",
    Vancouver: "Canada",
    New_York: "United States",
    Chicago: "United States",
    Los_Angeles: "United States",
    Sydney: "Australia",
    Melbourne: "Australia",
    Auckland: "New Zealand",
    Paris: "France",
    Berlin: "Germany",
    Madrid: "Spain",
    Rome: "Italy",
    Lisbon: "Portugal",
    Amsterdam: "Netherlands",
    Stockholm: "Sweden",
    Zurich: "Switzerland",
    Dublin: "Ireland",
    Warsaw: "Poland",
    Prague: "Czech Republic",
    Budapest: "Hungary",
    Bucharest: "Romania",
    Athens: "Greece",
    Istanbul: "Turkey",
    Dubai: "United Arab Emirates",
    Doha: "Qatar",
    Riyadh: "Saudi Arabia",
    Jerusalem: "Israel",
    Tokyo: "Japan",
    Seoul: "South Korea",
    Singapore: "Singapore",
    Bangkok: "Thailand",
    Delhi: "India",
    Kolkata: "India",
    Karachi: "Pakistan",
    Manila: "Philippines",
    Jakarta: "Indonesia",
    Sao_Paulo: "Brazil",
    Buenos_Aires: "Argentina",
    Santiago: "Chile",
    Bogota: "Colombia",
    Lima: "Peru",
    Mexico_City: "Mexico",
  };

  const match = Object.entries(timezoneCountryMap).find(([needle]) => timezone.includes(needle));
  return match?.[1];
};

export const detectLocation = async (): Promise<GeolocationResult> => {
  if (typeof window === "undefined") {
    return { ok: false, error: "Window is not available." };
  }
  if (!("geolocation" in navigator)) {
    return { ok: false, error: "Geolocation is not supported on this device/browser.", inferredCountry: inferCountryFromBrowser() };
  }

  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const isSecure = window.location.protocol === "https:";
  if (!isSecure && !isLocalhost) {
    return { ok: false, error: "Geolocation requires HTTPS outside local development.", inferredCountry: inferCountryFromBrowser() };
  }

  return new Promise<GeolocationResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          inferredCountry: inferCountryFromBrowser(),
        });
      },
      (err) => {
        const inferredCountry = inferCountryFromBrowser();
        if (err.code === 1) return resolve({ ok: false, error: "Location permission was denied.", inferredCountry });
        if (err.code === 2) return resolve({ ok: false, error: "Location is unavailable.", inferredCountry });
        if (err.code === 3) return resolve({ ok: false, error: "Location request timed out.", inferredCountry });
        resolve({ ok: false, error: "Could not get your location.", inferredCountry });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  });
};
