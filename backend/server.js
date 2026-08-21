import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
// Stripe Connect — import from the correctly named modules
import {
  createConnectAccount,
  generateOnboardingLink,
  getAccountStatus,
} from "./stripe-connect-core.js";
import {
  requestWithdrawal,
  getWithdrawalHistory,
  processRefund,
  getRefundHistory,
  getWithdrawalStatus,
} from "./stripe-connect-payouts.js";

// Compatibility shim so all existing StripeConnect.* calls in this file
// keep working without rewriting every call site
const StripeConnect = {
  setupProviderAccount: async ({ userId, email, country, roles }) => {
    const result = await createConnectAccount({
      userId,
      email,
      country: country || "US",
      role: (roles || ["creator"])[0],
    });
    // Derive needsOnboarding from isExisting — new accounts always need onboarding,
    // existing ones may still need it if not yet verified
    let onboardingUrl = null;
    if (!result.isExisting) {
      const linkResult = await generateOnboardingLink(result.accountId, userId, (roles || ["creator"])[0]);
      onboardingUrl = linkResult.url || linkResult;
    }
    const status = await getAccountStatus(result.accountId);
    const payoutsEnabled = status?.status?.payouts_enabled || status?.payouts_enabled || false;
    return {
      ...result,
      needsOnboarding: !payoutsEnabled,
      payoutsEnabled,
      onboardingUrl,
    };
  },
  createOnboardingLink: (accountId, userId) =>
    generateOnboardingLink(accountId, userId, "creator").then(r => r.url || r),
  getWithdrawalStatus,
  requestWithdrawal,
  getWithdrawalHistory,
  processRefund,
  getRefundHistory,
  updateProviderAccountStatus: async (accountId) => getAccountStatus(accountId),
};
import { courtRoomRoutes } from "./court-room-routes.js";
import { autoEscalateToCourtRoom } from "./court-room-integration.js";
import { courtRoomEmailService } from "./court-room-email-service.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 5000);
const APP_URL = (process.env.APP_URL || "http://localhost:8080").replace(/\/$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const CURRENCY = process.env.CURRENCY || "usd";
const MONTHLY_PLAN_PRICE = Number(process.env.MONTHLY_PLAN_PRICE || 10);
const YEARLY_PLAN_PRICE = Number(process.env.YEARLY_PLAN_PRICE || 120);
const NUBAN_API_KEY = process.env.NUBAN_API_KEY || "";
// Didit KYC and Persona KYC have been removed

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-07-29" }) : null;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.startsWith("replace_")
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toCents = (amount) => Math.max(0, Math.round(safeNumber(amount) * 100));

const buildReference = (prefix = "cv") => `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;

const findPlan = (planId) =>
  subscriptionPlans.find((p) => String(p.code).toLowerCase() === String(planId).toLowerCase()) || null;

const readSubscription = async (userId) => {
  if (!supabaseAdmin || !userId) return null;
  const { data } = await supabaseAdmin
    .from("subscriptions").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data || null;
};

const persistPaymentIntent = async ({ reference, userId, amount, type, contentId, status = "pending" }) => {
  if (!supabaseAdmin || !userId) return;
  supabaseAdmin.from("payments").insert({
    payer_id: userId,
    amount: safeNumber(amount),
    currency: CURRENCY,
    payment_type: type,
    reference_id: reference,
    status,
    payment_method: stripe ? "stripe" : "demo",
    admin_notes: contentId ? `content_id:${contentId}` : null,
  }).then(({ error }) => {
    if (error) console.warn("persistPaymentIntent warning:", error.message);
  }).catch(err => {
    console.warn("persistPaymentIntent error:", err.message);
  });
};

const markPaymentVerified = async ({ reference, type, userId, contentId, amount, metadata = {} }) => {
  if (!supabaseAdmin) return;

  await supabaseAdmin.from("payments")
    .update({ status: "success", updated_at: new Date().toISOString(), payment_method: stripe ? "stripe" : "demo" })
    .eq("reference_id", reference);

  let providerId = null;
  if (contentId && type !== "subscription") {
    if (type === "booking") {
      const { data: booking } = await supabaseAdmin.from("bookings").select("provider_id").eq("id", contentId).maybeSingle();
      providerId = booking?.provider_id || null;
    } else if (type === "course") {
      const { data: ci } = await supabaseAdmin.from("content_items").select("owner_id").eq("id", contentId).maybeSingle();
      providerId = ci?.owner_id || null;
      if (!providerId) {
        const { data: c } = await supabaseAdmin.from("courses").select("creator_id").eq("id", contentId).maybeSingle();
        providerId = c?.creator_id || null;
      }
    } else if (type === "video") {
      const { data: ci } = await supabaseAdmin.from("content_items").select("owner_id").eq("id", contentId).maybeSingle();
      providerId = ci?.owner_id || null;
    }
  }

  const adminShare = type === "subscription" ? safeNumber(amount) : Math.round(safeNumber(amount) * 0.05 * 100) / 100;
  const providerShare = safeNumber(amount) - adminShare;

  const { data: paymentRow } = await supabaseAdmin.from("payments").select("id").eq("reference_id", reference).maybeSingle();

  if (paymentRow?.id) {
    await supabaseAdmin.from("payments").update({ admin_share: adminShare, provider_share: providerShare, commission_settled: true }).eq("id", paymentRow.id);

    const { data: adminRole } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
    if (adminRole?.user_id) {
      const { data: adminWallet } = await supabaseAdmin.from("wallets").select("*").eq("user_id", adminRole.user_id).maybeSingle();
      if (adminWallet) {
        const newBal = safeNumber(adminWallet.available_balance) + adminShare;
        await supabaseAdmin.from("wallets").update({ balance: safeNumber(adminWallet.balance) + adminShare, available_balance: newBal, updated_at: new Date().toISOString() }).eq("id", adminWallet.id);
        await supabaseAdmin.from("wallet_ledger").insert({ wallet_id: adminWallet.id, amount: adminShare, type: "credit", description: `Admin share from ${type} payment`, balance_after: newBal });
      }
    }

    if (providerShare > 0 && providerId) {
      await supabaseAdmin.from("wallets").upsert({ user_id: providerId, currency: CURRENCY, balance: 0, pending_balance: 0, available_balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
      const { data: provWallet } = await supabaseAdmin.from("wallets").select("*").eq("user_id", providerId).maybeSingle();
      if (provWallet) {
        const newPending = safeNumber(provWallet.pending_balance) + providerShare;
        await supabaseAdmin.from("wallets").update({ pending_balance: newPending, updated_at: new Date().toISOString() }).eq("id", provWallet.id);
        await supabaseAdmin.from("wallet_ledger").insert({ wallet_id: provWallet.id, amount: providerShare, type: "credit", description: `95% provider share from ${type} (pending 8-day release)`, balance_after: newPending });
      }
    }

    if (userId) {
      await supabaseAdmin.from("wallets").upsert({ user_id: userId, currency: CURRENCY, balance: 0, pending_balance: 0, available_balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
    }
  }

  if (type === "subscription" && userId) {
    const planCode = metadata.plan || metadata.planId || "monthly";
    const endsAt = new Date();
    String(planCode).toLowerCase() === "yearly" ? endsAt.setFullYear(endsAt.getFullYear() + 1) : endsAt.setMonth(endsAt.getMonth() + 1);
    const existing = await readSubscription(userId);
    const subData = { plan: planCode, status: "active", payment_provider: "stripe", provider_name: "Stripe", starts_at: new Date().toISOString(), ends_at: endsAt.toISOString() };
    if (existing?.id) {
      await supabaseAdmin.from("subscriptions").update(subData).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("subscriptions").insert({ user_id: userId, ...subData });
    }
  }

  if (type === "booking" && contentId) {
    await supabaseAdmin.from("bookings").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", contentId);

    const { data: booking } = await supabaseAdmin.from("bookings").select("*, coach_profiles(*, profiles(*))").eq("id", contentId).maybeSingle();
    const { data: learner } = await supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle();

    if (booking && learner) {
      const providerProfile = booking.coach_profiles?.profiles || {};
      const serviceMode = booking.service_delivery_mode || "online";

      try {
        await fetch(`${APP_URL}/api/notifications/booking-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: contentId,
            learner_id: userId,
            provider_id: providerId,
            learner_email: learner.email || "",
            provider_email: providerProfile.email || "",
            learner_name: learner.full_name || "Learner",
            provider_name: providerProfile.full_name || "Provider",
            scheduled_at: booking.scheduled_at,
            service_title: metadata.contentTitle || "Session",
            service_mode: serviceMode,
            office_address: providerProfile.business_address || "",
            provider_phone: providerProfile.phone || "",
          }),
        });
      } catch (err) {
        console.error("[Booking] Email notification failed:", err);
      }
    }
  }
};

