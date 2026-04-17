
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getBanks } from "./bankData.js";

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

// Didit KYC
const DIDIT_CLIENT_ID = process.env.DIDIT_CLIENT_ID || "";
const DIDIT_API_KEY = process.env.DIDIT_API_KEY || "";
const DIDIT_BASE_URL = process.env.DIDIT_BASE_URL || "https://api.didit.me";
const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET || "";

// Persona KYC (Legacy)
const PERSONA_API_KEY = process.env.PERSONA_API_KEY || "";
const PERSONA_TEMPLATE_ID = process.env.PERSONA_TEMPLATE_ID || "persona_sandbox_59ce022a-0305-4892-84fd-4bc3482399d5";
const PERSONA_BASE_URL = process.env.PERSONA_BASE_URL || "https://withpersona.com/api/v1";
const PERSONA_WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET || "";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" }) : null;

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
  // Fire and forget - don't await, don't block the checkout flow
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
    
    // Send booking confirmation emails
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

// Persona helpers
const personaHeaders = () => ({ Authorization: `Bearer ${PERSONA_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" });
const normalizePersonaStatus = (status = "") => {
  const v = String(status).toLowerCase();
  if (["approved", "completed", "passed", "success"].includes(v)) return "approved";
  if (["declined", "failed", "rejected", "requires_retry"].includes(v)) return "rejected";
  return v || "pending";
};
const isPersonaWebhookAuthorized = (req) => {
  if (!PERSONA_WEBHOOK_SECRET) return true;
  const token = req.headers["persona-signature"] || req.headers["x-persona-signature"] || "";
  return token === PERSONA_WEBHOOK_SECRET;
};

// In-memory fallbacks
const demoStore = new Map();
const payoutAccountsMemory = new Map();
const payoutWithdrawalsMemory = new Map();
const payoutVerificationCodes = new Map();
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

// Health check - used by UptimeRobot to keep server awake
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ name: "Coursevia API", status: "running", version: "1.0.0" });
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

// POST /api/subscriptions/initialize — creates a Stripe Checkout Session for subscriptions
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

      // Use recurring price ID if available, otherwise fall back to one-time payment
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

    // Demo fallback
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

// POST /api/checkout/initialize — creates a Stripe Checkout Session for one-off payments
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

    // Demo / zero-amount fallback
    const redirectBase = callbackUrl || `${APP_URL}/billing/subscription-callback`;
    const authUrl = `${redirectBase}${redirectBase.includes("?") ? "&" : "?"}reference=${encodeURIComponent(reference)}&demo=1`;
    demoStore.set(reference, { type: normalizedType, userId, amount: numericAmount, contentId: contentId || null, plan: plan || null });
    return res.json({ success: true, reference, redirect_url: authUrl, authorization_url: authUrl, message: numericAmount > 0 ? "Demo checkout initialized." : "No-payment checkout initialized." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Could not initialize checkout." });
  }
});

// GET /api/checkout/verify — verify a Stripe payment by reference
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

// GET /api/checkout/config — diagnostic
app.get("/api/checkout/config", (req, res) => {
  res.json({ 
    mode: stripe ? "live" : "demo", 
    provider: "stripe", 
    currency: CURRENCY, 
    app_url: APP_URL,
    base_url: APP_URL 
  });
});

// POST /api/checkout/charge — charge a card token directly
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
        // Create payment intent with the card token
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

    // Demo mode fallback
    const demoSuccess = Math.random() > 0.1; // 90% success rate in demo
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

// POST /api/webhooks/stripe — Stripe webhook handler
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
        console.log(`[Stripe Webhook] ✓ Payment verified: ${reference}`);
      }
    }

    if (["payment_intent.payment_failed", "checkout.session.expired"].includes(type) && supabaseAdmin) {
      const metadata = obj.metadata || {};
      const reference = metadata.reference || "";
      if (reference) {
        await supabaseAdmin.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("reference_id", reference);
        console.log(`[Stripe Webhook] ✗ Payment failed: ${reference}`);
      }
    }

    return res.json({ received: true, type });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Webhook error." });
  }
});

// ── KYC / Didit ─────────────────────────────────────────────────────────────

const diditHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${DIDIT_API_KEY}`,
  "X-Client-Id": DIDIT_CLIENT_ID,
});

