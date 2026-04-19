import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Clock, ArrowRight } from "lucide-react";
import { posts, CATEGORY_STYLE, type Post } from "./BlogData";

// ── Render body text: ## headings + paragraphs ────────────────────────────────
const renderBody = (body: string) => {
  return body.split("\n\n").map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="text-lg font-bold text-gray-900 mt-8 mb-3 tracking-tight">
          {block.replace("## ", "")}
        </h2>
      );
    }
    // Bold inline: **text**
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm text-gray-600 leading-relaxed mb-0">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="font-semibold text-gray-800">
              {part.slice(2, -2)}
            </strong>
          ) : (
            part
          )
        )}
      </p>
    );
  });
};

// ── Related posts ─────────────────────────────────────────────────────────────
const RelatedCard = ({ post }: { post: Post }) => {
  const s = CATEGORY_STYLE[post.category] ?? CATEGORY_STYLE["Platform"];
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-gray-100 bg-white p-4 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
          {post.category}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={10} /> {post.readTime}
        </span>
      </div>
      <h3 className={`text-sm font-semibold text-gray-800 leading-snug group-hover:${s.text} transition-colors line-clamp-2`}>
        {post.title}
      </h3>
    </Link>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <p className="text-4xl font-bold text-gray-200 mb-4">404</p>
          <p className="text-base font-semibold text-gray-700 mb-2">Article not found</p>
          <p className="text-sm text-gray-400 mb-6">This article doesn't exist or may have been moved.</p>
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2">
            <ArrowLeft size={14} /> Back to blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const s = CATEGORY_STYLE[post.category] ?? CATEGORY_STYLE["Platform"];

  // Related: same category, different slug, max 3
  const related = posts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  // If not enough same-category, fill with others
  const moreRelated = related.length < 3
    ? [...related, ...posts.filter((p) => p.slug !== post.slug && p.category !== post.category).slice(0, 3 - related.length)]
    : related;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Top accent bar ── */}
      <div className={`h-1 w-full ${s.bg}`} />

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* Back */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 font-medium mb-8 transition-colors"
        >
          <ArrowLeft size={13} /> Back to blog
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {post.category}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={11} /> {post.readTime}
            </span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">{post.date}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
            {post.title}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-4">
            {post.excerpt}
          </p>
        </header>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-8" />

        {/* Body */}
        <article className="space-y-4">
          {renderBody(post.body)}
        </article>

        {/* Divider */}
        <div className="border-t border-gray-100 mt-12 mb-8" />

        {/* CTA */}
        <div className={`rounded-xl border ${s.border} ${s.bg} p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div>
            <p className={`text-sm font-semibold ${s.text} mb-0.5`}>
              {post.category === "Therapy" && "Find a therapist on Coursevia"}
              {post.category === "Coaching" && "Find a coach on Coursevia"}
              {post.category === "Creator Tips" && "Start selling your courses"}
              {post.category === "Learning" && "Browse courses on Coursevia"}
              {post.category === "Wellness" && "Explore wellness support"}
              {post.category === "Platform" && "Explore the platform"}
            </p>
            <p className="text-xs text-gray-500">
              {post.category === "Therapy" && "Browse verified therapists and book your first session."}
              {post.category === "Coaching" && "Browse coaches by specialisation and book a discovery call."}
              {post.category === "Creator Tips" && "Upload your first course and reach thousands of learners."}
              {post.category === "Learning" && "Thousands of courses across business, health, tech and more."}
              {post.category === "Wellness" && "Connect with coaches and therapists who specialise in wellbeing."}
              {post.category === "Platform" && "See everything Coursevia has to offer."}
            </p>
          </div>
          <Link
            to={
              post.category === "Therapy" ? "/therapists" :
              post.category === "Coaching" ? "/coaches" :
              post.category === "Creator Tips" ? "/signup" :
              "/courses"
            }
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold ${s.text} hover:gap-2.5 transition-all`}
          >
            Explore <ArrowRight size={12} />
          </Link>
        </div>

        {/* Related */}
        {moreRelated.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">More articles</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {moreRelated.map((p) => <RelatedCard key={p.slug} post={p} />)}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogArticle;
