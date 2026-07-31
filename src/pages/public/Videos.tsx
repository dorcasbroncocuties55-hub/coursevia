import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Play, Search, Layers, Film } from "lucide-react";

const Videos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "single_video" | "episode_series">("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("content_items" as any)
        .select("*")
        .in("content_type", ["single_video", "episode_series"])
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) { setVideos(data as any[]); return; }

      const fallback = await supabase
        .from("videos")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setVideos(fallback.data || []);
    };
    load();
  }, []);

  const filtered = videos.filter((v) => {
    const matchFilter = filter === "all" || v.content_type === filter;
    const matchQuery = !query.trim() || `${v.title} ${v.description}`.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0a0a0f] via-[#12101e] to-[#0a0a0f] px-4 py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="container-wide relative">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
              <Film size={14} /> Premium Video Content
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Watch. Learn. <span className="text-indigo-400">Grow.</span>
            </h1>
            <p className="mt-5 text-lg text-white/60">
              Standalone lessons and multi-episode series from expert creators — on demand, at your pace.
            </p>

            {/* Search */}
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <Search size={16} className="shrink-0 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search videos…"
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
              />
            </div>

            {/* Filter pills */}
            <div className="mt-4 flex justify-center gap-2">
              {(["all", "single_video", "episode_series"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    filter === f
                      ? "bg-indigo-600 text-white"
                      : "border border-white/10 text-white/50 hover:border-white/30 hover:text-white/80"
                  }`}
                >
                  {f === "all" ? "All" : f === "single_video" ? "Single Videos" : "Episode Series"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container-wide py-12">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 py-20 text-center text-white/40">
            No videos available yet.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((video) => (
              <Link
                key={video.id}
                to={`/videos/${video.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-indigo-500/40 hover:bg-white/8"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-white/5">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Film size={32} className="text-white/20" />
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
                      <Play size={20} className="ml-0.5" />
                    </div>
                  </div>
                  {/* Type badge */}
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {video.content_type === "episode_series" ? (
                      <><Layers size={11} /> Series</>
                    ) : (
                      <><Film size={11} /> Video</>
                    )}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="line-clamp-2 font-semibold text-white group-hover:text-indigo-300 transition">
                    {video.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-white/50">{video.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-white">
                      {Number(video.price || 0) === 0 ? (
                        <span className="text-emerald-400">Free</span>
                      ) : (
                        `$${Number(video.price).toFixed(2)}`
                      )}
                    </span>
                    <span className="text-xs text-white/30">
                      {video.content_type === "episode_series" ? "Multi-part" : "Focused lesson"}
                    </span>
                  </div>
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

export default Videos;
