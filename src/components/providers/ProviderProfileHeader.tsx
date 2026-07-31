import ProviderBadgeList from "./ProviderBadgeList";
import {
  getProviderHeadline,
  getProviderLabel,
  getProviderSpecialties,
} from "@/lib/provider";

type Props = {
  profile: any;
  badges?: any[];
  onBook?: () => void;
  onMessage?: () => void;
};

export default function ProviderProfileHeader({
  profile,
  badges = [],
  onBook,
  onMessage,
}: Props) {
  const specialties = getProviderSpecialties(profile);

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <img
            src={profile?.avatar_url || "https://placehold.co/120x120/png"}
            alt={profile?.full_name || "Provider"}
            className="h-24 w-24 rounded-2xl object-cover border"
          />

          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold">
                {profile?.full_name || "Unnamed Provider"}
              </h1>
              <p className="text-sm font-medium text-blue-600">
                {getProviderLabel(profile)}
              </p>
            </div>

            <p className="max-w-2xl text-sm text-slate-600">
              {getProviderHeadline(profile)}
            </p>

            <div className="flex flex-wrap gap-2">
              {specialties.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium"
                >
                  {item}
                </span>
              ))}
            </div>

            <ProviderBadgeList badges={badges} />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:min-w-[220px]">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Rating</div>
            <div className="text-2xl font-bold">
              {Number(profile?.rating || 0).toFixed(1)}
            </div>
            <div className="text-sm text-slate-500">
              {profile?.total_reviews || 0} reviews
            </div>
          </div>

          <button
            onClick={onBook}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white"
          >
            Book Session
          </button>

          <button
            onClick={onMessage}
            className="rounded-xl border px-4 py-3 text-sm font-medium"
          >
            Message Provider
          </button>
        </div>
      </div>
    </div>
  );
}