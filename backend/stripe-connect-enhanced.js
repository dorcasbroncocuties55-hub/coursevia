/**
 * STRIPE CONNECT - PRODUCTION-READY MARKETPLACE IMPLEMENTATION
 * Comprehensive Express account management for Coursevia marketplace
 * Features: Automated onboarding, verification tracking, webhook handling
 */

import "dotenv/config";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Initialize Stripe with latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Helper functions
const toCents = (amount) => Math.round(parseFloat(amount || 0) * 100);
const toDollars = (cents) => (parseInt(cents || 0) / 100).toFixed(2);

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM BRANDING & SETTINGS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Updates Stripe Connect platform account settings and branding
 * Configures company branding, statement descriptors, and Express dashboard styling
 */
export const updatePlatformSettings = async () => {
  try {
    console.log("🎨 Updating Stripe Connect platform settings...");

    // Update main account branding and business profile
    const accountUpdate = await stripe.accounts.update(process.env.STRIPE_ACCOUNT_ID || 'acct_main', {
      business_profile: {
        name: "Coursevia",
        product_description: "Online education marketplace connecting learners with creators, coaches, and therapists",
        support_email: process.env.SUPPORT_EMAIL || "support@coursevia.com",
        support_phone: process.env.SUPPORT_PHONE || "+44 20 7946 0958",
        url: process.env.APP_URL || "https://coursevia.com"
      },
      settings: {
        // Configure payout statement descriptor
        payouts: {
          statement_descriptor: "COURSEVIA EARNINGS"
        },
        // Express dashboard branding
        branding: {
          primary_color: "#10B981", // Your Coursevia green (152 60% 42%)
          secondary_color: "#059669", // Darker shade of your green
          icon: `${process.env.APP_URL}/logo-icon.png`, // Your logo URL
          logo: `${process.env.APP_URL}/logo-full.png`   // Full logo URL
        },
        // Dashboard display configuration
        dashboard: {
          display_name: "Coursevia Marketplace",
          timezone: "Europe/London"
        }
      }
    });

    console.log("✅ Platform settings updated successfully");
    return { success: true, account: accountUpdate };

  } catch (error) {
    console.error("❌ Failed to update platform settings:", error.message);
    throw new Error(`Platform settings update failed: ${error.message}`);
  }
};
// ═══════════════════════════════════════════════════════════════════════════
// CONNECT ACCOUNT CREATION & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a Stripe Connect Express account for marketplace vendors
 * @param {Object} vendorData - Vendor information
 * @param {string} vendorData.email - Vendor email address
 * @param {string} vendorData.userId - Internal user ID
 * @param {string} vendorData.role - Vendor role (creator, coach, therapist)
 * @param {string} vendorData.country - ISO country code (default: GB)
 * @param {Object} vendorData.businessInfo - Optional business information
 */
export const createConnectAccount = async (vendorData) => {
  try {
    const {
      email,
      userId,
      role = "creator",
      country = "GB", // Default to United Kingdom
      businessInfo = {}
    } = vendorData;

    console.log(`🔄 Creating Stripe Connect account for ${role}: ${email}`);

    // Check if account already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("user_id", userId)
      .single();

    if (existingProfile?.stripe_account_id) {
      console.log("⚠️  Account already exists:", existingProfile.stripe_account_id);
      return {
        success: true,
        accountId: existingProfile.stripe_account_id,
        isExisting: true
      };
    }

    // Create Express account with enhanced configuration
    const account = await stripe.accounts.create({
      type: "express",
      country: country,
      email: email,

      // Enhanced capabilities for marketplace
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },

      // Business profile setup
      business_profile: {
        name: businessInfo.businessName || `${role.charAt(0).toUpperCase() + role.slice(1)} Services`,
        product_description: businessInfo.description || `Professional ${role} services on Coursevia`,
        support_email: email,
        url: businessInfo.website || undefined,
        mcc: getIndustryMCC(role) // Merchant Category Code based on role
      },
      // Default settings optimized for marketplace
      settings: {
        payouts: {
          schedule: {
            interval: "daily", // Faster payouts for better UX
            delay_days: 2      // Minimum delay for Express accounts
          }
        },
        payments: {
          statement_descriptor: "COURSEVIA*" // Appears on customer statements
        }
      },

      // Metadata for internal tracking
      metadata: {
        internal_user_id: userId,
        vendor_role: role,
        onboarding_type: "express_marketplace",
        created_via: "coursevia_api",
        platform_version: "1.0"
      }
    });

    console.log(`✅ Express account created: ${account.id}`);

    // Update local database with account information
    await supabase
      .from("profiles")
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_completed: false,
        stripe_payouts_enabled: false,
        stripe_details_submitted: false,
        stripe_connect_status: "pending"
      })
      .eq("user_id", userId);

    return {
      success: true,
      accountId: account.id,
      isExisting: false,
      account: account
    };

  } catch (error) {
    console.error("❌ Failed to create Connect account:", error.message);
    throw new Error(`Account creation failed: ${error.message}`);
  }
};
// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING LINK GENERATION & REDIRECT HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates Account Link for Stripe Express onboarding
 * Creates a secure 5-minute token for user verification flow
 * @param {string} accountId - Stripe Connect account ID
 * @param {string} userId - Internal user ID for redirect tracking
 * @param {string} role - User role for proper redirect routing
 */
