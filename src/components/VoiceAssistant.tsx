/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, X, Send, ChevronDown, Volume2 } from "lucide-react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";
type ChatMsg = { id: string; role: "user" | "ai"; text: string; cards?: Card[] };
type Card = { title: string; sub?: string; href?: string; tag?: string };
type Ctx = { uid?: string; name?: string; role?: string; email?: string };
type Result = { reply: string; nav?: string; action?: string; cards?: Card[] };

// ── ElevenLabs + browser TTS fallback ────────────────────────────────────────
const EL_KEY   = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
const EL_VOICE = (import.meta.env.VITE_ELEVENLABS_VOICE_ID as string | undefined) || "EXAVITQu4vr4xnSDxMaL";
let _audio: HTMLAudioElement | null = null;

const stopAudio = () => {
  if (_audio) { try { _audio.pause(); } catch {} _audio.src = ""; _audio = null; }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
};

const browserSay = (text: string, onDone?: () => void) => {
  if (!("speechSynthesis" in window)) { onDone?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0; u.pitch = 1.05; u.volume = 1;
  const vs = window.speechSynthesis.getVoices();
  const v = vs.find(v => ["Samantha","Karen","Moira","Victoria","Google UK English Female"].some(n => v.name.includes(n)))
    || vs.find(v => v.lang.startsWith("en") && /female/i.test(v.name))
    || vs.find(v => v.lang.startsWith("en"));
  if (v) u.voice = v;
  u.onend = () => onDone?.();
  u.onerror = () => onDone?.();
  window.speechSynthesis.speak(u);
  const t = setInterval(() => { if (!window.speechSynthesis.speaking) { clearInterval(t); return; } if (window.speechSynthesis.paused) window.speechSynthesis.resume(); }, 250);
  setTimeout(() => clearInterval(t), 30000);
};

const say = async (raw: string, onDone?: () => void) => {
  stopAudio();
  const clean = raw.replace(/\*\*/g,"").replace(/\n+/g,". ").replace(/[^\x00-\x7F]/g,"").replace(/\s+/g," ").trim().slice(0, 400);
  if (EL_KEY) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}/stream`, {
        method: "POST",
        headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" },
        body: JSON.stringify({ text: clean, model_id: "eleven_turbo_v2", voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.35, use_speaker_boost: true } }),
      });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        const a = new Audio(url);
        _audio = a;
        a.onended = () => { URL.revokeObjectURL(url); _audio = null; onDone?.(); };
        a.onerror = () => { URL.revokeObjectURL(url); _audio = null; browserSay(clean, onDone); };
        a.play().catch(() => browserSay(clean, onDone));
        return;
      }
    } catch {}
  }
  browserSay(clean, onDone);
};

// ── Waveform bars ─────────────────────────────────────────────────────────────
const Waveform = ({ active }: { active: boolean }) => (
  <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
    {[3,6,10,7,12,8,5,11,6,4,9,7,11,5,8].map((h, i) => (
      <motion.div key={i} style={{ width: 2.5, borderRadius: 2, background: "#10b981", originY: 1 }}
        animate={active ? { scaleY: [0.3, h/6, 0.3, h/4, 0.3] } : { scaleY: 0.25 }}
        transition={{ duration: 0.55 + i * 0.04, repeat: Infinity, ease: "easeInOut", delay: i * 0.04 }} />
    ))}
  </div>
);

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ state }: { state: VoiceState }) => {
  const speaking = state === "speaking";
  const listening = state === "listening";
  const thinking = state === "thinking";
  return (
    <div className="relative" style={{ width: 80, height: 80 }}>
      <motion.div className="absolute inset-0 rounded-full"
        style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
        animate={{ scale: state !== "idle" ? [1,1.06,1] : 1, opacity: state !== "idle" ? [0.7,1,0.7] : 0.6 }}
        transition={{ duration: 1.4, repeat: Infinity }} />
      <div className="absolute inset-[3px] rounded-full flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(145deg,#0d2137,#071520)" }}>
        {/* Eyes */}
        <div className="flex gap-3 mb-1">
          {[0,1].map(i => (
            <motion.div key={i} className="rounded-full" style={{ width: 9, height: 9, background: "#10b981" }}
              animate={listening ? { scaleY: [1,0.15,1] } : { scaleY: 1 }}
              transition={{ duration: 0.12, repeat: listening ? Infinity : 0, repeatDelay: 2.8, delay: i * 0.06 }} />
          ))}
        </div>
        {/* Mouth */}
        <div className="flex items-center justify-center" style={{ height: 20 }}>
          {speaking ? <Waveform active /> :
           thinking ? (
             <div className="flex gap-1">
               {[0,1,2].map(i => (
                 <motion.div key={i} className="rounded-full" style={{ width: 4, height: 4, background: "#10b981" }}
                   animate={{ y: [0,-5,0] }} transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.15 }} />
               ))}
             </div>
           ) : (
             <motion.div style={{ width: 20, height: 7, borderBottom: "2.5px solid #10b981", borderLeft: "2.5px solid #10b981", borderRight: "2.5px solid #10b981", borderRadius: "0 0 12px 12px" }}
               animate={listening ? { scaleX: [1,1.25,1] } : {}}
               transition={{ duration: 0.7, repeat: Infinity }} />
           )}
        </div>
      </div>
      {listening && (
        <motion.div className="absolute inset-0 rounded-full" style={{ border: "2px solid #ef4444" }}
          animate={{ scale: [1,1.18,1], opacity: [0.9,0.2,0.9] }} transition={{ duration: 0.9, repeat: Infinity }} />
      )}
    </div>
  );
};

// Smart intent classifier — understands natural language meaning
// Maps what people SAY to what they MEAN, regardless of exact words
const classifyIntent = (q: string): string => {
  // Navigation intents — what people say vs what they mean
  const intentMap: [RegExp, string][] = [
    // Home
    [/\b(home|main page|start|beginning|front page|landing|go back home|take me home|homepage)\b/, "home"],

    // Auth
    [/\b(log ?in|sign ?in|login page|signin|access my account|enter my account)\b/, "login"],
    [/\b(sign ?up|register|create.*(account|profile)|join|get started|new account|make.*account)\b/, "signup"],

    // Courses
    [/\b(course|courses|class|classes|lesson|lessons|tutorial|tutorials|learn something|study|education|training|programme|program)\b/, "courses"],

    // Coaches
    [/\b(coach|coaches|coaching|mentor|mentors|mentoring|trainer|trainers|life coach|business coach|career coach|executive coach|personal development)\b/, "coaches"],

    // Therapists
    [/\b(therapist|therapists|therapy|counsell|psycholog|mental health|emotional support|wellness professional|psychiatr|counselor|counsellor|talk therapy|cbt|cognitive)\b/, "therapists"],

    // Creators
    [/\b(creator|creators|instructor|instructors|content maker|video maker|teacher|educator)\b/, "creators"],

    // Videos
    [/\b(video|videos|watch|stream|media|clip|clips)\b/, "videos"],

    // Pricing
    [/\b(pric|cost|fee|fees|how much|subscription plan|membership plan|package|packages|plan|plans|afford|cheap|expensive|value)\b/, "pricing"],

    // Dashboard
    [/\b(dashboard|overview|home screen|my area|my space|control panel|my page|my hub)\b/, "dashboard"],

    // Bookings
    [/\b(booking|bookings|appointment|appointments|session|sessions|scheduled|upcoming|reservation|reservations|my schedule|booked)\b/, "my bookings"],

    // Wallet
    [/\b(wallet|balance|money|funds|earnings|income|revenue|how much.*have|available.*funds|my.*cash|my.*money|financial|finances)\b/, "wallet"],

    // Payments
    [/\b(payment|payments|paid|transaction|transactions|invoice|invoices|receipt|receipts|charge|charges|billing history|purchase history|what.*paid|payment.*history)\b/, "payments"],

    // Messages
    [/\b(message|messages|inbox|chat|chats|conversation|conversations|talk to|communicate|direct message|dm)\b/, "messages"],

    // Profile
    [/\b(profile|my profile|account settings|personal info|edit.*profile|update.*profile|my info|my details|my account|account page)\b/, "profile"],

    // Subscription
    [/\b(subscription|my plan|my membership|current plan|active plan|cancel.*plan|upgrade|downgrade|billing plan)\b/, "subscription"],

    // Notifications
    [/\b(notification|notifications|alert|alerts|updates|what.*new|any.*news|bell)\b/, "notifications"],

    // Wishlist
    [/\b(wishlist|wish list|saved|favourites|favorites|saved items|liked|bookmarked)\b/, "wishlist"],

    // Withdrawals
    [/\b(withdraw|withdrawal|withdrawals|cash out|payout|pay out|transfer.*money|get.*money|send.*money|bank transfer)\b/, "withdrawals"],

    // Bank accounts
    [/\b(bank|bank account|bank accounts|add bank|payout method|payment method|account number|routing|iban|swift)\b/, "bank account"],

    // KYC
    [/\b(kyc|verify|verified|verification|identity|id check|id verification|document|passport|prove.*identity|am i verified)\b/, "kyc"],

    // Help
    [/\b(help|support|assistance|assist|problem|issue|trouble|stuck|confused|how do i|how to|guide|faq|question)\b/, "help"],

    // Contact
    [/\b(contact|reach out|get in touch|email.*team|talk to.*team|speak to.*team|contact.*support|write to)\b/, "contact"],

    // About
    [/\b(about|about.*coursevia|who.*coursevia|what.*coursevia|company|team|mission|story)\b/, "about"],

    // Blog
    [/\b(blog|article|articles|post|posts|read|news|latest|updates)\b/, "blog"],

    // Cart
    [/\b(cart|basket|shopping cart|checkout|items.*cart|what.*cart)\b/, "cart"],

    // Services (provider)
    [/\b(service|services|my services|what.*offer|offering|offerings)\b/, "services"],

    // Calendar
    [/\b(calendar|availability|available.*times|schedule|time slots|when.*available|set.*availability)\b/, "calendar"],

    // Clients
    [/\b(client|clients|my clients|people.*booked|who.*booked|learner list)\b/, "clients"],

    // Content management
    [/\b(my content|manage.*content|my videos|uploaded|my uploads|content.*list)\b/, "content"],

    // Upload
    [/\b(upload|add.*video|add.*course|publish|create.*course|new.*video|post.*video)\b/, "upload"],

    // Analytics
    [/\b(analytics|stats|statistics|performance|views|revenue.*stats|how.*performing|insights)\b/, "analytics"],

    // Reviews
    [/\b(review|reviews|rating|ratings|feedback|testimonial|what.*people.*say|my.*rating)\b/, "reviews"],

    // Refund policy
    [/\b(refund policy|refund.*terms|return policy|money back.*policy)\b/, "refund policy"],

    // Terms
    [/\b(terms|terms of service|terms and conditions|legal|tos)\b/, "terms"],

    // Privacy
    [/\b(privacy|privacy policy|data.*policy|gdpr|my data|data protection)\b/, "privacy"],
  ];

  for (const [pattern, intent] of intentMap) {
    if (pattern.test(q)) return intent;
  }
  return "";
};

const think = async (text: string, ctx: Ctx): Promise<Result> => {
  const q = text.toLowerCase().trim();
  const uid = ctx.uid;

  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|yo)\b/.test(q)) {
    const n = ctx.name?.split(" ")[0] || "";
    return { reply: `Hey${n ? ` ${n}` : ""}! I'm Coursevia AI. I can search coaches, therapists, creators and courses, check your account, navigate anywhere, and answer any question. What do you need?` };
  }
  if (q.includes("what can you do") || q.includes("capabilities") || q.includes("how do you work")) {
    return { reply: "I can search coaches, therapists, creators and courses by name or specialty. I can check your bookings, wallet, payments, subscription and KYC. I can navigate any page and answer questions about Coursevia.", cards: [{ title: "Find a coach" }, { title: "Find a therapist" }, { title: "Browse courses" }, { title: "My account" }] };
  }

  const wantsCoach = /\b(coach|coaching|mentor|trainer|life coach|business coach|career coach|executive|leadership|mindset|fitness coach|relationship coach|parenting coach)\b/.test(q);
  const wantsTherapist = /\b(therapist|therapy|counsell|psycholog|mental health|emotional|wellness|psychiatr|cbt|cognitive|anxiety|depression|trauma|grief|stress|ptsd|couples therapy|family therapy)\b/.test(q);
  const wantsCreator = /\b(creator|instructor|content maker|teacher|educator|video creator)\b/.test(q);
  const wantsCourse = /\b(course|class|lesson|tutorial|learn|study|training|programme|program|certification|certificate)\b/.test(q);
  const isSearch = /\b(find|search|look for|show|need|want|get|recommend|suggest|who|where|any|looking for|seeking|i want to|i need|can you find|help me find|discover|browse)\b/.test(q);

  if (isSearch && (wantsCoach || wantsTherapist || wantsCreator || wantsCourse)) {
    const role = wantsTherapist ? "therapist" : wantsCreator ? "creator" : wantsCoach ? "coach" : null;
    const specialties = ["anxiety","depression","trauma","cbt","couples","family","addiction","grief","stress","ptsd","life","business","career","fitness","relationship","mindset","executive","leadership","parenting","nutrition","wellness","finance","technology","education","motivation","spirituality","productivity"];
    const specialty = specialties.find(s => q.includes(s));
    const locMatch = q.match(/\bin\s+([a-z][a-z\s]{1,30}?)(?:\s+who|\s+that|\s+with|\s+for|$)/i);
    const location = locMatch?.[1]?.trim();
    const nameMatch = q.match(/(?:called|named|find|search for|look for)\s+([a-z][a-z\s]{1,30}?)(?:\s+who|\s+that|\s+in|\s+with|$)/i);
    const nameQuery = nameMatch?.[1]?.trim();

    if (role) {
      try {
        let dbq = supabase.from("profiles").select("user_id,full_name,headline,city,country,kyc_status,is_verified,booking_price,session_price,skills,service_delivery_mode").eq("onboarding_completed", true).or(`role.eq.${role},provider_type.eq.${role}`).limit(6);
        if (location) dbq = dbq.ilike("country", `%${location}%`);
        if (nameQuery && !specialty) dbq = dbq.ilike("full_name", `%${nameQuery}%`);
        if (specialty) dbq = dbq.or(`skills.ilike.%${specialty}%,headline.ilike.%${specialty}%,bio.ilike.%${specialty}%`);
        const { data } = await dbq;
        if (data && data.length > 0) {
          const cards = (data as any[]).map(p => ({ title: p.full_name || "Provider", sub: [p.city, p.country].filter(Boolean).join(", ") || p.headline || "", href: `/directory/${role}/${p.user_id}`, tag: (p.kyc_status === "approved" || p.is_verified) ? "Verified" : undefined }));
          const label = specialty ? ` specializing in ${specialty}` : nameQuery ? ` named "${nameQuery}"` : "";
          const loc = location ? ` in ${location}` : "";
          return { reply: `Found ${data.length} ${role}${data.length > 1 ? "s" : ""}${label}${loc}:`, nav: `/${role}s`, cards };
        }
        return { reply: `No ${role}s found matching that. Taking you to the ${role} directory.`, nav: `/${role}s` };
      } catch { return { reply: `Taking you to the ${role} directory.`, nav: `/${role}s` }; }
    }
    if (wantsCourse) {
      const keyword = q.replace(/find|search|look for|show me|i need|i want|get me|a |an |the |course|class|lesson|tutorial|learn/g, "").trim();
      try {
        const { data } = await supabase.from("content_items").select("id,title,description,price,content_type").or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`).eq("content_type", "course").limit(4);
        if (data && data.length > 0) {
          return { reply: `Found ${data.length} course${data.length > 1 ? "s" : ""}:`, cards: (data as any[]).map(c => ({ title: c.title, sub: c.price ? `$${c.price}` : "Free", href: `/courses/${c.id}` })), nav: "/courses" };
        }
      } catch {}
      return { reply: "Taking you to courses.", nav: "/courses" };
    }
    if (wantsCreator) {
      const nameQ = q.replace(/find|search|look for|show me|i need|i want|creator|creators/g, "").trim();
      try {
        let dbq = supabase.from("profiles").select("user_id,full_name,headline,country,is_verified").eq("onboarding_completed", true).or("role.eq.creator,provider_type.eq.creator").limit(5);
        if (nameQ) dbq = dbq.ilike("full_name", `%${nameQ}%`);
        const { data } = await dbq;
        if (data && data.length > 0) return { reply: `Found ${data.length} creator${data.length > 1 ? "s" : ""}:`, cards: (data as any[]).map(p => ({ title: p.full_name || "Creator", sub: p.headline || p.country || "", href: `/profile/${p.user_id}`, tag: p.is_verified ? "Verified" : undefined })), nav: "/creators" };
      } catch {}
      return { reply: "Taking you to creators.", nav: "/creators" };
    }
  }

  if (/\b(book|schedule|appointment|reserve|set up.*session|arrange.*session|i want to book|can i book|how do i book)\b/.test(q)) {
    if (!uid) return { reply: "You need to sign in first to book a session.", nav: "/login" };
    return { reply: `Taking you to the ${wantsTherapist ? "therapist" : "coach"} directory to book.`, nav: wantsTherapist ? "/therapists" : "/coaches" };
  }
  if (/\b(my booking|my session|upcoming session|next session|my appointment|when.*session|scheduled session|booked session|what.*booked)\b/.test(q)) {
    if (!uid) return { reply: "Please sign in to see your bookings.", nav: "/login" };
    try {
      const { data } = await supabase.from("bookings").select("id,status,scheduled_at").eq("learner_id", uid).order("scheduled_at", { ascending: true }).limit(5);
      if (data && data.length > 0) {
        const upcoming = (data as any[]).filter(b => b.status === "confirmed" && new Date(b.scheduled_at) > new Date());
        if (upcoming.length > 0) { const d = new Date(upcoming[0].scheduled_at); return { reply: `Your next session is on ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}. You have ${upcoming.length} upcoming session${upcoming.length > 1 ? "s" : ""}.`, nav: "/dashboard/bookings" }; }
        return { reply: "No upcoming sessions. Say find a coach or find a therapist to book one.", nav: "/dashboard/bookings" };
      }
      return { reply: "No bookings found yet.", nav: "/dashboard/bookings" };
    } catch { return { reply: "Opening your bookings.", nav: "/dashboard/bookings" }; }
  }
  if (/\b(wallet|balance|my money|earnings|income|how much.*have|available.*funds|my.*cash|my.*balance|what.*balance|check.*balance|funds|my.*earnings)\b/.test(q)) {
    if (!uid) return { reply: "Please sign in to check your wallet.", nav: "/login" };
    try {
      const { data } = await supabase.from("wallets").select("balance,available_balance,pending_balance").eq("user_id", uid).maybeSingle();
      if (data) { const w = data as any; return { reply: `Your wallet: $${w.available_balance || 0} available, $${w.pending_balance || 0} pending. Total $${w.balance || 0}.`, nav: "/dashboard/wallet" }; }
    } catch {}
    return { reply: "Opening your wallet.", nav: "/dashboard/wallet" };
  }
  if (/\b(my payment|payment history|last payment|my transactions|what.*paid|recent.*payment|payment.*record|billing history|purchase history)\b/.test(q)) {
    if (!uid) return { reply: "Please sign in to see your payments.", nav: "/login" };
    try {
      const { data } = await supabase.from("payments").select("amount,payment_type,status,created_at").eq("payer_id", uid).order("created_at", { ascending: false }).limit(3);
      if (data && data.length > 0) return { reply: `Recent payments: ${(data as any[]).map(p => `$${p.amount} for ${p.payment_type} on ${new Date(p.created_at).toLocaleDateString()}`).join(", ")}.`, nav: "/dashboard/payments" };
      return { reply: "No payments found.", nav: "/dashboard/payments" };
    } catch { return { reply: "Opening payments.", nav: "/dashboard/payments" }; }
  }
  if (/\b(subscription|my plan|membership|current plan|active plan|what plan|which plan|am i subscribed|my subscription)\b/.test(q)) {
    if (!uid) return { reply: "Please sign in to check your subscription.", nav: "/login" };
    try {
      const { data } = await supabase.from("subscriptions").select("plan,status,ends_at").eq("user_id", uid).maybeSingle();
      if (data) { const s = data as any; return { reply: `You are on the ${s.plan} plan, status: ${s.status}${s.ends_at ? `, renews ${new Date(s.ends_at).toLocaleDateString()}` : ""}.`, nav: "/dashboard/subscription" }; }
      return { reply: "No active subscription. Say open pricing to see plans.", nav: "/pricing" };
    } catch { return { reply: "Opening subscription.", nav: "/dashboard/subscription" }; }
  }
  if (/\b(kyc|verify|verified|verification|identity|id check|am i verified|my verification|document.*status|check.*verification)\b/.test(q)) {
    if (!uid) return { reply: "Please sign in to check verification.", nav: "/login" };
    try {
      const { data } = await supabase.from("verification_requests").select("status").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) { const map: Record<string,string> = { approved: "verified and approved", rejected: "rejected — please resubmit", pending: "under review" }; return { reply: `Your KYC status is ${map[(data as any).status] || (data as any).status}.`, nav: "/dashboard/kyc" }; }
      return { reply: "No verification request found. Go to your dashboard to start KYC.", nav: "/dashboard/kyc" };
    } catch { return { reply: "Opening KYC.", nav: "/dashboard/kyc" }; }
  }
  if (/\b(refund|money back|charged wrongly|wrong charge|overcharged|dispute|get.*money back|want.*refund|request.*refund)\b/.test(q)) {
    if (!uid) return { reply: "Please sign in to request a refund.", nav: "/login" };
    try {
      const { data } = await supabase.from("payments").select("id,amount,status,payment_type,created_at").eq("payer_id", uid).eq("status", "success").order("created_at", { ascending: false }).limit(3);
      if (data && data.length > 0) {
        const eligible = (data as any[]).filter(p => Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) <= 7);
        if (eligible.length > 0) return { reply: `You have ${eligible.length} payment${eligible.length > 1 ? "s" : ""} eligible for a refund. Go to Dashboard then Payments and click Request Refund.`, nav: "/dashboard/payments" };
        return { reply: "Your payments are outside the 7-day refund window. Our team reviews exceptions.", nav: "/dashboard/payments" };
      }
      return { reply: "No payments found to refund.", nav: "/dashboard/payments" };
    } catch { return { reply: "Opening payments.", nav: "/dashboard/payments" }; }
  }
  if (/\b(who am i|my account|am i logged in|am i signed in|my profile info|what.*my account|check.*account|account details|my details)\b/.test(q)) {
    if (uid) return { reply: `You are signed in as ${ctx.name || ctx.email || "a user"}. Your role is ${ctx.role || "learner"}.` };
    return { reply: "You are not signed in. Say open login to sign in.", nav: "/login" };
  }

  // Role-aware path helper
  const rp = (learner: string, coach: string, therapist: string, creator: string) =>
    ctx.role === "coach" ? coach : ctx.role === "therapist" ? therapist : ctx.role === "creator" ? creator : learner;

  const navMap: [string[], string, string][] = [
    [["home","homepage","main page","landing","landing page"], "/", "Taking you home."],
    [["courses","course","all courses","browse courses"], "/courses", "Opening courses."],
    [["coaches","coach","coaching directory","find coaches","all coaches"], "/coaches", "Opening coaches."],
    [["therapists","therapist","therapy directory","find therapists","all therapists"], "/therapists", "Opening therapists."],
    [["creators","creator","all creators","browse creators"], "/creators", "Opening creators."],
    [["videos","video","all videos","browse videos"], "/videos", "Opening videos."],
    [["pricing","price","plans","subscription plans","packages"], "/pricing", "Opening pricing."],
    [["dashboard","my dashboard","home dashboard","overview"], rp("/dashboard","/coach/dashboard","/therapist/dashboard","/creator/dashboard"), "Opening your dashboard."],
    [["login","sign in","log in","signin"], "/login", "Opening login."],
    [["signup","sign up","register","create account","create an account","join"], "/signup", "Opening signup."],
    [["help","help center","support center","help page"], "/help", "Opening help center."],
    [["contact","contact us","contact page","reach us"], "/contact", "Opening contact page."],
    [["about","about us","about coursevia","about page"], "/about", "Opening about page."],
    [["blog","articles","news","posts"], "/blog", "Opening blog."],
    [["cart","shopping cart","my cart","checkout cart"], "/cart", "Opening cart."],
    [["my bookings","bookings","my sessions","sessions","appointments"], rp("/dashboard/bookings","/coach/bookings","/therapist/bookings","/dashboard/bookings"), "Opening bookings."],
    [["messages","inbox","my messages","chats"], rp("/dashboard/messages","/coach/messages","/therapist/messages","/creator/messages"), "Opening messages."],
    [["payments","payment history","my payments","transactions"], "/dashboard/payments", "Opening payments."],
    [["wallet","my wallet","my balance","earnings"], rp("/dashboard/wallet","/coach/wallet","/therapist/wallet","/creator/wallet"), "Opening wallet."],
    [["subscription","my plan","my subscription","membership"], "/dashboard/subscription", "Opening subscription."],
    [["profile","my profile","profile settings","account settings","edit profile"], rp("/dashboard/profile","/coach/profile","/therapist/profile","/dashboard/profile"), "Opening profile."],
    [["notifications","my notifications","alerts"], "/dashboard/notifications", "Opening notifications."],
    [["wishlist","saved","my wishlist","favourites"], "/dashboard/wishlist", "Opening wishlist."],
    [["withdrawals","withdraw","payout","my withdrawals","cash out"], rp("/dashboard","/coach/withdrawals","/therapist/withdrawals","/creator/withdrawals"), "Opening withdrawals."],
    [["bank account","bank accounts","add bank","payout method","banking"], rp("/dashboard","/coach/bank-accounts","/therapist/bank-accounts","/creator/bank-accounts"), "Opening bank accounts."],
    [["kyc","verification","identity verification","verify account"], rp("/dashboard/kyc","/coach/kyc","/therapist/kyc","/dashboard/kyc"), "Opening KYC."],
    [["services","my services","service list"], rp("/dashboard","/coach/services","/therapist/services","/dashboard"), "Opening services."],
    [["calendar","my calendar","availability","schedule"], rp("/dashboard","/coach/calendar","/therapist/calendar","/dashboard"), "Opening calendar."],
    [["clients","my clients","client list"], rp("/dashboard","/coach/clients","/therapist/clients","/dashboard"), "Opening clients."],
    [["content","my content","my videos","uploaded content"], rp("/dashboard","/coach/content","/therapist/content","/creator/content"), "Opening content."],
    [["upload","upload video","upload course","add video"], rp("/dashboard","/coach/upload-video","/therapist/upload-video","/creator/upload-video"), "Opening upload."],
    [["analytics","my analytics","stats","statistics"], rp("/dashboard","/dashboard","/dashboard","/creator/analytics"), "Opening analytics."],
    [["reviews","my reviews","ratings"], rp("/dashboard","/coach/reviews","/dashboard","/dashboard"), "Opening reviews."],
    [["faq","frequently asked questions","common questions"], "/faq", "Opening FAQ."],
    [["terms","terms of service","terms and conditions"], "/terms", "Opening terms."],
    [["privacy","privacy policy"], "/privacy", "Opening privacy policy."],
    [["refund policy","refund"], "/refund-policy", "Opening refund policy."],
  ];

  // Match with or without trigger words — covers "go to X", "open X", "take me to X", and just "X"
  const navTriggers = ["go to","open","take me to","navigate to","show me","bring me to","launch","i want to go to","i want to see","i want to open","navigate","visit"];
  const hasNavTrigger = navTriggers.some(t => q.includes(t));

  // Try with trigger first (more precise), then without (catches bare keywords)
  if (hasNavTrigger) {
    for (const [kws, path, reply] of navMap) {
      if (kws.some(k => q.includes(k))) return { reply, nav: path };
    }
  }

  if (/\b(scroll down|scroll more|go down|move down|page down)\b/.test(q)) { window.scrollBy({ top: 500, behavior: "smooth" }); return { reply: "Scrolling down." }; }
  if (/\b(scroll up|go up|move up|page up)\b/.test(q)) { window.scrollBy({ top: -500, behavior: "smooth" }); return { reply: "Scrolling up." }; }
  if (/\b(scroll to top|back to top|go to top|top of page|beginning of page)\b/.test(q)) { window.scrollTo({ top: 0, behavior: "smooth" }); return { reply: "Back to top." }; }
  if (/\b(go back|previous page|last page|back)\b/.test(q)) { window.history.back(); return { reply: "Going back." }; }
  if (/\b(refresh|reload|update page)\b/.test(q)) { window.location.reload(); return { reply: "Refreshing." }; }

  if (/\b(what is coursevia|about coursevia|tell me about coursevia|what does coursevia do|explain coursevia|coursevia.*platform)\b/.test(q)) return { reply: "Coursevia is an all-in-one platform for learning, coaching, and creating. You can buy courses, book sessions with verified coaches and therapists, and access premium video content from creators worldwide." };
  if (/\b(how much|cost|price|fee|subscription.*cost|plan.*cost|what.*plan.*cost|afford|pricing)\b/.test(q) && /\b(plan|subscription|membership|monthly|yearly|annual)\b/.test(q)) return { reply: "Coursevia has a free plan, a monthly plan at $10 per month, and a yearly plan at $120 per year. Say open pricing for full details.", nav: "/pricing" };
  if (/\b(how.*upload|upload.*course|how.*add.*video|how.*publish|how.*create.*course)\b/.test(q)) return { reply: "Go to your creator dashboard and click Upload Video. Add your title, description, price, and video file, then publish." };
  if (/\b(how.*withdraw|how.*get.*money|how.*cash out|how.*payout|how.*transfer.*earnings)\b/.test(q)) return { reply: "First add a bank account in your dashboard, then go to Withdrawals and enter the amount. Payouts take 3 to 5 business days." };
  if (/\b(how.*book|how.*schedule|how.*reserve|how.*get.*session|how.*find.*coach|how.*find.*therapist)\b/.test(q)) return { reply: "Browse coaches or therapists, open a profile, and click Book Session. Choose a time and complete payment." };
  if (/\b(how.*cancel|how.*stop.*subscription|how.*end.*plan|how.*unsubscribe)\b/.test(q)) return { reply: "Go to Dashboard, then Subscription, and click Cancel Subscription. Access continues until the end of your billing period." };
  if (/\b(how.*refund|how.*get.*money back|how.*request.*refund|how.*dispute)\b/.test(q)) return { reply: "Go to Dashboard, then Payments, and click Request Refund next to the payment. Refunds are reviewed within 24 to 48 hours." };
  if (/\b(how.*become|how.*join as|how.*sign up as|how.*register as|how.*be a coach|how.*be a therapist|how.*be a creator)\b/.test(q)) {
    const r = /therapist/.test(q) ? "therapist" : /creator/.test(q) ? "creator" : "coach";
    return { reply: `Sign up, select ${r} during onboarding, complete your profile, and finish KYC verification. You will appear in the directory once verified.`, nav: "/signup" };
  }

  if (/^(thanks|thank you|thx|ty|great|perfect|awesome|cool|nice|wonderful|brilliant)\b/.test(q)) return { reply: "You're welcome! Anything else I can help with?" };
  if (/\b(stop|close|bye|goodbye|dismiss|exit|quit|done|that's all|no thanks)\b/.test(q)) return { reply: "Goodbye! Tap the mic anytime.", action: "close" };

  // Smart intent matching — understands meaning not just keywords
  const intent = classifyIntent(q);
  if (intent) {
    for (const [kws, path, reply] of navMap) {
      if (kws.some(k => intent.includes(k))) return { reply, nav: path };
    }
  }

  // Bare keyword fallback
  for (const [kws, path, reply] of navMap) { if (kws.some(k => q.includes(k))) return { reply, nav: path }; }

  return { reply: `I'm not sure I understood that. Could you rephrase? For example: "find me a life coach", "show my bookings", "take me to pricing", or "what's my wallet balance".` };
};

// ── Component ─────────────────────────────────────────────────────────────────
const VoiceAssistant = () => {
  const navigate = useNavigate();
  const { user, profile, primaryRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [liveText, setLiveText] = useState("");
  const [textInput, setTextInput] = useState("");
  const [micErr, setMicErr] = useState("");
  const [muted, setMuted] = useState(false);

  // Draggable position
  const [pos, setPos] = useState({ x: 16, y: -100 }); // bottom-left by default
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const recRef = useRef<any>(null);
  const finalRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const msgsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom — works on iOS Safari
  useEffect(() => {
    const el = msgsContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, liveText]);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    // Default position: bottom-left
    setPos({ x: 16, y: window.innerHeight - 120 });
  }, []);

  // Drag handlers — mouse + touch
  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button,input")) return;
    dragging.current = true;
    const client = "touches" in e ? e.touches[0] : e;
    dragStart.current = { mx: client.clientX, my: client.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const client = "touches" in e ? (e as TouchEvent).touches[0] : e as MouseEvent;
      const dx = client.clientX - dragStart.current.mx;
      const dy = client.clientY - dragStart.current.my;
      const newX = Math.max(0, Math.min(window.innerWidth - 60, dragStart.current.px + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + dy));
      setPos({ x: newX, y: newY });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [pos]);

  const addMsg = (role: ChatMsg["role"], text: string, cards?: Card[]) =>
    setMsgs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text, cards }]);

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
    addMsg("ai", result.reply, result.cards);
    setVoiceState("speaking");
    if (result.nav) setTimeout(() => navigate(result.nav!), 700);
    if (muted) { setVoiceState("idle"); if (result.action === "close") setTimeout(() => setOpen(false), 400); return; }
    await say(result.reply, () => {
      setVoiceState("idle");
      if (result.action === "close") setTimeout(() => setOpen(false), 400);
    });
  }, [getCtx, navigate, muted]);

  const stopMic = useCallback(() => {
    try { recRef.current?.abort(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
  }, []);

  const startMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicErr("Voice not supported. Use the text box below."); return; }
    setMicErr(""); stopMic(); stopAudio();
    finalRef.current = ""; setLiveText("");
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = "en-US"; rec.maxAlternatives = 3;
    recRef.current = rec;
    rec.onstart = () => setVoiceState("listening");
    rec.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (final) finalRef.current += ` ${final}`;
      setLiveText((finalRef.current + interim).trim());
    };
    rec.onspeechend = () => { try { rec.stop(); } catch {} };
    rec.onend = () => {
      const spoken = finalRef.current.trim();
      setLiveText(""); finalRef.current = ""; recRef.current = null;
      if (!spoken) { setVoiceState("idle"); return; }
      respond(spoken);
    };
    rec.onerror = (e: any) => {
      recRef.current = null; setLiveText(""); finalRef.current = "";
      if (e.error === "not-allowed" || e.error === "permission-denied") setMicErr("Microphone access denied. Allow mic in browser settings.");
      else if (e.error === "network") setMicErr("Network error. Check your connection.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setMicErr(`Mic error: ${e.error}`);
      setVoiceState("idle");
    };
    try { rec.start(); } catch (err: any) { setMicErr("Could not start mic: " + (err?.message || "")); setVoiceState("idle"); }
  }, [stopMic, respond]);

  const handleMicTap = () => {
    if (voiceState === "listening") { stopMic(); setVoiceState("idle"); }
    else if (voiceState === "speaking") { stopAudio(); setVoiceState("idle"); }
    else if (voiceState === "idle") startMic();
  };

  const handleTextSend = () => {
    const t = textInput.trim();
    if (!t || voiceState === "thinking") return;
    setTextInput("");
    respond(t);
  };

  const handleOpen = () => {
    setOpen(true); setMinimized(false); setMsgs([]); setMicErr("");
    setTimeout(() => {
      const n = profile?.full_name?.split(" ")[0] || "";
      const g = `Hi${n ? ` ${n}` : ""}! I'm Coursevia AI Assistant. Let me know if you need help.`;
      addMsg("ai", g);
      if (!muted) say(g);
    }, 150);
  };

  const handleClose = () => { stopMic(); stopAudio(); setVoiceState("idle"); setOpen(false); setMsgs([]); };

  const G = "#10b981"; const DG = "#059669";
  const quickBtns = ["Find a coach", "Find a therapist", "Browse courses", "My bookings", "My wallet", "Open dashboard"];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1.2 }}
          onClick={handleOpen} aria-label="Open Coursevia AI"
          className="fixed bottom-24 left-4 z-50 h-14 w-14 rounded-full flex items-center justify-center shadow-2xl"
          style={{ background: `linear-gradient(135deg,${G},${DG})` }}
        >
          <span className="text-white font-black text-xl" style={{ fontFamily: "system-ui" }}>C</span>
          <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: G }} />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.92 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed z-50"
            style={{ bottom: 16, left: 16, width: "min(370px, calc(100vw - 32px))", borderRadius: 22, background: "linear-gradient(160deg,#0a1628 0%,#0d2137 60%,#071520 100%)", border: `1px solid rgba(16,185,129,0.2)`, boxShadow: `0 28px 72px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,185,129,0.08)` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3">
                <Avatar state={voiceState} />
                <div>
                  <p className="text-sm font-bold text-white">Coursevia AI</p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: `${G}cc` }}>
                    {voiceState === "listening" ? "Listening..." : voiceState === "thinking" ? "Thinking..." : voiceState === "speaking" ? "Speaking..." : "Ready to help"}
                  </p>
                  {voiceState === "speaking" && <div className="mt-1"><Waveform active /></div>}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => { setMuted(v => !v); if (!muted) stopAudio(); }} className="p-2 rounded-lg transition-colors" style={{ color: muted ? "#ef4444" : "rgba(255,255,255,0.4)" }} title={muted ? "Unmute" : "Mute"}>
                  <Volume2 size={14} />
                </button>
                <button onClick={() => setMinimized(v => !v)} className="p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <ChevronDown size={14} style={{ transform: minimized ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                <button onClick={handleClose} className="p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!minimized && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>

                  {/* Messages */}
                  <div
                    className="px-3 py-3 space-y-2.5 overflow-y-auto cv-scroll"
                    ref={msgsContainerRef}
                    style={{
                      maxHeight: 260,
                      minHeight: 80,
                      overflowY: "auto",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {msgs.length === 0 && <p className="text-center text-xs py-8" style={{ color: "rgba(16,185,129,0.35)" }}>Tap the mic or type below</p>}
                    {msgs.map(m => (
                      <div key={m.id}>
                        <div className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black text-white"
                            style={{ background: m.role === "user" ? `rgba(16,185,129,0.8)` : "rgba(255,255,255,0.1)" }}>
                            {m.role === "user" ? "U" : "C"}
                          </div>
                          <div className="max-w-[82%] text-xs leading-relaxed px-3 py-2"
                            style={{ background: m.role === "user" ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.06)", color: m.role === "user" ? "#d1fae5" : "#e2e8f0", borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", border: m.role === "user" ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.06)" }}>
                            {m.text}
                          </div>
                        </div>
                        {/* Result cards */}
                        {m.cards && m.cards.length > 0 && (
                          <div className="ml-8 mt-2 space-y-1.5">
                            {m.cards.map((c, i) => (
                              <button key={i} onClick={() => c.href && navigate(c.href)}
                                className="w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition-all hover:scale-[1.01]"
                                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <div>
                                  <p className="text-xs font-semibold text-white">{c.title}</p>
                                  {c.sub && <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{c.sub}</p>}
                                </div>
                                {c.tag && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0" style={{ background: "rgba(16,185,129,0.25)", color: G }}>{c.tag}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {liveText && (
                      <div className="flex gap-2 flex-row-reverse">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black text-white" style={{ background: "rgba(16,185,129,0.8)" }}>U</div>
                        <div className="max-w-[82%] text-xs italic px-3 py-2" style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", borderRadius: "14px 4px 14px 14px", border: "1px solid rgba(16,185,129,0.2)" }}>{liveText}...</div>
                      </div>
                    )}
                    {voiceState === "thinking" && (
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black text-white" style={{ background: "rgba(255,255,255,0.1)" }}>C</div>
                        <div className="px-4 py-3 flex gap-1.5" style={{ background: "rgba(255,255,255,0.06)", borderRadius: "4px 14px 14px 14px" }}>
                          {[0,1,2].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: G, animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {micErr && <div className="mx-3 mb-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>{micErr}</div>}

                  {/* Mic */}
                  <div className="flex flex-col items-center gap-2 pt-3 pb-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="relative flex items-center justify-center">
                      {(voiceState === "listening" ? 3 : voiceState === "speaking" ? 2 : 0) > 0 && Array.from({ length: voiceState === "listening" ? 3 : 2 }).map((_, i) => (
                        <div key={i} className="absolute rounded-full animate-ping"
                          style={{ width: 56 + i * 24, height: 56 + i * 24, border: `1px solid ${voiceState === "listening" ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.35)"}`, animationDelay: `${i * 0.35}s`, animationDuration: "1.6s" }} />
                      ))}
                      <button onClick={handleMicTap} className="relative z-10 h-14 w-14 rounded-full flex items-center justify-center transition-all"
                        style={{ background: voiceState === "listening" ? "linear-gradient(135deg,#ef4444,#dc2626)" : voiceState === "speaking" ? `linear-gradient(135deg,${G},${DG})` : voiceState === "thinking" ? "linear-gradient(135deg,#f59e0b,#d97706)" : `linear-gradient(135deg,${G},${DG})`, transform: voiceState === "listening" ? "scale(1.1)" : "scale(1)", boxShadow: voiceState === "listening" ? "0 0 32px rgba(239,68,68,0.5)" : `0 8px 32px rgba(16,185,129,0.4)` }}>
                        {voiceState === "thinking" ? <Loader2 size={22} className="text-white animate-spin" /> : voiceState === "speaking" ? <Volume2 size={22} className="text-white" /> : voiceState === "listening" ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
                      </button>
                    </div>
                    <p className="text-[10px] font-medium" style={{ color: `${G}99` }}>
                      {voiceState === "listening" ? "Tap to stop" : voiceState === "speaking" ? "Tap to interrupt" : voiceState === "thinking" ? "Processing..." : "Tap to speak"}
                    </p>
                    {voiceState === "idle" && (
                      <div className="flex flex-wrap gap-1.5 justify-center px-3">
                        {quickBtns.map(cmd => (
                          <button key={cmd} onClick={() => respond(cmd)} className="text-[10px] px-2.5 py-1 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
                            style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.25)" }}>
                            {cmd}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Text input */}
                  <div className="px-3 pb-3 flex gap-2">
                    <input
                      value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleTextSend()}
                      placeholder="Or type your question..."
                      className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
                      style={{ background: "rgba(255,255,255,0.07)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", fontSize: 13 }}
                    />
                    <button onClick={handleTextSend} disabled={!textInput.trim() || voiceState === "thinking"}
                      className="h-9 w-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                      style={{ background: `linear-gradient(135deg,${G},${DG})` }}>
                      <Send size={14} className="text-white" />
                    </button>
                  </div>

                  <div className="pb-2 text-center">
                    <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.18)" }}>Powered by <span style={{ color: `${G}70` }}>Coursevia AI</span> {EL_KEY ? "· ElevenLabs Voice" : ""}</p>
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
