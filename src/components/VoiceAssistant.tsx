/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Coursevia AI Voice Assistant
 * - Branded with Coursevia green (#10b981)
 * - Works on iOS Safari, Android Chrome, Desktop
 * - Searches coaches, therapists, creators, courses
 * - Reads live account data from Supabase
 * - Navigates the full site by voice
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, X, Volume2, Loader2, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type VoiceState = "idle" | "listening" | "thinking" | "speaking";
type ChatMsg = { id: string; role: "user" | "ai"; text: string };
type Ctx = { uid?: string; name?: string; role?: string; email?: string };
type Result = { reply: string; nav?: string; action?: string; cards?: { title: string; sub?: string; href?: string; tag?: string }[] };

// ─── iOS Safari speech synthesis fix ─────────────────────────────────────────
const say = (raw: string, onDone?: () => void) => {
  if (!("speechSynthesis" in window)) { onDone?.(); return; }
  window.speechSynthesis.cancel();

  const clean = raw
    .replace(/\*\*/g, "")
    .replace(/\n+/g, ". ")
    .replace(/[^\x00-\x7F]/g, "") // strip emoji for TTS
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300); // keep it concise

  const u = new SpeechSynthesisUtterance(clean);
  u.rate = 1.0; u.pitch = 1.05; u.volume = 1;

  const setVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find(v => ["Samantha", "Karen", "Moira", "Victoria", "Google UK English Female"].some(n => v.name.includes(n))) ||
      voices.find(v => v.lang.startsWith("en") && /female|woman/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith("en"));
    if (pick) u.voice = pick;
  };

  setVoice();
  u.onend = () => onDone?.();
  u.onerror = () => onDone?.();

  window.speechSynthesis.speak(u);

  // iOS Safari randomly pauses — keep resuming
  const resume = setInterval(() => {
    if (!window.speechSynthesis.speaking) { clearInterval(resume); return; }
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, 250);
  setTimeout(() => clearInterval(resume), 30000);
};

