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
  providerPlanCode?: string | null;
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
  /** Checkout.com returns redirect_url; normalized to authorization_url by paymentGateway */
  redirect_url?: string;
  authorization_url: string;
  reference: string;
  payment_id?: string;
  message?: string;
};

const readJson = async <T>(response: Response): Promise<T> => {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || "Subscription request failed");
  }
  return json as T;
};

export const getLearnerSubscriptionPlans = async (): Promise<SubscriptionPlanSummary[]> => {
  try {
    const response = await fetch(buildBackendUrl("/api/subscription/plans"), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const json = await readJson<{ data?: SubscriptionPlanSummary[] }>(response);
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
};

export const getCurrentLearnerSubscription = async (
  userId: string,
): Promise<CurrentSubscription | null> => {
  try {
    const response = await fetch(
      `${buildBackendUrl("/api/subscriptions/current")}?user_id=${encodeURIComponent(userId)}`,
      { method: "GET", headers: { "Content-Type": "application/json" } },
    );
    const json = await readJson<{ data?: CurrentSubscription | null }>(response);
    return json?.data || null;
  } catch {
    return null;
  }
};

export const initializeLearnerSubscription = async (
  email: string,
  userId: string,
  planId: LearnerSubscriptionPlan,
): Promise<SubscriptionCheckoutResponse> => {
  const url = buildBackendUrl("/api/subscriptions/initialize");
  console.log("Subscription API call:", { url, email, userId, planId });
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, userId, planId }),
  });

  console.log("Subscription API response status:", response.status);
  const data = await readJson<SubscriptionCheckoutResponse>(response);
  console.log("Subscription API response data:", data);
  
  // Normalize Checkout.com redirect_url → authorization_url for all consumers
  if (data.redirect_url && !data.authorization_url) {
    data.authorization_url = data.redirect_url;
  }
  return data;
};

export const cancelLearnerSubscription = async (
  userId: string,
  subscriptionId?: string,
): Promise<{ success?: boolean; cancelled: boolean; message?: string }> => {
  const response = await fetch(buildBackendUrl("/api/subscriptions/cancel"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscriptionId }),
  });

  return readJson<{ success?: boolean; cancelled: boolean; message?: string }>(response);
};

export const initializeSubscription = initializeLearnerSubscription;