const normalizeDiditStatus = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "verified" || s === "completed") return "approved";
  if (s === "rejected" || s === "declined" || s === "failed") return "rejected";
  if (s === "pending" || s === "in_progress" || s === "processing") return "pending";
  return "pending";
};

app.post("/api/kyc/didit/session", async (req, res) => {
  try {
    if (!DIDIT_API_KEY || !DIDIT_CLIENT_ID) {
      return res.status(500).json({ message: "Didit KYC is not configured." });
    }

    const { userId, email, fullName, country, phone, role } = req.body || {};
    if (!userId || !role) {
      return res.status(400).json({ message: "userId and role are required." });
    }

    const payload = {
      vendor_data: userId, // IMPORTANT: This is how we identify the user in webhook
      email: email || undefined,
      full_name: fullName || undefined,
      country: country || undefined,
      phone: phone || undefined,
      metadata: {
        role,
        platform: "coursevia",
        user_id: userId, // Backup identifier
      },
      callback_url: `${APP_URL}/api/kyc/didit/webhook`,
      redirect_url: `${APP_URL}/dashboard`,
    };

    const response = await fetch(`${DIDIT_BASE_URL}/v1/verifications`, {
      method: "POST",
      headers: diditHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error("Didit API error:", json);
      return res.status(response.status).json({
        message: json?.message || "Could not create Didit verification session.",
        details: json,
      });
    }

    const verificationId = json?.id || json?.verification_id || json?.session_id;
    const verificationUrl = json?.url || json?.verification_url || json?.session_url;

    if (supabaseAdmin && verificationId) {
      await supabaseAdmin.from("verification_requests").insert({
        user_id: userId,
        verification_type: "provider_identity",
        provider: "didit",
        inquiry_id: verificationId,
        status: "pending",
        verification_method: "api",
        decision_payload: json,
      });
    }

    return res.json({
      provider: "didit",
      verificationId,
      verificationUrl,
      clientId: DIDIT_CLIENT_ID,
    });
  } catch (error) {
    console.error("Didit session error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Unknown KYC error.",
    });
  }
});

app.post("/api/kyc/didit/webhook", async (req, res) => {
  try {
    const payload = req.body || {};
    
    // Didit webhook structure based on actual webhook JSON
    const webhookType = payload?.webhook_type || "unknown";
    const sessionId = payload?.session_id;
    const workflowId = payload?.workflow_id;
    const vendorData = payload?.vendor_data; // This is the userId we sent
    const decision = payload?.decision || {};
    
    // Extract status from decision object (nested structure)
    const rawStatus = decision?.status || payload?.status || "pending";
    const status = normalizeDiditStatus(rawStatus);
    
    // Extract user_id from vendor_data (primary) or decision metadata
    const userId = vendorData || decision?.vendor_data || payload?.metadata?.user_id;
    
    // Extract user details from id_verifications array
    const idVerifications = decision?.id_verifications || [];
    const idVerification = idVerifications[0] || {};
    
    const userDetails = {
      full_name: idVerification?.full_name || null,
      first_name: idVerification?.first_name || null,
      last_name: idVerification?.last_name || null,
      date_of_birth: idVerification?.date_of_birth || null,
      document_type: idVerification?.document_type || null,
      document_number: idVerification?.document_number || null,
      nationality: idVerification?.nationality || null,
      issuing_state: idVerification?.issuing_state || null,
      address: idVerification?.address || idVerification?.formatted_address || null,
    };

    console.log("Didit webhook received:", {
      webhookType,
      sessionId,
      userId,
      status,
      workflowId,
      userDetails,
    });

    if (supabaseAdmin && userId && sessionId) {
      // Update profile KYC status
      const updateData = {
        kyc_status: status,
        kyc_provider: "didit",
        kyc_inquiry_id: sessionId,
        is_verified: status === "approved",
        verified_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      
      // Add verified user details if approved
      if (status === "approved" && userDetails.full_name) {
        updateData.verified_name = userDetails.full_name;
        updateData.verified_document_type = userDetails.document_type;
        updateData.verified_nationality = userDetails.nationality;
      }
      
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);

      if (profileError) {
        console.error("Didit webhook profile update error:", profileError);
      } else {
        console.log(`Profile updated for user ${userId}: ${status}`);
      }

      // Update or create verification request
      const { error: requestError } = await supabaseAdmin
        .from("verification_requests")
        .upsert({
          user_id: userId,
          inquiry_id: sessionId,
          provider: "didit",
          verification_type: "provider_identity",
          status,
          decision_payload: payload,
          reviewed_at: new Date().toISOString(),
          verification_method: "api",
        }, {
          onConflict: "inquiry_id,user_id"
        });

      if (requestError) {
        console.error("Didit webhook request update error:", requestError);
      }

      // Log verification event
      await supabaseAdmin.from("provider_verification_events").insert({
        user_id: userId,
        provider: "didit",
        inquiry_id: sessionId,
        event_type: webhookType,
        payload,
      });
    } else {
      console.warn("Missing required data:", { userId, sessionId });
    }

    return res.json({
      received: true,
      provider: "didit",
      webhookType,
      sessionId,
      userId,
      status,
    });
  } catch (error) {
    console.error("Didit webhook error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Webhook processing failed.",
    });
  }
});

