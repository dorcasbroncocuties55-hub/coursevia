/**
 * STRIPE CONNECT - EXPRESS ROUTES (fixed)
 *
 * Fixes vs. the original:
 *  - `supabase` is now actually imported (it was undefined before —
 *    every route that used it would have thrown).
 *  - Every route that acts on a specific userId now checks that the
 *    authenticated caller IS that user (or an admin), verified via
 *    Supabase Auth — see `requireAuth` / `requireSelfOrAdmin` below.
 *  - Webhook route now hard-fails if signature verification isn't
 *    possible, instead of falling back to unauthenticated JSON.parse.
 *  - Added POST /withdraw, which the original routes file never had.
 *
 * HOW AUTH WORKS HERE (Supabase Auth):
 * The frontend must send the user's Supabase access token on every
 * request to these routes, as a standard bearer header:
 *   Authorization: Bearer <supabase_access_token>
 * That token is what `supabase.auth.getSignInWithPassword` /
 * `supabase.auth.getSession()` gives you on the client after login —
 * grab it with `(await supabase.auth.getSession()).data.session.access_token`
 * on the frontend and attach it to your fetch/axios calls.
 */

import express from "express";
import {
    createConnectAccount,
    generateOnboardingLink,
    createDashboardLink,
    getAccountStatus,
    constructWebhookEvent,
    handleConnectWebhook,
    validateVendorData,
    supabase,
} from "./stripe-connect-core.js";
import { requestWithdrawal } from "./stripe-connect-payouts.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────
// Verifies the Supabase access token on every request and attaches
// the real, server-verified user to req.supabaseUser. Never trust a
// userId that just arrives in the request body/params — that's what
// requireSelfOrAdmin checks below against this verified identity.
// ─────────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, error: "Missing bearer token" });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
        return res.status(401).json({ success: false, error: "Invalid or expired session" });
    }

    req.supabaseUser = data.user; // { id, email, ... } — id is the real, verified user_id
    next();
}

// ─────────────────────────────────────────────────────────────────
// Requires requireAuth to have run first. Confirms the verified user
// IS the userId the request is acting on (or has role: 'admin' in
// their profiles row).
// ─────────────────────────────────────────────────────────────────
async function requireSelfOrAdmin(req, res, next) {
    const targetUserId = req.params.userId || req.body.userId;
    const callerId = req.supabaseUser?.id;

    if (!callerId) {
        return res.status(401).json({ success: false, error: "Authentication required" });
    }

    if (callerId === targetUserId) return next();

    const { data: callerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", callerId)
        .single();

    if (callerProfile?.role === "admin") return next();

    return res.status(403).json({ success: false, error: "Not authorized for this account" });
}

// ═══════════════════════════════════════════════════════════════════
// CONNECT ACCOUNT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

router.post("/setup", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
        const { email, userId, role, country, businessInfo } = req.body;

        const validation = validateVendorData({ email, userId, role });
        if (!validation.isValid) {
            return res.status(400).json({ success: false, error: "Validation failed", details: validation.errors });
        }

        const accountResult = await createConnectAccount({
            email,
            userId,
            role,
            country: country || "GB",
            businessInfo: businessInfo || {},
        });

        let onboardingUrl = null;
        if (!accountResult.isExisting) {
            const linkResult = await generateOnboardingLink(accountResult.accountId, userId, role);
            onboardingUrl = linkResult.url;
        }

        res.json({
            success: true,
            accountId: accountResult.accountId,
            isExisting: accountResult.isExisting,
            onboardingUrl,
            message: accountResult.isExisting ? "Account already exists" : "Account created, complete onboarding",
        });
    } catch (error) {
        console.error("Setup error:", error.message);
        res.status(500).json({ success: false, error: "Setup failed", message: error.message });
    }
});

router.get("/status/:userId", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: profile } = await supabase
            .from("profiles")
            .select("stripe_account_id, stripe_connect_status, stripe_payouts_enabled")
            .eq("user_id", userId)
            .single();

        if (!profile?.stripe_account_id) {
            return res.json({ success: true, connected: false, status: "not_connected", message: "No Stripe account found" });
        }

        const statusResult = await getAccountStatus(profile.stripe_account_id);

        res.json({ success: true, connected: true, accountId: profile.stripe_account_id, ...statusResult.status });
    } catch (error) {
        console.error("Status check error:", error.message);
        res.status(500).json({ success: false, error: "Status check failed", message: error.message });
    }
});

router.post("/refresh-link", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
        const { userId, role } = req.body;

        const { data: profile } = await supabase
            .from("profiles")
            .select("stripe_account_id")
            .eq("user_id", userId)
            .single();

        if (!profile?.stripe_account_id) {
            return res.status(404).json({ success: false, error: "Account not found", message: "No Stripe account exists for this user" });
        }

        const linkResult = await generateOnboardingLink(profile.stripe_account_id, userId, role);
        res.json({ success: true, onboardingUrl: linkResult.url, expiresAt: linkResult.expires_at });
    } catch (error) {
        console.error("Refresh link error:", error.message);
        res.status(500).json({ success: false, error: "Link generation failed", message: error.message });
    }
});

router.post("/dashboard-link", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
        const { userId } = req.body;

        const { data: profile } = await supabase
            .from("profiles")
            .select("stripe_account_id, stripe_payouts_enabled")
            .eq("user_id", userId)
            .single();

        if (!profile?.stripe_account_id) {
            return res.status(404).json({ success: false, error: "Account not found" });
        }
        if (!profile.stripe_payouts_enabled) {
            return res.status(400).json({ success: false, error: "Account not fully verified", message: "Complete onboarding first" });
        }

        const linkResult = await createDashboardLink(profile.stripe_account_id);
        res.json({ success: true, dashboardUrl: linkResult.url, expiresAt: linkResult.expires_at });
    } catch (error) {
        console.error("Dashboard link error:", error.message);
        res.status(500).json({ success: false, error: "Dashboard link creation failed", message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════
// WITHDRAWALS
// ═══════════════════════════════════════════════════════════════════

router.post("/withdraw", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
        const { userId, amount, role } = req.body;
        const result = await requestWithdrawal({ userId, amount, role });
        res.json(result);
    } catch (error) {
        console.error("Withdrawal error:", error.message);
        res.status(400).json({ success: false, error: "Withdrawal failed", message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK
// Note: `express.raw` MUST run before any app-level express.json() for
// this path, or the raw bytes Stripe needs for signature verification
// will already have been consumed/mutated by the JSON parser. If you
// mount a global `app.use(express.json())`, make sure this router (or
// at least this route) is registered before that, or is excluded from it.
// ═══════════════════════════════════════════════════════════════════

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        const event = constructWebhookEvent(req.body, req.headers["stripe-signature"]);

        if (event.type.startsWith("account.")) {
            const result = await handleConnectWebhook(event);
            return res.json({ received: true, processed: result.success, eventType: event.type });
        }

        res.json({ received: true, processed: false, eventType: event.type });
    } catch (error) {
        // Includes signature-verification failures and missing-secret errors —
        // both should be rejected, not processed.
        console.error("Webhook error:", error.message);
        res.status(400).json({ error: "Webhook processing failed", message: error.message });
    }
});

export default router;