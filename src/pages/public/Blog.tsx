import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ArrowRight, Clock, Tag, Search, TrendingUp, BookOpen, Lightbulb, Users } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  featured?: boolean;
  gradient: string;
  icon: React.ReactNode;
};

// ── Data ─────────────────────────────────────────────────────────────────────

const categories = ["All", "Learning", "Coaching", "Creator Tips", "Wellness", "Platform"];

const posts: Post[] = [
  {
    slug: "how-to-pick-the-right-online-coach",
    title: "How to Pick the Right Online Coach (Without Wasting Money)",
    excerpt: "Most people hire the wrong coach because they focus on credentials instead of fit. Here's a practical framework for finding someone who actually moves the needle for you.",
    category: "Coaching",
    readTime: "6 min read",
    date: "Apr 14, 2026",
    featured: true,
    gradient: "from-emerald-500 to-teal-600",
    icon: <Users size={22} className="text-white" />,
  },
  {
    slug: "creator-pricing-strategy",
    title: "The Creator Pricing Strategy That Doubled My Course Revenue",
    excerpt: "Pricing your course too low signals low value. Too high and nobody buys. This is the exact tiered pricing model that works for digital educators in 2026.",
    category: "Creator Tips",
    readTime: "8 min read",
    date: "Apr 10, 2026",
    featured: true,
    gradient: "from-violet-500 to-purple-600",
    icon: <TrendingUp size={22} className="text-white" />,
  },
  {
    slug: "science-of-learning-retention",
    title: "The Science of Learning Retention: Why You Forget 70% of What You Watch",
    excerpt: "Video courses are convenient but passive watching doesn't stick. Neuroscience-backed techniques to actually retain what you learn online.",
    category: "Learning",
    readTime: "5 min read",
    date: "Apr 7, 2026",
    gradient: "from-blue-500 to-cyan-600",
    icon: <BookOpen size={22} className="text-white" />,
  },
  {
    slug: "therapist-online-practice-guide",
    title: "Building a Thriving Online Therapy Practice in 2026",
    excerpt: "From setting boundaries with remote clients to managing your calendar and getting discovered — a practical guide for therapists going digital.",
    category: "Wellness",
    readTime: "7 min read",
    date: "Apr 3, 2026",
    gradient: "from-rose-500 to-pink-600",
    icon: <Lightbulb size={22} className="text-white" />,
  },
  {
    slug: "coursevia-platform-update-q2",
    title: "What's New on Coursevia: Q2 2026 Platform Update",
    excerpt: "New booking flows, wallet improvements, KYC upgrades, and the AI voice assistant — everything we shipped this quarter and what's coming next.",
    category: "Platform",
    readTime: "4 min read",
    date: "Mar 28, 2026",
    gradient: "from-amber-500 to-orange-600",
    icon: <TrendingUp size={22} className="text-white" />,
  },
  {
    slug: "deep-work-for-online-learners",
    title: "Deep Work for Online Learners: How to Study Without Distractions",
    excerpt: "Cal Newport's deep work principles applied to video-based learning. Build a study environment that makes focus the default, not the exception.",
    category: "Learning",
    readTime: "6 min read",
    date: "Mar 22, 2026",
    gradient: "from-sky-500 to-blue-600",
    icon: <BookOpen size={22} className="text-white" />,
  },
  {
    slug: "coach-client-retention",
    title: "5 Reasons Your Coaching Clients Don't Come Back (And How to Fix It)",
    excerpt: "Client churn is rarely about your expertise. It's almost always about expectation-setting, communication, and perceived progress. Here's how to fix each one.",
    category: "Coaching",
    readTime: "7 min read",
    date: "Mar 18, 2026",
    gradient: "from-emerald-500 to-green-600",
    icon: <Users size={22} className="text-white" />,
  },
  {
    slug: "video-course-production-on-budget",
    title: "Professional-Looking Video Courses on a $200 Budget",
    excerpt: "You don't need a studio. A phone, a ring light, and the right framing beats expensive gear every time. The complete budget setup guide for new creators.",
    category: "Creator Tips",
    readTime: "9 min read",
    date: "Mar 12, 2026",
    gradient: "from-fuchsia-500 to-violet-600",
    icon: <Lightbulb size={22} className="text-white" />,
  },
];

// ── Components ────────────────────────────────────────────────────────────────

const FeaturedCard = ({ post }: { post: Post }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row">
    {/* Colour band */}
    <div className={`bg-gradient-to-br ${post.gradient} md:w-56 w-full h-40 md:h-auto flex-shrink-0 flex items-center justify-center`}>
      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
        {post.icon}
      </div>
    </div>
    {/* Content */}
    <div className="flex flex-col justify-between p-6 flex-1">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/8 px-2.5 py-1 rounded-full">
            {post.category}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={11} /> {post.readTime}
          </span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 leading-snug mb-2 group-hover:text-primary transition-colors">
          {post.title}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{post.excerpt}</p>
      </div>
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-400">{post.date}</span>
        <Link
          to={`/blog/${post.slug}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all"
        >
          Read article <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  </div>
);

const PostCard = ({ post }: { post: Post }) => (
  <div className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
    <div className={`bg-gradient-to-br ${post.gradient} h-36 flex items-center justify-center`}>
      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
        {post.icon}
      </div>
    </div>
    <div className="flex flex-col flex-1 p-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/8 px-2 py-0.5 rounded-full">
          {post.category}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={10} /> {post.readTime}
        </span>
      </div>
      <h3 className="text-sm font-bold text-gray-900 leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {post.title}
      </h3>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <span className="text-xs text-gray-400">{post.date}</span>
        <Link
          to={`/blog/${post.slug}`}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:gap-2 transition-all"
        >
          Read <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const Blog = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = posts.filter((p) => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchQ =
      !query ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const featured = filtered.filter((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white pt-20 pb-16 px-4">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-emerald-100/40 blur-3xl" />

        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 px-3 py-1.5 rounded-full mb-5">
            <Tag size={11} /> Coursevia Blog
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
            Insights for learners,<br />
            <span className="text-gradient">creators & coaches</span>
          </h1>
          <p className="text-base text-gray-500 max-w-xl mx-auto mb-8">
            Practical guides on learning strategy, creator growth, coaching, and everything happening on the platform.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* ── Category pills ── */}
      <section className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-14">

        {/* ── Featured ── */}
        {featured.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={15} className="text-primary" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Featured</h2>
            </div>
            <div className="space-y-4">
              {featured.map((p) => <FeaturedCard key={p.slug} post={p} />)}
            </div>
          </section>
        )}

        {/* ── All posts grid ── */}
        {rest.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <BookOpen size={15} className="text-primary" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {activeCategory === "All" ? "Latest Articles" : activeCategory}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold mb-1">No articles found</p>
            <p className="text-sm text-gray-500">Try a different search or category.</p>
            <button
              onClick={() => { setQuery(""); setActiveCategory("All"); }}
              className="mt-4 text-sm text-primary font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Newsletter CTA ── */}
        <section className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_60%)]" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full mb-4">
              Stay in the loop
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
              New articles every week
            </h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Practical insights for learners, creators, coaches and therapists — straight to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
              <button className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-1.5 whitespace-nowrap">
                Subscribe <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