app.get("/api/kyc/didit/status/:verificationId", async (req, res) => {
  try {
    if (!DIDIT_API_KEY || !DIDIT_CLIENT_ID) {
      return res.status(500).json({ message: "Didit KYC is not configured." });
    }

    const { verificationId } = req.params;

    const response = await fetch(`${DIDIT_BASE_URL}/v1/verifications/${verificationId}`, {
      method: "GET",
      headers: diditHeaders(),
    });

    const json = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Could not fetch verification status.",
        details: json,
      });
    }

    const status = normalizeDiditStatus(json?.status);

    return res.json({
      verificationId,
      status,
      data: json,
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Status check failed.",
    });
  }
});

// ── KYC / Persona (Legacy) ─────────────────────────────────────────────────────────────

app.post("/api/kyc/persona/session", async (req, res) => {
  try {
    if (!PERSONA_API_KEY || !PERSONA_TEMPLATE_ID) return res.status(500).json({ message: "Persona KYC is not configured." });
    const { userId, email, fullName, country, phone, role, preferredDocument = "national_id" } = req.body || {};
    if (!userId || !role) return res.status(400).json({ message: "userId and role are required." });

    const payload = {
      data: {
        type: "inquiry",
        attributes: {
          template_id: PERSONA_TEMPLATE_ID,
          note: `${role} verification`,
          reference_id: userId,
          payload: { user_id: userId, role, preferred_document: preferredDocument, country: country || null, phone: phone || null },
          redirect_uri: `${APP_URL}/onboarding`,
        },
        relationships: {
          account: { data: { type: "account", attributes: { reference_id: userId, name: fullName || email || `user-${userId}`, email_address: email || undefined } } },
        },
      },
    };

    const response = await fetch(`${PERSONA_BASE_URL}/inquiries`, { method: "POST", headers: personaHeaders(), body: JSON.stringify(payload) });
    const json = await response.json();
    if (!response.ok) return res.status(response.status).json({ message: json?.errors?.[0]?.detail || "Could not create Persona inquiry.", details: json });

    const inquiryId = json?.data?.id;
    const inquiryUrl = json?.data?.attributes?.inquiry_url || json?.data?.attributes?.redirect_uri || null;

    if (supabaseAdmin && inquiryId) {
      await supabaseAdmin.from("verification_requests").insert({ user_id: userId, verification_type: "provider_identity", provider: "persona", inquiry_id: inquiryId, status: "pending", verification_method: "api", document_type: preferredDocument, decision_payload: json });
    }

    return res.json({ provider: "persona", inquiryId, inquiryUrl, templateId: PERSONA_TEMPLATE_ID });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Unknown KYC error." });
  }
});