// In-memory fallbacks
const demoStore = new Map();
const listMemory = (store, userId) => store.get(userId) || [];
const setMemory = (store, userId, rows) => store.set(userId, rows);
const ensureArray = (v) => Array.isArray(v) ? v : [];

// ── Subscription plans ────────────────────────────────────────────────────────

const subscriptionPlans = [
  {
    code: "monthly",
    name: "Learner Plus Monthly",
    price: MONTHLY_PLAN_PRICE,
    priceLabel: `$${MONTHLY_PLAN_PRICE}`,
    currency: CURRENCY,
    intervalLabel: "/month",
    benefits: [
      "Save a payment method for faster checkout",
      "Priority booking support and direct learner messaging",
      "Certificate downloads where the content includes certificates",
      "Member discounts on eligible paid bookings and paid content",
    ],
    featured: true,
  },
  {
    code: "yearly",
    name: "Learner Plus Yearly",
    price: YEARLY_PLAN_PRICE,
    priceLabel: `$${YEARLY_PLAN_PRICE}`,
    currency: CURRENCY,
    intervalLabel: "/year",
    benefits: [
      "Everything in monthly membership",
      "Longer uninterrupted access for heavy learners",
      "Enhanced member discounts on eligible paid bookings and paid content",
    ],
  },
];

// ── Routes ────────────────────────────────────────────────────────────────────

app.post("/api/pay", async (req, res) => {
  try {
    const {
      user_id: userId,
      email,
      amount,
      type = "payment",
      content_id: contentId = null,
      content_title: contentTitle = null,
      plan = null,
      reference,
      card_brand: cardBrand = "Card",
      card_last4: cardLast4 = "****",
      card_expiry: cardExpiry = null,
    } = req.body || {};

    if (!userId || !email) return res.status(400).json({ message: "user_id and email are required." });
    const numericAmount = safeNumber(amount, 0);
    if (numericAmount <= 0) return res.status(400).json({ message: "Amount must be greater than 0." });

    const ref = reference || buildReference("pay");

    if (supabaseAdmin) {
      const { error: payErr } = await supabaseAdmin.from("payments").insert({
        payer_id: userId,
        amount: numericAmount,
        currency: CURRENCY,
        payment_type: type,
        reference_id: ref,
        status: "success",
        payment_method: "card",
        admin_notes: [
          contentId ? `content_id:${contentId}` : null,
          contentTitle ? `title:${contentTitle}` : null,
          cardBrand ? `card:${cardBrand} ****${cardLast4}` : null,
        ].filter(Boolean).join(" | ") || null,
      });
      if (payErr) console.warn("[pay] payment insert warning:", payErr.message);

      let providerId = null;
      if (contentId && type !== "subscription") {
        if (type === "booking") {
          const { data: booking } = await supabaseAdmin.from("bookings").select("provider_id").eq("id", contentId).maybeSingle();
          providerId = booking?.provider_id || null;
        } else if (type === "course" || type === "video") {
          const { data: ci } = await supabaseAdmin.from("content_items").select("owner_id").eq("id", contentId).maybeSingle();
          providerId = ci?.owner_id || null;
          if (!providerId) {
            const { data: c } = await supabaseAdmin.from("courses").select("creator_id").eq("id", contentId).maybeSingle();
            providerId = c?.creator_id || null;
          }
        }
      }

      const adminShare = type === "subscription" ? numericAmount : Math.round(numericAmount * 0.05 * 100) / 100;
      const providerShare = numericAmount - adminShare;

      const { data: adminRole } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
      if (adminRole?.user_id) {
        const { data: adminWallet } = await supabaseAdmin.from("wallets").select("*").eq("user_id", adminRole.user_id).maybeSingle();
        if (adminWallet) {
          const newBal = safeNumber(adminWallet.available_balance) + adminShare;
          await supabaseAdmin.from("wallets").update({
            balance: safeNumber(adminWallet.balance) + adminShare,
            available_balance: newBal,
            updated_at: new Date().toISOString(),
          }).eq("id", adminWallet.id);
          await supabaseAdmin.from("wallet_ledger").insert({
            wallet_id: adminWallet.id, amount: adminShare, type: "credit",
            description: `Admin share from ${type} payment`, balance_after: newBal,
          });
        }
      }

      if (providerShare > 0 && providerId) {
        await supabaseAdmin.from("wallets").upsert(
          { user_id: providerId, currency: CURRENCY, balance: 0, pending_balance: 0, available_balance: 0 },
          { onConflict: "user_id", ignoreDuplicates: true }
        );
        const { data: provWallet } = await supabaseAdmin.from("wallets").select("*").eq("user_id", providerId).maybeSingle();
        if (provWallet) {
          const newPending = safeNumber(provWallet.pending_balance) + providerShare;
          await supabaseAdmin.from("wallets").update({
            pending_balance: newPending,
            updated_at: new Date().toISOString(),
          }).eq("id", provWallet.id);
          await supabaseAdmin.from("wallet_ledger").insert({
            wallet_id: provWallet.id, amount: providerShare, type: "credit",
            description: `95% provider share from ${type} (pending 8-day release)`,
            balance_after: newPending,
          });
        }
      }

      if (type === "booking" && contentId) {
        await supabaseAdmin.from("bookings").update({
          status: "confirmed", updated_at: new Date().toISOString(),
        }).eq("id", contentId);
      }

      if (type === "subscription" && userId && plan) {
        const endsAt = new Date();
        String(plan).toLowerCase() === "yearly"
          ? endsAt.setFullYear(endsAt.getFullYear() + 1)
          : endsAt.setMonth(endsAt.getMonth() + 1);
        const existing = await readSubscription(userId);
        const subData = {
          plan, status: "active", payment_provider: "internal",
          provider_name: "Coursevia", starts_at: new Date().toISOString(),
          ends_at: endsAt.toISOString(),
        };
        if (existing?.id) {
          await supabaseAdmin.from("subscriptions").update(subData).eq("id", existing.id);
        } else {
          await supabaseAdmin.from("subscriptions").insert({ user_id: userId, ...subData });
        }
      }
    }

    return res.json({
      success: true,
      reference: ref,
      status: "success",
      message: "Payment recorded successfully.",
      amount: numericAmount,
    });
  } catch (error) {
    console.error("[pay] error:", error);
    return res.status(500).json({ message: error instanceof Error ? error.message : "Payment processing failed." });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice_id } = req.body || {};
    if (!text) return res.status(400).json({ message: "text is required" });

    const EL_KEY = process.env.ELEVENLABS_API_KEY || "";
    const voiceId = voice_id || process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

    if (!EL_KEY) return res.status(503).json({ message: "ElevenLabs not configured" });

    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": EL_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: String(text).slice(0, 400),
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.35, use_speaker_boost: true },
      }),
    });

    if (!elRes.ok) {
      const err = await elRes.text();
      return res.status(elRes.status).json({ message: err });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    const buf = await elRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "TTS failed" });
  }
});

app.get("/api/subscription/plans", (req, res) => {
  res.json({ success: true, data: subscriptionPlans });
});

app.get("/api/subscriptions/current", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "").trim();
    if (!userId) return res.status(400).json({ message: "user_id is required." });
    const subscription = await readSubscription(userId);
    return res.json({
      success: true,
      data: subscription
        ? { ...subscription, plan_code: subscription.plan, provider_name: "Stripe", payment_provider: "stripe" }
        : { user_id: userId, plan: null, plan_code: null, status: "inactive", starts_at: null, ends_at: null, provider_name: "Stripe", payment_provider: "stripe" },
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not load subscription." });
  }
});

app.post("/api/subscriptions/initialize", async (req, res) => {
  try {
    const { email, userId, planId } = req.body || {};
    if (!email || !userId || !planId) return res.status(400).json({ message: "email, userId, and planId are required." });

    const plan = findPlan(planId);
    if (!plan) return res.status(400).json({ message: "Unsupported subscription plan." });

    const reference = buildReference("sub");
    await persistPaymentIntent({ reference, userId, amount: plan.price, type: "subscription", contentId: null });

    if (stripe) {
      const successUrl = `${APP_URL}/billing/subscription-callback?reference=${encodeURIComponent(reference)}`;
      const cancelUrl = `${APP_URL}/billing/subscription-callback?reference=${encodeURIComponent(reference)}&failed=1`;

      const stripePriceId = plan.stripePriceId || (planId === "yearly" ? "price_1TLX5vDrKgcLcR6esrkN3f6L" : "price_1TLX5vDrKgcLcR6e0kVQObOP");

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { reference, userId, type: "subscription", plan: plan.code },
      });
      return res.json({ success: true, reference, redirect_url: session.url, authorization_url: session.url, message: "Redirecting to Stripe checkout." });
    }

    const authUrl = `${APP_URL}/billing/subscription-callback?reference=${encodeURIComponent(reference)}&demo=1`;
    demoStore.set(reference, { type: "subscription", userId, amount: plan.price, plan: plan.code, contentId: null });
    return res.json({ success: true, reference, redirect_url: authUrl, authorization_url: authUrl, message: "Demo subscription checkout initialized." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not initialize subscription." });
  }
});

