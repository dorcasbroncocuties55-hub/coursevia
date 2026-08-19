/**
 * Stripe Connect - Withdrawal & Refund System
 * Handles: Creators, Coaches, Therapists withdrawals + Refunds
 */

import "dotenv/config";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APP_URL = process.env.APP_URL || "http://localhost:8080";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" }) : null;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// ═══════════════════════════════════════════════════════════════════
// PROVIDER ONBOARDING
// ═══════════════════════════════════════════════════════════════════

/**
 * Create or retrieve Stripe Connect Express account for a provider
 */
export async function setupProviderAccount({ userId, email, country = 'US', roles = [] }) {
  if (!stripe || !supabase) throw new Error("Stripe or Supabase not configured");

  // Check if account already exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id, email, role')
    .eq('id', userId)
    .single();

  if (profile?.stripe_account_id) {
    // Account exists, check status
    try {
      const account = await stripe.accounts.retrieve(profile.stripe_account_id);
      return {
        accountId: account.id,
        needsOnboarding: !account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled
      };
    } catch (error) {
      console.error('Error retrieving Stripe account:', error);
      // Account ID is invalid, create new one
    }
  }

  // Create new Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country: country,
    email: email || profile?.email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      userId: userId,
      roles: Array.isArray(roles) ? roles.join(',') : String(roles || profile?.role || 'creator'),
      platform: 'coursevia'
    }
  });

  // Save account ID to database
  await supabase
    .from('profiles')
    .update({
      stripe_account_id: account.id,
      stripe_onboarding_completed: false,
      stripe_details_submitted: false,
      stripe_payouts_enabled: false
    })
    .eq('id', userId);

  return {
    accountId: account.id,
    needsOnboarding: true,
    payoutsEnabled: false,
    chargesEnabled: false
  };
}

/**
 * Generate onboarding link for providers to complete setup
 */
