/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, X, Volume2, Loader2, Sparkles, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type State = "idle" | "listening" | "thinking" | "speaking";
type Msg = { id: string; role: "user" | "ai"; text: string };
type Ctx = { userId?: string; userName?: string; role?: string; email?: string };
type Result = { reply: string; nav?: string; action?: string; cards?: Card[] };
type Card = { title: string; subtitle?: string; href?: string; badge?: string };

// ─── Speech synthesis — works on iOS Safari ──────────────────────────────────
const speakText = (raw: string, onEnd?: () => void) => {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const clean = raw
    .replace(/\*\*/g, "").replace(/\n+/g, ". ")
    .replace(/[✅❌🔔💳💰🔧👤💬📅💼🎓📤🏦🎙🧠🔊✨]/g, "")
    .replace(/\s+/g, " ").trim();
  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = 1.0; utter.pitch = 1.05; utter.volume = 1;
  const loadVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const pick = voices.find(v =>
      ["Samantha","Karen","Moira","Victoria","Google UK English Female","Fiona"].some(n => v.name.includes(n))
    ) || voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
      || voices.find(v => v.lang.startsWith("en"));
    if (pick) utter.voice = pick;
  };
  loadVoice();
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  // iOS Safari fix: must call speak inside a user gesture context
  window.speechSynthesis.speak(utter);
  // iOS Safari sometimes pauses — resume it
  setTimeout(() => { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); }, 200);
};