app.post("/api/subscriptions/cancel", async (req, res) => {
  try {
    const { userId, subscriptionId } = req.body || {};
    if (!userId && !subscriptionId) return res.status(400).json({ message: "userId or subscriptionId is required." });
    if (!supabaseAdmin) return res.json({ success: true, cancelled: true, message: "Subscription marked for cancellation in demo mode." });
    let query = supabaseAdmin.from("subscriptions").update({ status: "cancelled" });
    query = subscriptionId ? query.eq("id", subscriptionId) : query.eq("user_id", userId);
    const { error } = await query;
    if (error) throw error;
    return res.json({ success: true, cancelled: true, message: "Subscription cancellation recorded." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not cancel subscription." });
  }
});

app.post("/api/checkout/initialize", async (req, res) => {
  try {
    const { email, user_id: userId, type, amount, content_id: contentId, content_title: contentTitle, plan, callback_url: callbackUrl } = req.body || {};
    if (!email || !userId || !type) return res.status(400).json({ message: "email, user_id, and type are required." });

    const normalizedType = String(type).toLowerCase();
    const numericAmount = safeNumber(amount, 0);
    const reference = buildReference(normalizedType.slice(0, 3) || "chk");
    await persistPaymentIntent({ reference, userId, amount: numericAmount, type: normalizedType, contentId });

    if (stripe && numericAmount > 0) {
      const redirectBase = callbackUrl || `${APP_URL}/billing/subscription-callback`;
      const successUrl = `${redirectBase}${redirectBase.includes("?") ? "&" : "?"}reference=${encodeURIComponent(reference)}`;
      const cancelUrl = `${redirectBase}${redirectBase.includes("?") ? "&" : "?"}reference=${encodeURIComponent(reference)}&failed=1`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [{ price_data: { currency: CURRENCY, product_data: { name: contentTitle || normalizedType }, unit_amount: toCents(numericAmount) }, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { reference, userId, type: normalizedType, contentId: contentId || "", plan: plan || "" },
      });
      demoStore.set(reference, { type: normalizedType, userId, amount: numericAmount, contentId: contentId || null, plan: plan || null });
      return res.json({ success: true, reference, redirect_url: session.url, authorization_url: session.url, message: "Redirecting to Stripe checkout." });
    }

    const redirectBase = callbackUrl || `${APP_URL}/billing/subscription-callback`;
    const authUrl = `${redirectBase}${redirectBase.includes("?") ? "&" : "?"}reference=${encodeURIComponent(reference)}&demo=1`;
    demoStore.set(reference, { type: normalizedType, userId, amount: numericAmount, contentId: contentId || null, plan: plan || null });
    return res.json({ success: true, reference, redirect_url: authUrl, authorization_url: authUrl, message: numericAmount > 0 ? "Demo checkout initialized." : "No-payment checkout initialized." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not initialize checkout." });
  }
});

app.get("/api/checkout/verify", async (req, res) => {
  try {
    const reference = String(req.query.reference || "").trim();
    const sessionId = String(req.query.session_id || "").trim();
    if (!reference && !sessionId) return res.status(400).json({ message: "reference is required." });

    let verification = null;

    if (stripe) {
      if (sessionId) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paid = session.payment_status === "paid";
        verification = { status: paid ? "success" : "pending", amount: safeNumber(session.amount_total, 0) / 100, metadata: session.metadata || {}, payment_id: session.payment_intent };
      } else if (reference) {
        const sessions = await stripe.checkout.sessions.list({ limit: 10 });
        const match = sessions.data.find((s) => s.metadata?.reference === reference);
        if (match) {
          const paid = match.payment_status === "paid";
          verification = { status: paid ? "success" : "pending", amount: safeNumber(match.amount_total, 0) / 100, metadata: match.metadata || {}, payment_id: match.payment_intent };
        }
      }
    }

    if (!verification) {
      const fallback = demoStore.get(reference || sessionId) || null;
      if (!fallback) {
        return res.status(409).json({ success: false, reference, status: "not_found", message: "Payment reference not found." });
      }
      verification = { status: "success", amount: fallback.amount || 0, metadata: fallback, payment_id: null };
    }

    if (verification.status !== "success") {
      return res.status(409).json({ success: false, reference, status: verification.status, message: "Payment is not verified yet." });
    }

    const metadata = verification.metadata || {};
    const normalizedType = String(metadata.type || "payment").toLowerCase();
    await markPaymentVerified({ reference, type: normalizedType, userId: metadata.userId || null, contentId: metadata.contentId || null, amount: verification.amount, metadata });

    return res.json({
      success: true, reference, status: "success",
      message: normalizedType === "subscription" ? "Subscription verified successfully." : "Payment verified successfully.",
      redirectTo: normalizedType === "subscription" ? "/dashboard/subscription" : "/dashboard/bookings",
      bookingId: metadata.contentId || null,
      payment: { amount: verification.amount, type: normalizedType, payment_id: verification.payment_id },
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not verify checkout." });
  }
});

app.get("/api/checkout/config", (req, res) => {
  res.json({
    mode: stripe ? "live" : "demo",
    provider: "stripe",
    currency: CURRENCY,
    app_url: APP_URL,
    base_url: APP_URL
  });
});

app.post("/api/checkout/charge", async (req, res) => {
  try {
    const { token, amount, currency = CURRENCY, description, metadata = {} } = req.body || {};

    if (!token || !amount) {
      return res.status(400).json({ message: "token and amount are required." });
    }

    const numericAmount = safeNumber(amount, 0);
    if (numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0." });
    }

    const reference = buildReference("chg");

    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: toCents(numericAmount),
          currency: currency.toLowerCase(),
          payment_method: token,
          confirmation_method: "manual",
          confirm: true,
          description: description || "Card charge",
          metadata: { reference, ...metadata },
          return_url: `${APP_URL}/payment-return`
        });

        if (paymentIntent.status === "succeeded") {
          return res.json({
            success: true,
            reference,
            payment_intent_id: paymentIntent.id,
            status: "succeeded",
            amount: numericAmount,
            message: "Payment successful"
          });
        } else if (paymentIntent.status === "requires_action") {
          return res.json({
            success: false,
            reference,
            payment_intent_id: paymentIntent.id,
            status: "requires_action",
            client_secret: paymentIntent.client_secret,
            message: "Payment requires additional authentication"
          });
        } else {
          return res.status(400).json({
            success: false,
            reference,
            status: paymentIntent.status,
            message: "Payment failed or requires additional steps"
          });
        }
      } catch (stripeError) {
        return res.status(400).json({
          success: false,
          reference,
          message: stripeError.message || "Payment processing failed",
          error_code: stripeError.code || "payment_failed"
        });
      }
    }

    const demoSuccess = Math.random() > 0.1;
    if (demoSuccess) {
      return res.json({
        success: true,
        reference,
        payment_intent_id: `pi_demo_${reference}`,
        status: "succeeded",
        amount: numericAmount,
        message: "Demo payment successful"
      });
    } else {
      return res.status(400).json({
        success: false,
        reference,
        message: "Demo payment failed (simulated)",
        error_code: "card_declined"
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Could not process charge."
    });
  }
});

app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    let event;
    if (STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers["stripe-signature"] || "";
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body.toString());
    }

    const type = event.type;
    const obj = event.data?.object || {};

    if (type === "checkout.session.completed" && obj.payment_status === "paid") {
      const metadata = obj.metadata || {};
      const reference = metadata.reference || "";
      const normalizedType = String(metadata.type || "payment").toLowerCase();
      if (reference) {
        await markPaymentVerified({
          reference, type: normalizedType,
          userId: metadata.userId || null,
          contentId: metadata.contentId || null,
          amount: safeNumber(obj.amount_total, 0) / 100,
          metadata,
        });
        console.log(`[Stripe Webhook] Payment verified: ${reference}`);
      }
    }

    if (["payment_intent.payment_failed", "checkout.session.expired"].includes(type) && supabaseAdmin) {
      const metadata = obj.metadata || {};
      const reference = metadata.reference || "";
      if (reference) {
        await supabaseAdmin.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("reference_id", reference);
        console.log(`[Stripe Webhook] Payment failed: ${reference}`);
      }
    }

    return res.json({ received: true, type });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Webhook error." });
  }
});