// ─── Brain — understands and acts on any command ──────────────────────────────
const think = async (text: string, ctx: Ctx): Promise<Result> => {
  const q = text.toLowerCase().trim();
  const uid = ctx.uid;

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|yo)\b/.test(q)) {
    const n = ctx.name?.split(" ")[0] || "";
    return { reply: `Hey${n ? ` ${n}` : ""}! I'm Coursevia AI. I can search coaches, therapists, creators and courses, check your account, navigate anywhere, and answer any question. What do you need?` };
  }

  // ── Capabilities ───────────────────────────────────────────────────────────
  if (q.includes("what can you do") || q.includes("capabilities") || q.includes("how do you work")) {
    return {
      reply: "I can search coaches, therapists, creators and courses by name or specialty. I can check your bookings, wallet, payments, subscription and KYC status. I can navigate any page on Coursevia and answer questions about the platform.",
      cards: [
        { title: "Find a coach", sub: "Search by specialty or location" },
        { title: "Find a therapist", sub: "Mental health & wellness" },
        { title: "Browse courses", sub: "Search by topic" },
        { title: "My account", sub: "Bookings, wallet, payments" },
      ],
    };
  }

  // ── Search coaches ─────────────────────────────────────────────────────────
  const wantsCoach = q.includes("coach") || q.includes("coaching") || q.includes("mentor") || q.includes("trainer");
  const wantsTherapist = q.includes("therapist") || q.includes("therapy") || q.includes("counsell") || q.includes("psycholog") || q.includes("mental health");
  const wantsCreator = q.includes("creator") || q.includes("content creator") || q.includes("instructor");
  const wantsCourse = q.includes("course") || q.includes("class") || q.includes("lesson") || q.includes("tutorial") || q.includes("learn");

  const isSearch = q.includes("find") || q.includes("search") || q.includes("look for") || q.includes("show me") || q.includes("i need") || q.includes("i want") || q.includes("get me") || q.includes("recommend");

  if (isSearch && (wantsCoach || wantsTherapist || wantsCreator || wantsCourse)) {
    const role = wantsTherapist ? "therapist" : wantsCreator ? "creator" : wantsCoach ? "coach" : null;

    // Extract specialty
    const specialties = ["anxiety","depression","trauma","cbt","couples","family","addiction","grief","stress","ptsd","life","business","career","fitness","relationship","mindset","executive","leadership","parenting","nutrition","wellness","finance","technology","education","motivation","spirituality","productivity"];
    const specialty = specialties.find(s => q.includes(s));

    // Extract location
    const locMatch = q.match(/\bin\s+([a-z][a-z\s]{1,30}?)(?:\s+who|\s+that|\s+with|\s+for|$)/i);
    const location = locMatch?.[1]?.trim();

    if (role) {
      try {
        // Extract name — words that are capitalised or after "called/named"
        const nameMatch = q.match(/(?:called|named|find|search for|look for)\s+([a-z][a-z\s]{1,30}?)(?:\s+who|\s+that|\s+in|\s+with|$)/i);
        const nameQuery = nameMatch?.[1]?.trim();

        let dbq = supabase
          .from("profiles")
          .select("user_id,full_name,headline,city,country,kyc_status,is_verified,booking_price,session_price,skills,service_delivery_mode")
          .eq("onboarding_completed", true)
          .or(`role.eq.${role},provider_type.eq.${role}`)
          .limit(6);

        if (location) dbq = dbq.ilike("country", `%${location}%`);
        if (nameQuery && !specialty) dbq = dbq.ilike("full_name", `%${nameQuery}%`);
        if (specialty) dbq = dbq.or(`skills.ilike.%${specialty}%,headline.ilike.%${specialty}%,bio.ilike.%${specialty}%`);

        const { data } = await dbq;
        if (data && data.length > 0) {
          const cards = (data as any[]).map(p => ({
            title: p.full_name || "Provider",
            sub: [p.city, p.country].filter(Boolean).join(", ") || p.headline || "",
            href: `/directory/${role}s/${p.user_id}`,
            tag: (p.kyc_status === "approved" || p.is_verified) ? "Verified" : undefined,
          }));
          const label = specialty ? ` specializing in ${specialty}` : nameQuery ? ` named "${nameQuery}"` : "";
          const loc = location ? ` in ${location}` : "";
          return {
            reply: `Found ${data.length} ${role}${data.length > 1 ? "s" : ""}${label}${loc}. Here they are:`,
            nav: `/${role}s`,
            cards,
          };
        }
        return { reply: `No ${role}s found matching that. Taking you to the ${role} directory to search.`, nav: `/${role}s` };
      } catch {
        return { reply: `Taking you to the ${role} directory.`, nav: `/${role}s` };
      }
    }

    if (wantsCourse) {
      const keyword = q.replace(/find|search|look for|show me|i need|i want|get me|a |an |the |course|class|lesson|tutorial|learn/g, "").trim();
      try {
        const { data } = await supabase
          .from("content_items")
          .select("id,title,description,price,content_type")
          .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
          .eq("content_type", "course")
          .limit(4);
        if (data && data.length > 0) {
          const cards = (data as any[]).map(c => ({ title: c.title, sub: c.price ? `$${c.price}` : "Free", href: `/courses/${c.id}` }));
          return { reply: `Found ${data.length} course${data.length > 1 ? "s" : ""} for you:`, cards, nav: "/courses" };
        }
      } catch {}
      return { reply: "Taking you to courses.", nav: "/courses" };
    }

    if (wantsCreator) {
      const nameQ = q.replace(/find|search|look for|show me|i need|i want|creator|creators/g, "").trim();
      try {
        let dbq = supabase
          .from("profiles")
          .select("user_id,full_name,headline,country,is_verified")
          .eq("onboarding_completed", true)
          .or("role.eq.creator,provider_type.eq.creator")
          .limit(5);
        if (nameQ) dbq = dbq.ilike("full_name", `%${nameQ}%`);
        const { data } = await dbq;
        if (data && data.length > 0) {
          const cards = (data as any[]).map(p => ({ title: p.full_name || "Creator", sub: p.headline || p.country || "", href: `/profile/${p.user_id}`, tag: p.is_verified ? "Verified" : undefined }));
          return { reply: `Found ${data.length} creator${data.length > 1 ? "s" : ""}:`, cards, nav: "/creators" };
        }
      } catch {}
      return { reply: "Taking you to creators.", nav: "/creators" };
    }
  }

  // ── Book a session ─────────────────────────────────────────────────────────
  if (q.includes("book") || q.includes("schedule") || q.includes("appointment") || q.includes("reserve a session")) {
    if (!uid) return { reply: "You need to sign in first to book a session.", nav: "/login" };
    const dest = wantsTherapist ? "/therapists" : "/coaches";
    return { reply: `Taking you to the ${wantsTherapist ? "therapist" : "coach"} directory to book a session.`, nav: dest };
  }

  // ── My bookings ────────────────────────────────────────────────────────────
  if (q.includes("my booking") || q.includes("my session") || q.includes("upcoming session") || q.includes("next session") || q.includes("my appointment")) {
    if (!uid) return { reply: "Please sign in to see your bookings.", nav: "/login" };
    try {
      const { data } = await supabase.from("bookings").select("id,status,scheduled_at").eq("learner_id", uid).order("scheduled_at", { ascending: true }).limit(5);
      if (data && data.length > 0) {
        const upcoming = (data as any[]).filter(b => b.status === "confirmed" && new Date(b.scheduled_at) > new Date());
        if (upcoming.length > 0) {
          const d = new Date(upcoming[0].scheduled_at);
          return { reply: `Your next session is on ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}. You have ${upcoming.length} upcoming session${upcoming.length > 1 ? "s" : ""}.`, nav: "/dashboard/bookings" };
        }
        return { reply: "No upcoming sessions. Say find a coach or find a therapist to book one.", nav: "/dashboard/bookings" };
      }
      return { reply: "No bookings found yet.", nav: "/dashboard/bookings" };
    } catch { return { reply: "Opening your bookings.", nav: "/dashboard/bookings" }; }
  }

  // ── Wallet / balance ───────────────────────────────────────────────────────
  if (q.includes("wallet") || q.includes("balance") || q.includes("my money") || q.includes("earnings") || q.includes("how much do i have")) {
    if (!uid) return { reply: "Please sign in to check your wallet.", nav: "/login" };
    try {
      const { data } = await supabase.from("wallets").select("balance,available_balance,pending_balance").eq("user_id", uid).maybeSingle();
      if (data) {
        const w = data as any;
        return { reply: `Your wallet: $${w.available_balance || 0} available, $${w.pending_balance || 0} pending. Total $${w.balance || 0}.`, nav: "/dashboard/wallet" };
      }
    } catch {}
    return { reply: "Opening your wallet.", nav: "/dashboard/wallet" };
  }

  // ── Payments ───────────────────────────────────────────────────────────────
  if (q.includes("my payment") || q.includes("payment history") || q.includes("what did i pay") || q.includes("last payment") || q.includes("my transactions")) {
    if (!uid) return { reply: "Please sign in to see your payments.", nav: "/login" };
    try {
      const { data } = await supabase.from("payments").select("amount,payment_type,status,created_at").eq("payer_id", uid).order("created_at", { ascending: false }).limit(3);
      if (data && data.length > 0) {
        const lines = (data as any[]).map(p => `$${p.amount} for ${p.payment_type} on ${new Date(p.created_at).toLocaleDateString()}`).join(", ");
        return { reply: `Recent payments: ${lines}.`, nav: "/dashboard/payments" };
      }
      return { reply: "No payments found.", nav: "/dashboard/payments" };
    } catch { return { reply: "Opening payments.", nav: "/dashboard/payments" }; }
  }

  // ── Subscription ───────────────────────────────────────────────────────────
  if (q.includes("subscription") || q.includes("my plan") || q.includes("membership") || (q.includes("cancel") && q.includes("plan"))) {
    if (!uid) return { reply: "Please sign in to check your subscription.", nav: "/login" };
    try {
      const { data } = await supabase.from("subscriptions").select("plan,status,ends_at").eq("user_id", uid).maybeSingle();
      if (data) {
        const s = data as any;
        return { reply: `You are on the ${s.plan} plan, status: ${s.status}${s.ends_at ? `, renews ${new Date(s.ends_at).toLocaleDateString()}` : ""}.`, nav: "/dashboard/subscription" };
      }
      return { reply: "No active subscription. Say open pricing to see plans.", nav: "/pricing" };
    } catch { return { reply: "Opening subscription.", nav: "/dashboard/subscription" }; }
  }

  // ── KYC ────────────────────────────────────────────────────────────────────
  if (q.includes("kyc") || q.includes("verification") || q.includes("am i verified") || q.includes("verify my account")) {
    if (!uid) return { reply: "Please sign in to check verification.", nav: "/login" };
    try {
      const { data } = await supabase.from("verification_requests").select("status").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) {
        const map: Record<string, string> = { approved: "verified and approved", rejected: "rejected — please resubmit with clearer documents", pending: "under review, usually takes 1 to 3 business days" };
        return { reply: `Your KYC status is ${map[(data as any).status] || (data as any).status}.`, nav: "/dashboard/kyc" };
      }
      return { reply: "No verification request found. Go to your dashboard to start KYC.", nav: "/dashboard/kyc" };
    } catch { return { reply: "Opening KYC.", nav: "/dashboard/kyc" }; }
  }

  // ── Refund ─────────────────────────────────────────────────────────────────
  if (q.includes("refund") || q.includes("money back") || q.includes("charged wrongly") || q.includes("wrong charge")) {
    if (!uid) return { reply: "Please sign in to request a refund.", nav: "/login" };
    try {
      const { data } = await supabase.from("payments").select("id,amount,status,payment_type,created_at").eq("payer_id", uid).eq("status", "success").order("created_at", { ascending: false }).limit(3);
      if (data && data.length > 0) {
        const eligible = (data as any[]).filter(p => Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) <= 7);
        if (eligible.length > 0) return { reply: `You have ${eligible.length} payment${eligible.length > 1 ? "s" : ""} eligible for a refund. Go to Dashboard then Payments and click Request Refund.`, nav: "/dashboard/payments" };
        return { reply: "Your payments are outside the 7-day refund window. Our team reviews exceptions. Opening payments.", nav: "/dashboard/payments" };
      }
      return { reply: "No payments found to refund.", nav: "/dashboard/payments" };
    } catch { return { reply: "Opening payments.", nav: "/dashboard/payments" }; }
  }

  // ── Account info ───────────────────────────────────────────────────────────
  if (q.includes("who am i") || q.includes("my account") || q.includes("my profile") || q.includes("am i logged in") || q.includes("am i signed in")) {
    if (uid) return { reply: `You are signed in as ${ctx.name || ctx.email || "a user"}. Your role is ${ctx.role || "learner"}.` };
    return { reply: "You are not signed in. Say open login to sign in.", nav: "/login" };
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navMap: [string[], string, string][] = [
    [["home", "homepage", "main page", "landing page"], "/", "Taking you home."],
    [["courses", "course", "learn", "learning", "classes"], "/courses", "Opening courses."],
    [["coaches", "coach", "coaching directory"], "/coaches", "Opening coaches."],
    [["therapists", "therapist", "therapy directory"], "/therapists", "Opening therapists."],
    [["creators", "creator"], "/creators", "Opening creators."],
    [["videos", "video"], "/videos", "Opening videos."],
    [["pricing", "price", "plans", "subscription plans"], "/pricing", "Opening pricing."],
    [["dashboard", "my dashboard", "home dashboard"], ctx.role === "coach" ? "/coach/dashboard" : ctx.role === "therapist" ? "/therapist/dashboard" : ctx.role === "creator" ? "/creator/dashboard" : "/dashboard", "Opening your dashboard."],
    [["login", "sign in", "signin", "log in"], "/login", "Opening login."],
    [["signup", "sign up", "register", "create account", "create an account"], "/signup", "Opening signup."],
    [["help", "help center", "support center"], "/help", "Opening help center."],
    [["contact", "contact us", "contact page"], "/contact", "Opening contact page."],
    [["about", "about us", "about coursevia"], "/about", "Opening about page."],
    [["blog", "articles", "news"], "/blog", "Opening blog."],
    [["cart", "shopping cart", "my cart"], "/cart", "Opening cart."],
    [["bookings", "my bookings", "sessions"], "/dashboard/bookings", "Opening bookings."],
    [["messages", "inbox", "my messages"], "/dashboard/messages", "Opening messages."],
    [["payments", "payment history", "my payments"], "/dashboard/payments", "Opening payments."],
    [["wallet", "my wallet", "my balance"], "/dashboard/wallet", "Opening wallet."],
    [["subscription", "my plan", "my subscription"], "/dashboard/subscription", "Opening subscription."],
    [["profile", "my profile", "profile settings", "account settings"], "/dashboard/profile", "Opening profile."],
    [["notifications", "my notifications"], "/dashboard/notifications", "Opening notifications."],
    [["wishlist", "saved", "my wishlist"], "/dashboard/wishlist", "Opening wishlist."],
    [["withdrawals", "withdraw", "payout"], ctx.role === "coach" ? "/coach/withdrawals" : ctx.role === "therapist" ? "/therapist/withdrawals" : "/creator/withdrawals", "Opening withdrawals."],
    [["bank account", "bank accounts", "add bank", "payout method"], ctx.role === "coach" ? "/coach/bank-accounts" : ctx.role === "therapist" ? "/therapist/bank-accounts" : "/creator/bank-accounts", "Opening bank accounts."],
    [["kyc", "verification", "identity verification"], "/dashboard/kyc", "Opening KYC."],
    [["faq", "frequently asked questions"], "/faq", "Opening FAQ."],
    [["terms", "terms of service", "terms and conditions"], "/terms", "Opening terms."],
    [["privacy", "privacy policy"], "/privacy", "Opening privacy policy."],
    [["refund policy", "refund"], "/refund-policy", "Opening refund policy."],
  ];

  const navTriggers = ["go to", "open", "take me to", "navigate to", "show me", "bring me to", "launch", "i want to go to", "i want to see"];
  if (navTriggers.some(t => q.includes(t))) {
    for (const [kws, path, reply] of navMap) {
      if (kws.some(k => q.includes(k))) return { reply, nav: path };
    }
  }

  // ── Scroll / page control ──────────────────────────────────────────────────
  if (q.includes("scroll down") || q.includes("scroll more")) { window.scrollBy({ top: 500, behavior: "smooth" }); return { reply: "Scrolling down." }; }
  if (q.includes("scroll up")) { window.scrollBy({ top: -500, behavior: "smooth" }); return { reply: "Scrolling up." }; }
  if (q.includes("scroll to top") || q.includes("go to top") || q.includes("back to top")) { window.scrollTo({ top: 0, behavior: "smooth" }); return { reply: "Back to top." }; }
  if (q.includes("scroll to bottom") || q.includes("go to bottom")) { window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); return { reply: "Scrolled to bottom." }; }
  if (q.includes("go back") || q.includes("previous page") || q.includes("back")) { window.history.back(); return { reply: "Going back." }; }
  if (q.includes("refresh") || q.includes("reload")) { window.location.reload(); return { reply: "Refreshing." }; }

  // ── Platform knowledge ─────────────────────────────────────────────────────
  if (q.includes("what is coursevia") || q.includes("about coursevia") || q.includes("tell me about coursevia")) {
    return { reply: "Coursevia is an all-in-one platform for learning, coaching, and creating. You can buy courses, book sessions with verified coaches and therapists, and access premium video content from creators worldwide." };
  }
  if ((q.includes("how much") || q.includes("cost") || q.includes("price")) && (q.includes("plan") || q.includes("subscription") || q.includes("membership"))) {
    return { reply: "Coursevia has a free plan, a monthly plan at $10 per month, and a yearly plan at $120 per year. Say open pricing for full details.", nav: "/pricing" };
  }
  if (q.includes("how do i") && q.includes("upload")) return { reply: "Go to your creator dashboard and click Upload Video. Add your title, description, price, and video file, then publish." };
  if (q.includes("how do i") && q.includes("withdraw")) return { reply: "First add a bank account in your dashboard, then go to Withdrawals and enter the amount. Payouts take 3 to 5 business days." };
  if (q.includes("how do i") && q.includes("book")) return { reply: "Browse coaches or therapists, open a profile, and click Book Session. Choose a time and complete payment." };
  if (q.includes("how do i") && q.includes("cancel")) return { reply: "Go to Dashboard, then Subscription, and click Cancel Subscription. Access continues until the end of your billing period." };
  if (q.includes("how do i") && q.includes("refund")) return { reply: "Go to Dashboard, then Payments, and click Request Refund next to the payment. Refunds are reviewed within 24 to 48 hours." };
  if (q.includes("how do i") && (q.includes("become") || q.includes("join as") || q.includes("sign up as"))) {
    const r = q.includes("therapist") ? "therapist" : q.includes("creator") ? "creator" : "coach";
    return { reply: `Sign up, select ${r} during onboarding, complete your profile, and finish KYC verification. You will appear in the directory once verified.`, nav: "/signup" };
  }

  // ── Positive / close ───────────────────────────────────────────────────────
  if (/^(thanks|thank you|thx|ty|great|perfect|awesome|cool|nice|wonderful)\b/.test(q)) return { reply: "You're welcome! Anything else I can help with?" };
  if (q.includes("stop") || q.includes("close") || q.includes("bye") || q.includes("goodbye") || q.includes("dismiss") || q.includes("exit")) return { reply: "Goodbye! Tap the mic anytime.", action: "close" };

  // ── Smart keyword fallback — navigate without trigger words ───────────────
  for (const [kws, path, reply] of navMap) {
    if (kws.some(k => q.includes(k))) return { reply, nav: path };
  }

  return { reply: `I heard "${text}". I can search coaches, therapists, creators and courses, check your account, or navigate anywhere on Coursevia. What would you like?` };
};

