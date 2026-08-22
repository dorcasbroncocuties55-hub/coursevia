/**
 * STRIPE LEARNER PAYMENTS MODULE
 * 
 * Handles card-based payments for learners:
 * - Save payment methods (cards)
 * - Create payment intents for courses/sessions
 * - Process refunds to original payment method
 * - Manage customer payment methods
 */

import "dotenv/config";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
);

// ═══════════════════════════════════════════════════════════════════
// CUSTOMER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Get or create Stripe customer for learner
 */
export async function getOrCreateCustomer(userId, email, name) {
  try {
    // Check if customer already exists in our DB
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("user_id", userId)
      .single();

    if (profile?.stripe_customer_id) {
      // Verify customer exists in Stripe
      try {
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
        if (!customer.deleted) {
          return { customerId: profile.stripe_customer_id, isNew: false };
        }
      } catch (err) {
        console.warn(`Stripe customer ${profile.stripe_customer_id} not found, creating new one`);
      }
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: email || profile?.email,
      name: name || profile?.full_name || undefined,
      metadata: { userId, platform: "coursevia", role: "learner" },
    });

    // Save customer ID to profile
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("user_id", userId);

    return { customerId: customer.id, isNew: true };
  } catch (error) {
    console.error("Error in getOrCreateCustomer:", error);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// PAYMENT METHODS (SAVED CARDS)
// ═══════════════════════════════════════════════════════════════════

/**
 * Attach payment method to customer and save to DB
 */
export async function savePaymentMethod(userId, paymentMethodId, isDefault = false) {
  try {
    // Get or create customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("user_id", userId)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const result = await getOrCreateCustomer(userId, profile.email, profile.full_name);
      customerId = result.customerId;
    }

    // Attach payment method to customer
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from("payment_methods")
        .update({ is_default: false })
        .eq("user_id", userId);

      // Set as default payment method in Stripe
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Save to our database
    const { data: savedMethod, error } = await supabase
      .from("payment_methods")
      .insert({
        user_id: userId,
        stripe_payment_method_id: paymentMethodId,
        stripe_customer_id: customerId,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        exp_month: paymentMethod.card?.exp_month,
        exp_year: paymentMethod.card?.exp_year,
        cardholder_name: paymentMethod.billing_details?.name,
        fingerprint: paymentMethod.card?.fingerprint,
        is_default: isDefault,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      paymentMethod: savedMethod,
      message: "Payment method saved successfully",
    };
  } catch (error) {
    console.error("Error in savePaymentMethod:", error);
    throw new Error(`Failed to save payment method: ${error.message}`);
  }
}

/**
 * List all payment methods for a user
 */
export async function listPaymentMethods(userId) {
  try {
    const { data: methods, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, paymentMethods: methods || [] };
  } catch (error) {
    console.error("Error in listPaymentMethods:", error);
    throw new Error(`Failed to list payment methods: ${error.message}`);
  }
}

/**
 * Set payment method as default
 */
export async function setDefaultPaymentMethod(userId, paymentMethodId) {
  try {
    // Unset all defaults
    await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("user_id", userId);

    // Set new default
    const { data, error } = await supabase
      .from("payment_methods")
      .update({ is_default: true })
      .eq("user_id", userId)
      .eq("id", paymentMethodId)
      .select()
      .single();

    if (error) throw error;

    // Update in Stripe
    if (data.stripe_payment_method_id && data.stripe_customer_id) {
      await stripe.customers.update(data.stripe_customer_id, {
        invoice_settings: { default_payment_method: data.stripe_payment_method_id },
      });
    }

    return { success: true, message: "Default payment method updated" };
  } catch (error) {
    console.error("Error in setDefaultPaymentMethod:", error);
    throw new Error(`Failed to set default: ${error.message}`);
  }
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(userId, paymentMethodId) {
  try {
    // Get payment method from DB
    const { data: method } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("id", paymentMethodId)
      .eq("user_id", userId)
      .single();

    if (!method) {
      throw new Error("Payment method not found");
    }

    // Detach from Stripe
    if (method.stripe_payment_method_id) {
      try {
        await stripe.paymentMethods.detach(method.stripe_payment_method_id);
      } catch (err) {
        console.warn(`Failed to detach from Stripe: ${err.message}`);
      }
    }

    // Delete from DB
    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", paymentMethodId)
      .eq("user_id", userId);

    if (error) throw error;

    return { success: true, message: "Payment method deleted" };
  } catch (error) {
    console.error("Error in deletePaymentMethod:", error);
    throw new Error(`Failed to delete payment method: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// PAYMENT INTENTS (CHECKOUT)
// ═══════════════════════════════════════════════════════════════════

/**
 * Create payment intent for course purchase
 */
export async function createCoursePaymentIntent(userId, courseId, amount, paymentMethodId = null) {
  try {
    // Get course details
    const { data: course } = await supabase
      .from("courses")
      .select("title, creator_id")
      .eq("id", courseId)
      .single();

    if (!course) {
      throw new Error("Course not found");
    }

    // Get or create customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("user_id", userId)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const result = await getOrCreateCustomer(userId, profile.email, profile.full_name);
      customerId = result.customerId;
    }

    // Calculate platform fee (5%)
    const platformFeeAmount = Math.round(amount * 0.05);
    const providerAmount = amount - platformFeeAmount;

    // Create payment intent
    const intentData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      description: `Course: ${course.title}`,
      metadata: {
        type: "course_purchase",
        userId,
        courseId,
        creatorId: course.creator_id,
        platformFee: platformFeeAmount,
        providerAmount,
      },
      automatic_payment_methods: { enabled: true },
    };

    // If payment method provided, use it
    if (paymentMethodId) {
      intentData.payment_method = paymentMethodId;
      intentData.confirm = true;
      intentData.return_url = `${process.env.APP_URL || "http://localhost:8080"}/learner/courses`;
    }

    const paymentIntent = await stripe.paymentIntents.create(intentData);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: "usd",
    };
  } catch (error) {
    console.error("Error in createCoursePaymentIntent:", error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
}

/**
 * Create payment intent for session booking
 */
export async function createSessionPaymentIntent(userId, serviceId, coachId, amount, paymentMethodId = null) {
  try {
    // Get service details
    const { data: service } = await supabase
      .from("coach_services")
      .select("title, coach_id")
      .eq("id", serviceId)
      .single();

    if (!service) {
      throw new Error("Service not found");
    }

    // Get or create customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("user_id", userId)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const result = await getOrCreateCustomer(userId, profile.email, profile.full_name);
      customerId = result.customerId;
    }

    // Calculate platform fee (5%)
    const platformFeeAmount = Math.round(amount * 0.05);
    const providerAmount = amount - platformFeeAmount;

    // Create payment intent
    const intentData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      description: `Session: ${service.title}`,
      metadata: {
        type: "session_booking",
        userId,
        serviceId,
        coachId: coachId || service.coach_id,
        platformFee: platformFeeAmount,
        providerAmount,
      },
      automatic_payment_methods: { enabled: true },
    };

    // If payment method provided, use it
    if (paymentMethodId) {
      intentData.payment_method = paymentMethodId;
      intentData.confirm = true;
      intentData.return_url = `${process.env.APP_URL || "http://localhost:8080"}/learner/bookings`;
    }

    const paymentIntent = await stripe.paymentIntents.create(intentData);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: "usd",
    };
  } catch (error) {
    console.error("Error in createSessionPaymentIntent:", error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
}

/**
 * Confirm payment and create enrollment/booking
 */
export async function confirmPayment(paymentIntentId, userId) {
  try {
    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
    }

    const metadata = paymentIntent.metadata;
    const amount = paymentIntent.amount / 100; // Convert from cents

    // Save payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        amount,
        currency: paymentIntent.currency,
        status: "completed",
        payment_method: "card",
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: paymentIntent.customer,
        payment_method_last4: paymentIntent.payment_method_details?.card?.last4,
        payment_method_brand: paymentIntent.payment_method_details?.card?.brand,
        description: paymentIntent.description,
        metadata: metadata,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Handle based on type
    if (metadata.type === "course_purchase") {
      // Create course enrollment
      await supabase.from("course_enrollments").insert({
        user_id: userId,
        course_id: metadata.courseId,
        payment_id: payment.id,
        status: "active",
      });

      // Add provider payment to escrow (will be released after 8 days)
      await supabase.from("wallets").update({
        pending_balance: supabase.rpc("increment_pending", {
          amount: parseFloat(metadata.providerAmount),
        }),
      }).eq("user_id", metadata.creatorId);

    } else if (metadata.type === "session_booking") {
      // Booking creation handled separately (requires scheduled_at, duration, etc.)
      // Return payment info so frontend can create booking with additional details
      return {
        success: true,
        payment,
        requiresBooking: true,
        message: "Payment successful. Complete booking details.",
      };
    }

    return {
      success: true,
      payment,
      message: "Payment successful",
    };
  } catch (error) {
    console.error("Error in confirmPayment:", error);
    throw new Error(`Failed to confirm payment: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════════════════════════════

/**
 * Process approved refund via Stripe
 */
export async function processApprovedRefunds() {
  try {
    // Get all approved refunds that haven't been processed
    const { data: approvedRefunds } = await supabase
      .from("refunds")
      .select("*, payments(*)")
      .eq("status", "approved")
      .is("stripe_refund_id", null);

    if (!approvedRefunds || approvedRefunds.length === 0) {
      return { success: true, processed: 0, message: "No refunds to process" };
    }

    const results = [];

    for (const refund of approvedRefunds) {
      try {
        const payment = refund.payments;

        if (!payment?.stripe_payment_intent_id) {
          console.warn(`Refund ${refund.id} has no payment_intent_id, skipping`);
          continue;
        }

        // Create Stripe refund
        const stripeRefund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          amount: Math.round(refund.amount * 100), // Convert to cents
          reason: "requested_by_customer",
          metadata: {
            refundId: refund.id,
            userId: refund.user_id,
          },
        });

        // Update refund record
        await supabase
          .from("refunds")
          .update({
            status: "processed",
            stripe_refund_id: stripeRefund.id,
            refund_method: "stripe_card",
            updated_at: new Date().toISOString(),
          })
          .eq("id", refund.id);

        results.push({ refundId: refund.id, stripeRefundId: stripeRefund.id, success: true });

      } catch (error) {
        console.error(`Error processing refund ${refund.id}:`, error);
        results.push({ refundId: refund.id, success: false, error: error.message });

        // Update refund with error
        await supabase
          .from("refunds")
          .update({
            reject_reason: `Stripe error: ${error.message}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", refund.id);
      }
    }

    return {
      success: true,
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  } catch (error) {
    console.error("Error in processApprovedRefunds:", error);
    throw new Error(`Failed to process refunds: ${error.message}`);
  }
}

/**
 * Get refund status
 */
export async function getRefundStatus(refundId) {
  try {
    const { data: refund } = await supabase
      .from("refunds")
      .select("*, payments(*)")
      .eq("id", refundId)
      .single();

    if (!refund) {
      throw new Error("Refund not found");
    }

    let stripeRefund = null;
    if (refund.stripe_refund_id) {
      stripeRefund = await stripe.refunds.retrieve(refund.stripe_refund_id);
    }

    return {
      success: true,
      refund,
      stripeRefund,
    };
  } catch (error) {
    console.error("Error in getRefundStatus:", error);
    throw new Error(`Failed to get refund status: ${error.message}`);
  }
}
