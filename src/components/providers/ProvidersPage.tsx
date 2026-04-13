import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProviderBadgeList from "@/components/providers/ProviderBadgeList";
import { getProviderLabel, getProviderHeadline } from "@/lib/provider";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [badgesByUser, setBadgesByUser] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProviders = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_type", "provider")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProviders(data);

        const userIds = data.map((item) => item.user_id);
        if (userIds.length) {
          const { data: badgeData } = await supabase
            .from("user_badges")
            .select("id, user_id, badge_id, badges(id, name, description)")
            .in("user_id", userIds);

          const grouped: Record<string, any[]> = {};

          (badgeData || []).forEach((row: any) => {
            if (!grouped[row.user_id]) grouped[row.user_id] = [];
            if (row.badges) grouped[row.user_id].push(row.badges);
          });

          setBadgesByUser(grouped);
        }
      }

      setLoading(false);
    };

    loadProviders();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Experts</h1>
        <p className="text-slate-600">
          Book coaches and therapists from one shared provider system.
        </p>
      </div>

      {loading ? (
        <div>Loading providers...</div>
      ) : !providers.length ? (
        <div className="rounded-2xl border bg-white p-6">
          No providers available yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <Link
              key={provider.user_id}
              to={`/providers/${provider.user_id}`}
              className="rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <img
                  src={provider.avatar_url || "https://placehold.co/88x88/png"}
                  alt={provider.full_name || "Provider"}
                  className="h-20 w-20 rounded-2xl object-cover border"
                />

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">
                    {provider.full_name || "Unnamed Provider"}
                  </h2>
                  <p className="text-sm font-medium text-blue-600">
                    {getProviderLabel(provider)}
                  </p>
                  <p className="text-sm text-slate-500">
                    ⭐ {Number(provider.rating || 0).toFixed(1)} ·{" "}
                    {provider.total_reviews || 0} reviews
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600 line-clamp-3">
                {getProviderHeadline(provider)}
              </p>

              <div className="mt-4">
                <ProviderBadgeList badges={badgesByUser[provider.user_id] || []} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}