// ── OLD PAYOUT SYSTEM REMOVED ─────────────────────────────────────────────────
// The old /api/payouts/* routes have been removed and replaced with Stripe Connect.
// See STRIPE_CONNECT_SETUP_GUIDE.md for the new implementation.
// Historical data in bank_accounts and withdrawals tables is preserved for reference.

// ── Stripe Connect (Real Bank Verification & Payouts) ────────────────────────

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID || "";

app.post("/api/connect/onboard", async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured." });

    const { user_id: userId, email, role = "coach" } = req.body || {};
    if (!userId || !email) return res.status(400).json({ error: "user_id and email are required." });

    let stripeAccountId = null;
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("stripe_account_id").eq("user_id", userId).maybeSingle();
      stripeAccountId = profile?.stripe_account_id || null;
    }

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: { transfers: { requested: true } },
        settings: { payouts: { schedule: { interval: "manual" } } },
        metadata: { user_id: userId, role },
      });
      stripeAccountId = account.id;

      if (supabaseAdmin) {
        await supabaseAdmin.from("profiles")
          .update({ stripe_account_id: stripeAccountId, stripe_connect_status: "pending" })
          .eq("user_id", userId);
      }
    }

    const returnBase = `${APP_URL}/${role}/bank-accounts`;
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${returnBase}?connect=refresh`,
      return_url: `${returnBase}?connect=success`,
      type: "account_onboarding",
    });

    return res.json({ success: true, onboarding_url: accountLink.url, stripe_account_id: stripeAccountId });
  } catch (error) {
    console.error("[Connect] Onboard error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not start onboarding." });
  }
});

app.get("/api/connect/status", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "").trim();
    if (!userId) return res.status(400).json({ error: "user_id is required." });

    let stripeAccountId = null;
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("stripe_account_id").eq("user_id", userId).maybeSingle();
      stripeAccountId = profile?.stripe_account_id || null;
    }

    if (!stripeAccountId || !stripe) {
      return res.json({ connected: false, verified: false, payouts_enabled: false });
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    return res.json({
      connected: true,
      stripe_account_id: stripeAccountId,
      verified: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      charges_enabled: account.charges_enabled,
      requirements: account.requirements?.currently_due || [],
      country: account.country,
    });
  } catch (error) {
    console.error("[Connect] Status error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not get status." });
  }
});

app.post("/api/connect/dashboard-link", async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured." });
    const { user_id: userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "user_id is required." });

    let stripeAccountId = null;
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("stripe_account_id").eq("user_id", userId).maybeSingle();
      stripeAccountId = profile?.stripe_account_id || null;
    }

    if (!stripeAccountId) return res.status(404).json({ error: "No Connect account found. Complete onboarding first." });

    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
    return res.json({ success: true, url: loginLink.url });
  } catch (error) {
    console.error("[Connect] Dashboard link error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not create dashboard link." });
  }
});

app.post("/api/connect/payout", async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured." });

    const { user_id: userId, amount, withdrawal_id: withdrawalId, currency = CURRENCY } = req.body || {};
    const numericAmount = safeNumber(amount, 0);
    if (!userId || numericAmount <= 0) return res.status(400).json({ error: "user_id and a valid amount are required." });

    let stripeAccountId = null;
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("stripe_account_id").eq("user_id", userId).maybeSingle();
      stripeAccountId = profile?.stripe_account_id || null;
    }

    if (!stripeAccountId) {
      return res.status(400).json({ error: "Provider has not connected their bank via Stripe. Ask them to complete onboarding from their Bank Accounts page." });
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.payouts_enabled) {
      return res.status(400).json({ error: "Provider's Stripe account is not yet verified. They need to complete their Stripe onboarding." });
    }

    const transfer = await stripe.transfers.create({
      amount: toCents(numericAmount),
      currency: currency.toLowerCase(),
      destination: stripeAccountId,
      description: `Coursevia earnings payout${withdrawalId ? ` (${withdrawalId})` : ""}`,
      metadata: { user_id: userId, withdrawal_id: withdrawalId || "" },
    });

    const payout = await stripe.payouts.create(
      {
        amount: toCents(numericAmount),
        currency: currency.toLowerCase(),
        description: "Coursevia earnings",
        metadata: { user_id: userId, withdrawal_id: withdrawalId || "" },
      },
      { stripeAccount: stripeAccountId }
    );

    if (supabaseAdmin && withdrawalId) {
      await supabaseAdmin.from("withdrawals").update({
        status: "processing",
        stripe_transfer_id: transfer.id,
        stripe_payout_id: payout.id,
        updated_at: new Date().toISOString(),
      }).eq("id", withdrawalId);
    }

    return res.json({
      success: true,
      transfer_id: transfer.id,
      payout_id: payout.id,
      amount: numericAmount,
      status: payout.status,
      estimated_arrival: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
    });
  } catch (error) {
    console.error("[Connect] Payout error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Payout failed." });
  }
});

app.post("/api/webhooks/stripe-connect", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    let event;
    if (STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] || "", STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body.toString());
    }

    const obj = event.data?.object || {};

    if (event.type === "account.updated" && supabaseAdmin) {
      const payoutsEnabled = obj.payouts_enabled || false;
      await supabaseAdmin.from("profiles").update({
        stripe_connect_verified: payoutsEnabled,
        stripe_connect_status: payoutsEnabled ? "active" : "pending",
      }).eq("stripe_account_id", obj.id);

      if (payoutsEnabled) {
        const { data: profile } = await supabaseAdmin.from("profiles")
          .select("user_id").eq("stripe_account_id", obj.id).maybeSingle();
        if (profile?.user_id) {
          await supabaseAdmin.from("user_bank_accounts")
            .update({ is_verified: true, verification_status: "verified" })
            .eq("user_id", profile.user_id);
        }
      }
    }

    if (event.type === "payout.paid" && supabaseAdmin) {
      await supabaseAdmin.from("withdrawals")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("stripe_payout_id", obj.id);
    }

    if (event.type === "payout.failed" && supabaseAdmin) {
      await supabaseAdmin.from("withdrawals")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("stripe_payout_id", obj.id);
    }

    return res.json({ received: true, type: event.type });
  } catch (error) {
    console.error("[Connect Webhook] Error:", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Webhook error." });
  }
});

// ── Wallet ────────────────────────────────────────────────────────────────────

app.post("/api/wallet/release-pending", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: "Database unavailable." });
    const cutoff = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const { data: entries, error: ledgerError } = await supabaseAdmin.from("wallet_ledger").select("id, wallet_id, amount").eq("type", "credit").eq("released", false).lte("created_at", cutoff);
    if (ledgerError) return res.status(500).json({ error: ledgerError.message });
    if (!entries || entries.length === 0) return res.json({ released: 0 });
    let released = 0;
    for (const entry of entries) {
      const { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("id", entry.wallet_id).maybeSingle();
      if (!wallet) continue;
      const moveAmount = Math.min(safeNumber(entry.amount), safeNumber(wallet.pending_balance));
      if (moveAmount <= 0) continue;
      await supabaseAdmin.from("wallets").update({ pending_balance: Math.max(0, safeNumber(wallet.pending_balance) - moveAmount), available_balance: safeNumber(wallet.available_balance) + moveAmount, updated_at: new Date().toISOString() }).eq("id", entry.wallet_id);
      await supabaseAdmin.from("wallet_ledger").update({ released: true }).eq("id", entry.id);
      released++;
    }
    return res.json({ released });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Release failed." });
  }
});

app.get("/api/wallet/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId is required." });
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId).maybeSingle();
      if (!error) return res.json(data || { user_id: userId, balance: 0, available_balance: 0 });
    }
    return res.json({ user_id: userId, balance: 0, available_balance: 0 });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not load wallet." });
  }
});

app.post("/api/wallet/withdraw", async (req, res) => {
  try {
    const { user_id: userId, amount } = req.body || {};
    const numericAmount = safeNumber(amount, 0);
    if (!userId || numericAmount <= 0) return res.status(400).json({ error: "user_id and a valid amount are required." });
    if (supabaseAdmin) {
      const { data: wallet, error: walletError } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId).maybeSingle();
      if (!walletError && wallet) {
        const available = safeNumber(wallet.available_balance ?? wallet.balance, 0);
        if (numericAmount > available) return res.status(400).json({ error: "Amount exceeds available balance." });
        await supabaseAdmin.from("wallets").update({ available_balance: Math.max(0, available - numericAmount), balance: Math.max(0, safeNumber(wallet.balance, 0) - numericAmount) }).eq("user_id", userId);
        return res.json({ success: true, amount: numericAmount });
      }
    }
    return res.json({ success: true, amount: numericAmount });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Withdrawal failed." });
  }
});

// ── Transactions & Escrow ─────────────────────────────────────────────────────

app.get("/api/transactions/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId is required." });
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("payments").select("id, payer_id, amount, currency, payment_type, reference_id, status, created_at").eq("payer_id", userId).order("created_at", { ascending: false }).limit(50);
      if (!error) return res.json(data || []);
    }
    return res.json([]);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not load transactions." });
  }
});

app.get("/api/escrow/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId is required." });
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("escrow").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (!error) return res.json(data || []);
    }
    return res.json([]);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not load escrow." });
  }
});

// ── Refunds ───────────────────────────────────────────────────────────────────

app.post("/api/refunds/request-payment", async (req, res) => {
  try {
    const { payment_id, user_id, reason } = req.body || {};
    if (!payment_id || !user_id || !reason?.trim()) return res.status(400).json({ message: "payment_id, user_id, and reason are required." });
    if (!supabaseAdmin) return res.status(503).json({ message: "Database not configured." });

    const { data: payment } = await supabaseAdmin.from("payments").select("*").eq("id", payment_id).eq("payer_id", user_id).maybeSingle();
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (!["completed", "success", "approved"].includes(payment.status)) return res.status(400).json({ message: "Only completed payments can be refunded." });

    const paidAt = new Date(payment.created_at);
    const windowEnd = new Date(paidAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > windowEnd) return res.status(400).json({ message: "Refund window has closed. Requests must be submitted within 7 days of purchase." });

    const { data: existing } = await supabaseAdmin.from("refunds").select("id, status").eq("payment_id", payment_id).in("status", ["pending", "processed"]).maybeSingle();
    if (existing) return res.status(409).json({ message: "A refund request already exists for this payment." });

    const amount = safeNumber(payment.amount);
    const { data: refund, error } = await supabaseAdmin.from("refunds").insert({
      user_id,
      payment_id,
      booking_id: null,
      amount,
      reason: reason.trim(),
      status: "pending",
      payment_type: payment.payment_type,
      content_title: null,
    }).select("*").single();
    if (error) throw new Error(error.message);

    // Auto-escalate to Court Room — any refund triggers provider ban
    try {
      // Find provider_id from content if available
      let providerId = null;
      if (payment.admin_notes?.includes("content_id:")) {
        const contentId = payment.admin_notes.match(/content_id:([^\s,]+)/)?.[1];
        if (contentId) {
          const { data: booking } = await supabaseAdmin.from("bookings").select("coach_id").eq("id", contentId).maybeSingle();
          if (booking?.coach_id) providerId = booking.coach_id;
          if (!providerId) {
            const { data: ci } = await supabaseAdmin.from("content_items").select("owner_id").eq("id", contentId).maybeSingle();
            if (ci?.owner_id) providerId = ci.owner_id;
          }
        }
      }

      if (providerId) {
        const escalationResult = await autoEscalateToCourtRoom({
          booking_id: null,
          learner_id: user_id,
          provider_id: providerId,
          amount,
          reason: reason.trim(),
          refund_type: "payment_dispute",
        });
        if (escalationResult.escalated) {
          await supabaseAdmin.from("refunds").update({
            court_case_id: escalationResult.courtCase?.id || null,
            status: "escalated_to_court",
          }).eq("id", refund.id);
          console.log(`Payment refund auto-escalated: ${escalationResult.courtCase?.case_number}`);
        }
      }
    } catch (escalationError) {
      console.error("Court room escalation failed for payment refund:", escalationError);
    }

    return res.json({ success: true, refund, message: "Refund request submitted and escalated to dispute resolution. You will receive further instructions via email." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not submit refund request." });
  }
});

app.post("/api/refunds/request", async (req, res) => {
  try {
    const { booking_id, user_id, reason } = req.body || {};
    if (!booking_id || !user_id || !reason?.trim()) return res.status(400).json({ message: "booking_id, user_id, and reason are required." });
    if (!supabaseAdmin) return res.status(503).json({ message: "Database not configured." });

    const { data: booking } = await supabaseAdmin.from("bookings").select("*").eq("id", booking_id).eq("learner_id", user_id).maybeSingle();
    const { data: payment } = await supabaseAdmin.from("payments").select("*").eq("payer_id", user_id).ilike("admin_notes", `%content_id:${booking_id}%`).eq("status", "success").order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!booking) return res.status(404).json({ message: "Booking not found." });

    const paidAt = payment?.created_at ? new Date(payment.created_at) : null;
    const scheduledAt = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
    const now = new Date();

    if (paidAt) {
      const twoDaysAfter = new Date(paidAt.getTime() + 2 * 24 * 60 * 60 * 1000);
      if (now < twoDaysAfter) {
        const hoursLeft = Math.ceil((twoDaysAfter - now) / (1000 * 60 * 60));
        return res.status(400).json({ message: `Refund requests open ${hoursLeft}h after payment is confirmed.` });
      }
    }

    if (scheduledAt) {
      const oneDayBefore = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
      if (now > oneDayBefore) return res.status(400).json({ message: "Refund requests must be submitted at least 24 hours before the session." });
    }

    const { data: existing } = await supabaseAdmin.from("refunds").select("id, status").eq("booking_id", booking_id).in("status", ["pending", "processed"]).maybeSingle();
    if (existing) return res.status(409).json({ message: "A refund request already exists for this booking." });

    const amount = safeNumber(payment?.amount || booking.price || 0);
    const { data: refund, error } = await supabaseAdmin.from("refunds").insert({
      user_id,
      booking_id,
      payment_id: payment?.id || null,
      amount,
      reason: reason.trim(),
      status: "pending",
      payment_type: "booking",
      content_title: booking.service_title || booking.title || null,
    }).select("*").single();
    if (error) throw new Error(error.message);

    // Auto-escalate to Court Room (as per user requirement: 1a - any refund triggers court room)
    try {
      // bookings uses coach_id as the provider field
      const escalationResult = await autoEscalateToCourtRoom({
        booking_id,
        learner_id: user_id,
        provider_id: booking.coach_id,   // ← correct field name in bookings table
        amount,
        reason: reason.trim() || "",
        refund_type: 'dispute'
      });

      if (escalationResult.escalated) {
        // Update refund record with court case reference
        await supabaseAdmin.from("refunds").update({
          court_case_id: escalationResult.courtCase?.id || null,
          status: "escalated_to_court"
        }).eq("id", refund.id);

        console.log(`Refund auto-escalated to court room: ${escalationResult.courtCase?.case_number}`);
      }
    } catch (escalationError) {
      console.error('Court room escalation failed:', escalationError);
      // Continue with regular refund process even if escalation fails
    }

    return res.json({
      success: true,
      refund,
      message: "Refund request submitted and escalated to dispute resolution. You will receive further instructions via email."
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not submit refund request." });
  }
});

app.post("/api/refunds/approve", async (req, res) => {
  try {
    const { refund_id } = req.body || {};
    if (!refund_id) return res.status(400).json({ message: "refund_id is required." });
    if (!supabaseAdmin) return res.status(503).json({ message: "Database not configured." });

    const { data: refund } = await supabaseAdmin.from("refunds").select("*").eq("id", refund_id).maybeSingle();
    if (!refund) return res.status(404).json({ message: "Refund not found." });
    if (refund.status !== "pending") return res.status(400).json({ message: "Refund is not pending." });

    const amount = safeNumber(refund.amount);
    let refundMethod = "original_payment";
    let stripeRefundId = null;

    if (stripe && refund.payment_id) {
      try {
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("reference_id, payment_method")
          .eq("id", refund.payment_id)
          .maybeSingle();

        if (payment?.reference_id) {
          const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });
          const pi = paymentIntents.data.find(p =>
            p.metadata?.reference === payment.reference_id ||
            p.id === payment.reference_id
          );

          if (pi && pi.latest_charge) {
            const stripeRefund = await stripe.refunds.create({
              charge: String(pi.latest_charge),
              amount: toCents(amount),
              reason: "requested_by_customer",
              metadata: { refund_id, coursevia_ref: payment.reference_id },
            });
            stripeRefundId = stripeRefund.id;
            refundMethod = "stripe_original";
            console.log(`Stripe refund created: ${stripeRefundId} for $${amount}`);
          }
        }
      } catch (stripeErr) {
        console.warn("Stripe refund failed, falling back to wallet credit:", stripeErr.message);
        refundMethod = "wallet_fallback";
      }
    } else {
      refundMethod = "wallet_fallback";
    }

    if (refundMethod === "wallet_fallback") {
      await supabaseAdmin.from("wallets").upsert(
        { user_id: refund.user_id, currency: "USD", balance: 0, pending_balance: 0, available_balance: 0 },
        { onConflict: "user_id", ignoreDuplicates: true }
      );
      const { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("user_id", refund.user_id).maybeSingle();
      if (wallet) {
        const newBal = safeNumber(wallet.available_balance) + amount;
        await supabaseAdmin.from("wallets").update({
          balance: safeNumber(wallet.balance) + amount,
          available_balance: newBal,
          updated_at: new Date().toISOString(),
        }).eq("user_id", refund.user_id);
        await supabaseAdmin.from("wallet_ledger").insert({
          wallet_id: wallet.id, amount, type: "credit",
          description: `Refund approved - credited to wallet (original payment method unavailable)`,
          balance_after: newBal,
        });
      }
    }

    await supabaseAdmin.from("refunds").update({
      status: "processed",
      processed_at: new Date().toISOString(),
      refund_method: refundMethod,
      stripe_refund_id: stripeRefundId,
    }).eq("id", refund_id);

    if (refund.booking_id) {
      await supabaseAdmin.from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", refund.booking_id)
        .in("status", ["pending", "confirmed"]);
    }

    const methodMsg = refundMethod === "stripe_original"
      ? "The refund has been sent to your original payment method and should appear within 5-10 business days."
      : "The refund has been credited to your Coursevia wallet.";

    await supabaseAdmin.from("notifications").insert({
      user_id: refund.user_id,
      title: "Refund Approved",
      message: `Your refund of $${amount.toFixed(2)} has been approved. ${methodMsg}`,
      type: "refund",
    }).catch(() => { });

    const msg = refundMethod === "stripe_original"
      ? `Refund of $${amount.toFixed(2)} sent to learner's original payment method (Stripe).`
      : `Refund of $${amount.toFixed(2)} credited to learner's wallet (Stripe unavailable).`;

    return res.json({ success: true, message: msg, refund_method: refundMethod, stripe_refund_id: stripeRefundId });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not approve refund." });
  }
});

