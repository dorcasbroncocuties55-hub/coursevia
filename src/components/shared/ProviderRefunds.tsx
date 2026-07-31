import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Clock, RotateCcw, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";

type Role = "coach" | "therapist";

type RefundRow = {
  id: string;
  user_id: string;
  booking_id?: string;
  payment_id?: string;
  amount: number;
  reason?: string;
  reject_reason?: string;
  status: string;
  payment_type?: string;
  created_at: string;
  processed_at?: string;
  learner_name?: string;
  learner_email?: string;
  scheduled_at?: string;
};

const statusConfig = {
  processed: { icon: CheckCircle2, color: "text-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Approved" },
  rejected:  { icon: XCircle,      color: "text-red-500",     badge: "bg-red-50 text-red-600 border-red-200",           label: "Rejected" },
  pending:   { icon: Clock,        color: "text-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200",     label: "Under Review" },
};

export const ProviderRefunds = ({ role }: { role: Role }) => {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "processed" | "rejected">("all");

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);

    // Get provider profile id
    const profileTable = role === "coach" ? "coach_profiles" : "therapist_profiles";
    const bookingCol   = role === "coach" ? "coach_id" : "therapist_id";

    const { data: profile } = await supabase
      .from(profileTable as any).select("id").eq("user_id", user.id).maybeSingle();

    if (!profile?.id) { setLoading(false); return; }

    // Get all bookings for this provider
    const { data: bookings } = await supabase
      .from("bookings").select("id, learner_id, scheduled_at")
      .eq(bookingCol, profile.id);

    if (!bookings?.length) { setRefunds([]); setLoading(false); return; }

    const bookingIds = bookings.map(b => b.id);

    // Get refunds for those bookings
    const { data: refundRows } = await supabase
      .from("refunds" as any)
      .select("*")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });

    if (!refundRows?.length) { setRefunds([]); setLoading(false); return; }

    // Enrich with learner names
    const learnerIds = [...new Set(refundRows.map((r: any) => r.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles").select("user_id, full_name, email").in("user_id", learnerIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const bookingMap = new Map(bookings.map(b => [b.id, b]));

    setRefunds((refundRows as any[]).map(r => ({
      ...r,
      learner_name:  profileMap.get(r.user_id)?.full_name || "Client",
      learner_email: profileMap.get(r.user_id)?.email || "",
      scheduled_at:  bookingMap.get(r.booking_id)?.scheduled_at || null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, role]);

  const filtered = filter === "all" ? refunds : refunds.filter(r => r.status === filter);
  const pending = refunds.filter(r => r.status === "pending").length;

  const tabs = [
    { key: "all",       label: "All" },
    { key: "pending",   label: `Pending${pending > 0 ? ` (${pending})` : ""}` },
    { key: "processed", label: "Approved" },
    { key: "rejected",  label: "Rejected" },
  ] as const;

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Refund Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Refund requests submitted by clients for your sessions
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 space-y-1">
            <p className="font-medium">How refunds work</p>
            <p>When a client requests a refund for one of your sessions, our admin team reviews it. If approved, the amount is refunded from the platform escrow — not from your wallet. Your earnings are only affected if the refund is approved before the 8-day release period.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Requests", value: refunds.length, color: "text-foreground" },
            { label: "Pending Review", value: refunds.filter(r => r.status === "pending").length, color: "text-amber-600" },
            { label: "Approved",       value: refunds.filter(r => r.status === "processed").length, color: "text-emerald-600" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <RotateCcw size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No refund requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const cfg = statusConfig[r.status as keyof typeof statusConfig] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{r.learner_name}</p>
                        {r.learner_email && <p className="text-xs text-muted-foreground">{r.learner_email}</p>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-foreground text-sm">${Number(r.amount).toFixed(2)}</span>
                        {r.payment_type && <span className="capitalize px-2 py-0.5 rounded-full bg-muted">{r.payment_type.replace(/_/g, " ")}</span>}
                        {r.scheduled_at && <span>Session: {format(new Date(r.scheduled_at), "PP p")}</span>}
                        <span>Requested: {format(new Date(r.created_at), "PP")}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-medium ${cfg.badge}`}>
                      <Icon size={12} /> {cfg.label}
                    </span>
                  </div>

                  {r.reason && (
                    <div className="p-3 rounded-xl bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Client reason:</span> {r.reason}
                      </p>
                    </div>
                  )}

                  {r.status === "rejected" && r.reject_reason && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="text-xs text-red-700">
                        <span className="font-medium">Admin decision:</span> {r.reject_reason}
                      </p>
                    </div>
                  )}

                  {r.status === "processed" && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle size={13} className="text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700">
                        This refund was approved. If the session earnings were still in the 8-day pending period, they have been reversed.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
