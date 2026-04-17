import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Search, Star, Video, Users, TrendingUp, BadgeCheck, ArrowRight, Sparkles, Play } from "lucide-react";

const creatorChips = ["All", "Business", "Education", "Technology", "Health", "Lifestyle", "Finance", "Creative"];

const Creators = () => {
  const [creators, setCreators] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "creator")
      .eq("onboarding_completed", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCreators(data || []);
        setLoading(false);
      });
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

  const stats = {
    creators: creators.length,
    verified: creators.filter(c => c.is_verified).length,
    avgRating: creators.length > 0 ? (creators.reduce((sum, c) => sum + (c.rating || 5), 0) / creators.length).toFixed(1) : "5.0"
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-purple-50 px-4 py-16 lg:py-24">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute right-0 top-0 h-96 w-96 bg-violet-200 rounded-full blur-3xl opacity-20 -z-10" />
        <div className="absolute left-0 bottom-0 h-96 w-96 bg-purple-200 rounded-full blur-3xl opacity-20 -z-10" />

        <div className="container-wide relative">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white border border-violet-200 px-4 py-2 shadow-sm">
              <Sparkles size={16} className="text-violet-600" />
              <span className="text-sm font-semibold text-slate-700">Premium Creator Marketplace</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Learn from the{" "}
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                best creators
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Discover talented creators sharing their expertise through courses, videos, and premium content. 
              Find your next mentor and level up your skills.
            </p>

            {/* Stats */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                  <Users size={18} className="text-violet-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900">{stats.creators}+</div>
                  <div className="text-slate-500">Creators</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <BadgeCheck size={18} className="text-emerald-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900">{stats.verified}</div>
                  <div className="text-slate-500">Verified</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Star size={18} className="text-amber-600 fill-amber-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900">{stats.avgRating}</div>
                  <div className="text-slate-500">Avg Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="sticky top-16 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-lg px-4 py-6 shadow-sm">
        <div className="container-wide">
          <div className="mx-auto max-w-4xl">
            {/* Search Bar */}
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search creators by name, niche, or expertise..."
                className="w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 py-4 text-sm shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            {/* Filter Chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {creatorChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setTopic(chip)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    topic === chip
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Creators Grid */}
      <section className="container-wide py-12 lg:py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {topic === "All" ? "All Creators" : `${topic} Creators`}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{filtered.length} creator{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-slate-200 rounded" />
                  <div className="h-3 bg-slate-200 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-20 text-center">
            <Video size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No creators found</h3>
            <p className="mt-2 text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((creator, index) => (
              <Link
                key={creator.user_id}
                to={`/profile/${creator.profile_slug || creator.user_id}`}
                className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-100"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Verified Badge */}
                {creator.is_verified && (
                  <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                    <BadgeCheck size={14} className="text-white" />
                  </div>
                )}

                {/* Avatar & Info */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <ProfileAvatar 
                      src={creator.avatar_url} 
                      name={creator.full_name} 
                      className="h-16 w-16 shrink-0 ring-2 ring-slate-100 group-hover:ring-violet-200 transition" 
                    />
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 shadow-md">
                      <Play size={10} className="text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-slate-900 group-hover:text-violet-700 transition">
                      {creator.full_name || "Unnamed Creator"}
                    </h3>
                    <p className="truncate text-sm text-slate-500">
                      {creator.profession || creator.headline || "Content Creator"}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                  {creator.bio || "Creating premium educational content to help you master new skills and achieve your goals."}
                </p>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {creator.country || "Global"}
                  </span>
                  {creator.specialization && (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                      {creator.specialization}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-slate-900">{Number(creator.rating || 5).toFixed(1)}</span>
                    <span className="text-xs text-slate-400">({creator.review_count || 0})</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 group-hover:gap-2 transition-all">
                    View profile <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-200 bg-gradient-to-br from-violet-600 to-purple-600 px-4 py-16 lg:py-20">
        <div className="container-wide text-center">
          <TrendingUp size={48} className="mx-auto mb-6 text-white/80" />
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to share your expertise?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-violet-100">
            Join our community of creators and start earning by teaching what you love. 
            Build your audience and make an impact.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-semibold text-violet-600 shadow-xl transition hover:scale-105 hover:shadow-2xl"
          >
            Become a Creator <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Creators;
