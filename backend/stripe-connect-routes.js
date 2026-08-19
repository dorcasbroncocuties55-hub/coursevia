/**
 * STRIPE CONNECT - EXPRESS ROUTES
 * Production-ready marketplace integration routes
 */

import express from "express";
import {
  updatePlatformSettings,
  createConnectAccount,
  generateOnboardingLink,
  handleOnboardingSuccess,
  handleConnectWebhook,
  getAccountStatus,
  validateVendorData,
  createDashboardLink
} from "./stripe-connect-enhanced.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// CONNECT ACCOUNT MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/connect/setup
 * Creates Express account and generates onboarding link
 * Body: { email, userId, role, country?, businessInfo? }
 */
router.post("/setup", async (req, res) => {
  try {
    const { email, userId, role, country, businessInfo } = req.body;

    // Validate input data
    const validation = validateVendorData({ email, userId, role });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors
      });
    }

    console.log(`🚀 Setting up Stripe Connect for ${role}: ${email}`);

    // Create or retrieve Connect account
    const accountResult = await createConnectAccount({
      email,
      userId,
      role,
      country: country || "GB",
      businessInfo: businessInfo || {}
    });

    if (!accountResult.success) {
      return res.status(500).json({
        success: false,
        error: "Account creation failed",
        details: accountResult.error
      });
    }

    // Generate onboarding link if account is new or needs completion
    let onboardingLink = null;
    if (!accountResult.isExisting) {
      const linkResult = await generateOnboardingLink(
        accountResult.accountId,
        userId,
        role
      );

      if (linkResult.success) {
        onboardingLink = linkResult.url;
      }
    }

    res.json({
      success: true,
      accountId: accountResult.accountId,
      isExisting: accountResult.isExisting,
      onboardingUrl: onboardingLink,
      message: accountResult.isExisting
        ? "Account already exists"
        : "Account created, complete onboarding"
    });

  } catch (error) {
    console.error("❌ Setup error:", error.message);
    res.status(500).json({
      success: false,
      error: "Setup failed",
      message: error.message
    });
  }
});

/**
 * GET /api/connect/status/:userId
 * Gets account status for a user
 */
router.get("/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get account ID from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_connect_status, stripe_payouts_enabled")
      .eq("user_id", userId)
      .single();

    if (!profile?.stripe_account_id) {
      return res.json({
        success: true,
        connected: false,
        status: "not_connected",
        message: "No Stripe account found"
      });
    }

    // Get live status from Stripe
    const statusResult = await getAccountStatus(profile.stripe_account_id);

    res.json({
      success: true,
      connected: true,
      accountId: profile.stripe_account_id,
      ...statusResult.status
    });

  } catch (error) {
    console.error("❌ Status check error:", error.message);
    res.status(500).json({
      success: false,
      error: "Status check failed",
      message: error.message
    });
  }
});
/**
 * POST /api/connect/refresh-link
 * Generates new onboarding link for existing account
 */
router.post("/refresh-link", async (req, res) => {
  try {
    const { userId, role } = req.body;

    // Get account ID from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.stripe_account_id) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        message: "No Stripe account exists for this user"
      });
    }

    // Generate fresh onboarding link
    const linkResult = await generateOnboardingLink(
      profile.stripe_account_id,
      userId,
      role
    );

    res.json({
      success: true,
      onboardingUrl: linkResult.url,
      expiresAt: linkResult.expires_at
    });

  } catch (error) {
    console.error("❌ Refresh link error:", error.message);
    res.status(500).json({
      success: false,
      error: "Link generation failed",
      message: error.message
    });
  }
});

/**
 * POST /api/connect/dashboard-link
 * Creates Express dashboard link for account management
 */
router.post("/dashboard-link", async (req, res) => {
  try {
    const { userId } = req.body;

    // Get account ID from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("user_id", userId)
      .single();

    if (!profile?.stripe_account_id) {
      return res.status(404).json({
        success: false,
        error: "Account not found"
      });
    }

    if (!profile.stripe_payouts_enabled) {
      return res.status(400).json({
        success: false,
        error: "Account not fully verified",
        message: "Complete onboarding first"
      });
    }

    // Create dashboard link
    const linkResult = await createDashboardLink(profile.stripe_account_id);

    res.json({
      success: true,
      dashboardUrl: linkResult.url,
      expiresAt: linkResult.expires_at
    });

  } catch (error) {
    console.error("❌ Dashboard link error:", error.message);
    res.status(500).json({
      success: false,
      error: "Dashboard link creation failed",
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/connect/webhook
 * Handles Stripe Connect webhook events
 */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    let event;
    const signature = req.headers["stripe-signature"];

    // Verify webhook signature if secret is configured
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // For development - parse JSON directly
      event = JSON.parse(req.body.toString());
    }

    console.log(`📡 Received webhook: ${event.type}`);

    // Process Connect-related events
    if (event.type.startsWith('account.')) {
      const result = await handleConnectWebhook(event);

      return res.json({
        received: true,
        processed: result.success,
        eventType: event.type
      });
    }

    // Log unhandled events
    console.log(`ℹ️  Unhandled webhook type: ${event.type}`);

    res.json({
      received: true,
      processed: false,
      eventType: event.type
    });

  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    res.status(400).json({
      error: "Webhook processing failed",
      message: error.message
    });
  }
});

export default router;