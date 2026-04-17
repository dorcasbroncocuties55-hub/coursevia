import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, X, Volume2, Loader2, Sparkles } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AssistantState = "idle" | "listening" | "thinking" | "speaking";
type Message = { id: string; role: "user" | "assistant"; text: string };

// ── Speech synthesis helper ───────────────────────────────────────────────────
const speak = (text: string, onEnd?: () => void) => {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const clean = text.replace(/\*\*/g, "").replace(/\n/g, " ").replace(/[✅❌🔔💳💰🔧👤💬📅💼🎓📤🏦]/g, "");
  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = 1.05;
  utt.pitch = 1;
  utt.volume = 1;
  // Prefer a natural voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.name.includes("Samantha") || v.name.includes("Google UK English Female") ||
    v.name.includes("Karen") || v.name.includes("Moira") || v.name.includes("Victoria")
  ) || voices.find(v => v.lang.startsWith("en") && !v.name.includes("Male"));
  if (preferred) utt.voice = preferred;
  utt.onend = () => onEnd?.();
  utt.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utt);
};

// ── Command resolver ──────────────────────────────────────────────────────────
type CommandResult = { reply: string; navigate?: string; action?: string };

const resolveCommand = async (
  text: string,
  ctx: { userId?: string; userName?: string; role?: string }
): Promise<CommandResult> => {
  const lower = text.toLowerCase().trim();

  // ── Navigation ──
  if (lower.includes("go to") || lower.includes("open") || lower.includes("take me to") || lower.includes("navigate to") || lower.includes("show me")) {
    if (lower.includes("home") || lower.includes("homepage")) return { reply: "Taking you home.", navigate: "/" };
    if (lower.includes("course")) return { reply: "Opening courses.", navigate: "/courses" };
    if (lower.includes("coach")) return { reply: "Opening coaches directory.", navigate: "/coaches" };
    if (lower.includes("therapist")) return { reply: "Opening therapists directory.", navigate: "/therapists" };
    if (lower.includes("creator")) return { reply: "Opening creators page.", navigate: "/creators" };
    if (lower.includes("pricing") || lower.includes("price") || lower.includes("plan")) return { reply: "Opening pricing page.", navigate: "/pricing" };
    if (lower.includes("dashboard")) return { reply: "Taking you to your dashboard.", navigate: ctx.role === "coach" ? "/coach/dashboard" : ctx.role === "therapist" ? "/therapist/dashboard" : ctx.role === "creator" ? "/creator/dashboard" : "/dashboard" };
    if (lower.includes("login") || lower.includes("sign in")) return { reply: "Opening login page.", navigate: "/login" };
    if (lower.includes("signup") || lower.includes("sign up") || lower.includes("register")) return { reply: "Opening signup page.", navigate: "/signup" };
    if (lower.includes("help") || lower.includes("support")) return { reply: "Opening help center.", navigate: "/help" };
    if (lower.includes("about")) return { reply: "Opening about page.", navigate: "/about" };
    if (lower.includes("blog")) return { reply: "Opening blog.", navigate: "/blog" };
    if (lower.includes("contact")) return { reply: "Opening contact page.", navigate: "/contact" };
    if (lower.includes("cart")) return { reply: "Opening your cart.", navigate: "/cart" };
    if (lower.includes("booking")) return { reply: "Opening your bookings.", navigate: "/dashboard/bookings" };
    if (lower.includes("message")) return { reply: "Opening messages.", navigate: "/dashboard/messages" };
    if (lower.includes("payment")) return { reply: "Opening payments.", navigate: "/dashboard/payments" };
    if (lower.includes("wallet")) return { reply: "Opening your wallet.", navigate: "/dashboard/wallet" };
    if (lower.includes("subscription")) return { reply: "Opening subscription page.", navigate: "/dashboard/subscription" };
    if (lower.includes("profile") || lower.includes("settings")) return { reply: "Opening profile settings.", navigate: "/dashboard/profile" };
    if (lower.includes("withdrawal") || lower.includes("withdraw")) return { reply: "Opening withdrawals.", navigate: ctx.role === "coach" ? "/coach/withdrawals" : ctx.role === "therapist" ? "/therapist/withdrawals" : "/creator/withdrawals" };
    if (lower.includes("faq")) return { reply: "Opening FAQ.", navigate: "/faq" };
    if (lower.includes("terms")) return { reply: "Opening terms of service.", navigate: "/terms" };
    if (lower.includes("privacy")) return { reply: "Opening privacy policy.", navigate: "/privacy" };
    if (lower.includes("kyc") || lower.includes("verification")) return { reply: "Opening KYC verification.", navigate: "/dashboard/kyc" };
    if (lower.includes("bank") || lower.includes("payout")) return { reply: "Opening bank accounts.", navigate: ctx.role === "coach" ? "/coach/bank-accounts" : ctx.role === "therapist" ? "/therapist/bank-accounts" : "/creator/bank-accounts" };
  }

  // ── Scroll ──
  if (lower.includes("scroll down")) { window.scrollBy({ top: 400, behavior: "smooth" }); return { reply: "Scrolling down." }; }
  if (lower.includes("scroll up")) { window.scrollBy({ top: -400, behavior: "smooth" }); return { reply: "Scrolling up." }; }
  if (lower.includes("scroll to top") || lower.includes("go to top")) { window.scrollTo({ top: 0, behavior: "smooth" }); return { reply: "Back to top." }; }
  if (lower.includes("scroll to bottom") || lower.includes("go to bottom")) { window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); return { reply: "Scrolled to bottom." }; }

  // ── Back / forward ──
  if (lower.includes("go back") || lower.includes("previous page")) { window.history.back(); return { reply: "Going back." }; }
  if (lower.includes("go forward")) { window.history.forward(); return { reply: "Going forward." }; }

  // ── Refresh ──
  if (lower.includes("refresh") || lower.includes("reload")) { window.location.reload(); return { reply: "Refreshing the page." }; }

  // ── Account info ──
  if ((lower.includes("who am i") || lower.includes("my account") || lower.includes("my name") || lower.includes("logged in")) && ctx.userId) {
    return { reply: `You are signed in as ${ctx.userName || "a user"}. Your role is ${ctx.role || "learner"}.` };
  }
  if (lower.includes("am i logged in") || lower.includes("am i signed in")) {
    return { reply: ctx.userId ? `Yes, you are signed in as ${ctx.userName || "a user"}.` : "No, you are not signed in. Say open login to sign in." };
  }

  // ── Live data queries ──
  if (lower.includes("my balance") || lower.includes("my wallet") || lower.includes("how much") && lower.includes("wallet")) {
    if (ctx.userId) {
      try {
        const { data } = await supabase.from("wallets").select("available_balance,pending_balance").eq("user_id", ctx.userId).maybeSingle();
        if (data) return { reply: `Your wallet has $${(data as any).available_balance || 0} available and $${(data as any).pending_balance || 0} pending.` };
      } catch {}
    }
    return { reply: "Please sign in to check your wallet balance." };
  }

  if (lower.includes("my booking") || lower.includes("upcoming session") || lower.includes("next session")) {
    if (ctx.userId) {
      try {
        const { data } = await supabase.from("bookings").select("status,scheduled_at").eq("learner_id", ctx.userId).eq("status", "confirmed").order("scheduled_at", { ascending: true }).limit(1).maybeSingle();
        if (data) {
          const date = new Date((data as any).scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return { reply: `Your next session is on ${date}.` };
        }
        return { reply: "You have no upcoming sessions." };
      } catch {}
    }
    return { reply: "Please sign in to check your bookings." };
  }

  if (lower.includes("my subscription") || lower.includes("my plan")) {
    if (ctx.userId) {
      try {
        const { data } = await supabase.from("subscriptions").select("plan,status,ends_at").eq("user_id", ctx.userId).maybeSingle();
        if (data) {
          const s = data as any;
          return { reply: `You are on the ${s.plan} plan. Status: ${s.status}.${s.ends_at ? ` Renews on ${new Date(s.ends_at).toLocaleDateString()}.` : ""}` };
        }
        return { reply: "You do not have an active subscription." };
      } catch {}
    }
    return { reply: "Please sign in to check your subscription." };
  }

  if (lower.includes("my payment") || lower.includes("last payment") || lower.includes("recent payment")) {
    if (ctx.userId) {
      try {
        const { data } = await supabase.from("payments").select("amount,payment_type,status,created_at").eq("payer_id", ctx.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (data) {
          const p = data as any;
          return { reply: `Your last payment was $${p.amount} for ${p.payment_type}, status: ${p.status}, on ${new Date(p.created_at).toLocaleDateString()}.` };
        }
        return { reply: "No payments found on your account." };
      } catch {}
    }
    return { reply: "Please sign in to check your payments." };
  }

  // ── Platform info ──
  if (lower.includes("what is coursevia") || lower.includes("about coursevia") || lower.includes("tell me about")) {
    return { reply: "Coursevia is an all-in-one platform for learning, coaching, and creating. You can buy courses, book sessions with coaches and therapists, and access premium video content." };
  }
  if (lower.includes("how much") && (lower.includes("cost") || lower.includes("price") || lower.includes("subscription"))) {
    return { reply: "Coursevia has a free plan, a monthly plan at $10 per month, and a yearly plan at $120 per year. Say open pricing to see full details." };
  }
  if (lower.includes("how do i") && lower.includes("refund")) {
    return { reply: "To request a refund, go to your dashboard, open payments, and click request refund next to the payment. Refunds are reviewed within 24 to 48 hours." };
  }
  if (lower.includes("how do i") && lower.includes("upload")) {
    return { reply: "To upload a course, go to your creator dashboard and click upload video. Add your title, description, price, and video file, then publish." };
  }
  if (lower.includes("how do i") && lower.includes("book")) {
    return { reply: "To book a session, browse coaches or therapists, open a profile, and click book session. Choose a time and complete the payment." };
  }
  if (lower.includes("how do i") && lower.includes("withdraw")) {
    return { reply: "To withdraw earnings, first add a bank account in your dashboard, then go to withdrawals and enter the amount. Payouts take 3 to 5 business days." };
  }

  // ── Greetings ──
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|howdy)\b/.test(lower)) {
    const name = ctx.userName?.split(" ")[0] || "";
    return { reply: `Hey${name ? ` ${name}` : ""}! I'm your Coursevia voice assistant. You can ask me to navigate anywhere, check your account, or answer questions. What would you like to do?` };
  }

  // ── Thanks ──
  if (/^(thanks|thank you|thx|ty|great|perfect|awesome)\b/.test(lower)) {
    return { reply: "You're welcome! Anything else I can help with?" };
  }

  // ── Stop / close ──
  if (lower.includes("stop") || lower.includes("close") || lower.includes("dismiss") || lower.includes("goodbye") || lower.includes("bye")) {
    return { reply: "Goodbye! Tap the mic anytime to call me back.", action: "close" };
  }

  // ── Help ──
  if (lower.includes("what can you do") || lower.includes("help") || lower.includes("commands")) {
    return { reply: "I can navigate pages, check your wallet, bookings, payments, and subscription. I can answer questions about the platform. Try saying: go to courses, what is my balance, open my dashboard, or how do I book a session." };
  }

  // ── Fallback ──
  return { reply: `I heard you say: "${text}". I'm not sure how to help with that yet. Try saying go to a page, or ask me about your account.` };
};