app.post("/api/refunds/reject", async (req, res) => {
  try {
    const { refund_id, reject_reason } = req.body || {};
    if (!refund_id) return res.status(400).json({ message: "refund_id is required." });
    if (!supabaseAdmin) return res.status(503).json({ message: "Database not configured." });

    const { data: refund } = await supabaseAdmin.from("refunds").select("*").eq("id", refund_id).maybeSingle();
    if (!refund) return res.status(404).json({ message: "Refund not found." });
    if (refund.status !== "pending") return res.status(400).json({ message: "Refund is not pending." });

    await supabaseAdmin.from("refunds").update({
      status: "rejected",
      reject_reason: reject_reason?.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", refund_id);

    await supabaseAdmin.from("notifications").insert({
      user_id: refund.user_id,
      title: "Refund Request Update",
      message: reject_reason?.trim()
        ? `Your refund request of $${Number(refund.amount).toFixed(2)} was not approved. Reason: ${reject_reason.trim()}`
        : `Your refund request of $${Number(refund.amount).toFixed(2)} was reviewed and not approved.`,
      type: "refund",
    }).catch(() => { });

    return res.json({ success: true, message: "Refund rejected." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not reject refund." });
  }
});

app.get("/api/refunds/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId is required." });
    if (!supabaseAdmin) return res.status(503).json({ message: "Database not configured." });

    const { data, error } = await supabaseAdmin
      .from("refunds")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return res.json(data || []);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not fetch refunds." });
  }
});

