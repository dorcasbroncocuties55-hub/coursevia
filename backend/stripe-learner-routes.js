/**
 * STRIPE LEARNER PAYMENTS ROUTES
 * Express routes for learner payment operations
 */

import express from "express";
import {
  getOrCreateCustomer,
  savePaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  createCoursePaymentIntent,
  createSessionPaymentIntent,
  confirmPayment,
  processApprovedRefunds,
  getRefundStatus,
} from "./stripe-learner-payments.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════
// PAYMENT METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/stripe-learner/payment-methods/:userId
 * List all saved payment methods for a learner
 */
router.get("/payment-methods/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const result = await listPaymentMethods(userId);
    return res.json(result);
  } catch (error) {
    console.error("Error listing payment methods:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/stripe-learner/payment-methods
 * Save a new payment method (card)
 * Body: { userId, paymentMethodId, isDefault }
 */
router.post("/payment-methods", async (req, res) => {
  try {
    const { userId, paymentMethodId, isDefault = false } = req.body;

    if (!userId || !paymentMethodId) {
      return res.status(400).json({ message: "userId and paymentMethodId are required" });
    }

    const result = await savePaymentMethod(userId, paymentMethodId, isDefault);
    return res.json(result);
  } catch (error) {
    console.error("Error saving payment method:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/stripe-learner/payment-methods/default
 * Set a payment method as default
 * Body: { userId, paymentMethodId }
 */
router.put("/payment-methods/default", async (req, res) => {
  try {
    const { userId, paymentMethodId } = req.body;

    if (!userId || !paymentMethodId) {
      return res.status(400).json({ message: "userId and paymentMethodId are required" });
    }

    const result = await setDefaultPaymentMethod(userId, paymentMethodId);
    return res.json(result);
  } catch (error) {
    console.error("Error setting default payment method:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/stripe-learner/payment-methods/:paymentMethodId
 * Delete a payment method
 * Query: userId
 */
router.delete("/payment-methods/:paymentMethodId", async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const { userId } = req.query;

    if (!userId || !paymentMethodId) {
      return res.status(400).json({ message: "userId and paymentMethodId are required" });
    }

    const result = await deletePaymentMethod(userId, paymentMethodId);
    return res.json(result);
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PAYMENT INTENTS (CHECKOUT)
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/stripe-learner/create-course-payment
 * Create payment intent for course purchase
 * Body: { userId, courseId, amount, paymentMethodId? }
 */
router.post("/create-course-payment", async (req, res) => {
  try {
    const { userId, courseId, amount, paymentMethodId } = req.body;

    if (!userId || !courseId || !amount) {
      return res.status(400).json({ message: "userId, courseId, and amount are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const result = await createCoursePaymentIntent(userId, courseId, amount, paymentMethodId);
    return res.json(result);
  } catch (error) {
    console.error("Error creating course payment:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/stripe-learner/create-session-payment
 * Create payment intent for session booking
 * Body: { userId, serviceId, coachId, amount, paymentMethodId? }
 */
router.post("/create-session-payment", async (req, res) => {
  try {
    const { userId, serviceId, coachId, amount, paymentMethodId } = req.body;

    if (!userId || !serviceId || !amount) {
      return res.status(400).json({ message: "userId, serviceId, and amount are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const result = await createSessionPaymentIntent(userId, serviceId, coachId, amount, paymentMethodId);
    return res.json(result);
  } catch (error) {
    console.error("Error creating session payment:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/stripe-learner/confirm-payment
 * Confirm payment and create enrollment/booking
 * Body: { paymentIntentId, userId }
 */
router.post("/confirm-payment", async (req, res) => {
  try {
    const { paymentIntentId, userId } = req.body;

    if (!paymentIntentId || !userId) {
      return res.status(400).json({ message: "paymentIntentId and userId are required" });
    }

    const result = await confirmPayment(paymentIntentId, userId);
    return res.json(result);
  } catch (error) {
    console.error("Error confirming payment:", error);
    return res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/stripe-learner/process-refunds
 * Process all approved refunds (cron job endpoint)
 */
router.post("/process-refunds", async (req, res) => {
  try {
    const result = await processApprovedRefunds();
    return res.json(result);
  } catch (error) {
    console.error("Error processing refunds:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/stripe-learner/refund-status/:refundId
 * Get refund status
 */
router.get("/refund-status/:refundId", async (req, res) => {
  try {
    const { refundId } = req.params;

    if (!refundId) {
      return res.status(400).json({ message: "refundId is required" });
    }

    const result = await getRefundStatus(refundId);
    return res.json(result);
  } catch (error) {
    console.error("Error getting refund status:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/stripe-learner/customer/:userId
 * Get or create Stripe customer
 */
router.get("/customer/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, name } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const result = await getOrCreateCustomer(userId, email, name);
    return res.json(result);
  } catch (error) {
    console.error("Error getting customer:", error);
    return res.status(500).json({ message: error.message });
  }
});

export { router as stripeLearnerRoutes };
