import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Search, Star, Video, Globe, BadgeCheck, ArrowRight } from "lucide-react";

const creatorChips = ["All", "Business", "Education", "Technology", "Health", "Motivation", "Finance"];

const Creators = () => {
  const [creators, setCreators] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "creator")
      .eq("onboarding_completed", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setCreators(data || []));
  }, []);

  const filtered = useMemo(() => {
    return creators.filter((c) => {
      const hay = `${c.full_name || ""} ${c.profession || ""} ${c.headline || ""} ${c.bio || ""}`.toLowerCase();
      return (
        (!query.trim() || hay.includes(query.toLowerCase())) &&
        (topic === "All" || hay.includes(topic.toLowerCase()))
      );
    });
  }, [creators, query, topic]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white px-4 py-14 lg:py-20">
        <div className="container-wide">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700">
                <Video size={14} /> Creator Marketplace
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Discover creators building{" "}
                <span className="text-violet-600">premium learning products.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-slate-600">
                Browse by niche, explore their catalog, and access courses, videos, and series from creators who know their craft.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Globe size={15} className="text-violet-600" /> Global creators</span>
                <span className="flex items-center gap-1.5"><BadgeCheck size={15} className="text-emerald-600" /> Verified profiles</span>
                <span className="flex items-center gap-1.5"><Star size={15} className="text-amber-500 fill-amber-500" /> Rated content</span>
              </div>
            </div>

            {/* Search panel */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Search creators</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, niche, or topic…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {creatorChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setTopic(chip)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      topic === chip
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container-wide py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {topic === "All" ? "All Creators" : `${topic} Creators`}{" "}
            <span className="ml-1 text-base font-normal text-slate-400">({filtered.length})</span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center text-slate-400 shadow-sm">
            No creators available yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((creator) => (
              <Link
                key={creator.user_id}
                to={`/profile/${creator.profile_slug || creator.user_id}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <ProfileAvatar src={creator.avatar_url} name={creator.full_name} className="h-14 w-14 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900 group-hover:text-violet-700 transition">
                      {creator.full_name || "Unnamed Creator"}
                    </h3>
                    <p className="truncate text-xs text-slate-500">{creator.profession || creator.headline || "Creator"}</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                    {creator.country || "Global"}
                  </span>
                  {creator.is_verified && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">
                      <BadgeCheck size={11} /> Verified
                    </span>
                  )}
                </div>

                {/* Bio */}
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
                  {creator.bio || "Professional creator publishing premium lessons, courses, and on-demand video content on Coursevia."}
                </p>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-slate-900">{Number(creator.rating || 5).toFixed(1)}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-violet-600 group-hover:gap-2 transition-all">
                    View storefront <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Creators;
