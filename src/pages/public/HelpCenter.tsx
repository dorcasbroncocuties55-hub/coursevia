import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, BookOpen, Video, Upload, CreditCard, Shield, Wrench,
  ChevronRight, ThumbsUp, ThumbsDown, MessageCircle, X, Send,
  Bot, User, Loader2, ArrowRight, HelpCircle, Zap,
} from "lucide-react";

// ─── HELP DATA ────────────────────────────────────────────────────────────────

const categories = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    desc: "Learn how to create an account, set up your profile, and start using Coursevia.",
    color: "bg-blue-50 text-blue-600",
    topics: ["Creating an account", "Logging in", "Profile setup"],
  },
  {
    id: "courses-learning",
    icon: Video,
    title: "Courses & Learning",
    desc: "Everything about buying, accessing, and watching courses.",
    color: "bg-emerald-50 text-emerald-600",
    topics: ["How to purchase a course", "Accessing your content", "Video playback issues"],
  },
  {
    id: "creators-uploading",
    icon: Upload,
    title: "Creators & Uploading",
    desc: "Guides for creators who want to upload and sell courses.",
    color: "bg-violet-50 text-violet-600",
    topics: ["Uploading videos", "Setting pricing", "Managing content"],
  },
  {
    id: "payments-billing",
    icon: CreditCard,
    title: "Payments & Billing",
    desc: "Understand how payments work on Coursevia.",
    color: "bg-amber-50 text-amber-600",
    topics: ["Payment methods", "Refund policy", "Transaction issues"],
  },
  {
    id: "account-security",
    icon: Shield,
    title: "Account & Security",
    desc: "Manage your account and keep it secure.",
    color: "bg-red-50 text-red-600",
    topics: ["Resetting password", "Account settings", "Security tips"],
  },
  {
    id: "technical-support",
    icon: Wrench,
    title: "Technical Support",
    desc: "Fix common issues and bugs.",
    color: "bg-slate-50 text-slate-600",
    topics: ["App not loading", "Errors and glitches", "Browser compatibility"],
  },
];

type Article = {
  id: string;
  title: string;
  category: string;
  steps: string[];
  lastUpdated: string;
};

const articles: Article[] = [
  {
    id: "upload-course",
    title: "How to Upload a Course on Coursevia",
    category: "creators-uploading",
    lastUpdated: "April 2026",
    steps: [
      "Log into your Coursevia account.",
      "Go to your Creator Dashboard from the top navigation.",
      'Click "Upload Video" in the sidebar.',
      "Add your course title, description, and set your price.",
      "Upload your video content (MP4, MOV supported, max 2GB).",
      'Click "Publish" to make your course live on the marketplace.',
    ],
  },
  {
    id: "request-refund",
    title: "How to Request a Refund",
    category: "payments-billing",
    lastUpdated: "April 2026",
    steps: [
      "Go to your Learner Dashboard and click Payments.",
      "Find the payment you want to refund.",
      'Click the "Request Refund" button next to the payment.',
      "Select a reason and describe your issue clearly.",
      "Submit the request — our team reviews within 24–48 hours.",
      "If approved, the refund is credited to your Coursevia wallet.",
    ],
  },
  {
    id: "cant-access-course",
    title: "Why Can't I Access My Course?",
    category: "courses-learning",
    lastUpdated: "April 2026",
    steps: [
      "Make sure your payment was completed successfully (check Payments in your dashboard).",
      "Try refreshing the page or clearing your browser cache.",
      "Log out and log back in to refresh your session.",
      "Check that you're using a supported browser (Chrome, Firefox, Safari, Edge).",
      "If the issue persists, contact support with your payment reference number.",
    ],
  },
  {
    id: "payments-creators",
    title: "How Payments Work for Creators",
    category: "payments-billing",
    lastUpdated: "April 2026",
    steps: [
      "When a learner purchases your content, the payment is held in escrow.",
      "Coursevia takes a 5% platform fee from each transaction.",
      "Your 95% share is held in pending balance for 8 days.",
      "After 8 days, funds move to your available balance.",
      "You can withdraw to your bank account from the Withdrawals page.",
      "Payouts are processed within 3–5 business days.",
    ],
  },
  {
    id: "video-playback",
    title: "Fix Video Playback Issues",
    category: "technical-support",
    lastUpdated: "April 2026",
    steps: [
      "Check your internet connection — video requires at least 5 Mbps.",
      "Try lowering the video quality using the settings icon on the player.",
      "Clear your browser cache and cookies, then reload.",
      "Disable browser extensions (especially ad blockers) that may interfere.",
      "Try a different browser or device.",
      "If the video still won't play, contact support with the course name and error message.",
    ],
  },
];

// ─── CHAT BOT ─────────────────────────────────────────────────────────────────