app.post("/api/kyc/persona/webhook", async (req, res) => {
  try {
    if (!isPersonaWebhookAuthorized(req)) return res.status(401).json({ message: "Unauthorized Persona webhook." });

    const payload = req.body || {};
    const eventType = payload?.data?.attributes?.name || payload?.type || "unknown";
    const included = Array.isArray(payload?.included) ? payload.included : [];
    const inquiry = included.find((e) => e?.type === "inquiry") || payload?.data || {};
    const inquiryId = inquiry?.id || null;
    const inquiryAttributes = inquiry?.attributes || payload?.data?.attributes || {};
    const referenceId = inquiryAttributes?.reference_id || inquiryAttributes?.payload?.user_id || null;
    const rawStatus = inquiryAttributes?.status || (eventType.includes("approved") ? "approved" : eventType.includes("declined") ? "rejected" : "pending");
    const status = normalizePersonaStatus(rawStatus);
    const documentVerification = included.find((e) => e?.type === "verification/government-id");
    const selfieVerification = included.find((e) => e?.type === "verification/selfie");
    const documentType = documentVerification?.attributes?.id_class || null;
    const faceMatchStatus = selfieVerification?.attributes?.status || null;

    if (supabaseAdmin && referenceId) {
      const { error } = await supabaseAdmin.rpc("apply_provider_verification_decision", { p_user_id: referenceId, p_provider: "persona", p_inquiry_id: inquiryId, p_status: status, p_document_type: documentType, p_face_match_status: faceMatchStatus, p_payload: payload });
      if (error) console.error("Persona webhook RPC error", error);
      await supabaseAdmin.from("provider_verification_events").insert({ user_id: referenceId, provider: "persona", inquiry_id: inquiryId, event_type: eventType, payload });
    }

    return res.json({ received: true, provider: "persona", eventType, inquiryId, referenceId, status });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Unknown Persona webhook error." });
  }
});

// ── Payouts ───────────────────────────────────────────────────────────────────

app.get("/api/payouts/accounts", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "").trim();
    if (!userId) return res.status(400).json({ error: "user_id is required." });
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("bank_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (!error) return res.json({ accounts: data || [] });
    }
    return res.json({ accounts: listMemory(payoutAccountsMemory, userId) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not load payout accounts." });
  }
});

app.get("/api/payouts/withdrawals", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "").trim();
    if (!userId) return res.status(400).json({ error: "user_id is required." });
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("withdrawals").select("id, amount, status, created_at").eq("user_id", userId).order("created_at", { ascending: false });
      if (!error) return res.json({ withdrawals: data || [] });
    }
    return res.json({ withdrawals: listMemory(payoutWithdrawalsMemory, userId) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not load withdrawals." });
  }
});

app.get("/api/payouts/capabilities", async (req, res) => {
  const country = String(req.query.country || "").trim().toUpperCase();
  const currency = String(req.query.currency || "USD").trim().toUpperCase();
  if (!country) return res.status(400).json({ error: "country is required." });
  return res.json({ capability: { country_code: country, currency, provider: "Coursevia", rails: ["swift", "iban", "local_bank"], supports_account_resolve: true, verification_mode: "code", supported: true } });
});

app.get("/api/payouts/banks", async (req, res) => {
  const country = String(req.query.country || "").trim().toUpperCase();
  const query = String(req.query.query || "").trim();
  if (!country) return res.status(400).json({ error: "country is required." });
  return res.json({ banks: getBanks(country, query) });
});

app.post("/api/payouts/resolve-beneficiary", async (req, res) => {
  const { account_number: accountNumber, bank_code: bankCode, country_code: countryCode, account_name: accountName } = req.body || {};
  if (!accountNumber) return res.status(400).json({ error: "account_number is required." });
  const country = String(countryCode || "").toUpperCase();

  if (country === "NG" && NUBAN_API_KEY && bankCode) {
    try {
      const url = `https://app.nuban.com.ng/api/${NUBAN_API_KEY}?bank_code=${encodeURIComponent(bankCode)}&account_no=${encodeURIComponent(accountNumber)}`;
      const r = await fetch(url);
      const json = await r.json().catch(() => ({}));
      const name = (Array.isArray(json) ? json[0]?.account_name : json?.account_name) || null;
      if (name) return res.json({ account_name: name, resolved: true });
    } catch { /* fall through */ }
  }

  return res.json({ account_name: accountName || null, resolved: false, note: "Please enter the account holder name manually." });
});

