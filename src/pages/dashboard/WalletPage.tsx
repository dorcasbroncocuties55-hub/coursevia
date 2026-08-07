import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Wallet, Clock, ReceiptText, Lock, ShoppingBag, Users, Video, Star } from "lucide-react";
import { ScrollableContent } from "@/components/ui/scrollable-content";
import {
  getWallet,
  getTransactions,
  getEscrow,
  type WalletRecord,
  type TransactionRecord,
  type EscrowRecord,
} from "@/lib/walletApi";
import { PageLoading } from "@/components/LoadingSpinner";
import { VirtualAccountCard } from "@/components/wallet/VirtualAccountCard";
import { PaddleTopUp } from "@/components/wallet/PaddleTopUp";

type WalletRole = "learner" | "coach" | "creator" | "therapist";

const fmt = (v: number) => `$${Number(v || 0).toFixed(2)}`;

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    failed:  "bg-red-50 text-red-600 border-red-200",
  };
  return map[s] || "bg-slate-50 text-slate-600 border-slate-200";
};

const WalletPage = ({ role = "learner" }: { role?: WalletRole }) => {
  const { user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<WalletRecord | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [escrow, setEscrow] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const isProvider = role !== "learner";

  const load = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const [w, t, e] = await Promise.all([
        getWallet(user.id),
        getTransactions(user.id),
        getEscrow(user.id),
      ]);
      setWallet(w);
      setTransactions(t);
      setEscrow(e);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load wallet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const available = Number((wallet as any)?.available_balance ?? wallet?.balance ?? 0);
  const pending   = Number((wallet as any)?.pending_balance ?? 0);

  const escrowPending = useMemo(
    () => escrow.filter((i) => i.status === "pending").reduce((s, i) => s + Number(i.amount || 0), 0),
    [escrow],
  );

  const withdrawRoute = `/${role}/withdrawals`;

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout role={role}>
      <ScrollableContent maxHeight="h-full" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground capitalize">{role} Wallet</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isProvider
                ? "Track earnings, escrow holds, and withdraw to your bank."
                : "Refunds and credits from cancelled bookings appear here."}
            </p>
          </div>
          {isProvider && (
            <div className="flex gap-2">
              <Button size="sm" asChild><Link to={withdrawRoute}>Transfer Earnings</Link></Button>
            </div>
          )}
        </div>

        {/* Balance cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={16} className="text-emerald-500" />
              <p className="text-sm text-muted-foreground">Available balance</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{loading ? "—" : fmt(available)}</p>
            {!isProvider && available > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">Applied automatically at checkout</p>
            )}
          </div>

          {isProvider && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Lock size={16} className="text-amber-500" />
                <p className="text-sm text-muted-foreground">Pending (8-day hold)</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{loading ? "—" : fmt(pending)}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">Released after learner approval + 8 days</p>
            </div>
          )}

          {isProvider && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-blue-500" />
                <p className="text-sm text-muted-foreground">In escrow</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{loading ? "—" : fmt(escrowPending)}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{escrow.filter((i) => i.status === "pending").length} item(s) pending release</p>
            </div>
          )}
        </div>

        {/* Provider quick-withdraw CTA */}
        {isProvider && available > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-emerald-800">You have {fmt(available)} ready to withdraw</p>
              <p className="text-sm text-emerald-700">Transfer to your verified bank account.</p>
            </div>
            <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
              <Link to={withdrawRoute}>Transfer now</Link>
            </Button>
          </div>
        )}

        {/* Learner: spend balance CTA + virtual account top-up + refund info */}
        {!isProvider && (
          <>
            {/* ── Spend wallet balance ── */}
            {available > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                    <Wallet size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900">You have {fmt(available)} to spend</p>
                    <p className="text-xs text-emerald-700">Applied automatically at checkout — or pick something now</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Find a Coach",     href: "/coaches",     icon: Users,       color: "text-blue-600",   bg: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
                    { label: "Find a Therapist", href: "/therapists",  icon: Star,        color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100 border-purple-200" },
                    { label: "Browse Videos",    href: "/videos",      icon: Video,       color: "text-rose-600",   bg: "bg-rose-50 hover:bg-rose-100 border-rose-200" },
                    { label: "Browse Courses",   href: "/courses",     icon: ShoppingBag, color: "text-amber-600",  bg: "bg-amber-50 hover:bg-amber-100 border-amber-200" },
                  ].map(({ label, href, icon: Icon, color, bg }) => (
                    <Link
                      key={href}
                      to={href}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center text-xs font-medium transition ${bg}`}
                    >
                      <Icon size={18} className={color} />
                      {label}
                    </Link>
                  ))}
                </div>
                <p className="mt-3 text-xs text-emerald-700">
                  Your balance is deducted automatically when you check out — no extra steps needed.
                </p>
              </div>
            )}

            {/* ── Zero balance nudge ── */}
            {!loading && available === 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                    <Wallet size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">No balance yet</p>
                    <p className="text-xs text-muted-foreground">Top up your wallet below to pay instantly without a card</p>
                  </div>
                </div>
              </div>
            )}

            <VirtualAccountCard />
            <PaddleTopUp onSuccess={() => load()} />
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">Refund credits</p>
              <p className="text-sm text-blue-700 mt-1">
                When a refund is approved, the amount is credited here and automatically applied to your next booking or course purchase.
              </p>
            </div>
          </>
        )}

        {/* Escrow (providers only) */}
        {isProvider && escrow.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Escrow holds</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Payments held until 8-day release window completes</p>
            </div>
            <div className="divide-y divide-border">
              {escrow.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{item.type}</p>
                    <p className="text-xs text-muted-foreground">
                      Releases {new Date(item.release_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{fmt(Number(item.amount))}</p>
                    <span className={`text-xs border rounded-full px-2 py-0.5 capitalize ${statusBadge(item.status)}`}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <ReceiptText size={15} className="text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Transaction history</h2>
          </div>
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{(t as any).payment_type || t.type}</p>
                    <p className="text-xs text-muted-foreground">{(t as any).reference_id || t.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{fmt(Number(t.amount))}</p>
                    <span className={`text-xs border rounded-full px-2 py-0.5 capitalize ${statusBadge(t.status)}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollableContent>
    </DashboardLayout>
  );
};

export const LearnerWallet   = () => <WalletPage role="learner" />;
export const CoachWallet     = () => <WalletPage role="coach" />;
export const CreatorWallet   = () => <WalletPage role="creator" />;
export const TherapistWallet = () => <WalletPage role="therapist" />;

export default WalletPage;