const BOT_RESPONSES: Record<string, string> = {
  default: "I'm here to help! Could you describe your issue in more detail? You can also browse our help categories above.",
  refund: "To request a refund, go to your Learner Dashboard → Payments → click 'Request Refund' next to the payment. Refunds are reviewed within 24–48 hours.",
  course: "To access your courses, go to Dashboard → My Courses. If you can't see a purchased course, try logging out and back in.",
  upload: "To upload a course, go to Creator Dashboard → Upload Video. Add your title, description, price, and video file, then publish.",
  payment: "Payments on Coursevia are processed securely. Creators receive 95% of each sale after an 8-day escrow period. Learners can request refunds within 7 days.",
  login: "If you can't log in, try resetting your password via the 'Forgot Password' link on the login page. Check your spam folder for the reset email.",
  password: "Click 'Forgot Password' on the login page, enter your email, and follow the reset link sent to your inbox.",
  account: "You can manage your account settings from your Dashboard → Profile. To delete your account, contact support@coursevia.com.",
  subscription: "Manage your subscription from Dashboard → Subscription. You can cancel anytime — access continues until the end of your billing period.",
};

const getBotReply = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (lower.includes("refund")) return BOT_RESPONSES.refund;
  if (lower.includes("course") || lower.includes("access") || lower.includes("watch")) return BOT_RESPONSES.course;
  if (lower.includes("upload") || lower.includes("creator") || lower.includes("sell")) return BOT_RESPONSES.upload;
  if (lower.includes("payment") || lower.includes("pay") || lower.includes("money") || lower.includes("earn")) return BOT_RESPONSES.payment;
  if (lower.includes("login") || lower.includes("sign in") || lower.includes("log in")) return BOT_RESPONSES.login;
  if (lower.includes("password") || lower.includes("reset")) return BOT_RESPONSES.password;
  if (lower.includes("account") || lower.includes("profile") || lower.includes("delete")) return BOT_RESPONSES.account;
  if (lower.includes("subscription") || lower.includes("plan") || lower.includes("cancel")) return BOT_RESPONSES.subscription;
  return BOT_RESPONSES.default;
};

type ChatMsg = { id: string; role: "user" | "bot" | "agent"; text: string; ts: Date };

