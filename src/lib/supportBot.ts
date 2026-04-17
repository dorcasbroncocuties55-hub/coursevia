import { supabase } from "@/integrations/supabase/client";

export type BotContext = { userId?: string; userEmail?: string; userName?: string };
export type BotResult = { text: string; action?: string; resolved?: boolean };

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const daysAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const dateStr = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ── main resolver ─────────────────────────────────────────────────────────────
export const getIntelligentReply = async (
  msg: string,
  ctx: BotContext,
  history: { role: string; text: string }[] = []
): Promise<BotResult> => {
  const lower = msg.toLowerCase().trim();
  const uid = ctx.userId;

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|sup|yo)\b/.test(lower)) {
    const name = ctx.userName?.split(" ")[0] || "";
    const greeting = ["morning","afternoon","evening"].find(t => lower.includes(t));
    return {
      text: `Good ${greeting || "day"}${name ? `, ${name}` : ""}! 👋 I'm Coursevia's AI assistant.\n\nI can:\n✅ Look up your payments, bookings & account\n✅ Cancel subscriptions instantly\n✅ Submit refund requests on your behalf\n✅ Fix access issues\n✅ Answer any question about the platform\n\nWhat can I help you with today?`,
    };
  }

  // ── What can you do / capabilities ────────────────────────────────────────
  if (lower.includes("what can you do") || lower.includes("what do you do") || lower.includes("help me") || lower.includes("capabilities")) {
    return {
      text: `Here's everything I can do for you:\n\n💳 **Billing** — Check payments, invoices, charges\n💰 **Refunds** — Submit refund requests, check eligibility\n🔐 **Account** — Password reset, profile issues, access problems\n📚 **Courses** — Access issues, purchase verification\n📅 **Bookings** — View sessions, check status\n💼 **Wallet** — Check balance, explain pending funds\n🔄 **Subscriptions** — Check plan, cancel, upgrade info\n🎓 **KYC** — Verification status, resubmission guide\n📤 **Uploads** — Creator upload troubleshooting\n\nJust describe your problem in plain English and I'll handle it!`,
    };
  }

  // ── Account info / profile ─────────────────────────────────────────────────
  if ((lower.includes("my account") || lower.includes("my profile") || lower.includes("account info") || lower.includes("who am i")) && uid) {
    try {
      const { data: profile } = await supabase.from("profiles").select("full_name,email,role,country,created_at,onboarding_completed").eq("user_id", uid).maybeSingle();
      if (profile) {
        const p = profile as any;
        return {
          text: `Here's your account info:\n\n👤 **Name:** ${p.full_name || "Not set"}\n📧 **Email:** ${p.email || ctx.userEmail || "Not set"}\n🎭 **Role:** ${p.role || "learner"}\n🌍 **Country:** ${p.country || "Not set"}\n📅 **Joined:** ${p.created_at ? dateStr(p.created_at) : "Unknown"}\n✅ **Onboarding:** ${p.onboarding_completed ? "Complete" : "Incomplete"}\n\nNeed to update anything?`,
          resolved: true,
        };
      }
    } catch {}
  }

  // ── Payment history ────────────────────────────────────────────────────────
  if ((lower.includes("my payment") || lower.includes("payment history") || lower.includes("what did i pay") || lower.includes("my transactions") || lower.includes("my purchases")) && uid) {
    try {
      const { data: payments } = await supabase.from("payments").select("id,amount,payment_type,status,created_at").eq("payer_id", uid).order("created_at", { ascending: false }).limit(5);
      if (payments && payments.length > 0) {
        const lines = (payments as any[]).map(p => `• ${dateStr(p.created_at)} — ${fmt(p.amount)} (${p.payment_type}) — ${p.status}`).join("\n");
        return { text: `Your last ${payments.length} payment${payments.length > 1 ? "s" : ""}:\n\n${lines}\n\nNeed help with any of these?`, resolved: true };
      } else {
        return { text: "I don't see any payments on your account yet. If you believe you were charged, please describe the issue and I'll investigate.", resolved: true };
      }
    } catch {}
  }

  // ── Refund ─────────────────────────────────────────────────────────────────
  if (lower.includes("refund") || lower.includes("money back") || lower.includes("charged wrongly") || lower.includes("wrong charge") || lower.includes("reimburse")) {
    if (uid) {
      try {
        const { data: payments } = await supabase.from("payments").select("id,amount,status,payment_type,created_at").eq("payer_id", uid).eq("status", "success").order("created_at", { ascending: false }).limit(5);
        if (payments && payments.length > 0) {
          const eligible = (payments as any[]).filter(p => daysAgo(p.created_at) <= 7);
          if (eligible.length > 0) {
            const lines = eligible.map(p => `• ${dateStr(p.created_at)} — ${fmt(p.amount)} (${p.payment_type})`).join("\n");
            return {
              text: `I found ${eligible.length} payment${eligible.length > 1 ? "s" : ""} eligible for a refund (within 7 days):\n\n${lines}\n\nTo request a refund:\n1. Go to **Dashboard → Payments**\n2. Click **"Request Refund"** next to the payment\n3. Select a reason and submit\n\nOur team reviews within 24–48 hours. Want me to connect you directly with our Refunds team to expedite this?`,
            };
          } else {
            const latest = payments[0] as any;
            return {
              text: `Your last payment was ${daysAgo(latest.created_at)} days ago (${fmt(latest.amount)}) — outside the standard 7-day refund window.\n\nHowever, we review exceptions on a case-by-case basis. I'm connecting you with our Refunds team now who can review your situation.`,
              action: "escalate_refunds",
            };
          }
        } else {
          return { text: "I don't see any completed payments on your account to refund. If you believe you were charged, please share the payment reference or amount and I'll look into it." };
        }
      } catch {}
    }
    return { text: "To request a refund, go to **Dashboard → Payments** and click 'Request Refund'. Refunds are reviewed within 24–48 hours.\n\nAre you signed in? If so, I can look up your payments directly and check eligibility." };
  }

  // ── Cancel subscription ────────────────────────────────────────────────────
  if ((lower.includes("cancel") && (lower.includes("subscription") || lower.includes("plan") || lower.includes("membership"))) || lower.includes("cancel my plan")) {
    if (uid) {
      try {
        const { data: sub } = await supabase.from("subscriptions").select("id,plan,status,ends_at").eq("user_id", uid).maybeSingle();
        if (sub && (sub as any).status === "active") {
          const s = sub as any;
          return {
            text: `I found your active **${s.plan}** subscription${s.ends_at ? ` (renews ${dateStr(s.ends_at)})` : ""}.\n\nTo cancel:\n1. Go to **Dashboard → Subscription**\n2. Click **"Cancel subscription"**\n3. Confirm — access continues until ${s.ends_at ? dateStr(s.ends_at) : "the end of your billing period"}\n\nWould you like me to connect you with Billing to process this immediately?`,
          };
        } else {
          return { text: "I don't see an active subscription on your account. If you believe you're being charged, please share the details and I'll investigate.", resolved: true };
        }
      } catch {}
    }
    return { text: "To cancel your subscription, go to **Dashboard → Subscription** and click 'Cancel subscription'. Access continues until the end of your billing period." };
  }

  // ── Subscription status ────────────────────────────────────────────────────
  if (lower.includes("subscription") || lower.includes("my plan") || lower.includes("membership")) {
    if (uid) {
      try {
        const { data: sub } = await supabase.from("subscriptions").select("plan,status,ends_at,created_at").eq("user_id", uid).maybeSingle();
        if (sub) {
          const s = sub as any;
          return {
            text: `Your subscription details:\n\n📋 **Plan:** ${s.plan || "Unknown"}\n✅ **Status:** ${s.status}\n📅 **Started:** ${s.created_at ? dateStr(s.created_at) : "Unknown"}\n🔄 **Renews/Expires:** ${s.ends_at ? dateStr(s.ends_at) : "Unknown"}\n\nManage it at **Dashboard → Subscription**. Need to cancel or upgrade?`,
            resolved: true,
          };
        } else {
          return { text: "You don't have an active subscription. Visit **Pricing** to see available plans and unlock member benefits.", resolved: true };
        }
      } catch {}
    }
    return { text: "Manage your subscription at **Dashboard → Subscription**. You can cancel anytime — access continues until the billing period ends." };
  }

  // ── Password / login ───────────────────────────────────────────────────────
  if (lower.includes("password") || lower.includes("forgot") || lower.includes("can't log in") || lower.includes("cant login") || lower.includes("locked out") || lower.includes("sign in issue")) {
    if (uid) {
      return {
        text: `You're currently signed in, so your account is active. ✅\n\nIf you need to change your password:\n1. Go to **Dashboard → Profile Settings**\n2. Click **"Change Password"**\n\nOr if you're locked out on another device:\n1. Go to the login page\n2. Click **"Forgot Password"**\n3. Enter **${ctx.userEmail || "your email"}**\n4. Check your inbox for the reset link (expires in 1 hour)\n\nStill having trouble?`,
        resolved: true,
      };
    }
    return {
      text: `To reset your password:\n1. Go to the **login page**\n2. Click **"Forgot Password"**\n3. Enter your email address\n4. Check your inbox and spam folder for the reset link\n\nThe link expires in 1 hour. If you don't receive it within 5 minutes, check your spam folder or try again.\n\nStill locked out? I can connect you with our Account team.`,
    };
  }

  // ── Course access ──────────────────────────────────────────────────────────
  if (lower.includes("course") && (lower.includes("access") || lower.includes("not showing") || lower.includes("can't find") || lower.includes("missing") || lower.includes("purchased"))) {
    if (uid) {
      try {
        const { data: purchases } = await supabase.from("payments").select("id,amount,payment_type,status,created_at").eq("payer_id", uid).in("payment_type", ["course", "video"]).order("created_at", { ascending: false }).limit(10);
        const successful = (purchases as any[] || []).filter(p => p.status === "success");
        if (successful.length > 0) {
          return {
            text: `I can see ${successful.length} content purchase${successful.length > 1 ? "s" : ""} on your account. ✅\n\nIf a course isn't showing in your dashboard:\n1. Go to **Dashboard → My Courses**\n2. Try **logging out and back in** to refresh your session\n3. Clear your browser cache (Ctrl+Shift+Delete)\n4. Try a different browser\n\nIf it's still missing after these steps, I'll escalate to our Technical team with your purchase details. Want me to do that?`,
          };
        } else {
          const pending = (purchases as any[] || []).filter(p => p.status === "pending");
          if (pending.length > 0) {
            return { text: `I can see a pending payment on your account. Payments usually process within a few minutes. Please wait 5–10 minutes and check again.\n\nIf it's still not showing after 30 minutes, I'll connect you with our Billing team.` };
          }
          return { text: `I don't see any completed course purchases on your account. If you believe you were charged, please share the payment amount or reference and I'll investigate immediately.` };
        }
      } catch {}
    }
    return { text: "To access your courses, go to **Dashboard → My Courses**. If a purchased course isn't showing, try logging out and back in. Still having issues? I can connect you with our Technical team." };
  }

  // ── Booking issues ─────────────────────────────────────────────────────────
  if (lower.includes("booking") || lower.includes("session") || lower.includes("appointment") || lower.includes("scheduled")) {
    if (uid) {
      try {
        const { data: bookings } = await supabase.from("bookings").select("id,status,scheduled_at,created_at").eq("learner_id", uid).order("created_at", { ascending: false }).limit(5);
        if (bookings && bookings.length > 0) {
          const upcoming = (bookings as any[]).filter(b => b.status === "confirmed" && new Date(b.scheduled_at) > new Date());
          const lines = (bookings as any[]).slice(0, 3).map(b => `• ${dateStr(b.scheduled_at)} — ${b.status}`).join("\n");
          return {
            text: `Your bookings:\n\n${lines}\n\n${upcoming.length > 0 ? `You have ${upcoming.length} upcoming session${upcoming.length > 1 ? "s" : ""}. ` : ""}Manage all bookings at **Dashboard → Bookings**.\n\nWhat's the specific issue with your booking?`,
            resolved: true,
          };
        } else {
          return { text: "I don't see any bookings on your account. To book a session, browse coaches or therapists and click 'Book Session' on their profile.", resolved: true };
        }
      } catch {}
    }
    return { text: "For booking issues, go to **Dashboard → Bookings**. You can view, manage, and join sessions from there. Need more help?" };
  }

  // ── Wallet / earnings ──────────────────────────────────────────────────────
  if (lower.includes("wallet") || lower.includes("balance") || lower.includes("earnings") || lower.includes("withdraw") || lower.includes("payout") || lower.includes("pending funds")) {
    if (uid) {
      try {
        const { data: wallet } = await supabase.from("wallets").select("balance,available_balance,pending_balance,currency").eq("user_id", uid).maybeSingle();
        if (wallet) {
          const w = wallet as any;
          return {
            text: `Your wallet:\n\n💰 **Available:** ${fmt(w.available_balance)} (ready to withdraw)\n⏳ **Pending:** ${fmt(w.pending_balance)} (releases after 8 days)\n📊 **Total:** ${fmt(w.balance)}\n\nTo withdraw:\n1. **Dashboard → Bank Accounts** — add your bank if not done\n2. **Dashboard → Withdrawals** — enter amount\n\nPayouts take 3–5 business days. Pending funds release automatically after 8 days from the transaction date.`,
            resolved: true,
          };
        }
      } catch {}
    }
    return { text: "To check your wallet, go to **Dashboard → Wallet**. To withdraw, go to **Dashboard → Withdrawals** (you'll need a bank account added first)." };
  }

  // ── KYC / verification ─────────────────────────────────────────────────────
  if (lower.includes("kyc") || lower.includes("verification") || lower.includes("verify") || lower.includes("identity") || lower.includes("not verified") || lower.includes("rejected")) {
    if (uid) {
      try {
        const { data: kyc } = await supabase.from("verification_requests").select("status,provider,created_at,updated_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (kyc) {
          const k = kyc as any;
          const statusMsg: Record<string, string> = {
            approved: "✅ Your identity is verified! You can receive payouts.",
            rejected: "❌ Your verification was rejected. You can resubmit with clearer documents.",
            pending: "⏳ Your verification is under review (1–3 business days).",
          };
          return {
            text: `KYC Status: ${statusMsg[k.status] || `Status: ${k.status}`}\n\nLast updated: ${dateStr(k.updated_at || k.created_at)}\n\n${k.status === "rejected" ? "To resubmit: **Dashboard → KYC Verification** → upload clearer ID documents." : k.status === "pending" ? "No action needed — we'll notify you when it's done." : ""}`,
            resolved: k.status === "approved",
          };
        }
      } catch {}
    }
    return {
      text: `KYC (identity verification) is required for coaches, therapists, and creators to receive payouts.\n\nTo complete verification:\n1. Go to **Dashboard → KYC Verification**\n2. Submit your government-issued ID\n3. Wait 1–3 business days for approval\n\nIf rejected, resubmit with clearer, well-lit photos of your ID.`,
    };
  }

  // ── Upload / creator issues ────────────────────────────────────────────────
  if (lower.includes("upload") || lower.includes("publish") || (lower.includes("video") && (lower.includes("not") || lower.includes("fail") || lower.includes("error")))) {
    return {
      text: `To upload content:\n1. **Creator Dashboard → Upload Video**\n2. Add title, description, and price\n3. Upload your video (MP4/MOV, max 2GB)\n4. Click **Publish**\n\n**Common upload issues:**\n• File too large → compress to under 2GB\n• Wrong format → use MP4 or MOV\n• Upload stuck → refresh and try again\n• Video not showing → wait 5–10 mins for processing\n\nStill failing? Tell me the exact error message and I'll help.`,
    };
  }

  // ── Bank account ───────────────────────────────────────────────────────────
  if (lower.includes("bank") || lower.includes("add bank") || lower.includes("payout method") || lower.includes("bank account")) {
    return {
      text: `To add a bank account:\n1. Go to **Dashboard → Bank Accounts**\n2. Click **"Add Bank Account"** or **"Connect via Stripe"**\n3. Enter your bank details\n\n**Stripe Connect** (recommended) — verified by Stripe, supports 40+ countries, fastest payouts.\n\n**Manual bank** — enter account number, routing/SWIFT, and country.\n\nOnce added, go to **Dashboard → Withdrawals** to request a payout.`,
      resolved: true,
    };
  }

  // ── Pricing / how much ─────────────────────────────────────────────────────
  if (lower.includes("how much") || lower.includes("pricing") || lower.includes("price") || lower.includes("cost") || lower.includes("fee") || lower.includes("commission")) {
    return {
      text: `Coursevia pricing:\n\n**For Learners:**\n• Free — browse, preview content\n• Monthly plan — $10/month (member discounts + priority support)\n• Yearly plan — $120/year (enhanced discounts)\n\n**For Creators/Coaches/Therapists:**\n• Free to join\n• Platform takes a small fee per transaction\n• You keep the majority of your earnings\n• Payouts after 8-day escrow period\n\nSee full details at **/pricing**.`,
      resolved: true,
    };
  }

  // ── How to become a coach/therapist/creator ────────────────────────────────
  if (lower.includes("become a coach") || lower.includes("become a therapist") || lower.includes("become a creator") || lower.includes("how to join") || lower.includes("sign up as")) {
    const role = lower.includes("therapist") ? "therapist" : lower.includes("creator") ? "creator" : "coach";
    return {
      text: `To become a ${role} on Coursevia:\n\n1. **Sign up** at /signup\n2. During onboarding, select **"${role.charAt(0).toUpperCase() + role.slice(1)}"** as your role\n3. Complete your profile (bio, specialization, photo)\n4. Complete **KYC verification** (required to receive payments)\n5. Set up your services/content\n6. You'll appear in the ${role} directory once verified\n\nThe whole process takes about 10–15 minutes. Need help with any step?`,
      resolved: true,
    };
  }

  // ── Video playback ─────────────────────────────────────────────────────────
  if (lower.includes("video") && (lower.includes("play") || lower.includes("watch") || lower.includes("buffer") || lower.includes("load") || lower.includes("stuck"))) {
    return {
      text: `Video playback troubleshooting:\n\n1. **Check internet** — video needs at least 5 Mbps\n2. **Lower quality** — click the settings icon on the player\n3. **Clear cache** — Ctrl+Shift+Delete → clear cached images/files\n4. **Disable extensions** — especially ad blockers\n5. **Try another browser** — Chrome or Firefox work best\n6. **Try another device** — rules out device-specific issues\n\nIf the video still won't play after all these steps, tell me the course name and I'll escalate to our Technical team.`,
    };
  }

  // ── Messages / messaging ───────────────────────────────────────────────────
  if (lower.includes("message") || lower.includes("chat") || lower.includes("contact") || lower.includes("inbox")) {
    return {
      text: `To message a coach, therapist, or creator:\n1. Go to their profile\n2. Click **"Message"**\n3. Your conversation appears in **Dashboard → Messages**\n\n**Note:** Direct messaging requires a Learner Plus subscription. Free accounts can message after booking a session.\n\nHaving trouble with messages? Tell me more.`,
    };
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  if (lower.includes("notification") || lower.includes("email") && lower.includes("not receiving")) {
    return {
      text: `If you're not receiving notifications:\n\n1. Check your **spam/junk folder**\n2. Add **support@coursevia.com** to your contacts\n3. Go to **Dashboard → Notifications** to check your settings\n4. Make sure your email address is correct in **Profile Settings**\n\nFor in-app notifications, make sure your browser allows notifications from coursevia.site.`,
      resolved: true,
    };
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  if (lower.includes("delete") && (lower.includes("account") || lower.includes("profile"))) {
    return {
      text: `To delete your account:\n\n1. Go to **Dashboard → Profile Settings**\n2. Scroll to the bottom\n3. Click **"Delete Account"**\n\n⚠️ **Important:** Account deletion is permanent. All your data, purchases, and earnings will be removed. Make sure to withdraw any available balance first.\n\nIf you're having issues with the platform, I might be able to help fix them before you decide to delete. What's the underlying problem?`,
    };
  }

  // ── Onboarding stuck ───────────────────────────────────────────────────────
  if (lower.includes("onboarding") || lower.includes("stuck") || lower.includes("setup") || lower.includes("complete profile")) {
    return {
      text: `If you're stuck on onboarding:\n\n1. **Refresh the page** and try again\n2. Make sure all required fields are filled\n3. For photo upload — use JPG/PNG under 5MB\n4. For phone number — include your country code\n\nIf onboarding keeps failing, try:\n• A different browser\n• Clearing your cache\n• Signing out and back in\n\nStill stuck? Tell me which step you're on and I'll help you through it.`,
    };
  }

  // ── Earning / how to make money ────────────────────────────────────────────
  if (lower.includes("how to earn") || lower.includes("make money") || lower.includes("how do i get paid") || lower.includes("how does payment work")) {
    return {
      text: `How earnings work on Coursevia:\n\n**For Creators/Coaches/Therapists:**\n1. Set your prices for content/sessions\n2. When a learner pays, funds go into escrow\n3. After 8 days, your share moves to your wallet\n4. Withdraw to your bank anytime\n\n**Payout timeline:**\n• Day 0 — Learner pays\n• Day 8 — Funds available in your wallet\n• Day 8–13 — Withdraw to bank\n• Day 11–16 — Money in your bank account\n\nMake sure you've completed KYC and added a bank account to receive payouts.`,
      resolved: true,
    };
  }

  // ── Contact / speak to human ───────────────────────────────────────────────
  if (lower.includes("speak to") || lower.includes("talk to") || lower.includes("human") || lower.includes("real person") || lower.includes("agent") || lower.includes("support team")) {
    return {
      text: `Of course! I'll connect you with a human agent right now. 👨‍💻\n\nWhich department do you need?\n• 💳 Billing & Payments\n• 💰 Refunds\n• 🔧 Technical Support\n• 👤 Account & Security\n\nOr just click one of the department buttons above and I'll route you there instantly.`,
    };
  }

  // ── Positive feedback ──────────────────────────────────────────────────────
  if (/^(thanks|thank you|thx|ty|great|perfect|awesome|solved|got it|ok|okay|cool|nice|wonderful|excellent)\b/.test(lower)) {
    return { text: "You're welcome! 😊 Is there anything else I can help you with today?", resolved: true };
  }

  // ── Negative / frustrated ──────────────────────────────────────────────────
  if (lower.includes("this is terrible") || lower.includes("worst") || lower.includes("useless") || lower.includes("not helpful") || lower.includes("frustrated") || lower.includes("angry")) {
    return {
      text: `I'm really sorry you're having a frustrating experience. 😔 That's not what we want at all.\n\nLet me connect you with a human agent right now who can give you their full attention and resolve this properly.\n\nCan you briefly describe what went wrong so I can brief the agent before they join?`,
      action: "escalate_general",
    };
  }

  // ── Generic fallback with smart routing ───────────────────────────────────
  const dept = detectDepartment(msg);
  const deptLabel = DEPARTMENTS.find(d => d.id === dept)?.label || "Support";

  // Try to give a useful answer even for vague questions
  if (lower.length < 15) {
    return {
      text: `I want to help! Could you give me a bit more detail about your issue?\n\nFor example:\n• "I can't access my course"\n• "I want a refund for my payment"\n• "My video won't play"\n• "I can't log in"\n\nOr click one of the department buttons above to go straight to the right team.`,
    };
  }

  return {
    text: `I understand you're having an issue. Based on your message, this looks like a **${deptLabel}** matter.\n\nHere's what I can do right now:\n• Look up your account data\n• Check your payments and bookings\n• Guide you through the fix step by step\n\nCould you tell me:\n1. What exactly happened?\n2. When did it start?\n3. What were you trying to do?\n\nOr I can connect you directly with our ${deptLabel} team — just say "connect me" or click the department button above.`,
  };
};

export const DEPARTMENTS = [
  { id: "billing",   label: "💳 Billing",    keywords: ["payment","pay","charge","invoice","billing","subscription","plan","cancel","refund","money","price","cost","fee"] },
  { id: "technical", label: "🔧 Technical",  keywords: ["error","bug","crash","not working","broken","loading","blank","slow","video","playback","upload","fail"] },
  { id: "refunds",   label: "💰 Refunds",    keywords: ["refund","money back","return","reimburse","chargeback"] },
  { id: "account",   label: "👤 Account",    keywords: ["account","login","password","email","profile","delete","banned","locked","access","sign in","sign up"] },
  { id: "general",   label: "💬 General",    keywords: [] },
];

export const detectDepartment = (text: string): string => {
  const lower = text.toLowerCase();
  for (const dept of DEPARTMENTS) {
    if (dept.keywords.some(k => lower.includes(k))) return dept.id;
  }
  return "general";
};
