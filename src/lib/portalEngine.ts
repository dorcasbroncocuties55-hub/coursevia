/**
 * portalEngine.ts
 * Shared data hooks used by ALL portals — therapist, coach, creator.
 * Every hook reads from Supabase directly (or the backend API where noted).
 * No hardcoded data anywhere.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "";

// ── Generic async state ───────────────────────────────────────────────────────
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAsync<T>(fn: () => Promise<T | null>, deps: any[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fn()
      .then(d => { if (!cancelled) { setData(d); setError(null); } })
      .catch(e => { if (!cancelled) { setError(e?.message || "Unknown error"); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, error, refetch };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  available_balance: number;
  pending_balance: number;
  currency: string;
}

export interface Booking {
  id: string;
  coach_id: string;           // provider id (therapist or coach)
  learner_id: string;
  scheduled_at: string;
  status: string | null;
  duration_minutes: number;
  notes: string | null;
  meeting_url: string | null;
  service_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  learner?: { full_name: string | null; avatar_url: string | null; email: string | null };
  service?: { title: string; price: number } | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
  last_message?: string | null;
  // joined
  other_user?: { user_id: string; full_name: string | null; avatar_url: string | null; email: string | null } | null;
  unread_count?: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status?: string | null;
  description?: string | null;
  created_at: string;
  reference_id?: string | null;
  commission_amount?: number | null;
}

export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_name?: string | null;
  routing_number?: string | null;
  is_default: boolean;
  currency: string;
  created_at: string;
}

// ── useWallet ─────────────────────────────────────────────────────────────────
export function useWallet(userId: string | undefined): AsyncState<Wallet> {
  return useAsync<Wallet>(async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as Wallet | null;
  }, [userId]);
}

// ── useBookings (provider side) ───────────────────────────────────────────────
// For therapist/coach: coach_id = their user_id
export function useProviderBookings(providerId: string | undefined): AsyncState<Booking[]> {
  return useAsync<Booking[]>(async () => {
    if (!providerId) return [];
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        learner:profiles!bookings_learner_id_fkey(full_name, avatar_url, email),
        service:coach_services(title, price)
      `)
      .eq("coach_id", providerId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as Booking[];
  }, [providerId]);
}

// ── useTodayBookings ──────────────────────────────────────────────────────────
export function useTodayBookings(providerId: string | undefined): AsyncState<Booking[]> {
  return useAsync<Booking[]>(async () => {
    if (!providerId) return [];
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        learner:profiles!bookings_learner_id_fkey(full_name, avatar_url, email),
        service:coach_services(title, price)
      `)
      .eq("coach_id", providerId)
      .gte("scheduled_at", start)
      .lte("scheduled_at", end)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as Booking[];
  }, [providerId]);
}

// ── useConversations ──────────────────────────────────────────────────────────
export function useConversations(userId: string | undefined): AsyncState<Conversation[]> {
  return useAsync<Conversation[]>(async () => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("messages")
      .select("conversation_id, sender_id, content, created_at")
      .or(`sender_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    // Group by conversation_id — deduplicate
    const seen = new Set<string>();
    const convs: Conversation[] = [];
    for (const m of (data || []) as any[]) {
      if (!seen.has(m.conversation_id)) {
        seen.add(m.conversation_id);
        const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
        // fetch other participant profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, email")
          .eq("user_id", otherId)
          .maybeSingle();
        convs.push({
          id: m.conversation_id,
          participant_ids: [userId, otherId],
          created_at: m.created_at,
          updated_at: m.created_at,
          last_message: m.content,
          other_user: prof as any,
          unread_count: 0,
        });
      }
    }
    return convs;
  }, [userId]);
}

// ── useMessages ───────────────────────────────────────────────────────────────
export function useMessages(conversationId: string | undefined): AsyncState<Message[]> {
  return useAsync<Message[]>(async () => {
    if (!conversationId) return [];
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as Message[];
  }, [conversationId]);
}

// ── useSendMessage ────────────────────────────────────────────────────────────
export async function sendMessage(senderId: string, receiverId: string, content: string): Promise<void> {
  const conversationId = [senderId, receiverId].sort().join("_");
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ── useTransactions ───────────────────────────────────────────────────────────
export function useTransactions(userId: string | undefined): AsyncState<Transaction[]> {
  return useAsync<Transaction[]>(async () => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []) as Transaction[];
  }, [userId]);
}

// ── useBankAccounts ───────────────────────────────────────────────────────────
export function useBankAccounts(userId: string | undefined): AsyncState<BankAccount[]> {
  return useAsync<BankAccount[]>(async () => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });
    if (error) throw error;
    return (data || []) as BankAccount[];
  }, [userId]);
}

// ── useProfile ────────────────────────────────────────────────────────────────
export interface ProviderProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  bio: string | null;
  phone: string | null;
  country: string | null;
  role: string | null;
  is_verified: boolean | null;
  onboarding_completed: boolean | null;
}

export function useProfile(userId: string | undefined): AsyncState<ProviderProfile> {
  return useAsync<ProviderProfile>(async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, email, bio, phone, country, role, is_verified, onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as ProviderProfile | null;
  }, [userId]);
}

// ── updateProfile ─────────────────────────────────────────────────────────────
export async function updateProfile(userId: string, updates: Partial<ProviderProfile>): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── Stripe Connect: get status + balances ────────────────────────────────────
export interface StripeConnectStatus {
  connected: boolean;
  accountId?: string;
  payouts_enabled: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  onboardingComplete: boolean;
  canWithdraw: boolean;
  availableBalance: number;
  pendingBalance: number;
  balance: number;
  requirements?: { currently_due: string[]; eventually_due: string[] };
}

export async function getStripeConnectStatus(userId: string, accessToken: string): Promise<StripeConnectStatus | null> {
  const res = await fetch(`${BACKEND}/api/stripe-connect/status/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Stripe Connect: setup account + get onboarding link ──────────────────────
export async function setupStripeConnect(
  userId: string,
  email: string,
  role: string,
  accessToken: string
): Promise<{ onboardingUrl?: string; accountId: string; needsOnboarding: boolean }> {
  const res = await fetch(`${BACKEND}/api/stripe-connect/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ userId, email, role, country: "US" }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Setup failed");
  return json;
}

// ── Stripe Connect: withdraw ──────────────────────────────────────────────────
export async function requestStripeWithdrawal(
  userId: string,
  amount: number,
  role: string,
  accessToken: string
): Promise<{ withdrawalId: string; transferId: string; estimatedArrival: string }> {
  const res = await fetch(`${BACKEND}/api/stripe-connect/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ userId, amount, role }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Withdrawal failed");
  return json;
}

// ── Stripe Connect: withdrawal history ───────────────────────────────────────
export interface WithdrawalRecord {
  id: string;
  amount: number;
  status: string;
  stripe_transfer_id?: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  failure_reason?: string;
  currency: string;
}

export async function getWithdrawalHistory(userId: string, accessToken: string): Promise<WithdrawalRecord[]> {
  const res = await fetch(`${BACKEND}/api/stripe-connect/withdrawals/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// ── Stripe Connect: dashboard link ───────────────────────────────────────────
export async function getStripeDashboardLink(userId: string, accessToken: string): Promise<string | null> {
  const res = await fetch(`${BACKEND}/api/stripe-connect/dashboard-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.dashboardUrl || null;
}

// ── withdraw (via wallet backend — legacy) ────────────────────────────────────
export async function requestWithdrawal(userId: string, amount: number): Promise<void> {
  const res = await fetch(`${BACKEND}/api/wallet/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, amount }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Withdrawal failed");
  }
}

// ── getWalletFromBackend ──────────────────────────────────────────────────────
export async function getWalletFromBackend(userId: string): Promise<Wallet | null> {
  const res = await fetch(`${BACKEND}/api/wallet/${userId}`);
  if (!res.ok) return null;
  return res.json();
}

// ── useWithdrawalHistory ──────────────────────────────────────────────────────
export function useWithdrawalHistory(userId: string | undefined, accessToken: string | undefined): AsyncState<WithdrawalRecord[]> {
  return useAsync<WithdrawalRecord[]>(async () => {
    if (!userId || !accessToken) return [];
    return getWithdrawalHistory(userId, accessToken);
  }, [userId, accessToken]);
}

// ── useStripeConnectStatus ────────────────────────────────────────────────────
export function useStripeConnectStatus(userId: string | undefined, accessToken: string | undefined): AsyncState<StripeConnectStatus> {
  return useAsync<StripeConnectStatus>(async () => {
    if (!userId || !accessToken) return null;
    return getStripeConnectStatus(userId, accessToken);
  }, [userId, accessToken]);
}

// ── formatCurrency ────────────────────────────────────────────────────────────
export function fmt(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// ── formatDate ────────────────────────────────────────────────────────────────
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)}, ${fmtTime(iso)}`;
}

// ── isToday ───────────────────────────────────────────────────────────────────
export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

// ── getInitials ───────────────────────────────────────────────────────────────
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── booking status badge ──────────────────────────────────────────────────────
export function bookingStatusBadge(status: string | null): { bg: string; text: string; label: string } {
  switch ((status || "pending").toLowerCase()) {
    case "confirmed": return { bg: "#EFF6FF", text: "#1E40AF", label: "Confirmed" };
    case "completed": return { bg: "#F0FDF4", text: "#166534", label: "Completed" };
    case "cancelled": return { bg: "#FEF2F2", text: "#991B1B", label: "Cancelled" };
    case "pending": return { bg: "#FEF3C7", text: "#92400E", label: "Pending" };
    default: return { bg: "#F3F4F6", text: "#374151", label: status || "Unknown" };
  }
}
