/**
 * Stripe Learner Payment API Client
 * Functions for interacting with backend Stripe payment endpoints
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// ═══════════════════════════════════════════════════════════════════
// PAYMENT METHODS
// ═══════════════════════════════════════════════════════════════════

export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  stripe_customer_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  cardholder_name?: string;
  fingerprint?: string;
  is_default: boolean;
  created_at: string;
}

export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const res = await fetch(`${BACKEND_URL}/api/stripe-learner/payment-methods/${userId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to list payment methods");
  return json.paymentMethods || [];
}

export async function savePaymentMethod(
  userId: string,
  paymentMethodId: string,
  isDefault: boolean = false
): Promise<PaymentMethod> {
  const res = await fetch(`${BACKEND_URL}/api/stripe-learner/payment-methods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, paymentMethodId, isDefault }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to save payment method");
  return json.paymentMethod;
}

export async function setDefaultPaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/stripe-learner/payment-methods/default`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, paymentMethodId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to set default");
}

export async function deletePaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<void> {
  const res = await fetch(
    `${BACKEND_URL}/api/stripe-learner/payment-methods/${paymentMethodId}?userId=${userId}`,
    { method: "DELETE" }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to delete payment method");
}

// ═══════════════════════════════════════════════════════════════════
// PAYMENT INTENTS
// ═══════════════════════════════════════════════════════════════════

export interface PaymentIntentResponse {
  success: boolean;
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export async function createCoursePaymentIntent(
  userId: string,
  courseId: string,
  amount: number,
  paymentMethodId?: string
): Promise<PaymentIntentResponse> {
  const res = await fetch(`${BACKEND_URL}/api/stripe-learner/create-course-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, courseId, amount, paymentMethodId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create payment intent");
  return json;
}

export async function createSessionPaymentIntent(
  userId: string,
  serviceId: string,
  coachId: string,
  amount: number,
  paymentMethodId?: string
): Promise<PaymentIntentResponse> {
  const res = await fetch(`${BACKEND_URL}/api/stripe-learner/create-session-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, serviceId, coachId, amount, paymentMethodId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create payment intent");
  return json;
}

export async function confirmPayment(
  paymentIntentId: string,
  userId: string
): Promise<any> {
  const res = await fetch(`${BACKEND_URL}/api/stripe-learner/confirm-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId, userId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to confirm payment");
  return json;
}

// ═══════════════════════════════════════════════════════════════════
// CUSTOMER
// ═══════════════════════════════════════════════════════════════════

export async function getOrCreateCustomer(
  userId: string,
  email?: string,
  name?: string
): Promise<{ customerId: string; isNew: boolean }> {
  const params = new URLSearchParams();
  if (email) params.append("email", email);
  if (name) params.append("name", name);

  const res = await fetch(
    `${BACKEND_URL}/api/stripe-learner/customer/${userId}?${params.toString()}`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get customer");
  return json;
}