app.post("/api/payouts/send-verification", async (req, res) => {
  try {
    const { user_id: userId, country_code: countryCode, bank_name: bankName, bank_code: bankCode, account_number: accountNumber, account_name: accountName, swift_code: swiftCode, iban, payout_method_type: payoutMethodType, currency } = req.body || {};
    if (!userId || !countryCode || !bankName || !accountNumber) return res.status(400).json({ error: "user_id, country_code, bank_name, and account_number are required." });

    const account = { id: crypto.randomUUID(), user_id: userId, bank_name: bankName, bank_code: bankCode || null, account_name: accountName || `Verified Holder ${String(accountNumber).slice(-4)}`, account_number: accountNumber, country_code: String(countryCode).toUpperCase(), currency: currency || "USD", provider: "Coursevia", verification_status: "pending", verification_method: "code", is_default: false, metadata: { swift_code: swiftCode || null, iban: iban || null, payout_method_type: payoutMethodType || "swift" }, created_at: new Date().toISOString() };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("bank_accounts").insert(account).select("*").single();
      if (!error && data) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        payoutVerificationCodes.set(data.id, code);
        return res.json({ account: data, verification_required: true, message: "Verification code sent.", dev_code: code });
      }
    }

    const rows = listMemory(payoutAccountsMemory, userId);
    rows.unshift(account);
    setMemory(payoutAccountsMemory, userId, rows);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    payoutVerificationCodes.set(account.id, code);
    return res.json({ account, verification_required: true, message: "Verification code sent.", dev_code: code });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not create payout account." });
  }
});

app.post("/api/payouts/verify-beneficiary", async (req, res) => {
  try {
    const { user_id: userId, bank_account_id: bankAccountId, code } = req.body || {};
    if (!userId || !bankAccountId || !code) return res.status(400).json({ error: "user_id, bank_account_id, and code are required." });
    const expectedCode = payoutVerificationCodes.get(bankAccountId);
    if (expectedCode && String(expectedCode) !== String(code)) return res.status(400).json({ error: "Invalid verification code." });

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("bank_accounts").update({ verification_status: "verified" }).eq("id", bankAccountId).eq("user_id", userId);
      if (!error) { payoutVerificationCodes.delete(bankAccountId); return res.json({ success: true }); }
    }

    const rows = listMemory(payoutAccountsMemory, userId).map((r) => r.id === bankAccountId ? { ...r, verification_status: "verified" } : r);
    setMemory(payoutAccountsMemory, userId, rows);
    payoutVerificationCodes.delete(bankAccountId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not verify payout account." });
  }
});

app.delete("/api/payouts/accounts/:id", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "").trim();
    const accountId = String(req.params.id || "").trim();
    if (!userId || !accountId) return res.status(400).json({ error: "user_id and account id are required." });
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("bank_accounts").delete().eq("id", accountId).eq("user_id", userId);
      if (!error) return res.json({ success: true });
    }
    const rows = listMemory(payoutAccountsMemory, userId).filter((r) => r.id !== accountId);
    setMemory(payoutAccountsMemory, userId, rows);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not remove payout account." });
  }
});

app.post("/api/payouts/withdraw", async (req, res) => {
  try {
    const { user_id: userId, amount, bank_account_id: bankAccountId } = req.body || {};
    const numericAmount = safeNumber(amount, 0);
    if (!userId || !bankAccountId || numericAmount <= 0) return res.status(400).json({ error: "user_id, bank_account_id, and a valid amount are required." });

    if (supabaseAdmin) {
      const { data: wallet, error: walletError } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId).maybeSingle();
      if (!walletError && wallet) {
        const available = safeNumber(wallet.available_balance ?? wallet.balance, 0);
        if (numericAmount > available) return res.status(400).json({ error: "Amount exceeds available balance." });
        const withdrawal = { id: crypto.randomUUID(), user_id: userId, bank_account_id: bankAccountId, amount: numericAmount, status: "pending", created_at: new Date().toISOString() };
        const insertResult = await supabaseAdmin.from("withdrawals").insert(withdrawal);
        if (!insertResult.error) {
          await supabaseAdmin.from("wallets").update({ available_balance: Math.max(0, available - numericAmount), balance: Math.max(0, safeNumber(wallet.balance, 0) - numericAmount) }).eq("user_id", userId);
          return res.json({ success: true, withdrawal });
        }
      }
    }

    const withdrawals = listMemory(payoutWithdrawalsMemory, userId);
    const withdrawal = { id: crypto.randomUUID(), amount: numericAmount, status: "pending", created_at: new Date().toISOString() };
    withdrawals.unshift(withdrawal);
    setMemory(payoutWithdrawalsMemory, userId, withdrawals);
    return res.json({ success: true, withdrawal });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not create withdrawal." });
  }
});