// ─── Brain — resolves any command ────────────────────────────────────────────
const brain = async (text: string, ctx: Ctx): Promise<Result> => {
  const q = text.toLowerCase().trim();
  const uid = ctx.userId;

  // ── Greetings ──
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|yo|sup)\b/.test(q)) {
    const name = ctx.userName?.split(" ")[0] || "";
    return { reply: `Hey${name ? ` ${name}` : ""}! I'm your Coursevia AI assistant. I can search coaches and therapists, check your bookings, navigate anywhere, answer questions, and much more. What do you need?` };
  }

  // ── What can you do ──
  if (q.includes("what can you do") || q.includes("help me") || q.includes("commands") || q.includes("capabilities")) {
    return {
      reply: "I can do everything on this site. Search coaches and therapists by specialty or location, check your bookings, wallet, payments, subscription, navigate any page, scroll, go back, and answer any question about Coursevia. Just tell me what you need.",
      cards: [
        { title: "Find a coach", subtitle: "Search by specialty" },
        { title: "My bookings", subtitle: "Upcoming sessions" },
        { title: "My wallet", subtitle: "Balance & withdrawals" },
        { title: "Navigate", subtitle: "Go to any page" },
      ],
    };
  }

  // ── Search coaches ──
  if (q.includes("find") || q.includes("search") || q.includes("look for") || q.includes("show me") || q.includes("i need a") || q.includes("i want a")) {
    const isTherapist = q.includes("therapist") || q.includes("therapy") || q.includes("mental health") || q.includes("counsell") || q.includes("psycholog");
    const isCoach = q.includes("coach") || q.includes("coaching") || q.includes("mentor") || q.includes("trainer");

    if (isTherapist || isCoach) {
      const role = isTherapist ? "therapist" : "coach";
      // Extract specialty keywords
      const specialties = ["anxiety","depression","trauma","cbt","couples","family","addiction","life","business","career","fitness","relationship","mindset","executive","leadership","parenting","nutrition","wellness"];
      const foundSpecialty = specialties.find(s => q.includes(s));
      // Extract country/location
      const locationWords = q.match(/in\s+([a-z\s]+?)(?:\s+who|\s+that|\s+with|$)/i);
      const location = locationWords?.[1]?.trim();

      try {
        let query = supabase.from("profiles").select("user_id,full_name,headline,city,country,kyc_status,is_verified,booking_price,session_price,skills,service_delivery_mode").eq("onboarding_completed", true).or(`role.eq.${role},provider_type.eq.${role}`).limit(5);
        if (location) query = query.ilike("country", `%${location}%`);
        if (foundSpecialty) query = query.or(`skills.ilike.%${foundSpecialty}%,headline.ilike.%${foundSpecialty}%,bio.ilike.%${foundSpecialty}%`);
        const { data } = await query;
        if (data && data.length > 0) {
          const cards: Card[] = (data as any[]).map(p => ({
            title: p.full_name || "Provider",
            subtitle: p.headline || (p.city ? `${p.city}, ${p.country}` : p.country) || "",
            href: `/directory/${role}s/${p.user_id}`,
            badge: (p.kyc_status === "approved" || p.is_verified) ? "Verified" : undefined,
          }));
          const count = data.length;
          return {
            reply: `I found ${count} ${role}${count > 1 ? "s" : ""}${foundSpecialty ? ` specializing in ${foundSpecialty}` : ""}${location ? ` in ${location}` : ""}. Here they are:`,
            nav: isTherapist ? "/therapists" : "/coaches",
            cards,
          };
        }
        return { reply: `I couldn't find any ${role}s matching that. Let me take you to the ${role} directory where you can search.`, nav: isTherapist ? "/therapists" : "/coaches" };
      } catch {
        return { reply: `Taking you to the ${role} directory.`, nav: isTherapist ? "/therapists" : "/coaches" };
      }
    }

    // Search courses
    if (q.includes("course") || q.includes("class") || q.includes("lesson") || q.includes("tutorial")) {
      const keyword = q.replace(/find|search|look for|show me|a |an |the |course|class|lesson|tutorial/g, "").trim();
      try {
        const { data } = await supabase.from("content_items").select("id,title,description,price").ilike("title", `%${keyword}%`).limit(4);
        if (data && data.length > 0) {
          const cards: Card[] = (data as any[]).map(c => ({ title: c.title, subtitle: c.price ? `$${c.price}` : "Free", href: `/courses/${c.id}` }));
          return { reply: `Found ${data.length} course${data.length > 1 ? "s" : ""} for you:`, cards };
        }
      } catch {}
      return { reply: "Taking you to courses.", nav: "/courses" };
    }
  }

  // ── Book a session ──
  if (q.includes("book") || q.includes("schedule") || q.includes("appointment") || q.includes("reserve")) {
    if (!uid) return { reply: "You need to sign in first to book a session. Say open login to sign in.", nav: "/login" };
    const isTherapist = q.includes("therapist") || q.includes("therapy");
    return {
      reply: `I'll take you to the ${isTherapist ? "therapist" : "coach"} directory where you can browse and book a session.`,
      nav: isTherapist ? "/therapists" : "/coaches",
    };
  }

  // ── My bookings ──
  if (q.includes("my booking") || q.includes("my session") || q.includes("upcoming session") || q.includes("next session") || q.includes("my appointment")) {
    if (!uid) return { reply: "Please sign in to see your bookings.", nav: "/login" };
    try {
      const { data } = await supabase.from("bookings").select("id,status,scheduled_at").eq("learner_id", uid).order("scheduled_at", { ascending: true }).limit(5);
      if (data && data.length > 0) {
        const upcoming = (data as any[]).filter(b => b.status === "confirmed" && new Date(b.scheduled_at) > new Date());
        if (upcoming.length > 0) {
          const next = upcoming[0];
          const d = new Date(next.scheduled_at);
          const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
          const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          return { reply: `Your next session is on ${dateStr} at ${timeStr}. You have ${upcoming.length} upcoming session${upcoming.length > 1 ? "s" : ""} in total.`, nav: "/dashboard/bookings" };
        }
        return { reply: "You have no upcoming sessions. Want me to find you a coach or therapist?", nav: "/dashboard/bookings" };
      }
      return { reply: "No bookings found. Say find a coach or find a therapist to get started.", nav: "/dashboard/bookings" };
    } catch { return { reply: "Opening your bookings.", nav: "/dashboard/bookings" }; }
  }

  // ── Wallet / balance ──
  if (q.includes("wallet") || q.includes("balance") || q.includes("my money") || q.includes("earnings") || q.includes("how much do i have") || q.includes("my funds")) {
    if (!uid) return { reply: "Please sign in to check your wallet.", nav: "/login" };
    try {
      const { data } = await supabase.from("wallets").select("balance,available_balance,pending_balance,currency").eq("user_id", uid).maybeSingle();
      if (data) {
        const w = data as any;
        return { reply: `Your wallet: ${w.available_balance || 0} dollars available, ${w.pending_balance || 0} dollars pending. Total balance is ${w.balance || 0} dollars.`, nav: "/dashboard/wallet" };
      }
    } catch {}
    return { reply: "Opening your wallet.", nav: "/dashboard/wallet" };
  }

  // ── Payments ──
  if (q.includes("my payment") || q.includes("payment history") || q.includes("what did i pay") || q.includes("my transactions") || q.includes("last payment")) {
    if (!uid) return { reply: "Please sign in to see your payments.", nav: "/login" };
    try {
      const { data } = await supabase.from("payments").select("amount,payment_type,status,created_at").eq("payer_id", uid).order("created_at", { ascending: false }).limit(3);
      if (data && data.length > 0) {
        const lines = (data as any[]).map(p => `${p.payment_type} for ${p.amount} dollars on ${new Date(p.created_at).toLocaleDateString()}`).join(", ");
        return { reply: `Your recent payments: ${lines}.`, nav: "/dashboard/payments" };
      }
      return { reply: "No payments found on your account.", nav: "/dashboard/payments" };
    } catch { return { reply: "Opening payments.", nav: "/dashboard/payments" }; }
  }

  // ── Subscription ──
  if (q.includes("subscription") || q.includes("my plan") || q.includes("membership") || q.includes("cancel plan") || q.includes("cancel subscription")) {
    if (!uid) return { reply: "Please sign in to check your subscription.", nav: "/login" };
    try {
      const { data } = await supabase.from("subscriptions").select("plan,status,ends_at").eq("user_id", uid).maybeSingle();
      if (data) {
        const s = data as any;
        const renews = s.ends_at ? ` It renews on ${new Date(s.ends_at).toLocaleDateString()}.` : "";
        return { reply: `You are on the ${s.plan} plan. Status is ${s.status}.${renews}`, nav: "/dashboard/subscription" };
      }
      return { reply: "You don't have an active subscription. Say open pricing to see plans.", nav: "/pricing" };
    } catch { return { reply: "Opening subscription.", nav: "/dashboard/subscription" }; }
  }

  // ── Account info ──
  if (q.includes("who am i") || q.includes("my account") || q.includes("my profile") || q.includes("am i logged in") || q.includes("am i signed in")) {
    if (uid) return { reply: `You are signed in as ${ctx.userName || ctx.email || "a user"}. Your role is ${ctx.role || "learner"}.` };
    return { reply: "You are not signed in. Say open login to sign in.", nav: "/login" };
  }

  // ── KYC / verification ──
  if (q.includes("kyc") || q.includes("verification") || q.includes("verify") || q.includes("identity") || q.includes("am i verified")) {
    if (!uid) return { reply: "Please sign in to check your verification status.", nav: "/login" };
    try {
      const { data } = await supabase.from("verification_requests").select("status,updated_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) {
        const k = data as any;
        const statusMap: Record<string, string> = { approved: "verified and approved", rejected: "rejected — please resubmit", pending: "under review" };
        return { reply: `Your KYC status is ${statusMap[k.status] || k.status}.`, nav: "/dashboard/kyc" };
      }
      return { reply: "No verification request found. Go to your dashboard to start KYC.", nav: "/dashboard/kyc" };
    } catch { return { reply: "Opening KYC verification.", nav: "/dashboard/kyc" }; }
  }

  // ── Refund ──
  if (q.includes("refund") || q.includes("money back") || q.includes("charged wrongly")) {
    if (!uid) return { reply: "Please sign in to request a refund.", nav: "/login" };
    try {
      const { data } = await supabase.from("payments").select("id,amount,status,payment_type,created_at").eq("payer_id", uid).eq("status", "success").order("created_at", { ascending: false }).limit(3);
      if (data && data.length > 0) {
        const eligible = (data as any[]).filter(p => Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) <= 7);
        if (eligible.length > 0) {
          return { reply: `You have ${eligible.length} payment${eligible.length > 1 ? "s" : ""} eligible for a refund. Go to Dashboard, then Payments, and click Request Refund.`, nav: "/dashboard/payments" };
        }
        return { reply: "Your payments are outside the 7-day refund window. Our team reviews exceptions. Opening payments for you.", nav: "/dashboard/payments" };
      }
      return { reply: "No payments found to refund.", nav: "/dashboard/payments" };
    } catch { return { reply: "Opening payments to request a refund.", nav: "/dashboard/payments" }; }
  }

  // ── Navigation — comprehensive ──
  const navMap: [string[], string, string][] = [
    [["home","homepage","main page","landing"], "/", "Taking you home."],
    [["course","courses","learn","learning"], "/courses", "Opening courses."],
    [["coach","coaches","coaching"], "/coaches", "Opening coaches directory."],
    [["therapist","therapists","therapy","mental health"], "/therapists", "Opening therapists directory."],
    [["creator","creators"], "/creators", "Opening creators page."],
    [["pricing","price","plans","subscription plan"], "/pricing", "Opening pricing page."],
    [["dashboard","my dashboard"], ctx.role === "coach" ? "/coach/dashboard" : ctx.role === "therapist" ? "/therapist/dashboard" : ctx.role === "creator" ? "/creator/dashboard" : "/dashboard", "Taking you to your dashboard."],
    [["login","sign in","signin"], "/login", "Opening login."],
    [["signup","sign up","register","create account"], "/signup", "Opening signup."],
    [["help","support","help center"], "/help", "Opening help center."],
    [["about","about us"], "/about", "Opening about page."],
    [["blog","articles"], "/blog", "Opening blog."],
    [["contact","contact us"], "/contact", "Opening contact page."],
    [["cart","shopping cart"], "/cart", "Opening your cart."],
    [["my booking","bookings","sessions"], "/dashboard/bookings", "Opening bookings."],
    [["messages","inbox","chat"], "/dashboard/messages", "Opening messages."],
    [["payments","payment history"], "/dashboard/payments", "Opening payments."],
    [["wallet","my wallet"], "/dashboard/wallet", "Opening wallet."],
    [["subscription","my plan"], "/dashboard/subscription", "Opening subscription."],
    [["profile","settings","my profile"], "/dashboard/profile", "Opening profile settings."],
    [["withdraw","withdrawals","payout"], ctx.role === "coach" ? "/coach/withdrawals" : ctx.role === "therapist" ? "/therapist/withdrawals" : "/creator/withdrawals", "Opening withdrawals."],
    [["faq","frequently asked"], "/faq", "Opening FAQ."],
    [["terms","terms of service"], "/terms", "Opening terms."],
    [["privacy","privacy policy"], "/privacy", "Opening privacy policy."],
    [["kyc","verification","verify"], "/dashboard/kyc", "Opening KYC."],
    [["bank","bank account","payout method"], ctx.role === "coach" ? "/coach/bank-accounts" : ctx.role === "therapist" ? "/therapist/bank-accounts" : "/creator/bank-accounts", "Opening bank accounts."],
    [["videos","video"], "/videos", "Opening videos."],
    [["notifications"], "/dashboard/notifications", "Opening notifications."],
    [["wishlist","saved"], "/dashboard/wishlist", "Opening wishlist."],
  ];

  const navTriggers = ["go to","open","take me to","navigate to","show me","i want to see","bring me to","launch"];
  if (navTriggers.some(t => q.includes(t)) || q.startsWith("open ") || q.startsWith("go to ")) {
    for (const [keywords, path, reply] of navMap) {
      if (keywords.some(k => q.includes(k))) return { reply, nav: path };
    }
  }

  // ── Scroll ──
  if (q.includes("scroll down") || q.includes("scroll more")) { window.scrollBy({ top: 500, behavior: "smooth" }); return { reply: "Scrolling down." }; }
  if (q.includes("scroll up")) { window.scrollBy({ top: -500, behavior: "smooth" }); return { reply: "Scrolling up." }; }
  if (q.includes("top") || q.includes("scroll to top")) { window.scrollTo({ top: 0, behavior: "smooth" }); return { reply: "Back to top." }; }
  if (q.includes("bottom") || q.includes("scroll to bottom")) { window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); return { reply: "Scrolled to bottom." }; }
  if (q.includes("go back") || q.includes("previous page") || q.includes("back")) { window.history.back(); return { reply: "Going back." }; }
  if (q.includes("refresh") || q.includes("reload")) { window.location.reload(); return { reply: "Refreshing." }; }

  // ── Platform knowledge ──
  if (q.includes("what is coursevia") || q.includes("about coursevia")) {
    return { reply: "Coursevia is an all-in-one platform for learning, coaching, and creating. You can buy courses, book sessions with verified coaches and therapists, and access premium video content from creators worldwide." };
  }
  if ((q.includes("how much") || q.includes("cost") || q.includes("price")) && (q.includes("plan") || q.includes("subscription") || q.includes("membership"))) {
    return { reply: "Coursevia has a free plan, a monthly plan at 10 dollars per month, and a yearly plan at 120 dollars per year. Say open pricing for full details.", nav: "/pricing" };
  }
  if (q.includes("how do i") && q.includes("upload")) return { reply: "Go to your creator dashboard and click Upload Video. Add your title, description, price, and video file, then publish." };
  if (q.includes("how do i") && q.includes("withdraw")) return { reply: "First add a bank account in your dashboard, then go to Withdrawals and enter the amount. Payouts take 3 to 5 business days." };
  if (q.includes("how do i") && q.includes("book")) return { reply: "Browse coaches or therapists, open a profile, and click Book Session. Choose a time and complete payment." };
  if (q.includes("how do i") && q.includes("cancel")) return { reply: "Go to Dashboard, then Subscription, and click Cancel Subscription. Access continues until the end of your billing period." };
  if (q.includes("how do i") && q.includes("refund")) return { reply: "Go to Dashboard, then Payments, and click Request Refund next to the payment. Refunds are reviewed within 24 to 48 hours." };
  if (q.includes("how do i") && (q.includes("become") || q.includes("join as"))) {
    const role = q.includes("therapist") ? "therapist" : q.includes("creator") ? "creator" : "coach";
    return { reply: `Sign up, select ${role} during onboarding, complete your profile, and finish KYC verification. You'll appear in the directory once verified.`, nav: "/signup" };
  }

  // ── Greetings / thanks ──
  if (/^(thanks|thank you|thx|ty|great|perfect|awesome|cool|nice)\b/.test(q)) return { reply: "You're welcome! Anything else I can help with?" };
  if (q.includes("stop") || q.includes("close") || q.includes("bye") || q.includes("goodbye") || q.includes("dismiss")) return { reply: "Goodbye! Tap the mic anytime.", action: "close" };

  // ── Smart fallback — try to navigate based on keywords ──
  for (const [keywords, path, reply] of navMap) {
    if (keywords.some(k => q.includes(k))) return { reply, nav: path };
  }

  return { reply: `I heard "${text}". I can search coaches, therapists, courses, check your account, navigate anywhere, or answer questions. What would you like to do?` };
};