const ChatWidget = () => {
  const { user, profile } = useAuth();
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [msgs, setMsgs]       = useState<ChatMsg[]>([
    { id: "0", role: "bot", text: "👋 Hi! How can we help you today? Ask me anything about Coursevia.", ts: new Date() },
  ]);
  const [typing, setTyping]   = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [convId, setConvId]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  const addMsg = (role: ChatMsg["role"], text: string) => {
    const msg: ChatMsg = { id: Date.now().toString(), role, text, ts: new Date() };
    setMsgs(prev => [...prev, msg]);
    return msg;
  };

  const saveToSupabase = async (userMsg: string, botReply: string) => {
    try {
      if (!convId) {
        const { data } = await supabase.from("support_conversations" as any).insert({
          user_id: user?.id || null,
          user_name: profile?.full_name || user?.email || "Guest",
          user_email: user?.email || null,
          status: "open",
        }).select("id").single();
        if (data?.id) {
          setConvId(data.id);
          await supabase.from("support_messages" as any).insert([
            { conversation_id: data.id, role: "user", text: userMsg },
            { conversation_id: data.id, role: "bot",  text: botReply },
          ]);
        }
      } else {
        await supabase.from("support_messages" as any).insert([
          { conversation_id: convId, role: "user", text: userMsg },
          { conversation_id: convId, role: "bot",  text: botReply },
        ]);
      }
    } catch { /* silent — chat still works without DB */ }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    addMsg("user", text);

    if (escalated) {
      // Save to DB for agent to see
      try {
        if (convId) {
          await supabase.from("support_messages" as any).insert({ conversation_id: convId, role: "user", text });
          await supabase.from("support_conversations" as any).update({ status: "open", updated_at: new Date().toISOString() }).eq("id", convId);
        }
      } catch {}
      addMsg("bot", "✅ Your message has been sent to our support team. We'll reply as soon as possible.");
      return;
    }

    setTyping(true);
    await new Promise(r => setTimeout(r, 900));
    setTyping(false);

    const reply = getBotReply(text);
    addMsg("bot", reply);
    saveToSupabase(text, reply);
  };

  const escalate = async () => {
    setEscalated(true);
    addMsg("bot", "Connecting you to a human agent... 👨‍💻 Our team will respond shortly. You can keep typing your message below.");
    try {
      const { data } = await supabase.from("support_conversations" as any).insert({
        user_id: user?.id || null,
        user_name: profile?.full_name || user?.email || "Guest",
        user_email: user?.email || null,
        status: "open",
        escalated: true,
      }).select("id").single();
      if (data?.id) setConvId(data.id);
    } catch {}
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all"
        aria-label="Open support chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "520px" }}
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Coursevia Support</p>
                  <p className="text-xs text-primary-foreground/70">{escalated ? "Agent connected" : "AI Assistant • Online"}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
              {msgs.map(m => (
                <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === "user" ? "bg-primary/10" : "bg-primary/10"
                  }`}>
                    {m.role === "user" ? <User size={13} className="text-primary" /> : <Bot size={13} className="text-primary" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot size={13} className="text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Escalate button */}
            {!escalated && msgs.length > 2 && (
              <div className="px-4 pb-2">
                <button onClick={escalate} className="w-full text-xs text-primary hover:underline text-center py-1">
                  Talk to a human agent →
                </button>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3 flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Type your message..."
                className="flex-1 h-9 text-sm"
              />
              <Button size="sm" onClick={send} disabled={!input.trim()} className="h-9 w-9 p-0">
                <Send size={14} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── ARTICLE PAGE ─────────────────────────────────────────────────────────────

const ArticlePage = ({ article, onBack }: { article: Article; onBack: () => void }) => {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ChevronRight size={14} className="rotate-180" /> Back to Help Centre
      </button>
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-7">
        <p className="text-xs text-muted-foreground mb-2">Last updated: {article.lastUpdated}</p>
        <h1 className="text-2xl font-bold text-foreground mb-6">{article.title}</h1>
        <ol className="space-y-4">
          {article.steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1">{step}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">Was this helpful?</p>
          <div className="flex gap-3">
            <button onClick={() => { setFeedback("up"); toast.success("Thanks for your feedback!"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${
                feedback === "up" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-border hover:border-primary/40"
              }`}>
              <ThumbsUp size={14} /> Yes, helpful
            </button>
            <button onClick={() => { setFeedback("down"); toast.success("Thanks — we'll improve this article."); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${
                feedback === "down" ? "border-red-300 bg-red-50 text-red-600" : "border-border hover:border-primary/40"
              }`}>
              <ThumbsDown size={14} /> Not really
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN HELP CENTRE ─────────────────────────────────────────────────────────

const HelpCenter = () => {
  const [query, setQuery]           = useState("");
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [userType, setUserType]     = useState<"learner" | "creator" | null>(null);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.steps.some(s => s.toLowerCase().includes(q))
    );
  }, [query]);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.4, delay },
  });

  if (activeArticle) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <ArticlePage article={activeArticle} onBack={() => setActiveArticle(null)} />
        <Footer />
        <ChatWidget />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero + Search */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <motion.div {...fadeUp()}>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-5">
              Help Centre
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-3">
              Find answers, guides, and support — fast
            </h1>
            <p className="text-muted-foreground mb-8">Search our knowledge base or browse by category below.</p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Search for help... (e.g. "how to upload course")'
                className="pl-11 h-12 text-sm rounded-2xl border-border shadow-sm"
              />
              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-2xl shadow-lg overflow-hidden z-20">
                  {searchResults.map(a => (
                    <button key={a.id} onClick={() => { setActiveArticle(a); setQuery(""); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors border-b border-border last:border-0">
                      <HelpCircle size={14} className="text-primary shrink-0" />
                      <span className="text-sm text-foreground">{a.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {query.trim() && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-2xl shadow-lg p-4 text-sm text-muted-foreground z-20">
                  No results for "{query}" — try different keywords or browse categories below.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* What do you need help with? */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <motion.div {...fadeUp()} className="text-center mb-6">
          <p className="font-semibold text-foreground">What do you need help with?</p>
        </motion.div>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { key: "learner",  label: "I want to learn",        icon: BookOpen },
            { key: "creator",  label: "I want to sell courses",  icon: Upload },
            { key: "problem",  label: "I have a problem",        icon: Wrench },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => setUserType(key === "problem" ? null : key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-colors ${
                userType === key ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 text-foreground"
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-14">
        <motion.div {...fadeUp()} className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Browse by Category</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map(({ id, icon: Icon, title, desc, color, topics }, i) => (
            <motion.div key={id} {...fadeUp(i * 0.07)}
              className="rounded-2xl border border-border bg-white dark:bg-card shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => {
                const first = articles.find(a => a.category === id);
                if (first) setActiveArticle(first);
              }}
            >
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{title}</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{desc}</p>
              <ul className="space-y-1.5">
                {topics.map(t => (
                  <li key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ChevronRight size={11} className="text-primary shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular Articles */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14">
          <motion.div {...fadeUp()} className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">🔥 Popular Help Topics</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-3">
            {articles.map((a, i) => (
              <motion.button key={a.id} {...fadeUp(i * 0.06)}
                onClick={() => setActiveArticle(a)}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <HelpCircle size={14} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{a.title}</span>
                </div>
                <ArrowRight size={14} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Contact escalation */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <motion.div {...fadeUp()}>
            <Zap size={32} className="mx-auto mb-4 text-primary-foreground/80" />
            <h2 className="text-3xl font-bold mb-3">Still Need Help?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
              If you couldn't find what you're looking for, our support team is here to help.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild className="rounded-full px-8 bg-white text-primary hover:bg-white/90">
                <Link to="/contact">📩 Contact Support</Link>
              </Button>
              <button
                onClick={() => {
                  const btn = document.querySelector<HTMLButtonElement>('[aria-label="Open support chat"]');
                  btn?.click();
                }}
                className="rounded-full px-8 py-3 border border-white/30 text-white hover:bg-white/10 transition text-sm font-semibold"
              >
                💬 Chat with Agent
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default HelpCenter;