export const generateOnboardingLink = async (accountId, userId, role) => {
  try {
    console.log(`🔗 Generating onboarding link for account: ${accountId}`);

    const baseUrl = process.env.APP_URL || "http://localhost:8080";

    // Create account link with 5-minute expiration
    const accountLink = await stripe.accountLinks.create({
      account: accountId,

      // Success redirect - user completes onboarding
      return_url: `${baseUrl}/${role}/payouts/success?user_id=${userId}&account_id=${accountId}`,

      // Failure/retry redirect - user needs to complete more info
      refresh_url: `${baseUrl}/${role}/payouts/setup?user_id=${userId}&retry=true`,

      type: "account_onboarding",

      // Enhanced collection options for faster approval
      collect: "eventually_due" // Collect all required information
    });

    console.log(`✅ Onboarding link generated (expires in 5 minutes)`);

    // Log onboarding attempt for analytics
    if (supabase) {
      await supabase
        .from("admin_logs")
        .insert({
          user_id: userId,
          action: "stripe_onboarding_link_generated",
          details: {
            stripe_account_id: accountId,
            link_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            user_role: role
          }
        });
    }

    return {
      success: true,
      url: accountLink.url,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };

  } catch (error) {
    console.error("❌ Failed to generate onboarding link:", error.message);
    throw new Error(`Onboarding link generation failed: ${error.message}`);
  }
};
/**
 * Handles successful onboarding redirect
 * Verifies account status and updates local database
 * @param {string} userId - Internal user ID
 * @param {string} accountId - Stripe Connect account ID
 */