// ─── Component ────────────────────────────────────────────────────────────────
const VoiceAssistant = () => {
  const navigate = useNavigate();
  const { user, profile, primaryRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [live, setLive] = useState(""); // live transcript
  const [micError, setMicError] = useState("");
  const [minimized, setMinimized] = useState(false);
  const recRef = useRef<any>(null);
  const finalRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<State>("idle");

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state; }, [state]);

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, live]);

  // Preload voices on mount
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const addMsg = (role: Msg["role"], text: string) =>
    setMsgs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }]);

  const ctx = useCallback((): Ctx => ({
    userId: user?.id,
    userName: profile?.full_name || user?.email?.split("@")[0],
    role: primaryRole || (profile?.role as string) || "learner",
    email: user?.email,
  }), [user, profile, primaryRole]);

  const respond = useCallback(async (text: string) => {
    addMsg("user", text);
    setState("thinking");
    const result = await brain(text, ctx());
    addMsg("ai", result.reply);
    if (result.cards?.length) {
      // Cards shown in UI — no extra speech needed
    }
    setState("speaking");
    if (result.nav) setTimeout(() => navigate(result.nav!), 700);
    speakText(result.reply, () => {
      setState("idle");
      if (result.action === "close") setTimeout(() => setOpen(false), 500);
    });
  }, [ctx, navigate]);

  // ── Mic — works on iOS Safari, Android Chrome, Desktop ──
  const stopListening = useCallback(() => {
    try { recRef.current?.stop(); recRef.current?.abort(); } catch {}
    recRef.current = null;
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMicError("Voice recognition not supported on this browser. Try Chrome or Safari.");
      return;
    }
    setMicError("");
    stopListening();
    window.speechSynthesis.cancel();
    finalRef.current = "";
    setLive("");

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onstart = () => setState("listening");

    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) finalRef.current += final;
      setLive(finalRef.current || interim);
    };

    rec.onspeechend = () => { try { rec.stop(); } catch {} };

    rec.onend = () => {
      const spoken = finalRef.current.trim();
      setLive("");
      finalRef.current = "";
      recRef.current = null;
      if (!spoken) { setState("idle"); return; }
      respond(spoken);
    };

    rec.onerror = (e: any) => {
      recRef.current = null;
      setLive("");
      finalRef.current = "";
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setMicError("Microphone access denied. Please allow mic access in your browser settings, then try again.");
      } else if (e.error === "no-speech") {
        setState("idle");
        return;
      } else if (e.error === "network") {
        setMicError("Network error. Check your connection and try again.");
      } else if (e.error === "aborted") {
        setState("idle");
        return;
      }
      setState("idle");
    };

    try { rec.start(); }
    catch (err: any) {
      setMicError("Could not start microphone. " + (err?.message || ""));
      setState("idle");
    }
  }, [stopListening, respond]);

  const handleMic = () => {
    if (state === "listening") { stopListening(); setState("idle"); }
    else if (state === "speaking") { window.speechSynthesis.cancel(); setState("idle"); }
    else if (state === "idle") startListening();
  };

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setMsgs([]);
    setMicError("");
    setTimeout(() => {
      const name = profile?.full_name?.split(" ")[0] || "";
      const greeting = `Hi${name ? ` ${name}` : ""}! I'm your Coursevia AI. I can search coaches and therapists, check your account, navigate anywhere, and answer any question. Tap the mic or type below.`;
      addMsg("ai", greeting);
      speakText(greeting);
    }, 200);
  };

  const handleClose = () => {
    stopListening();
    window.speechSynthesis.cancel();
    setState("idle");
    setOpen(false);
    setMsgs([]);
  };

  // Quick tap commands
  const quickCmds = ["Find a coach", "Find a therapist", "My bookings", "My wallet", "Open courses", "Help"];

  const rings = state === "listening" ? 3 : state === "speaking" ? 2 : 0;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onClick={handleOpen}
          className="fixed bottom-24 left-4 z-50 h-14 w-14 rounded-full text-white shadow-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
          aria-label="Open AI voice assistant"
        >
          <Sparkles size={22} />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }} />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed z-50 shadow-2xl"
            style={{
              bottom: 16, left: 16,
              width: "min(360px, calc(100vw - 32px))",
              borderRadius: 24,
              background: "linear-gradient(160deg, #1e1035 0%, #2d1b69 60%, #1a0f3c 100%)",
              border: "1px solid rgba(139,92,246,0.3)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
                  <Sparkles size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">Coursevia AI</p>
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: "#a78bfa" }}>
                    {state === "listening" ? "🎙 Listening..." : state === "thinking" ? "🧠 Thinking..." : state === "speaking" ? "🔊 Speaking..." : "✨ Ready"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimized(v => !v)} className="p-1.5 rounded-lg text-white/40 hover:text-white/80 transition-colors">
                  <ChevronDown size={16} className={minimized ? "rotate-180" : ""} style={{ transition: "transform 0.2s" }} />
                </button>
                <button onClick={handleClose} className="p-1.5 rounded-lg text-white/40 hover:text-white/80 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!minimized && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {/* Messages */}
                  <div className="overflow-y-auto px-3 py-3 space-y-2.5" style={{ maxHeight: 260, scrollbarWidth: "none" }}>
                    {msgs.length === 0 && (
                      <p className="text-center text-xs py-6" style={{ color: "rgba(167,139,250,0.5)" }}>Tap the mic and speak</p>
                    )}
                    {msgs.map(m => (
                      <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black"
                          style={{ background: m.role === "user" ? "#7c3aed" : "rgba(139,92,246,0.3)", color: "white" }}>
                          {m.role === "user" ? "U" : "AI"}
                        </div>
                        <div className="max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                          style={{
                            background: m.role === "user" ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.08)",
                            color: m.role === "user" ? "white" : "#e9d5ff",
                            borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                          }}>
                          {m.text}
                        </div>
                      </div>
                    ))}

                    {/* Live transcript */}
                    {live && (
                      <div className="flex gap-2 flex-row-reverse">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black" style={{ background: "#7c3aed", color: "white" }}>U</div>
                        <div className="max-w-[82%] rounded-2xl px-3 py-2 text-xs italic" style={{ background: "rgba(124,58,237,0.4)", color: "#c4b5fd", borderRadius: "16px 4px 16px 16px" }}>
                          {live}...
                        </div>
                      </div>
                    )}

                    {state === "thinking" && (
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black" style={{ background: "rgba(139,92,246,0.3)", color: "white" }}>AI</div>
                        <div className="rounded-2xl px-4 py-3 flex gap-1" style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px 16px 16px 16px" }}>
                          {[0,1,2].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "#8b5cf6", animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Mic error */}
                  {micError && (
                    <div className="mx-3 mb-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>
                      {micError}
                    </div>
                  )}

                  {/* Mic button */}
                  <div className="flex flex-col items-center gap-2 py-4 border-t border-white/10">
                    <div className="relative flex items-center justify-center">
                      {Array.from({ length: rings }).map((_, i) => (
                        <div key={i} className="absolute rounded-full animate-ping"
                          style={{ width: 56 + i * 22, height: 56 + i * 22, border: "1px solid rgba(139,92,246,0.4)", animationDelay: `${i * 0.35}s`, animationDuration: "1.6s" }} />
                      ))}
                      <button
                        onClick={handleMic}
                        className="relative z-10 h-14 w-14 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: state === "listening" ? "#ef4444" : state === "speaking" ? "#10b981" : state === "thinking" ? "#f59e0b" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                          transform: state === "listening" ? "scale(1.12)" : "scale(1)",
                          boxShadow: state === "listening" ? "0 0 30px rgba(239,68,68,0.5)" : state === "speaking" ? "0 0 30px rgba(16,185,129,0.5)" : "0 8px 32px rgba(124,58,237,0.5)",
                        }}
                      >
                        {state === "thinking" ? <Loader2 size={22} className="text-white animate-spin" />
                          : state === "speaking" ? <Volume2 size={22} className="text-white" />
                          : state === "listening" ? <MicOff size={22} className="text-white" />
                          : <Mic size={22} className="text-white" />}
                      </button>
                    </div>
                    <p className="text-[10px] font-medium" style={{ color: "#a78bfa" }}>
                      {state === "listening" ? "Tap to stop" : state === "speaking" ? "Tap to interrupt" : state === "thinking" ? "Processing..." : "Tap to speak"}
                    </p>

                    {/* Quick commands */}
                    {state === "idle" && (
                      <div className="flex flex-wrap gap-1.5 justify-center px-3 mt-1">
                        {quickCmds.map(cmd => (
                          <button key={cmd} onClick={() => respond(cmd)}
                            className="text-[10px] px-2.5 py-1 rounded-full font-medium transition-all hover:scale-105"
                            style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                            {cmd}
                          </button>
                        ))}
                      </div>
                    )}
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