app.get("/api/refunds/all", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ message: "Database not configured." });
    const { data, error } = await supabaseAdmin
      .from("refunds")
      .select("*, profiles!refunds_user_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return res.json(data || []);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not fetch refunds." });
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────

app.post("/api/reports/submit", async (req, res) => {
  try {
    const { reporter_id, reported_user_id, booking_id, reason, description } = req.body || {};
    if (!reporter_id || !reason?.trim()) return res.status(400).json({ message: "reporter_id and reason are required." });
    if (!supabaseAdmin) return res.status(503).json({ message: "Database not configured." });
    const { data: report, error } = await supabaseAdmin.from("reports").insert({ reporter_id, reported_user_id: reported_user_id || null, booking_id: booking_id || null, reason: reason.trim(), description: description?.trim() || null, status: "pending" }).select("*").single();
    if (error) throw new Error(error.message);
    return res.json({ success: true, report, message: "Report submitted. Our team will review it." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not submit report." });
  }
});

// ── Admin ─────────────────────────────────────────────────────────────────────

app.post("/api/admin/create-account", async (req, res) => {
  try {
    const { email, password, full_name } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email and password are required." });
    if (!supabaseAdmin) return res.status(503).json({ message: "Supabase admin client not configured." });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: full_name || email, requested_role: "admin", role: "admin" } });
    if (authError) throw new Error(authError.message);
    const userId = authData.user?.id;
    if (!userId) throw new Error("User creation failed.");

    await supabaseAdmin.from("profiles").upsert({ user_id: userId, email, full_name: full_name || email, role: "admin", onboarding_completed: true, status: "active" }, { onConflict: "user_id" });
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    await supabaseAdmin.from("wallets").upsert({ user_id: userId, currency: "USD", balance: 0, pending_balance: 0, available_balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

    return res.json({ success: true, user_id: userId, message: "Admin account created." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not create admin account." });
  }
});

// ── Email Notifications ───────────────────────────────────────────────────────

app.post("/api/notifications/booking-confirmation", async (req, res) => {
  try {
    const { booking_id, learner_email, provider_email, learner_name, provider_name, scheduled_at, service_title, service_mode, office_address, provider_phone } = req.body || {};

    if (!booking_id || !learner_email || !provider_email) {
      return res.status(400).json({ message: "booking_id, learner_email, and provider_email are required." });
    }

    const learnerEmailContent = service_mode === "in_person"
      ? `Your in-person session with ${provider_name} is confirmed!\n\nSession Details:\n- Service: ${service_title}\n- Date & Time: ${scheduled_at}\n- Location: ${office_address || "Contact provider for address"}${provider_phone ? `\n- Phone: ${provider_phone}` : ""}\n\nPlease arrive 5-10 minutes early.`
      : `Your online session with ${provider_name} is confirmed!\n\nSession Details:\n- Service: ${service_title}\n- Date & Time: ${scheduled_at}\n- You will receive a meeting link via email before the session.`;

    const providerEmailContent = `New booking received!\n\n${learner_name} has booked a ${service_mode} session with you.\n\nBooking Details:\n- Service: ${service_title}\n- Date & Time: ${scheduled_at}\n- Mode: ${service_mode === "in_person" ? "In-Person" : "Online"}\n${service_mode === "in_person" ? `- Location: ${office_address}${provider_phone ? `\n- Contact: ${provider_phone}` : ""}` : ""}\n\nPlease confirm and prepare for the session.`;

    console.log("[Email] Booking confirmation to learner:", {
      to: learner_email,
      subject: `Booking Confirmed: ${service_title}`,
      content: learnerEmailContent,
    });

    console.log("[Email] Booking confirmation to provider:", {
      to: provider_email,
      subject: `New Booking: ${learner_name}`,
      content: providerEmailContent,
    });

    if (supabaseAdmin) {
      await supabaseAdmin.from("notifications").insert([
        {
          user_id: req.body.learner_id,
          type: "booking_confirmation",
          title: "Booking Confirmed",
          message: service_mode === "in_person"
            ? `Your in-person session with ${provider_name} is confirmed at ${office_address || "the provider's office"}`
            : `Your online session with ${provider_name} is confirmed for ${scheduled_at}`,
          metadata: { booking_id, service_mode, office_address, scheduled_at, provider_name },
        },
        {
          user_id: req.body.provider_id,
          type: "new_booking",
          title: "New Booking",
          message: `${learner_name} has booked a ${service_mode} session with you for ${scheduled_at}`,
          metadata: { booking_id, service_mode, learner_name, scheduled_at },
        },
      ]);
    }

    return res.json({
      success: true,
      message: "Booking confirmation emails queued.",
      learner_email_content: learnerEmailContent,
      provider_email_content: providerEmailContent,
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not send booking confirmation." });
  }
});

app.post("/api/notifications/welcome", async (req, res) => {
  try {
    const { user_id, email, full_name, role } = req.body || {};

    if (!user_id || !email) {
      return res.status(400).json({ message: "user_id and email are required." });
    }

    console.log("[Email] Welcome email:", {
      to: email,
      name: full_name,
      role,
    });

    if (supabaseAdmin) {
      await supabaseAdmin.from("notifications").insert({
        user_id,
        type: "welcome",
        title: "Welcome to Coursevia!",
        message: `Thank you for signing up, ${full_name || "there"}! We're excited to have you on board.`,
        metadata: { role },
      });
    }

    return res.json({ success: true, message: "Welcome email sent." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not send welcome email." });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const releasePendingBalances = async () => {
  if (!supabaseAdmin) return;
  try {
    const cutoff = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const { data: entries } = await supabaseAdmin
      .from("wallet_ledger")
      .select("id, wallet_id, amount")
      .eq("type", "credit")
      .eq("released", false)
      .lte("created_at", cutoff);

    if (!entries?.length) return;

    let released = 0;
    for (const entry of entries) {
      const { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("id", entry.wallet_id).maybeSingle();
      if (!wallet) continue;
      const moveAmount = Math.min(safeNumber(entry.amount), safeNumber(wallet.pending_balance));
      if (moveAmount <= 0) continue;
      await supabaseAdmin.from("wallets").update({
        pending_balance: Math.max(0, safeNumber(wallet.pending_balance) - moveAmount),
        available_balance: safeNumber(wallet.available_balance) + moveAmount,
        updated_at: new Date().toISOString(),
      }).eq("id", entry.wallet_id);
      await supabaseAdmin.from("wallet_ledger").update({ released: true }).eq("id", entry.id);
      released++;
    }

    if (released > 0) console.log(`[Wallet] Released ${released} pending balance(s) to available`);
  } catch (err) {
    console.error("[Wallet] Release pending error:", err);
  }
};

releasePendingBalances();
setInterval(releasePendingBalances, 6 * 60 * 60 * 1000);

app.get("/", (req, res) => {
  res.json({
    name: "Coursevia API",
    status: "running",
    version: "1.0.0",
    service: "Coursevia Backend",
    stripe: stripe ? "live" : "demo",
    db: supabaseAdmin ? "connected" : "demo"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    stripe: stripe ? "live" : "demo",
    db: supabaseAdmin ? "connected" : "demo"
  });
});

// ── Airwallex Virtual Accounts ────────────────────────────────────────────────

const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID || "";
const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY || "";
const AIRWALLEX_ENV = process.env.AIRWALLEX_ENV || "demo";
const AIRWALLEX_WEBHOOK_SECRET = process.env.AIRWALLEX_WEBHOOK_SECRET || "";

const AIRWALLEX_BASE = AIRWALLEX_ENV === "production"
  ? "https://api.airwallex.com"
  : "https://api-demo.airwallex.com";

let airwallexToken = null;
let airwallexTokenExp = 0;

const getAirwallexToken = async () => {
  if (airwallexToken && Date.now() < airwallexTokenExp) return airwallexToken;

  const res = await fetch(`${AIRWALLEX_BASE}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "x-client-id": AIRWALLEX_CLIENT_ID,
      "x-api-key": AIRWALLEX_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airwallex auth failed: ${err}`);
  }

  const data = await res.json();
  airwallexToken = data.token;
  airwallexTokenExp = Date.now() + (28 * 60 * 1000);
  return airwallexToken;
};

const airwallexRequest = async (method, path, body = null) => {
  const token = await getAirwallexToken();
  const res = await fetch(`${AIRWALLEX_BASE}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `Airwallex error ${res.status}`);
  return data;
};

const verifyAirwallexWebhook = (req) => {
  if (!AIRWALLEX_WEBHOOK_SECRET) return true;
  const signature = req.headers["x-signature"] || req.headers["x-airwallex-signature"] || "";
  const timestamp = req.headers["x-timestamp"] || req.headers["x-airwallex-timestamp"] || "";
  const payload = `${timestamp}.${JSON.stringify(req.body)}`;
  const expected = crypto
    .createHmac("sha256", AIRWALLEX_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  return signature === expected;
};

app.post("/api/virtual-account/create", async (req, res) => {
  try {
    if (!AIRWALLEX_CLIENT_ID || !AIRWALLEX_API_KEY) {
      return res.status(503).json({ error: "Airwallex not configured. Add AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY to .env" });
    }

    const { user_id: userId, email, full_name: fullName, currency = "USD", country_code: countryCode = "US" } = req.body || {};
    if (!userId || !email) return res.status(400).json({ error: "user_id and email are required." });

    if (supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from("virtual_accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("currency", currency.toUpperCase())
        .maybeSingle();

      if (existing) return res.json({ success: true, account: existing, already_exists: true });
    }

    const nickname = `coursevia-${userId.slice(0, 8)}`;
    const awAccount = await airwallexRequest("POST", "/api/v1/va/account_details/create", {
      request_id: buildReference("va"),
      nickname,
      currency: currency.toUpperCase(),
      country_code: countryCode.toUpperCase(),
      beneficiary: {
        name: fullName || email,
        email,
      },
    });

    const details = awAccount?.account_details?.[0] || {};
    const bankCode = details?.bank_details?.bank_name || "";
    const accountNum = details?.bank_details?.account_number
      || details?.bank_details?.iban
      || "";
    const routing = details?.bank_details?.routing_number
      || details?.bank_details?.sort_code
      || "";
    const iban = details?.bank_details?.iban || null;
    const bic = details?.bank_details?.bic || details?.bank_details?.swift_code || null;

    const record = {
      user_id: userId,
      airwallex_id: awAccount.id || awAccount.account_id || nickname,
      account_number: accountNum,
      routing_number: routing,
      iban,
      bic,
      bank_name: bankCode,
      account_name: fullName || email,
      currency: currency.toUpperCase(),
      country_code: countryCode.toUpperCase(),
      status: "active",
    };

    if (supabaseAdmin) {
      const { data: saved, error: saveErr } = await supabaseAdmin
        .from("virtual_accounts")
        .insert(record)
        .select("*")
        .single();

      if (saveErr) throw new Error(saveErr.message);
      return res.json({ success: true, account: saved });
    }

    return res.json({ success: true, account: { id: crypto.randomUUID(), ...record } });
  } catch (error) {
    console.error("[VA] create error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not create virtual account." });
  }
});

app.get("/api/virtual-account/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    const currency = String(req.query.currency || "").toUpperCase() || null;
    if (!userId) return res.status(400).json({ error: "userId is required." });

    if (supabaseAdmin) {
      let query = supabaseAdmin
        .from("virtual_accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (currency) query = query.eq("currency", currency);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return res.json({ accounts: data || [] });
    }

    return res.json({ accounts: [] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not load virtual accounts." });
  }
});

app.post("/api/webhooks/airwallex", async (req, res) => {
  try {
    if (!verifyAirwallexWebhook(req)) {
      console.warn("[AW Webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.body || {};
    const type = event.name || event.type || "";
    const data = event.data || event.payload || {};

    console.log(`[AW Webhook] ${type}`, JSON.stringify(data).slice(0, 200));

    const isIncoming =
      type.includes("transfer.received") ||
      type.includes("payment.received") ||
      type.includes("incoming_payment") ||
      type.includes("va.payment_received");

    if (!isIncoming) return res.json({ received: true, type, action: "ignored" });

    const airwallexAccountId = data?.account_id || data?.virtual_account_id || "";
    const amount = safeNumber(data?.amount || data?.payment_amount || 0);
    const currency = (data?.currency || data?.payment_currency || "USD").toUpperCase();
    const eventId = event.id || event.event_id || buildReference("awe");
    const senderName = data?.sender_name || data?.remitter_name || null;
    const senderBank = data?.sender_bank_name || null;
    const reference = data?.reference || data?.payment_reference || null;

    if (!airwallexAccountId || amount <= 0) {
      console.warn("[AW Webhook] Missing account_id or amount", { airwallexAccountId, amount });
      return res.json({ received: true, error: "Missing account_id or amount" });
    }

    if (!supabaseAdmin) return res.json({ received: true, note: "No DB - demo mode" });

    const { data: existing } = await supabaseAdmin
      .from("wallet_topups")
      .select("id")
      .eq("airwallex_event_id", eventId)
      .maybeSingle();
    if (existing) return res.json({ received: true, action: "duplicate_skipped" });

    const { data: vaRecord } = await supabaseAdmin
      .from("virtual_accounts")
      .select("id, user_id")
      .eq("airwallex_id", airwallexAccountId)
      .maybeSingle();

    if (!vaRecord?.user_id) {
      console.warn("[AW Webhook] No virtual account found for", airwallexAccountId);
      return res.status(404).json({ error: "Virtual account not found" });
    }

    const userId = vaRecord.user_id;

    await supabaseAdmin.from("wallet_topups").insert({
      user_id: userId,
      virtual_account_id: vaRecord.id,
      airwallex_event_id: eventId,
      amount,
      currency,
      sender_name: senderName,
      sender_bank: senderBank,
      reference,
      status: "completed",
    });

    await supabaseAdmin.from("wallets").upsert(
      { user_id: userId, currency, balance: 0, pending_balance: 0, available_balance: 0 },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (wallet) {
      const newAvailable = safeNumber(wallet.available_balance) + amount;
      const newBalance = safeNumber(wallet.balance) + amount;

      await supabaseAdmin.from("wallets").update({
        available_balance: newAvailable,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }).eq("id", wallet.id);

      await supabaseAdmin.from("wallet_ledger").insert({
        wallet_id: wallet.id,
        type: "credit",
        amount,
        balance_after: newAvailable,
        description: `Wallet top-up via bank transfer${senderName ? ` from ${senderName}` : ""}${reference ? ` (ref: ${reference})` : ""}`,
      });
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "wallet_topup",
      title: "Wallet funded",
      message: `$${amount.toFixed(2)} ${currency} has been credited to your Coursevia wallet.`,
      metadata: { amount, currency, sender_name: senderName, reference },
    }).catch(() => { });

    console.log(`[AW Webhook] Credited $${amount} ${currency} to user ${userId}`);
    return res.json({ received: true, action: "wallet_credited", amount, userId });
  } catch (error) {
    console.error("[AW Webhook] Error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Webhook processing failed." });
  }
});

app.get("/api/virtual-account/:userId/topups", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) return res.status(400).json({ error: "userId is required." });

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("wallet_topups")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return res.json({ topups: data || [] });
    }

    return res.json({ topups: [] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not load topups." });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE CONNECT - WITHDRAWALS & REFUNDS
// ══════════════════════════════════════════════════════════════════════════════

app.post("/api/stripe-connect/setup", async (req, res) => {
  try {
    const { userId, email, country, roles } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const result = await StripeConnect.setupProviderAccount({
      userId,
      email,
      country: country || 'US',
      roles: roles || ['creator']
    });

    if (result.needsOnboarding) {
      const onboardingUrl = await StripeConnect.createOnboardingLink(result.accountId, userId);
      return res.json({
        success: true,
        accountId: result.accountId,
        needsOnboarding: true,
        onboardingUrl: onboardingUrl
      });
    }

    return res.json({
      success: true,
      accountId: result.accountId,
      needsOnboarding: false,
      payoutsEnabled: result.payoutsEnabled,
      message: 'Account already setup'
    });

  } catch (error) {
    console.error('[Stripe Connect] Setup error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to setup withdrawal account'
    });
  }
});

app.get("/api/stripe-connect/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await StripeConnect.getWithdrawalStatus(userId);
    return res.json(status);
  } catch (error) {
    console.error('[Stripe Connect] Status error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to get status'
    });
  }
});

app.post("/api/stripe-connect/withdraw", async (req, res) => {
  try {
    const { userId, amount, role } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ message: "userId and amount are required" });
    }

    const result = await StripeConnect.requestWithdrawal({
      userId,
      amount: parseFloat(amount),
      role: role || 'creator'
    });

    return res.json(result);

  } catch (error) {
    console.error('[Stripe Connect] Withdrawal error:', error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Withdrawal failed'
    });
  }
});

app.get("/api/stripe-connect/withdrawals/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const history = await StripeConnect.getWithdrawalHistory(userId, limit);
    return res.json(history);
  } catch (error) {
    console.error('[Stripe Connect] History error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to get history'
    });
  }
});

app.post("/api/stripe-connect/refund", async (req, res) => {
  try {
    const {
      paymentId,
      bookingId,
      contentId,
      learnerId,
      providerId,
      providerRole,
      amount,
      reason,
      refundType,
      requestedBy
    } = req.body;

    if (!learnerId || !providerId || !amount || !reason) {
      return res.status(400).json({
        message: "learnerId, providerId, amount, and reason are required"
      });
    }

    const result = await StripeConnect.processRefund({
      paymentId,
      bookingId,
      contentId,
      learnerId,
      providerId,
      providerRole: providerRole || 'creator',
      amount: parseFloat(amount),
      reason,
      refundType: refundType || 'full',
      requestedBy
    });

    return res.json(result);

  } catch (error) {
    console.error('[Stripe Connect] Refund error:', error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Refund failed'
    });
  }
});

app.get("/api/stripe-connect/refunds/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const history = await StripeConnect.getRefundHistory(userId, limit);
    return res.json(history);
  } catch (error) {
    console.error('[Stripe Connect] Refund history error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to get refund history'
    });
  }
});

app.post("/api/stripe-connect/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET || STRIPE_WEBHOOK_SECRET
    );

    console.log('[Stripe Connect Webhook]', event.type);

    switch (event.type) {
      case 'account.updated':
        await StripeConnect.updateProviderAccountStatus(event.data.object.id);
        break;

      case 'transfer.created':
        console.log('Transfer created:', event.data.object.id);
        break;

      case 'transfer.failed':
        console.log('Transfer failed:', event.data.object.id);
        break;

      case 'payout.paid':
        console.log('Payout paid:', event.data.object.id);
        break;

      case 'payout.failed':
        console.log('Payout failed:', event.data.object.id);
        break;
    }

    res.json({ received: true });

  } catch (error) {
    console.error('[Stripe Connect Webhook] Error:', error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Webhook error'
    });
  }
});

// ── Court Room Routes ─────────────────────────────────────────────────────────
// Add Court Room dispute resolution system routes
courtRoomRoutes(app, supabaseAdmin);

// ── Mercy Window Scheduler ────────────────────────────────────────────────────
// Every 5 minutes: find restricted providers with a booking starting in 25–35 mins,
// send them a mercy window email and activate the window exactly 30 mins before.
// Also deactivate judge-granted access records that have expired.
const runMercyWindowScheduler = async () => {
  if (!supabaseAdmin) return;
  try {
    const now = new Date();
    const in25mins = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
    const in35mins = new Date(now.getTime() + 35 * 60 * 1000).toISOString();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    // 1. Find active restrictions
    const { data: restrictions } = await supabaseAdmin
      .from('provider_restrictions')
      .select('provider_id, court_case_id, restriction_metadata')
      .eq('is_active', true)
      .eq('restriction_type', 'dashboard_access');

    if (!restrictions?.length) return;

    for (const restriction of restrictions) {
      const providerId = restriction.provider_id;
      const caseId = restriction.court_case_id;

      // 2. Check if already notified recently (avoid duplicate emails)
      const alreadyNotifiedKey = `mercy_notified_${providerId}_${caseId}`;
      if (restriction.restriction_metadata?.[alreadyNotifiedKey]) continue;

      // 3. Find a confirmed booking in the 30-min window
      const { data: upcomingBooking } = await supabaseAdmin
        .from('bookings')
        .select('id, scheduled_at, learner_id, service_title')
        .or(`provider_id.eq.${providerId},provider_user_id.eq.${providerId}`)
        .eq('status', 'confirmed')
        .gte('scheduled_at', in25mins)
        .lte('scheduled_at', in35mins)
        .limit(1)
        .maybeSingle();

      if (!upcomingBooking) continue;

      // 4. Get the court case for email context
      const { data: courtCase } = await supabaseAdmin
        .from('court_cases')
        .select('case_number')
        .eq('id', caseId)
        .maybeSingle();

      // 5. Calculate mercy window end (30 mins after booking starts)
      const bookingStart = new Date(upcomingBooking.scheduled_at);
      const mercyEnd = new Date(bookingStart.getTime() + 30 * 60 * 1000).toISOString();

      // 6. Send mercy window email
      await courtRoomEmailService.sendMercyWindowNotice(
        { provider_id: providerId },
        {
          scheduled_at: upcomingBooking.scheduled_at,
          mercy_end_time: new Date(mercyEnd).toLocaleString(),
          learner_id: upcomingBooking.learner_id,
        },
        { case_number: courtCase?.case_number || 'N/A' }
      );

      // 7. Mark as notified so we don't send again for this session
      await supabaseAdmin
        .from('provider_restrictions')
        .update({
          restriction_metadata: {
            ...restriction.restriction_metadata,
            [alreadyNotifiedKey]: true,
            last_mercy_notified_at: now.toISOString(),
          }
        })
        .eq('provider_id', providerId)
        .eq('court_case_id', caseId)
        .eq('is_active', true);

      console.log(`[Mercy Scheduler] Sent mercy window email to provider ${providerId} for booking at ${upcomingBooking.scheduled_at}`);
    }

    // 8. Expire judge-granted access records past their expiry
    await supabaseAdmin
      .from('provider_restrictions')
      .update({ is_active: false, deactivated_at: now.toISOString() })
      .eq('restriction_type', 'judge_granted_access')
      .eq('is_active', true)
      .lt('restriction_metadata->>expires_at', now.toISOString());

  } catch (err) {
    console.error('[Mercy Scheduler] Error:', err);
  }
};

// Run immediately on startup then every 5 minutes
runMercyWindowScheduler();
setInterval(runMercyWindowScheduler, 5 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Payment provider: ${stripe ? "Stripe (live)" : "Demo mode"}`);
  console.log(`Database: ${supabaseAdmin ? "Supabase connected" : "Demo mode (no DB)"}`);
});