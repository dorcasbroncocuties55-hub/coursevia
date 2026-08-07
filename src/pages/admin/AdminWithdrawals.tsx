/**
 * AdminWithdrawals — Manual payout management.
 * Admin sees all pending payout requests, views full bank details,
 * pays manually from business bank account, then approves or rejects.
 */
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { buildBackendUrl } from "@/lib/backendApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Copy, ChevronDown, ChevronUp,
  AlertCircle, RefreshCw, Building2, User, Search, Filter,
} from "lucide-react";

type PayoutRequest = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  account_name: string;
  account_number?: string;
  bank_name: string;
  bank_code?: string;
  swift_code?: string;
  iban?: string;
  routing_number?: string;
  country_code: string;
  note?: string;
  admin_note?: string;
  created_at: string;
  processed_at?: string;
  profiles?: {
    full_name?: string;
    email?: string;
    role?: string;
    avatar_url?: string;
  };
};

const statusBadge = (s: string) => {
  if (s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "rejected")  return "bg-red-50 text-red-600 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const CopyBtn = ({ value, label }: { value: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 text-primary hover:underline text-xs flex items-center gap-0.5 shrink-0"
    >
      <Copy size={10} /> {copied ? "Copied" : (label || "Copy")}
    </button>
  );
};

const DetailRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
    <span className="text-xs text-muted-foreground shrink-0 w-32">{label}</span>
    <div className="flex items-center gap-1 min-w-0">
      <span className={`text-xs text-foreground break-all ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
      {value && <CopyBtn value={value} />}
    </div>
  </div>
);

const AdminWithdrawals = () => {
  const [requests,    setRequests]    = useState<PayoutRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<"all" | "pending" | "completed" | "rejected">("pending");
  const [search,      setSearch]      = useState("");
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [actionId,    setActionId]    = useState<string | null>(null);
  const [adminNote,   setAdminNote]   = useState("");
  const [processing,  setProcessing]  = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all"
        ? buildBackendUrl("/api/admin/payouts")
        : buildBackendUrl(`/api/admin/payouts?status=${filter}`);
      const res  = await fetch(url);
      const data = await res.json().catch(() => ({}));
      setRequests(data.payouts || []);
    } catch {
      toast.error("Could not load payout requests.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleApprove = async (id: string) => {
    setProcessing(true);
    try {
      const res = await fetch(buildBackendUrl(`/api/admin/payouts/${id}/approve`), {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ admin_note: adminNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Approval failed");
      toast.success("Payout approved — provider notified.");
      setExpanded(null);
      setAdminNote("");
      setActionId(null);
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Could not approve payout.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!adminNote.trim()) { toast.error("Please enter a reason for rejection."); return; }
    setProcessing(true);
    try {
      const res = await fetch(buildBackendUrl(`/api/admin/payouts/${id}/reject`), {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ admin_note: adminNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Rejection failed");
      toast.success("Payout rejected — amount refunded to provider wallet.");
      setExpanded(null);
      setAdminNote("");
      setActionId(null);
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Could not reject payout.");
    } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.reference?.toLowerCase().includes(q) ||
      r.account_name?.toLowerCase().includes(q) ||
      r.bank_name?.toLowerCase().includes(q) ||
      r.profiles?.full_name?.toLowerCase().includes(q) ||
      r.profiles?.email?.toLowerCase().includes(q)
    );
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payout Requests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review, verify, and manually pay providers. Approve after transferring from your bank.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1">
                {pendingCount} pending
              </span>
            )}
            <Button size="sm" variant="outline" onClick={loadRequests} className="gap-1.5">
              <RefreshCw size={13} /> Refresh
            </Button>
          </div>
        </div>

        {/* How to process */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 space-y-1">
          <p className="font-semibold text-sm">How to process a payout</p>
          <ol className="list-decimal ml-4 space-y-0.5">
            <li>Find a pending request below and expand it to see full bank details</li>
            <li>Transfer the amount from your business bank account to their bank details</li>
            <li>Come back here and click <strong>Mark as Paid</strong> — provider gets notified immediately</li>
            <li>If there's an issue, click <strong>Reject</strong> — the amount is refunded to their wallet automatically</li>
          </ol>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, bank, reference…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-1.5">
            {(["pending", "completed", "rejected", "all"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition border ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Requests list */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {search ? "No results match your search." : `No ${filter === "all" ? "" : filter} payout requests.`}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(r => {
                const isExpanded = expanded === r.id;
                const isActioning = actionId === r.id;
                return (
                  <div key={r.id}>
                    {/* Row summary */}
                    <button
                      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition"
                      onClick={() => { setExpanded(isExpanded ? null : r.id); setActionId(null); setAdminNote(""); }}
                    >
                      {/* Status icon */}
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {r.status === "completed" ? <CheckCircle2 size={16} className="text-emerald-500" />
                          : r.status === "rejected"  ? <XCircle size={16} className="text-red-500" />
                          : <Clock size={16} className="text-amber-500" />}
                      </div>

                      {/* Provider + bank */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">
                            {r.currency} {Number(r.amount).toFixed(2)}
                          </p>
                          <span className={`text-[11px] border rounded-full px-2 py-0.5 font-medium capitalize ${statusBadge(r.status)}`}>
                            {r.status === "completed" ? "Paid" : r.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.profiles?.full_name || r.profiles?.email || "Provider"} ·{" "}
                          {r.bank_name} ·{" "}
                          {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground/70 mt-0.5">{r.reference}</p>
                      </div>

                      {isExpanded ? <ChevronUp size={15} className="text-muted-foreground shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground shrink-0" />}
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 px-5 py-5 space-y-5">

                        <div className="grid sm:grid-cols-2 gap-5">
                          {/* Provider info */}
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                              <User size={11} /> Provider
                            </p>
                            <DetailRow label="Name"  value={r.profiles?.full_name || "—"} />
                            <DetailRow label="Email" value={r.profiles?.email || "—"} />
                            <DetailRow label="Role"  value={r.profiles?.role || "—"} />
                          </div>

                          {/* Bank details */}
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                              <Building2 size={11} /> Bank Details — transfer to these
                            </p>
                            <DetailRow label="Account name"   value={r.account_name} />
                            <DetailRow label="Bank"           value={r.bank_name} />
                            {r.account_number && <DetailRow label="Account number" value={r.account_number} mono />}
                            {r.bank_code      && <DetailRow label="Bank code"      value={r.bank_code} mono />}
                            {r.swift_code     && <DetailRow label="SWIFT / BIC"    value={r.swift_code} mono />}
                            {r.iban           && <DetailRow label="IBAN"           value={r.iban} mono />}
                            {r.routing_number && <DetailRow label="Routing"        value={r.routing_number} mono />}
                            <DetailRow label="Country"        value={r.country_code} />
                            <DetailRow label="Amount"         value={`${r.currency} ${Number(r.amount).toFixed(2)}`} />
                          </div>
                        </div>

                        {r.note && (
                          <div className="rounded-lg border border-border bg-card p-3 text-xs">
                            <span className="font-medium text-muted-foreground">Provider note: </span>{r.note}
                          </div>
                        )}

                        {r.admin_note && (
                          <div className="rounded-lg border border-border bg-card p-3 text-xs">
                            <span className="font-medium text-muted-foreground">Admin note: </span>{r.admin_note}
                          </div>
                        )}

                        {/* Action buttons — only for pending */}
                        {r.status === "pending" && (
                          <>
                            {!isActioning ? (
                              <div className="flex gap-3 pt-1">
                                <Button
                                  className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => { setActionId(r.id); }}
                                >
                                  <CheckCircle2 size={14} /> Mark as Paid
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => { setActionId(r.id + "_reject"); }}
                                >
                                  <XCircle size={14} /> Reject
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3 pt-1">
                                {actionId === r.id + "_reject" && (
                                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                    Rejection refunds the full amount back to the provider's wallet automatically.
                                  </div>
                                )}
                                <div>
                                  <label className="text-xs font-medium text-foreground block mb-1.5">
                                    {actionId === r.id + "_reject" ? "Reason for rejection *" : "Admin note (optional)"}
                                  </label>
                                  <Input
                                    value={adminNote}
                                    onChange={e => setAdminNote(e.target.value)}
                                    placeholder={actionId === r.id + "_reject" ? "e.g. Invalid bank details" : "e.g. Transferred via GTBank"}
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => { setActionId(null); setAdminNote(""); }}
                                    disabled={processing}
                                  >
                                    Cancel
                                  </Button>
                                  {actionId === r.id ? (
                                    <Button
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                      onClick={() => handleApprove(r.id)}
                                      disabled={processing}
                                    >
                                      {processing ? "Processing…" : <><CheckCircle2 size={14} /> Confirm Paid</>}
                                    </Button>
                                  ) : (
                                    <Button
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5"
                                      onClick={() => handleReject(r.id)}
                                      disabled={processing}
                                    >
                                      {processing ? "Processing…" : <><XCircle size={14} /> Confirm Reject</>}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminWithdrawals;
