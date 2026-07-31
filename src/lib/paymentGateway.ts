import { buildBackendUrl } from "@/lib/backendApi";

export type CheckoutType = "booking" | "course" | "video" | "subscription";

export type CheckoutInitializePayload = {
  email: string;
  user_id: string;
  type: CheckoutType | string;
  amount?: number;
  content_id?: string | null;
  content_title?: string;
  plan?: string;
  reference?: string;
  card_brand?: string;
  card_last4?: string;
};

export type CheckoutInitializeResponse = {
  success?: boolean;
  reference: string;
  status?: string;
  message?: string;
  amount?: number;
};

export type CheckoutVerifyResponse = {
  success?: boolean;
  reference: string;
  status: string;
  message?: string;
  redirectTo?: string;
  bookingId?: string | null;
  payment?: Record<string, any>;
};

const readJson = async <T>(response: Response): Promise<T> => {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((json as any)?.message || "Payment request failed");
  return json as T;
};

/**
 * initializeCheckout — posts to the internal /api/pay endpoint.
 * No Stripe redirect; payment is recorded directly in Supabase.
 */
export const initializeCheckout = async (
  payload: CheckoutInitializePayload,
): Promise<CheckoutInitializeResponse> => {
  const response = await fetch(buildBackendUrl("/api/pay"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<CheckoutInitializeResponse>(response);
};

/**
 * verifyCheckout — checks payment status by reference.
 */
export const verifyCheckout = async (
  reference: string,
): Promise<CheckoutVerifyResponse> => {
  const response = await fetch(
    `${buildBackendUrl("/api/checkout/verify")}?reference=${encodeURIComponent(reference)}`,
  );
  return readJson<CheckoutVerifyResponse>(response);
};
