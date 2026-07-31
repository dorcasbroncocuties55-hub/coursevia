import { buildBackendUrl } from "@/lib/backendApi";

export type LearnerSubscriptionPlan = "monthly" | "yearly";

export type SubscriptionPlanSummary = {
  code: LearnerSubscriptionPlan;
  name: string;
  price: number;
  priceLabel: string;
  currency: string;
  intervalLabel: string;
  benefits: string[];
  featured?: boolean;
};

export type CurrentSubscription = {
  id?: string;
  user_id?: string;
  plan?: string | null;
  plan_code?: string | null;
  status?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  cancel_at_period_end?: boolean;
  provider_name?: string | null;
  payment_provider?: string | null;
};

export type SubscriptionCheckoutResponse = {
  success?: boolean;
  reference: string;
  status?: string;
  message?: string;
  /** kept for any consumers that still check this field */
  authorization_url?: string;
  redirect_url?: string;
};

const readJson = async <T>(response: Response): Promise<T> => {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || "Subscription request failed");
  return json as T;
};

export const getLearnerSubscriptionPlans = async (): Promise<SubscriptionPlanSummary[]> => {
  try {
    const res = await fetch(buildBackendUrl("/api/subscription/plans"), {
      headers: { "Content-Type": "application/json" },
    });
    const json = await readJson<{ data?: SubscriptionPlanSummary[] }>(res);
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
};

export const getCurrentLearnerSubscription = async (
  userId: string,
): Promise<CurrentSubscription | null> => {
  try {
    const res = await fetch(
      `${buildBackendUrl("/api/subscriptions/current")}?user_id=${encodeURIComponent(userId)}`,
      { headers: { "Content-Type": "application/json" } },
    );
    const json = await readJson<{ data?: CurrentSubscription | null }>(res);
    return json?.data || null;
  } catch {
    return null;
  }
};

/**
 * initializeLearnerSubscription — posts to internal /api/pay with type=subscription.
 * Returns a synthetic SubscriptionCheckoutResponse so existing consumers don't break.
 */
export const initializeLearnerSubscription = async (
  email: string,
  userId: string,
  planId: LearnerSubscriptionPlan,
): Promise<SubscriptionCheckoutResponse> => {
  const res = await fetch(buildBackendUrl("/api/pay"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, user_id: userId, type: "subscription", plan: planId }),
  });

  const data = await readJson<SubscriptionCheckoutResponse>(res);

  // Provide a redirect URL so any consumer that navigates on authorization_url still works
  if (!data.authorization_url) {
    data.authorization_url = "/dashboard/subscription";
    data.redirect_url      = "/dashboard/subscription";
  }

  return data;
};

export const cancelLearnerSubscription = async (
  userId: string,
  subscriptionId?: string,
): Promise<{ success?: boolean; cancelled: boolean; message?: string }> => {
  const res = await fetch(buildBackendUrl("/api/subscriptions/cancel"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscriptionId }),
  });
  return readJson<{ success?: boolean; cancelled: boolean; message?: string }>(res);
};

export const initializeSubscription = initializeLearnerSubscription;