// ── Main Component ─────────────────────────────────────────────────────────────
const VoiceAssistant = () => {
  const navigate = useNavigate();
  const { user, profile, primaryRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AssistantState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setSupported(false); return; }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  // Preload voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const addMessage = (role: "user" | "assistant", text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role, text }]);
  };

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    stopListening();
    window.speechSynthesis.cancel();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    setState("listening");
    setTranscript("");

    recognition.onresult = (e: any) => {
      const interim = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setTranscript(interim);
    };

    recognition.onend = async () => {
      const final = transcript || "";
      setTranscript("");
      if (!final.trim()) { setState("idle"); return; }

      addMessage("user", final);
      setState("thinking");

      const ctx = {
        userId: user?.id,
        userName: profile?.full_name || user?.email?.split("@")[0],
        role: primaryRole || profile?.role || "learner",
      };

      const result = await resolveCommand(final, ctx);
      addMessage("assistant", result.reply);
      setState("speaking");

      if (result.navigate) {
        setTimeout(() => navigate(result.navigate!), 600);
      }

      speak(result.reply, () => {
        setState("idle");
        if (result.action === "close") setTimeout(() => setOpen(false), 400);
      });
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") {
        addMessage("assistant", "I didn't catch that. Tap the mic and try again.");
      } else if (e.error === "not-allowed") {
        addMessage("assistant", "Microphone access was denied. Please allow microphone access in your browser settings.");
      }
      setState("idle");
    };

    recognition.start();
  }, [transcript, user, profile, primaryRole, navigate, stopListening]);

  // Fix: use ref to always have latest transcript in onend
  const transcriptRef = useRef("");
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const handleMicClick = () => {
    if (state === "listening") {
      stopListening();
      setState("idle");
    } else if (state === "speaking") {
      window.speechSynthesis.cancel();
      setState("idle");
    } else {
      startListening();
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setMessages([]);
    setTimeout(() => {
      const greeting = `Hi${profile?.full_name ? ` ${profile.full_name.split(" ")[0]}` : ""}! I'm your Coursevia voice assistant. Tap the mic and tell me what you need.`;
      addMessage("assistant", greeting);
      speak(greeting);
    }, 300);
  };

  const handleClose = () => {
    stopListening();
    window.speechSynthesis.cancel();
    setState("idle");
    setOpen(false);
  };

  if (!supported) return null;

  const pulseRings = state === "listening" ? 3 : state === "speaking" ? 2 : 0;

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-24 left-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Open voice assistant"
          title="Voice Assistant"
        >
          <Sparkles size={22} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-6 z-50 w-[320px] sm:w-[360px] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Coursevia AI</p>
                  <p className="text-[10px] text-violet-300 font-medium">
                    {state === "listening" ? "🎙 Listening..." : state === "thinking" ? "🧠 Thinking..." : state === "speaking" ? "🔊 Speaking..." : "✨ Voice Assistant"}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="text-white/50 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="h-64 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-violet-300/60 text-xs text-center">Tap the mic and speak a command</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${m.role === "user" ? "bg-violet-500" : "bg-purple-700"}`}>
                    {m.role === "user" ? "U" : "AI"}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-tr-sm"
                      : "bg-white/10 text-violet-100 rounded-tl-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}

              {/* Live transcript */}
              {transcript && (
                <div className="flex gap-2 flex-row-reverse">
                  <div className="h-6 w-6 rounded-full bg-violet-500 flex items-center justify-center shrink-0 text-[10px] font-bold">U</div>
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-3 py-2 text-xs bg-violet-600/50 text-violet-200 italic">
                    {transcript}...
                  </div>
                </div>
              )}

              {state === "thinking" && (
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-700 flex items-center justify-center shrink-0 text-[10px] font-bold">AI</div>
                  <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Mic button */}
            <div className="flex flex-col items-center gap-3 py-5 border-t border-white/10">
              <div className="relative flex items-center justify-center">
                {/* Pulse rings */}
                {Array.from({ length: pulseRings }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-violet-400/40 animate-ping"
                    style={{
                      width: 56 + i * 20,
                      height: 56 + i * 20,
                      animationDelay: `${i * 0.3}s`,
                      animationDuration: "1.5s",
                    }}
                  />
                ))}

                <button
                  onClick={handleMicClick}
                  className={`relative z-10 h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-xl ${
                    state === "listening"
                      ? "bg-red-500 hover:bg-red-600 scale-110"
                      : state === "speaking"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : state === "thinking"
                      ? "bg-amber-500 cursor-wait"
                      : "bg-gradient-to-br from-violet-500 to-purple-600 hover:scale-105"
                  }`}
                >
                  {state === "thinking" ? (
                    <Loader2 size={22} className="text-white animate-spin" />
                  ) : state === "speaking" ? (
                    <Volume2 size={22} className="text-white" />
                  ) : state === "listening" ? (
                    <MicOff size={22} className="text-white" />
                  ) : (
                    <Mic size={22} className="text-white" />
                  )}
                </button>
              </div>

              <p className="text-[10px] text-violet-400 font-medium">
                {state === "listening" ? "Tap to stop" : state === "speaking" ? "Tap to interrupt" : state === "thinking" ? "Processing..." : "Tap to speak"}
              </p>

              {/* Quick commands */}
              {state === "idle" && (
                <div className="flex flex-wrap gap-1.5 justify-center px-4">
                  {["Go to courses", "My balance", "Open dashboard", "Help"].map(cmd => (
                    <button
                      key={cmd}
                      onClick={async () => {
                        addMessage("user", cmd);
                        setState("thinking");
                        const ctx = { userId: user?.id, userName: profile?.full_name || user?.email?.split("@")[0], role: primaryRole || profile?.role || "learner" };
                        const result = await resolveCommand(cmd, ctx);
                        addMessage("assistant", result.reply);
                        setState("speaking");
                        if (result.navigate) setTimeout(() => navigate(result.navigate!), 600);
                        speak(result.reply, () => { setState("idle"); if (result.action === "close") setTimeout(() => setOpen(false), 400); });
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-violet-200 hover:bg-white/20 transition-colors"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
