/**
 * STRIPE CONNECT - WITHDRAWALS & REFUNDS
 *
 * Fixes vs. the original:
 *  - Balance changes use optimistic concurrency (compare-and-swap on the
 *    row) instead of naive read-then-write, closing the double-withdraw
 *    race condition.
 *  - Wallet is debited BEFORE the Stripe transfer fires, and refunded
 *    back automatically if the transfer fails — so a crash between
 *    "money left the platform" and "ledger updated" can't happen the
 *    way it could before.
 *  - Idempotency key on the Stripe transfer so a retried request can't
 *    double-pay.
 *  - Refunds now check the provider actually has enough balance before
 *    deducting.
 *  - $20 minimum lives in one place.
 *
 * NOTE ON CONCURRENCY: the compare-and-swap here relies on Supabase's
 * `.eq('available_balance', expectedValue)` filter to make the UPDATE a
 * no-op (0 rows affected) if the balance changed since it was read, and
 * retries a few times. This is a reasonable fix without inventing a
 * Postgres function you don't have — but if you have high write
 * contention on the same wallet, a real `FOR UPDATE` transaction (e.g.
 * via a Postgres RPC function) is the more robust long-term fix.
 */

import { supabase, stripe } from "./stripe-connect-core.js";

const MIN_WITHDRAWAL_USD = 20;
const MAX_BALANCE_UPDATE_RETRIES = 3;

function toCents(amount) {
    return Math.round(Number(amount) * 100);
}

function assertValidAmount(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
        throw new Error("Amount must be a positive number");
    }
    return n;
}

/**
 * Atomically adjusts a wallet's balance by `delta` (positive or negative),
 * retrying on concurrent-write conflicts. Throws if the wallet would go
 * negative.
 */
async function adjustWalletBalance(userId, delta) {
    for (let attempt = 0; attempt < MAX_BALANCE_UPDATE_RETRIES; attempt++) {
        const { data: wallet, error } = await supabase
            .from("wallets")
            .select("id, balance, available_balance")
            .eq("user_id", userId)
            .single();

        if (error || !wallet) throw new Error("Wallet not found");

        const newAvailable = wallet.available_balance + delta;
        const newBalance = wallet.balance + delta;

        if (newAvailable < 0) {
            throw new Error(`Insufficient balance. Available: $${wallet.available_balance}`);
        }

        const { data: updated, error: updateError } = await supabase
            .from("wallets")
            .update({
                balance: newBalance,
                available_balance: newAvailable,
                updated_at: new Date().toISOString(),
            })
            .eq("id", wallet.id)
            .eq("available_balance", wallet.available_balance) // compare-and-swap
            .select()
            .single();

        if (!updateError && updated) {
            return { wallet: updated, previousAvailable: wallet.available_balance };
        }
        // else: someone else updated the wallet between our read and write — retry
    }
    throw new Error("Could not update wallet balance due to concurrent writes, please retry");
}

async function writeLedgerEntry({ walletId, userId, amount, type, description, referenceId, balanceAfter }) {
    await supabase.from("wallet_ledger").insert({
        wallet_id: walletId,
        user_id: userId,
        amount,
        type,
        description,
        reference_id: referenceId,
        balance_after: balanceAfter,
    });
}

// ═══════════════════════════════════════════════════════════════════
// WITHDRAWALS
// ═══════════════════════════════════════════════════════════════════