export const handleOnboardingSuccess = async (userId, accountId) => {
  try {
    console.log(`🎉 Processing successful onboarding for account: ${accountId}`);

    // Retrieve updated account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    const isFullyOnboarded = account.details_submitted && account.payouts_enabled;
    const hasRequirements = account.requirements?.currently_due?.length > 0;

    // Update local database with current status
    if (supabase) {
      await supabase
        .from("profiles")
        .update({
          stripe_onboarding_completed: account.details_submitted,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_details_submitted: account.details_submitted,
          stripe_connect_status: isFullyOnboarded ? "active" : "pending",
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      // Log successful onboarding
      await supabase
        .from("admin_logs")
        .insert({
          user_id: userId,
          action: "stripe_onboarding_completed",
          details: {
            stripe_account_id: accountId,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            requirements_remaining: account.requirements?.currently_due || [],
            completed_at: new Date().toISOString()
          }
        });
    }

    return {
      success: true,
      status: isFullyOnboarded ? "complete" : "pending",
      account: {
        id: accountId,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements?.currently_due || [],
        country: account.country,
        default_currency: account.default_currency
      }
    };

  } catch (error) {
    console.error("❌ Failed to process onboarding success:", error.message);
    throw new Error(`Onboarding success handling failed: ${error.message}`);
  }
};
// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLING FOR ACCOUNT STATUS UPDATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Processes Stripe webhook events for Connect accounts
 * Handles account.updated events to sync verification status
 * @param {Object} event - Stripe webhook event
 */
export const handleConnectWebhook = async (event) => {
  try {
    console.log(`📡 Processing Stripe Connect webhook: ${event.type}`);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;
        const accountId = account.id;

        console.log(`🔄 Account updated: ${accountId}`);

        // Find the user associated with this Stripe account
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .eq("stripe_account_id", accountId)
          .single();

        if (!profile) {
          console.log(`⚠️  No local user found for Stripe account: ${accountId}`);
          return { success: false, reason: "User not found" };
        }

        // Determine status change
        const wasRestricted = !account.payouts_enabled;
        const isNowEnabled = account.payouts_enabled && account.details_submitted;
        const statusChanged = wasRestricted && isNowEnabled;

        // Update local database with latest Stripe status
        await supabase
          .from("profiles")
          .update({
            stripe_onboarding_completed: account.details_submitted,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_details_submitted: account.details_submitted,
            stripe_connect_status: isNowEnabled ? "active" :
              account.details_submitted ? "pending" : "restricted",
            updated_at: new Date().toISOString()
          })
          .eq("stripe_account_id", accountId);

        // Log status change for analytics and support
        await supabase
          .from("admin_logs")
          .insert({
            user_id: profile.user_id,
            action: statusChanged ? "stripe_account_enabled" : "stripe_account_updated",
            details: {
              stripe_account_id: accountId,
              previous_status: wasRestricted ? "restricted" : "enabled",
              current_status: isNowEnabled ? "enabled" : "restricted",
              payouts_enabled: account.payouts_enabled,
              details_submitted: account.details_submitted,
              requirements: account.requirements?.currently_due || [],
              updated_at: new Date().toISOString()
            }
          });
        // Send notification email if account was just enabled
        if (statusChanged) {
          console.log(`🎉 Account enabled for user: ${profile.email}`);

          // Optional: Send email notification
          // await sendAccountEnabledEmail(profile.email, profile.full_name);
        }

        return {
          success: true,
          accountId: accountId,
          statusChanged: statusChanged,
          currentStatus: isNowEnabled ? "enabled" : "restricted"
        };
      }

      case 'account.application.deauthorized': {
        // Handle when user disconnects their account
        const account = event.data.object;

        await supabase
          .from("profiles")
          .update({
            stripe_account_id: null,
            stripe_onboarding_completed: false,
            stripe_payouts_enabled: false,
            stripe_connect_status: "disconnected"
          })
          .eq("stripe_account_id", account.id);

        console.log(`🔌 Account disconnected: ${account.id}`);
        return { success: true, action: "disconnected" };
      }

      default:
        console.log(`ℹ️  Unhandled webhook type: ${event.type}`);
        return { success: true, action: "ignored" };
    }

  } catch (error) {
    console.error("❌ Webhook processing failed:", error.message);
    throw new Error(`Webhook handling failed: ${error.message}`);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT STATUS & INFORMATION RETRIEVAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retrieves current account status from Stripe
 * @param {string} accountId - Stripe Connect account ID
 */
export const getAccountStatus = async (accountId) => {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      success: true,
      status: {
        id: accountId,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
          pending_verification: account.requirements?.pending_verification || []
        },
        country: account.country,
        default_currency: account.default_currency,
        business_profile: account.business_profile
      }
    };

  } catch (error) {
    console.error("❌ Failed to get account status:", error.message);
    throw new Error(`Account status retrieval failed: ${error.message}`);
  }
};
// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns appropriate Merchant Category Code based on vendor role
 * @param {string} role - Vendor role
 */
function getIndustryMCC(role) {
  const mccMap = {
    creator: "7372", // Computer Programming Services
    coach: "7299",   // Miscellaneous Personal Services
    therapist: "8099" // Health Practitioners
  };
  return mccMap[role] || "7299";
}

/**
 * Validates vendor data before account creation
 * @param {Object} vendorData - Vendor information to validate
 */
export const validateVendorData = (vendorData) => {
  const { email, userId, role } = vendorData;

  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email address is required");
  }

  if (!userId || typeof userId !== "string") {
    errors.push("Valid user ID is required");
  }

  if (!role || !["creator", "coach", "therapist"].includes(role)) {
    errors.push("Valid role (creator, coach, therapist) is required");
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

/**
 * Creates Express dashboard link for existing accounts
 * @param {string} accountId - Stripe Connect account ID
 */
export const createDashboardLink = async (accountId) => {
  try {
    const link = await stripe.accounts.createLoginLink(accountId);

    return {
      success: true,
      url: link.url,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    };

  } catch (error) {
    console.error("❌ Failed to create dashboard link:", error.message);
    throw new Error(`Dashboard link creation failed: ${error.message}`);
  }
};

// Export all functions for use in server routes
export default {
  updatePlatformSettings,
  createConnectAccount,
  generateOnboardingLink,
  handleOnboardingSuccess,
  handleConnectWebhook,
  getAccountStatus,
  validateVendorData,
  createDashboardLink,
  getIndustryMCC
};