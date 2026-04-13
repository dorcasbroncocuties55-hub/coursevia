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
  callback_url?: string;
};

export type CheckoutInitializeResponse = {
  success?: boolean;
  reference: string;
  payment_id?: string;
  redirect_url?: string;
  /** Checkout.com returns redirect_url; normalized below for all consumers */
  authorization_url?: string;
  access_code?: string;
  message?: string;
  redirectTo?: string;
  metadata?: Record<string, any>;
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
  if (!response.ok) {
    throw new Error((json as any)?.message || "Payment request failed");
  }
  return json as T;
};

export const initializeCheckout = async (
  payload: CheckoutInitializePayload,
): Promise<CheckoutInitializeResponse> => {
  const response = await fetch(buildBackendUrl("/api/checkout/initialize"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await readJson<CheckoutInitializeResponse>(response);

  // Normalize: Checkout.com returns redirect_url; map to authorization_url for all consumers
  if (data.redirect_url && !data.authorization_url) {
    data.authorization_url = data.redirect_url;
  }

  return data;
};

export const verifyCheckout = async (
  reference: string,
): Promise<CheckoutVerifyResponse> => {
  // reference may be our internal ref, a pay_xxx ID, or a ps_xxx session ID
  const param = reference.startsWith("pay_")
    ? `payment_id=${encodeURIComponent(reference)}`
    : reference.startsWith("ps_")
    ? `cko-session-id=${encodeURIComponent(reference)}`
    : `reference=${encodeURIComponent(reference)}`;

  const response = await fetch(`${buildBackendUrl("/api/checkout/verify")}?${param}`);
  return readJson<CheckoutVerifyResponse>(response);
};