// ─── Component ────────────────────────────────────────────────────────────────
const VoiceAssistant = () => {
  const navigate = useNavigate();
  const { user, profile, primaryRole } = useAuth();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [liveText, setLiveText] = useState("");
  const [micErr, setMicErr] = useState("");
  const [supported, setSupported] = useState(true);

  const recRef = useRef<any>(null);
  const finalRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const voiceStateRef = useRef<VoiceState>("idle");

  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, liveText]);

  // Check support & preload voices
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const addMsg = (role: ChatMsg["role"], text: string) =>
    setMsgs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }]);

  const getCtx = useCallback((): Ctx => ({
    uid: user?.id,
    name: profile?.full_name || user?.email?.split("@")[0],
    role: (primaryRole || profile?.role || "learner") as string,
    email: user?.email,
  }), [user, profile, primaryRole]);

  const respond = useCallback(async (text: string) => {
    addMsg("user", text);
    setVoiceState("thinking");
    const result = await think(text, getCtx());
    addMsg("ai", result.reply);
    setVoiceState("speaking");
    if (result.nav) setTimeout(() => navigate(result.nav!), 600);
    say(result.reply, () => {
      setVoiceState("idle");
      if (result.action === "close") setTimeout(() => setOpen(false), 400);
    });
  }, [getCtx, navigate]);

  // ── Mic — iOS Safari + Android Chrome + Desktop ───────────────────────────
  const stopMic = useCallback(() => {
    try { recRef.current?.abort(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
  }, []);

  const startMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicErr("Voice not supported. Try Chrome or Safari."); return; }

    setMicErr("");
    stopMic();
    window.speechSynthesis.cancel();
    finalRef.current = "";
    setLiveText("");

    const rec = new SR();
    // iOS Safari: continuous=false is required, interimResults may not work
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 3;
    recRef.current = rec;

    rec.onstart = () => setVoiceState("listening");

    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) finalRef.current += ` ${final}`;
      setLiveText((finalRef.current + interim).trim());
    };

    // iOS Safari fires onspeechend before onend
    rec.onspeechend = () => { try { rec.stop(); } catch {} };

    rec.onend = () => {
      const spoken = finalRef.current.trim();
      setLiveText("");
      finalRef.current = "";
      recRef.current = null;
      if (!spoken) { setVoiceState("idle"); return; }
      respond(spoken);
    };

    rec.onerror = (e: any) => {
      recRef.current = null;
      setLiveText("");
      finalRef.current = "";
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setMicErr("Microphone access denied. Go to your browser settings and allow microphone for this site.");
      } else if (e.error === "network") {
        setMicErr("Network error. Check your connection.");
      } else if (e.error === "no-speech" || e.error === "aborted") {
        // silent — user just didn't speak
      } else {
        setMicErr(`Mic error: ${e.error}. Try again.`);
      }
      setVoiceState("idle");
    };

    try {
      rec.start();
    } catch (err: any) {
      setMicErr("Could not start microphone: " + (err?.message || "unknown error"));
      setVoiceState("idle");
    }
  }, [stopMic, respond]);

  const handleMicTap = () => {
    if (voiceState === "listening") { stopMic(); setVoiceState("idle"); }
    else if (voiceState === "speaking") { window.speechSynthesis.cancel(); setVoiceState("idle"); }
    else if (voiceState === "idle") startMic();
  };

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setMsgs([]);
    setMicErr("");
    setTimeout(() => {
      const n = profile?.full_name?.split(" ")[0] || "";
      const g = `Hi${n ? ` ${n}` : ""}! I'm Coursevia AI. I can search coaches, therapists, creators and courses, check your account, and navigate anywhere. Tap the mic or use the quick buttons below.`;
      addMsg("ai", g);
      say(g);
    }, 150);
  };

  const handleClose = () => {
    stopMic();
    window.speechSynthesis.cancel();
    setVoiceState("idle");
    setOpen(false);
    setMsgs([]);
  };

  if (!supported) return null;

  const pulseCount = voiceState === "listening" ? 3 : voiceState === "speaking" ? 2 : 0;
  const GREEN = "#10b981";
  const DARK_GREEN = "#059669";
  const BG = "linear-gradient(160deg, #0a1628 0%, #0d2137 60%, #071520 100%)";

  const quickBtns = [
    "Find a coach", "Find a therapist", "Browse courses",
    "My bookings", "My wallet", "Open dashboard",
  ];

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1 }}
          onClick={handleOpen}
          aria-label="Open Coursevia AI assistant"
          className="fixed bottom-24 left-4 z-50 h-14 w-14 rounded-full flex items-center justify-center shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${GREEN}, ${DARK_GREEN})` }}
        >
          {/* Coursevia "C" logo mark */}
          <span className="text-white font-black text-xl leading-none" style={{ fontFamily: "system-ui, sans-serif" }}>C</span>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ background: GREEN }} />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.93 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed z-50"
            style={{
              bottom: 16, left: 16,
              width: "min(360px, calc(100vw - 32px))",
              borderRadius: 20,
              background: BG,
              border: `1px solid rgba(16,185,129,0.25)`,
              boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1)`,
            }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2.5">
                {/* Coursevia logo mark */}
                <div className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${GREEN}, ${DARK_GREEN})`, fontFamily: "system-ui" }}>
                  C
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">Coursevia AI</p>
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: `${GREEN}cc` }}>
                    {voiceState === "listening" ? "Listening..." : voiceState === "thinking" ? "Thinking..." : voiceState === "speaking" ? "Speaking..." : "Ready to help"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setMinimized(v => !v)} className="p-2 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                <button onClick={handleClose} className="p-2 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!minimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  {/* ── Messages ── */}
                  <div className="px-3 py-3 space-y-2.5 overflow-y-auto" style={{ maxHeight: 240, scrollbarWidth: "none" }}>
                    {msgs.length === 0 && (
                      <p className="text-center text-xs py-8" style={{ color: "rgba(16,185,129,0.4)" }}>
                        Tap the mic or a quick button below
                      </p>
                    )}

                    {msgs.map(m => (
                      <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        {/* Avatar */}
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black text-white"
                          style={{ background: m.role === "user" ? `rgba(16,185,129,0.8)` : "rgba(255,255,255,0.1)" }}>
                          {m.role === "user" ? "U" : "C"}
                        </div>
                        {/* Bubble */}
                        <div className="max-w-[82%] text-xs leading-relaxed px-3 py-2"
                          style={{
                            background: m.role === "user" ? `rgba(16,185,129,0.2)` : "rgba(255,255,255,0.06)",
                            color: m.role === "user" ? "#d1fae5" : "#e2e8f0",
                            borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                            border: m.role === "user" ? `1px solid rgba(16,185,129,0.3)` : "1px solid rgba(255,255,255,0.06)",
                          }}>
                          {m.text}
                        </div>
                      </div>
                    ))}

                    {/* Live transcript */}
                    {liveText && (
                      <div className="flex gap-2 flex-row-reverse">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black text-white" style={{ background: `rgba(16,185,129,0.8)` }}>U</div>
                        <div className="max-w-[82%] text-xs italic px-3 py-2" style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", borderRadius: "14px 4px 14px 14px", border: "1px solid rgba(16,185,129,0.2)" }}>
                          {liveText}...
                        </div>
                      </div>
                    )}

                    {/* Thinking dots */}
                    {voiceState === "thinking" && (
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black text-white" style={{ background: "rgba(255,255,255,0.1)" }}>C</div>
                        <div className="px-4 py-3 flex gap-1.5" style={{ background: "rgba(255,255,255,0.06)", borderRadius: "4px 14px 14px 14px" }}>
                          {[0,1,2].map(i => (
                            <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: GREEN, animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Mic error */}
                  {micErr && (
                    <div className="mx-3 mb-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                      {micErr}
                    </div>
                  )}

                  {/* ── Mic button ── */}
                  <div className="flex flex-col items-center gap-2 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="relative flex items-center justify-center">
                      {/* Pulse rings */}
                      {Array.from({ length: pulseCount }).map((_, i) => (
                        <div key={i} className="absolute rounded-full animate-ping"
                          style={{
                            width: 56 + i * 24, height: 56 + i * 24,
                            border: `1px solid ${voiceState === "listening" ? "rgba(239,68,68,0.4)" : `rgba(16,185,129,0.35)`}`,
                            animationDelay: `${i * 0.35}s`,
                            animationDuration: "1.6s",
                          }} />
                      ))}

                      <button
                        onClick={handleMicTap}
                        className="relative z-10 h-14 w-14 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: voiceState === "listening"
                            ? "linear-gradient(135deg, #ef4444, #dc2626)"
                            : voiceState === "speaking"
                            ? `linear-gradient(135deg, ${GREEN}, ${DARK_GREEN})`
                            : voiceState === "thinking"
                            ? "linear-gradient(135deg, #f59e0b, #d97706)"
                            : `linear-gradient(135deg, ${GREEN}, ${DARK_GREEN})`,
                          transform: voiceState === "listening" ? "scale(1.1)" : "scale(1)",
                          boxShadow: voiceState === "listening"
                            ? "0 0 32px rgba(239,68,68,0.5)"
                            : `0 8px 32px rgba(16,185,129,0.4)`,
                        }}
                      >
                        {voiceState === "thinking" ? <Loader2 size={22} className="text-white animate-spin" />
                          : voiceState === "speaking" ? <Volume2 size={22} className="text-white" />
                          : voiceState === "listening" ? <MicOff size={22} className="text-white" />
                          : <Mic size={22} className="text-white" />}
                      </button>
                    </div>

                    <p className="text-[10px] font-medium" style={{ color: `${GREEN}99` }}>
                      {voiceState === "listening" ? "Tap to stop" : voiceState === "speaking" ? "Tap to interrupt" : voiceState === "thinking" ? "Processing..." : "Tap to speak"}
                    </p>

                    {/* Quick buttons */}
                    {voiceState === "idle" && (
                      <div className="flex flex-wrap gap-1.5 justify-center px-3 mt-0.5">
                        {quickBtns.map(cmd => (
                          <button key={cmd} onClick={() => respond(cmd)}
                            className="text-[10px] px-2.5 py-1 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
                            style={{
                              background: "rgba(16,185,129,0.12)",
                              color: "#6ee7b7",
                              border: "1px solid rgba(16,185,129,0.25)",
                            }}>
                            {cmd}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Branding footer */}
                  <div className="px-4 pb-3 text-center">
                    <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                      Powered by <span style={{ color: `${GREEN}80` }}>Coursevia AI</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
