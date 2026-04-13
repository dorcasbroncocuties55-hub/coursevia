import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DIRECTORY_COUNTRIES,
  detectLocation,
  filterProviders,
  getCountryOption,
  getRoleCopy,
  loadProviders,
  Provider,
  ProviderRole,
  countryNameFromSlug,
  countryToSlug,
} from "@/lib/providerDirectory";

type ProviderDirectoryPageProps = {
  type: ProviderRole;
};

const ProviderDirectoryPage = ({ type }: ProviderDirectoryPageProps) => {
  const navigate = useNavigate();
  const { country } = useParams();

  const roleCopy = useMemo(() => getRoleCopy(type), [type]);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [geoLoading, setGeoLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [geoError, setGeoError] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>(
    countryNameFromSlug(country)
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");

      const result = await loadProviders(type);
      setProviders(result.data);
      setError(result.error || "");

      setLoading(false);
    };

    run();
  }, [type]);

  useEffect(() => {
    setSelectedCountry(countryNameFromSlug(country));
  }, [country]);

  const filteredProviders = useMemo(() => {
    return filterProviders(providers, {
      search,
      selectedCountry,
    });
  }, [providers, search, selectedCountry]);

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);

    const option = getCountryOption(value);
    const slug = option?.slug || countryToSlug(value);

    if (!value.trim()) {
      navigate(roleCopy.routeBase);
      return;
    }

    navigate(`${roleCopy.routeBase}/${slug}`);
  };

  const handleUseLocation = async () => {
    setGeoLoading(true);
    setGeoError("");

    const result = await detectLocation();

    if (!result.ok) {
      setGeoError(result.error || "Could not get your location.");
      setGeoLoading(false);
      return;
    }

    console.log("Detected coordinates:", result.latitude, result.longitude);
    setGeoError(
      "Location detected successfully. Reverse geocoding is not connected yet."
    );
    setGeoLoading(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{roleCopy.plural}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Browse verified {roleCopy.plural.toLowerCase()} by country or search
            by name, headline, city, or keyword.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${roleCopy.plural.toLowerCase()}...`}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            >
              <option value="">All Countries</option>
              {DIRECTORY_COUNTRIES.map((countryOption) => (
                <option key={countryOption.code} value={countryOption.name}>
                  {countryOption.flag} {countryOption.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Location</label>
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={geoLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {geoLoading ? "Detecting location..." : "Use my current location"}
            </button>
          </div>
        </div>

        {geoError ? (
          <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {geoError}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="py-10 text-sm text-gray-600">
            Loading {roleCopy.plural.toLowerCase()}...
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <h2 className="text-lg font-semibold">{roleCopy.emptyTitle}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {roleCopy.emptyDescription}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProviders.map((provider) => {
              const countryOption = getCountryOption(
                provider.country || provider.country_code || ""
              );

              return (
                <div
                  key={provider.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-100">
                      {provider.avatar_url ? (
                        <img
                          src={provider.avatar_url}
                          alt={provider.full_name || roleCopy.singular}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">
                        {provider.full_name ||
                          provider.username ||
                          `Unnamed ${roleCopy.singular}`}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {provider.headline || roleCopy.defaultHeadline}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Country:</span>{" "}
                      {countryOption
                        ? `${countryOption.flag} ${countryOption.name}`
                        : provider.country || provider.country_code || "Not set"}
                    </p>
                    <p>
                      <span className="font-medium">City:</span>{" "}
                      {provider.city || "Not set"}
                    </p>
                    <p>
                      <span className="font-medium">Rating:</span>{" "}
                      {provider.rating ?? 0}
                    </p>
                    <p>
                      <span className="font-medium">Reviews:</span>{" "}
                      {provider.total_reviews ?? 0}
                    </p>
                    <p>
                      <span className="font-medium">Price:</span>{" "}
                      {provider.session_price ?? provider.hourly_rate ?? 0}
                    </p>
                  </div>

                  {provider.bio ? (
                    <p className="mt-4 line-clamp-3 text-sm text-gray-600">
                      {provider.bio}
                    </p>
                  ) : null}

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${provider.id}`)}
                      className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
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
    </div>
  );
};

export default ProviderDirectoryPage;