export async function createOnboardingLink(stripeAccountId, userId) {
  if (!stripe) throw new Error("Stripe not configured");

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${APP_URL}/dashboard/wallet?refresh=true`,
    return_url: `${APP_URL}/dashboard/wallet?setup=complete`,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

/**
 * Check account verification status
 */
export async function checkAccountStatus(stripeAccountId) {
  if (!stripe) throw new Error("Stripe not configured");

  const account = await stripe.accounts.retrieve(stripeAccountId);

  return {
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    requirements: {
      currently_due: account.requirements?.currently_due || [],
      eventually_due: account.requirements?.eventually_due || [],
      past_due: account.requirements?.past_due || []
    }
  };
}

/**
 * Update provider status in database
 */
export async function updateProviderAccountStatus(accountId) {
  if (!supabase || !stripe) return;

  try {
    const account = await stripe.accounts.retrieve(accountId);

    await supabase
      .from('profiles')
      .update({
        stripe_onboarding_completed: account.details_submitted,
        stripe_details_submitted: account.details_submitted,
        stripe_payouts_enabled: account.payouts_enabled
      })
      .eq('stripe_account_id', accountId);
  } catch (error) {
    console.error('Error updating provider status:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════
// WITHDRAWALS
// ═══════════════════════════════════════════════════════════════════

/**
 * Request withdrawal for any provider (creator, coach, therapist)
 */
export async function requestWithdrawal({ userId, amount, role = 'creator' }) {
  if (!stripe || !supabase) throw new Error("Stripe or Supabase not configured");

  const amountInCents = Math.round(amount * 100);

  // Validate minimum
  if (amount < 20) {
    throw new Error('Minimum withdrawal amount is $20');
  }

  // Get provider info
  const { data: provider, error: providerError } = await supabase
    .from('profiles')
    .select('stripe_account_id, stripe_payouts_enabled, email, full_name')
    .eq('id', userId)
    .single();

  if (providerError || !provider) {
    throw new Error('Provider not found');
  }

  if (!provider.stripe_account_id) {
    throw new Error('Please complete withdrawal setup first');
  }

  if (!provider.stripe_payouts_enabled) {
    throw new Error('Your account is still being verified. Please check back later.');
  }

  // Check wallet balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance, available_balance')
    .eq('user_id', userId)
    .single();

  if (!wallet || wallet.available_balance < amount) {
    throw new Error(`Insufficient balance. Available: $${wallet?.available_balance || 0}`);
  }

  // Create withdrawal request
  const { data: withdrawal, error: withdrawalError } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: userId,
      amount: amount,
      currency: 'USD',
      provider_role: role,
      status: 'processing'
    })
    .select()
    .single();

  if (withdrawalError) {
    throw new Error('Failed to create withdrawal request');
  }

  try {
    // Execute Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: provider.stripe_account_id,
      description: `Coursevia ${role} earnings - ${provider.full_name || provider.email}`,
      metadata: {
        withdrawal_id: withdrawal.id,
        user_id: userId,
        role: role
      }
    });

    // Update withdrawal as completed
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'completed',
        stripe_transfer_id: transfer.id,
        processed_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', withdrawal.id);

    // Deduct from wallet
    const newBalance = wallet.available_balance - amount;
    await supabase
      .from('wallets')
      .update({
        balance: wallet.balance - amount,
        available_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Record in ledger
    await supabase
      .from('wallet_ledger')
      .insert({
        wallet_id: wallet.id,
        user_id: userId,
        amount: -amount,
        type: 'withdrawal',
        description: `Withdrawal to bank account`,
        reference_id: withdrawal.id,
        balance_after: newBalance
      });

    return {
      success: true,
      withdrawalId: withdrawal.id,
      transferId: transfer.id,
      amount: amount,
      estimatedArrival: '2-7 business days'
    };

  } catch (error) {
    // Mark as failed
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'failed',
        failure_reason: error.message,
        processed_at: new Date().toISOString()
      })
      .eq('id', withdrawal.id);

    throw new Error(`Withdrawal failed: ${error.message}`);
  }
}

/**
 * Get withdrawal history
 */
export async function getWithdrawalHistory(userId, limit = 50) {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════════════════════════════

/**
 * Process a refund (learner gets money back, provider loses it)
 */
export async function processRefund({
  paymentId = null,
  bookingId = null,
  contentId = null,
  learnerId,
  providerId,
  providerRole,
  amount,
  reason,
  refundType = 'full',
  requestedBy
}) {
  if (!supabase) throw new Error("Supabase not configured");

  const amountInCents = Math.round(amount * 100);

  // Create refund record
  const { data: refund, error: refundError } = await supabase
    .from('refunds')
    .insert({
      payment_id: paymentId,
      booking_id: bookingId,
      content_id: contentId,
      learner_id: learnerId,
      provider_id: providerId,
      provider_role: providerRole,
      amount: amount,
      reason: reason,
      refund_type: refundType,
      requested_by: requestedBy,
      status: 'processing'
    })
    .select()
    .single();

  if (refundError) {
    throw new Error('Failed to create refund record');
  }

  try {
    // Get wallets
    const { data: learnerWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', learnerId)
      .single();

    const { data: providerWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', providerId)
      .single();

    if (!learnerWallet || !providerWallet) {
      throw new Error('Wallet not found');
    }

    // Add money to learner wallet
    const newLearnerBalance = learnerWallet.available_balance + amount;
    await supabase
      .from('wallets')
      .update({
        balance: learnerWallet.balance + amount,
        available_balance: newLearnerBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', learnerWallet.id);

    await supabase
      .from('wallet_ledger')
      .insert({
        wallet_id: learnerWallet.id,
        user_id: learnerId,
        amount: amount,
        type: 'refund',
        description: `Refund: ${reason}`,
        reference_id: refund.id,
        balance_after: newLearnerBalance
      });

    // Deduct from provider wallet
    const newProviderBalance = providerWallet.available_balance - amount;
    await supabase
      .from('wallets')
      .update({
        balance: providerWallet.balance - amount,
        available_balance: newProviderBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerWallet.id);

    await supabase
      .from('wallet_ledger')
      .insert({
        wallet_id: providerWallet.id,
        user_id: providerId,
        amount: -amount,
        type: 'refund_deduction',
        description: `Refund issued: ${reason}`,
        reference_id: refund.id,
        balance_after: newProviderBalance
      });

    // Mark refund as completed
    await supabase
      .from('refunds')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', refund.id);

    return {
      success: true,
      refundId: refund.id,
      amount: amount
    };

  } catch (error) {
    // Mark as failed
    await supabase
      .from('refunds')
      .update({
        status: 'failed',
        notes: error.message,
        processed_at: new Date().toISOString()
      })
      .eq('id', refund.id);

    throw new Error(`Refund failed: ${error.message}`);
  }
}

/**
 * Get refund history
 */
export async function getRefundHistory(userId, limit = 50) {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from('refunds')
    .select('*')
    .or(`learner_id.eq.${userId},provider_id.eq.${userId}`)
    .order('requested_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get provider's withdrawal status and balance
 */
export async function getWithdrawalStatus(userId) {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id, stripe_payouts_enabled, stripe_onboarding_completed')
    .eq('id', userId)
    .single();

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance, available_balance, pending_balance')
    .eq('user_id', userId)
    .single();

  let accountStatus = null;
  if (profile?.stripe_account_id && stripe) {
    try {
      accountStatus = await checkAccountStatus(profile.stripe_account_id);
    } catch (error) {
      console.error('Error checking account status:', error);
    }
  }

  return {
    hasStripeAccount: !!profile?.stripe_account_id,
    onboardingComplete: profile?.stripe_onboarding_completed || false,
    payoutsEnabled: profile?.stripe_payouts_enabled || false,
    balance: wallet?.balance || 0,
    availableBalance: wallet?.available_balance || 0,
    pendingBalance: wallet?.pending_balance || 0,
    canWithdraw: profile?.stripe_payouts_enabled && (wallet?.available_balance || 0) >= 20,
    accountStatus: accountStatus
  };
}

export default {
  setupProviderAccount,
  createOnboardingLink,
  checkAccountStatus,
  updateProviderAccountStatus,
  requestWithdrawal,
  getWithdrawalHistory,
  processRefund,
  getRefundHistory,
  getWithdrawalStatus
};