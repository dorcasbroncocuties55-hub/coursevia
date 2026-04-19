import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ArrowRight, Clock, Search, TrendingUp, BookOpen } from "lucide-react";
import { posts, CATEGORIES, CATEGORY_STYLE, type Post } from "./BlogData";

// ── Category badge ────────────────────────────────────────────────────────────
const CategoryBadge = ({ category }: { category: string }) => {
  const s = CATEGORY_STYLE[category] ?? CATEGORY_STYLE["Platform"];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {category}
    </span>
  );
};

// ── Featured card (horizontal) ────────────────────────────────────────────────
const FeaturedCard = ({ post }: { post: Post }) => {
  const s = CATEGORY_STYLE[post.category] ?? CATEGORY_STYLE["Platform"];
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col sm:flex-row rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Accent strip */}
      <div className={`${s.bg} sm:w-2 w-full h-1.5 sm:h-auto flex-shrink-0`} />
      <div className="flex flex-col justify-between p-6 flex-1">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <CategoryBadge category={post.category} />
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={11} /> {post.readTime}
            </span>
          </div>
          <h2 className={`text-base sm:text-lg font-bold text-gray-900 leading-snug mb-2 group-hover:${s.text} transition-colors`}>
            {post.title}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{post.excerpt}</p>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
          <span className="text-xs text-gray-400">{post.date}</span>
          <span className={`flex items-center gap-1.5 text-sm font-semibold ${s.text} group-hover:gap-2.5 transition-all`}>
            Read article <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
};

// ── Regular card (grid) ───────────────────────────────────────────────────────
const PostCard = ({ post }: { post: Post }) => {
  const s = CATEGORY_STYLE[post.category] ?? CATEGORY_STYLE["Platform"];
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${s.bg} border-b ${s.border}`} />
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={10} /> {post.readTime}
          </span>
        </div>
        <h3 className={`text-sm font-bold text-gray-900 leading-snug mb-2 group-hover:${s.text} transition-colors line-clamp-2`}>
          {post.title}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">{post.date}</span>
          <span className={`flex items-center gap-1 text-xs font-semibold ${s.text} group-hover:gap-2 transition-all`}>
            Read <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
};

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
      <section className="bg-gray-50 border-b border-gray-100 pt-16 pb-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Coursevia Blog</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight mb-3">
            Insights for learners, coaches,<br className="hidden sm:block" /> therapists & creators
          </h1>
          <p className="text-sm text-gray-500 max-w-lg mx-auto mb-7">
            Practical guides on learning strategy, therapy, creator growth, coaching, and platform updates.
          </p>
          <div className="relative max-w-sm mx-auto">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition"
            />
          </div>
        </div>
      </section>

      {/* ── Category filter ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeCategory === cat
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">

        {/* ── Featured ── */}
        {featured.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={13} className="text-gray-400" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Featured</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featured.map((p) => <FeaturedCard key={p.slug} post={p} />)}
            </div>
          </section>
        )}

        {/* ── All posts ── */}
        {rest.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={13} className="text-gray-400" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {activeCategory === "All" ? "All Articles" : activeCategory}
              </h2>
              <span className="text-xs text-gray-300 ml-1">{rest.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Search size={18} className="text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No articles found</p>
            <p className="text-xs text-gray-400">Try a different search or category.</p>
            <button
              onClick={() => { setQuery(""); setActiveCategory("All"); }}
              className="mt-4 text-xs text-gray-600 font-semibold underline underline-offset-2"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Newsletter CTA ── */}
        <section className="rounded-2xl bg-gray-900 p-8 sm:p-10 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Stay in the loop</p>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
            New articles every week
          </h2>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            Practical insights for learners, creators, coaches and therapists.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-gray-500 outline-none focus:border-white/30 transition"
            />
            <button className="px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-1.5 whitespace-nowrap">
              Subscribe <ArrowRight size={13} />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
