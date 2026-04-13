import { getBackendBaseUrl } from "@/lib/backendApi";

export type WalletRecord = {
  id?: string;
  user_id: string;
  balance: number;
};

export type TransactionRecord = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  reference: string;
  status: string;
};

export type EscrowRecord = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  reference: string;
  release_date: string;
  status: string;
};

export const getWallet = async (userId: string): Promise<WalletRecord | null> => {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/wallet/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data || null;
  } catch {
    return null;
  }
};

export const withdrawFromWallet = async (payload: { user_id: string; amount: number }) => {
  const res = await fetch(`${getBackendBaseUrl()}/api/wallet/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Withdrawal failed");
  return data;
};

export const getTransactions = async (userId: string): Promise<TransactionRecord[]> => {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/transactions/${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return data || [];
  } catch {
    return [];
  }
};

export const getEscrow = async (userId: string): Promise<EscrowRecord[]> => {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/escrow/${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return data || [];
  } catch {
    return [];
  }
};