// ── Stripe Connect (Real Bank Verification & Payouts) ────────────────────────

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID || "";

/**
 * POST /api/connect/onboard
 * Creates a Stripe Connect Express account for a provider.
 * Provider completes KYC + bank setup directly on Stripe's hosted page.
 */
app.post("/api/connect/onboard", async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured." });

    const { user_id: userId, email, role = "coach" } = req.body || {};
    if (!userId || !email) return res.status(400).json({ error: "user_id and email are required." });

    // Check if provider already has a Connect account
    let stripeAccountId = null;
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("stripe_account_id").eq("user_id", userId).maybeSingle();
      stripeAccountId = profile?.stripe_account_id || null;
    }

    // Create new Express account if none exists
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

    // Generate onboarding link — provider fills in bank + identity on Stripe
    const returnBase = `${APP_URL}/${role}/bank-accounts`;
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${returnBase}?connect=refresh`,
      return_url:  `${returnBase}?connect=success`,
      type: "account_onboarding",
    });

    return res.json({ success: true, onboarding_url: accountLink.url, stripe_account_id: stripeAccountId });
  } catch (error) {
    console.error("[Connect] Onboard error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not start onboarding." });
  }
});

/**
 * GET /api/connect/status?user_id=xxx
 * Returns the provider's Stripe Connect account status.
 */
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

/**
 * POST /api/connect/dashboard-link
 * Returns a link to the provider's Stripe Express dashboard.
 */
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

/**
 * POST /api/connect/payout
 * Transfers funds from platform to provider's connected Stripe account,
 * then triggers a payout to their bank. Fully reflected in Stripe dashboard.
 */
app.post("/api/connect/payout", async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured." });

    const { user_id: userId, amount, withdrawal_id: withdrawalId, currency = CURRENCY } = req.body || {};
    const numericAmount = safeNumber(amount, 0);
    if (!userId || numericAmount <= 0) return res.status(400).json({ error: "user_id and a valid amount are required." });

    // Get provider's Stripe Connect account
    let stripeAccountId = null;
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("stripe_account_id").eq("user_id", userId).maybeSingle();
      stripeAccountId = profile?.stripe_account_id || null;
    }

    if (!stripeAccountId) {
      return res.status(400).json({ error: "Provider has not connected their bank via Stripe. Ask them to complete onboarding from their Bank Accounts page." });
    }

    // Verify account can receive payouts
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.payouts_enabled) {
      return res.status(400).json({ error: "Provider's Stripe account is not yet verified. They need to complete their Stripe onboarding." });
    }

    // Step 1: Transfer from platform → provider's connected account
    const transfer = await stripe.transfers.create({
      amount: toCents(numericAmount),
      currency: currency.toLowerCase(),
      destination: stripeAccountId,
      description: `Coursevia earnings payout${withdrawalId ? ` (${withdrawalId})` : ""}`,
      metadata: { user_id: userId, withdrawal_id: withdrawalId || "" },
    });

    // Step 2: Trigger payout from connected account → provider's bank
    const payout = await stripe.payouts.create(
      {
        amount: toCents(numericAmount),
        currency: currency.toLowerCase(),
        description: "Coursevia earnings",
        metadata: { user_id: userId, withdrawal_id: withdrawalId || "" },
      },
      { stripeAccount: stripeAccountId }
    );

    // Update withdrawal record
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

/**
 * POST /api/webhooks/stripe-connect
 * Handles Connect events: account verified, payout paid/failed.
 */
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

      // Auto-verify bank accounts when Stripe confirms the account
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

// Refund request for a payment (course, video, booking)
app.post("/api/refunds/request-payment", async (req, res) => {
  try {
    const { payment_id, user_id, reason } = req.body || {};
    if (!payment_id || !user_id || !reason?.trim()) return res.status(400).json({ message: "payment_id, user_id, and reason are required." });
    if (!supabaseAdmin) return res.status(503).json({ message: "Database not configured." });

    const { data: payment } = await supabaseAdmin.from("payments").select("*").eq("id", payment_id).eq("payer_id", user_id).maybeSingle();
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (!["completed", "success", "approved"].includes(payment.status)) return res.status(400).json({ message: "Only completed payments can be refunded." });

    // 7-day window
    const paidAt = new Date(payment.created_at);
    const windowEnd = new Date(paidAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > windowEnd) return res.status(400).json({ message: "Refund window has closed. Requests must be submitted within 7 days of purchase." });

    // No duplicate
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

    return res.json({ success: true, refund, message: "Refund request submitted. Admin will review within 24–48 hours." });
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

    return res.json({ success: true, refund, message: "Refund request submitted. Admin will review within 24–48 hours." });
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

    // ── Try Stripe refund to original payment method first ──────────────────
    if (stripe && refund.payment_id) {
      try {
        // Find the Stripe payment intent from our payments table
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("reference_id, payment_method")
          .eq("id", refund.payment_id)
          .maybeSingle();

        if (payment?.reference_id) {
          // Look up the Stripe PaymentIntent by our reference
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

    // ── Wallet fallback if Stripe refund not possible ────────────────────────
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
          description: `Refund approved — credited to wallet (original payment method unavailable)`,
          balance_after: newBal,
        });
      }
    }

    // ── Mark refund processed ────────────────────────────────────────────────
    await supabaseAdmin.from("refunds").update({
      status: "processed",
      processed_at: new Date().toISOString(),
      refund_method: refundMethod,
      stripe_refund_id: stripeRefundId,
    }).eq("id", refund_id);

    // Cancel booking if applicable
    if (refund.booking_id) {
      await supabaseAdmin.from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", refund.booking_id)
        .in("status", ["pending", "confirmed"]);
    }

    // Notify user
    const methodMsg = refundMethod === "stripe_original"
      ? "The refund has been sent to your original payment method and should appear within 5–10 business days."
      : "The refund has been credited to your Coursevia wallet.";

    await supabaseAdmin.from("notifications").insert({
      user_id: refund.user_id,
      title: "Refund Approved",
      message: `Your refund of $${amount.toFixed(2)} has been approved. ${methodMsg}`,
      type: "refund",
    }).catch(() => {});

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

    // Notify user
    await supabaseAdmin.from("notifications").insert({
      user_id: refund.user_id,
      title: "Refund Request Update",
      message: reject_reason?.trim()
        ? `Your refund request of $${Number(refund.amount).toFixed(2)} was not approved. Reason: ${reject_reason.trim()}`
        : `Your refund request of $${Number(refund.amount).toFixed(2)} was reviewed and not approved.`,
      type: "refund",
    }).catch(() => {});

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

    // Format email content based on service mode
    const learnerEmailContent = service_mode === "in_person"
      ? `Your in-person session with ${provider_name} is confirmed!\n\nSession Details:\n- Service: ${service_title}\n- Date & Time: ${scheduled_at}\n- Location: ${office_address || "Contact provider for address"}${provider_phone ? `\n- Phone: ${provider_phone}` : ""}\n\nPlease arrive 5-10 minutes early.`
      : `Your online session with ${provider_name} is confirmed!\n\nSession Details:\n- Service: ${service_title}\n- Date & Time: ${scheduled_at}\n- You will receive a meeting link via email before the session.`;

    const providerEmailContent = `New booking received!\n\n${learner_name} has booked a ${service_mode} session with you.\n\nBooking Details:\n- Service: ${service_title}\n- Date & Time: ${scheduled_at}\n- Mode: ${service_mode === "in_person" ? "In-Person" : "Online"}\n${service_mode === "in_person" ? `- Location: ${office_address}${provider_phone ? `\n- Contact: ${provider_phone}` : ""}` : ""}\n\nPlease confirm and prepare for the session.`;

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, log the email details
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

    // Store notification in database
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

    // TODO: Integrate with email service
    console.log("[Email] Welcome email:", {
      to: email,
      name: full_name,
      role,
    });

    // Store notification
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

// Auto-release pending wallet balances every 6 hours
// Moves funds from pending_balance → available_balance after 8-day hold
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

// Run on startup then every 6 hours
releasePendingBalances();
setInterval(releasePendingBalances, 6 * 60 * 60 * 1000);

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "Coursevia Backend",
    stripe: stripe ? "live" : "demo",
    db: supabaseAdmin ? "connected" : "demo"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Payment provider: ${stripe ? "Stripe (live)" : "Demo mode"}`);
  console.log(`Database: ${supabaseAdmin ? "Supabase connected" : "Demo mode (no DB)"}`);
});
