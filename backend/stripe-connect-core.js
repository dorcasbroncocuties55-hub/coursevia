/**
 * STRIPE CONNECT - CORE ACCOUNT MODULE (consolidated)
 *
 * Merges what used to be duplicated across two files:
 *   - createConnectAccount / setupProviderAccount
 *   - generateOnboardingLink / createOnboardingLink
 *   - getAccountStatus / checkAccountStatus / updateProviderAccountStatus
 *   - handleConnectWebhook
 *
 * ASSUMPTION THAT NEEDS CONFIRMING AGAINST YOUR ACTUAL SCHEMA:
 * The old files disagreed on the profiles primary key used to look up a
 * Stripe account: one used `.eq("user_id", userId)`, the other used
 * `.eq("id", userId)`. This file standardizes on `user_id` (majority of
 * the original code used it). If your `profiles` table's primary key is
 * actually `id` and there is no separate `user_id` column, change
 * PROFILE_LOOKUP_COLUMN below — but pick ONE and audit your DB for rows
 * written under the other convention, since some accounts may currently
 * be orphaned under the wrong column.
 */

import "dotenv/config";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PROFILE_LOOKUP_COLUMN = "user_id"; // see note above

const STRIPE_API_VERSION = "2024-06-20"; // single source of truth for API version

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: STRIPE_API_VERSION,
});

export const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
);

const APP_URL = process.env.APP_URL || "http://localhost:8080";

const MCC_BY_ROLE = {
    creator: "7372",
    coach: "7299",
    therapist: "8099",
};

function getIndustryMCC(role) {
    return MCC_BY_ROLE[role] || "7299";
}