export async function requestWithdrawal({ userId, amount, role = "creator" }) {
    const validAmount = assertValidAmount(amount);
    if (validAmount < MIN_WITHDRAWAL_USD) {
        throw new Error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL_USD}`);
    }

    const { data: provider, error: providerError } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_payouts_enabled, email, full_name")
        .eq("user_id", userId)
        .single();

    if (providerError || !provider) throw new Error("Provider not found");
    if (!provider.stripe_account_id) throw new Error("Please complete withdrawal setup first");
    if (!provider.stripe_payouts_enabled) {
        throw new Error("Your account is still being verified. Please check back later.");
    }

    const { data: withdrawal, error: withdrawalError } = await supabase
        .from("withdrawal_requests")
        .insert({ user_id: userId, amount: validAmount, currency: "USD", provider_role: role, status: "processing" })
        .select()
        .single();
    if (withdrawalError) throw new Error("Failed to create withdrawal request");

    // Reserve the funds first. If anything below fails, we put them back.
    const { wallet } = await adjustWalletBalance(userId, -validAmount);
    await writeLedgerEntry({
        walletId: wallet.id,
        userId,
        amount: -validAmount,
        type: "withdrawal",
        description: "Withdrawal to bank account",
        referenceId: withdrawal.id,
        balanceAfter: wallet.available_balance,
    });

    try {
        const transfer = await stripe.transfers.create(
            {
                amount: toCents(validAmount),
                currency: "usd",
                destination: provider.stripe_account_id,
                description: `Coursevia ${role} earnings - ${provider.full_name || provider.email}`,
                metadata: { withdrawal_id: withdrawal.id, user_id: userId, role },
            },
            // Prevents a duplicate transfer if this request is retried after a
            // timeout — Stripe will return the original transfer instead of
            // creating a new one.
            { idempotencyKey: `withdrawal-${withdrawal.id}` }
        );

        await supabase
            .from("withdrawal_requests")
            .update({
                status: "completed",
                stripe_transfer_id: transfer.id,
                processed_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
            })
            .eq("id", withdrawal.id);

        return {
            success: true,
            withdrawalId: withdrawal.id,
            transferId: transfer.id,
            amount: validAmount,
            estimatedArrival: "2-7 business days",
        };
    } catch (error) {
        // Transfer failed — give the reserved funds back and mark as failed.
        const { wallet: restored } = await adjustWalletBalance(userId, validAmount);
        await writeLedgerEntry({
            walletId: restored.id,
            userId,
            amount: validAmount,
            type: "withdrawal_reversal",
            description: `Reversal: withdrawal ${withdrawal.id} failed`,
            referenceId: withdrawal.id,
            balanceAfter: restored.available_balance,
        });

        await supabase
            .from("withdrawal_requests")
            .update({ status: "failed", failure_reason: error.message, processed_at: new Date().toISOString() })
            .eq("id", withdrawal.id);

        throw new Error(`Withdrawal failed: ${error.message}`);
    }
}

export async function getWithdrawalHistory(userId, limit = 50) {
    const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

// ═══════════════════════════════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════════════════════════════

export async function processRefund({
    paymentId = null,
    bookingId = null,
    contentId = null,
    learnerId,
    providerId,
    providerRole,
    amount,
    reason,
    refundType = "full",
    requestedBy,
}) {
    const validAmount = assertValidAmount(amount);

    // Insert only columns that actually exist on the refunds table
    const { data: refund, error: refundError } = await supabase
        .from("refunds")
        .insert({
            payment_id: paymentId || null,
            user_id: learnerId,          // refund recipient — maps to real user_id column
            amount: validAmount,
            reason: reason || null,
            status: "pending",
        })
        .select()
        .single();
    if (refundError) throw new Error(`Failed to create refund record: ${refundError.message}`);

    try {
        // Deduct from provider first — this is where "insufficient balance"
        // should surface, before the learner is credited.
        const { wallet: providerWallet } = await adjustWalletBalance(providerId, -validAmount);
        await writeLedgerEntry({
            walletId: providerWallet.id,
            userId: providerId,
            amount: -validAmount,
            type: "refund_deduction",
            description: `Refund issued: ${reason}`,
            referenceId: refund.id,
            balanceAfter: providerWallet.available_balance,
        });

        const { wallet: learnerWallet } = await adjustWalletBalance(learnerId, validAmount);
        await writeLedgerEntry({
            walletId: learnerWallet.id,
            userId: learnerId,
            amount: validAmount,
            type: "refund",
            description: `Refund: ${reason}`,
            referenceId: refund.id,
            balanceAfter: learnerWallet.available_balance,
        });

        await supabase
            .from("refunds")
            .update({ status: "completed", processed_at: new Date().toISOString(), completed_at: new Date().toISOString() })
            .eq("id", refund.id);

        return { success: true, refundId: refund.id, amount: validAmount };
    } catch (error) {
        await supabase
            .from("refunds")
            .update({ status: "failed", notes: error.message, processed_at: new Date().toISOString() })
            .eq("id", refund.id);
        throw new Error(`Refund failed: ${error.message}`);
    }
}

export async function getRefundHistory(userId, limit = 50) {
    const { data, error } = await supabase
        .from("refunds")
        .select("*")
        .or(`learner_id.eq.${userId},provider_id.eq.${userId}`)
        .order("requested_at", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

// ═══════════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════════

export async function getWithdrawalStatus(userId) {
    const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_payouts_enabled, stripe_onboarding_completed")
        .eq("user_id", userId)
        .single();

    const { data: wallet } = await supabase
        .from("wallets")
        .select("balance, available_balance, pending_balance")
        .eq("user_id", userId)
        .single();

    return {
        hasStripeAccount: !!profile?.stripe_account_id,
        onboardingComplete: profile?.stripe_onboarding_completed || false,
        payoutsEnabled: profile?.stripe_payouts_enabled || false,
        balance: wallet?.balance || 0,
        availableBalance: wallet?.available_balance || 0,
        pendingBalance: wallet?.pending_balance || 0,
        canWithdraw: !!profile?.stripe_payouts_enabled && (wallet?.available_balance || 0) >= MIN_WITHDRAWAL_USD,
    };
}

export default {
    requestWithdrawal,
    getWithdrawalHistory,
    processRefund,
    getRefundHistory,
    getWithdrawalStatus,
};