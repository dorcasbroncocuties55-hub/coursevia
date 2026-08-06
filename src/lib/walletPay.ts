/**
 * walletPay.ts
 * Client-side helper for the POST /api/wallet/pay endpoint.
 * Used by WalletCheckoutModal, CheckoutPage, booking flows, and subscriptions.
 */
import { buildBackendUrl } from "@/lib/backendApi";

export type WalletPayPayload = {
  user_id: string;
  email: string;
  type: "course" | "video" | "booking" | "subscription";
  amount: number;
  content_id?: string | null;
  content_title?: string | null;
  plan?: string | null;
};

export type WalletPayResponse = {
  success: boolean;
  reference: string;
  status: string;
  message: string;
  amount: number;
  balance_after: number;
};

export type WalletBalanceResponse = {
  available: number;
  pending: number;
  balance: number;
};

/** Fetch current wallet balance for a user. */
export const getWalletBalance = async (userId: string): Promise<WalletBalanceResponse> => {
  const res = await fetch(buildBackendUrl(`/api/wallet/balance/${encodeURIComponent(userId)}`));
  const data = await res.json().catch(() => ({ available: 0, pending: 0, balance: 0 }));
  if (!res.ok) throw new Error(data?.error || "Could not load wallet balance.");
  return data as WalletBalanceResponse;
};

/** Deduct from wallet, record payment, grant access. Throws on failure. */
export const walletPay = async (payload: WalletPayPayload): Promise<WalletPayResponse> => {
  const res = await fetch(buildBackendUrl("/api/wallet/pay"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Wallet payment failed.");
  return data as WalletPayResponse;
};