export function validateVendorData({ email, userId, role }) {
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
    return { isValid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════
// PLATFORM SETTINGS
// ═══════════════════════════════════════════════════════════════════

export async function updatePlatformSettings() {
    const accountUpdate = await stripe.accounts.update(
        process.env.STRIPE_ACCOUNT_ID || "acct_main",
        {
            business_profile: {
                name: "Coursevia",
                product_description:
                    "Online education marketplace connecting learners with creators, coaches, and therapists",
                support_email: process.env.SUPPORT_EMAIL || "support@coursevia.com",
                support_phone: process.env.SUPPORT_PHONE || undefined, // don't ship a placeholder number
                url: process.env.APP_URL || "https://coursevia.com",
            },
            settings: {
                payouts: { statement_descriptor: "COURSEVIA EARNINGS" },
                branding: {
                    primary_color: "#10B981",
                    secondary_color: "#059669",
                    icon: `${APP_URL}/logo-icon.png`,
                    logo: `${APP_URL}/logo-full.png`,
                },
                dashboard: { display_name: "Coursevia Marketplace", timezone: "Europe/London" },
            },
        }
    );
    return { success: true, account: accountUpdate };
}

// ═══════════════════════════════════════════════════════════════════
// ACCOUNT CREATION (single implementation)
// ═══════════════════════════════════════════════════════════════════

/**
 * Creates or returns an existing Stripe Express account for a vendor.
 * Idempotent: a network retry with the same userId will not create a
 * second Stripe account, because we check the DB first AND pass a
 * deterministic idempotency key to Stripe as a second line of defense.
 */
export async function createConnectAccount({
    email,
    userId,
    role = "creator",
    country = "GB",
    businessInfo = {},
}) {
    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq(PROFILE_LOOKUP_COLUMN, userId)
        .single();

    if (existingProfile?.stripe_account_id) {
        return { success: true, accountId: existingProfile.stripe_account_id, isExisting: true };
    }

    const account = await stripe.accounts.create(
        {
            type: "express",
            country,
            email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_profile: {
                name: businessInfo.businessName || `${role.charAt(0).toUpperCase() + role.slice(1)} Services`,
                product_description: businessInfo.description || `Professional ${role} services on Coursevia`,
                support_email: email,
                url: businessInfo.website || undefined,
                mcc: getIndustryMCC(role),
            },
            settings: {
                payouts: { schedule: { interval: "daily", delay_days: 2 } },
                payments: { statement_descriptor: "COURSEVIA*" },
            },
            metadata: {
                internal_user_id: userId,
                vendor_role: role,
                onboarding_type: "express_marketplace",
                created_via: "coursevia_api",
            },
        },
        // Idempotency key: same userId retried within Stripe's idempotency window
        // won't create a duplicate account even if the DB check above raced.
        { idempotencyKey: `connect-account-create-${userId}` }
    );

    await supabase
        .from("profiles")
        .update({
            stripe_account_id: account.id,
            stripe_onboarding_completed: false,
            stripe_payouts_enabled: false,
            stripe_details_submitted: false,
            stripe_connect_status: "pending",
        })
        .eq(PROFILE_LOOKUP_COLUMN, userId);

    return { success: true, accountId: account.id, isExisting: false, account };
}

// ═══════════════════════════════════════════════════════════════════
// ONBOARDING LINKS
// ═══════════════════════════════════════════════════════════════════

export async function generateOnboardingLink(accountId, userId, role) {
    const accountLink = await stripe.accountLinks.create({
        account: accountId,
        return_url: `${APP_URL}/${role}/payouts/success?user_id=${userId}&account_id=${accountId}`,
        refresh_url: `${APP_URL}/${role}/payouts/setup?user_id=${userId}&retry=true`,
        type: "account_onboarding",
        // Correct param name (the old code used a non-existent top-level
        // `collect` field, which Stripe silently ignored).
        collection_options: { fields: "eventually_due" },
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from("admin_logs").insert({
        user_id: userId,
        action: "stripe_onboarding_link_generated",
        details: { stripe_account_id: accountId, link_expires_at: expiresAt, user_role: role },
    });

    return { success: true, url: accountLink.url, expires_at: expiresAt };
}

export async function createDashboardLink(accountId) {
    const link = await stripe.accounts.createLoginLink(accountId);
    return { success: true, url: link.url, expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
}

// ═══════════════════════════════════════════════════════════════════
// STATUS SYNC (single implementation used by webhook, redirect handler,
// and manual refresh — previously three copies of this logic existed)
// ═══════════════════════════════════════════════════════════════════

export async function getAccountStatus(accountId) {
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
                pending_verification: account.requirements?.pending_verification || [],
            },
            country: account.country,
            default_currency: account.default_currency,
            business_profile: account.business_profile,
        },
    };
}

/**
 * Pulls current status from Stripe and writes it to the DB. This is the
 * one place that touches profiles.stripe_* fields.
 */
async function syncAccountStatusToDb(accountId) {
    const account = await stripe.accounts.retrieve(accountId);
    const isFullyOnboarded = account.details_submitted && account.payouts_enabled;

    const { data: profile } = await supabase
        .from("profiles")
        .select(`${PROFILE_LOOKUP_COLUMN}, email`)
        .eq("stripe_account_id", accountId)
        .single();

    await supabase
        .from("profiles")
        .update({
            stripe_onboarding_completed: account.details_submitted,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_details_submitted: account.details_submitted,
            stripe_connect_status: isFullyOnboarded ? "active" : account.details_submitted ? "pending" : "restricted",
            updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", accountId);

    return { account, profile, isFullyOnboarded };
}

export async function handleOnboardingSuccess(userId, accountId) {
    const { account, isFullyOnboarded } = await syncAccountStatusToDb(accountId);

    await supabase.from("admin_logs").insert({
        user_id: userId,
        action: "stripe_onboarding_completed",
        details: {
            stripe_account_id: accountId,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            requirements_remaining: account.requirements?.currently_due || [],
            completed_at: new Date().toISOString(),
        },
    });

    return {
        success: true,
        status: isFullyOnboarded ? "complete" : "pending",
        account: {
            id: accountId,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            requirements: account.requirements?.currently_due || [],
            country: account.country,
            default_currency: account.default_currency,
        },
    };
}

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK — signature verification is now mandatory, not best-effort.
// ═══════════════════════════════════════════════════════════════════

/**
 * Verifies and parses the raw webhook body into a Stripe event.
 * Throws if STRIPE_WEBHOOK_SECRET is missing or the signature is
 * invalid — callers must NOT fall back to unauthenticated JSON.parse.
 * Call this from the route with the RAW (unparsed) request body.
 */
export function constructWebhookEvent(rawBody, signatureHeader) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error(
            "STRIPE_WEBHOOK_SECRET is not configured — refusing to process an unverified webhook"
        );
    }
    return stripe.webhooks.constructEvent(rawBody, signatureHeader, process.env.STRIPE_WEBHOOK_SECRET);
}

export async function handleConnectWebhook(event) {
    switch (event.type) {
        case "account.updated": {
            const accountId = event.data.object.id;
            const wasRestricted = !event.data.object.payouts_enabled;

            const { profile, account, isFullyOnboarded } = await syncAccountStatusToDb(accountId);
            if (!profile) {
                return { success: false, reason: "User not found for this account" };
            }

            const statusChanged = wasRestricted && isFullyOnboarded;

            await supabase.from("admin_logs").insert({
                user_id: profile[PROFILE_LOOKUP_COLUMN],
                action: statusChanged ? "stripe_account_enabled" : "stripe_account_updated",
                details: {
                    stripe_account_id: accountId,
                    payouts_enabled: account.payouts_enabled,
                    details_submitted: account.details_submitted,
                    requirements: account.requirements?.currently_due || [],
                    updated_at: new Date().toISOString(),
                },
            });

            return { success: true, accountId, statusChanged, currentStatus: isFullyOnboarded ? "enabled" : "restricted" };
        }

        case "account.application.deauthorized": {
            const accountId = event.data.object.id;
            await supabase
                .from("profiles")
                .update({
                    stripe_account_id: null,
                    stripe_onboarding_completed: false,
                    stripe_payouts_enabled: false,
                    stripe_connect_status: "disconnected",
                })
                .eq("stripe_account_id", accountId);
            return { success: true, action: "disconnected" };
        }

        default:
            return { success: true, action: "ignored" };
    }
}

export default {
    stripe,
    supabase,
    updatePlatformSettings,
    createConnectAccount,
    generateOnboardingLink,
    createDashboardLink,
    getAccountStatus,
    handleOnboardingSuccess,
    constructWebhookEvent,
    handleConnectWebhook,
    validateVendorData,
};