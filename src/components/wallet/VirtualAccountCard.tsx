/**
 * VirtualAccountCard
 * Shows the learner their dedicated bank account number.
 * They transfer money from their own bank to fund their Coursevia wallet.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildBackendUrl } from "@/lib/backendApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Building2, Copy, CheckCircle2, Loader2, RefreshCw,
  ChevronDown, ChevronUp, AlertCircle, Globe,
} from "lucide-react";

// ── Currency options the learner can choose ───────────────────────────────────
const CURRENCIES = [
  { code: "USD", country: "US", label: "USD — US Dollar",         flag: "🇺🇸" },
  { code: "GBP", country: "GB", label: "GBP — British Pound",     flag: "🇬🇧" },
  { code: "EUR", country: "DE", label: "EUR — Euro",              flag: "🇪🇺" },
  { code: "AUD", country: "AU", label: "AUD — Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", country: "CA", label: "CAD — Canadian Dollar",   flag: "🇨🇦" },
  { code: "SGD", country: "SG", label: "SGD — Singapore Dollar",  flag: "🇸🇬" },
  { code: "HKD", country: "HK", label: "HKD — Hong Kong Dollar",  flag: "🇭🇰" },
  { code: "JPY", country: "JP", label: "JPY — Japanese Yen",      flag: "🇯🇵" },
];

type VirtualAccount = {
  id: string;
  airwallex_id: string;
  account_number?: string;
  routing_number?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  account_name?: string;
  currency: string;
  country_code: string;
  status: string;
};

type TopUp = {
  id: string;
  amount: number;
  currency: string;
  sender_name?: string;
  reference?: string;
  created_at: string;
};

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy}
      className="ml-2 flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
      {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

export const VirtualAccountCard = () => {
  const { user, profile } = useAuth();

  const [accounts,      setAccounts]      = useState<VirtualAccount[]>([]);
  const [topups,        setTopups]        = useState<TopUp[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [creating,      setCreating]      = useState(false);
  const [showTopups,    setShowTopups]    = useState(false);
  const [selectedCcy,   setSelectedCcy]   = useState("USD");
  const [showCcyPicker, setShowCcyPicker] = useState(false);
  // null = not checked yet, false = backend reachable, string = error message
  const [backendError,  setBackendError]  = useState<string | null>(null);

  const backendBase = buildBackendUrl("");

  const loadAccounts = async () => {
    if (!user?.id) return;
    setLoading(true);
    setBackendError(null);
    try {
      const [accRes, topRes] = await Promise.all([
        fetch(`${backendBase}/api/virtual-account/${user.id}`),
        fetch(`${backendBase}/api/virtual-account/${user.id}/topups`),
      ]);

      // Surface Airwallex-not-configured and other backend errors clearly
      if (!accRes.ok) {
        const body = await accRes.json().catch(() => ({}));
        const msg = body?.error || `Backend error (${accRes.status})`;
        setBackendError(msg);
        setLoading(false);
        return;
      }

      const accData = await accRes.json().catch(() => ({}));
      const topData = await topRes.json().catch(() => ({}));
      setAccounts(accData.accounts || []);
      setTopups(topData.topups || []);
      setBackendError(null);
    } catch {
      // Network error — backend unreachable
      setBackendError("Could not reach the backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, [user?.id]);

  const createAccount = async () => {
    if (!user?.id || !user?.email) return;
    const chosen = CURRENCIES.find(c => c.code === selectedCcy);
    setCreating(true);
    try {
      const res = await fetch(`${backendBase}/api/virtual-account/create`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:      user.id,
          email:        user.email,
          full_name:    profile?.full_name || user.email,
          currency:     selectedCcy,
          country_code: chosen?.country || "US",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "Failed to create account";
        // Persist as a banner rather than just a fleeting toast for config errors
        if (res.status === 503) setBackendError(msg);
        throw new Error(msg);
      }
      toast.success(`${selectedCcy} account created!`);
      setBackendError(null);
      await loadAccounts();
    } catch (err: any) {
      toast.error(err.message || "Could not create virtual account");
    } finally {
      setCreating(false);
    }
  };

  const activeAccount = accounts.find(a => a.currency === selectedCcy && a.status === "active");
  const ccyInfo       = CURRENCIES.find(c => c.code === selectedCcy);

  // ── Account details rows ──────────────────────────────────────────────────

  const buildRows = (acc: VirtualAccount) => {
    const rows: { label: string; value: string }[] = [];
    if (acc.account_name)   rows.push({ label: "Account name",    value: acc.account_name });
    if (acc.bank_name)      rows.push({ label: "Bank",            value: acc.bank_name });
    if (acc.iban)           rows.push({ label: "IBAN",            value: acc.iban });
    if (acc.bic)            rows.push({ label: "BIC / SWIFT",     value: acc.bic });
    if (acc.account_number) rows.push({ label: "Account number",  value: acc.account_number });
    if (acc.routing_number) rows.push({ label: "Routing / Sort",  value: acc.routing_number });
    rows.push({ label: "Currency", value: acc.currency });
    return rows;
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-primary" />
          <h2 className="font-semibold text-foreground">Your Bank Account</h2>
        </div>
        <button onClick={loadAccounts} className="text-muted-foreground hover:text-foreground">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* Info banner */}
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3.5 text-sm text-foreground space-y-1">
          <p className="font-medium">Fund your wallet with a bank transfer</p>
          <p className="text-xs text-muted-foreground">
            Transfer money from your personal bank to this account. It will reflect in your Coursevia wallet automatically — usually within minutes.
          </p>
        </div>

        {/* Airwallex / backend error banner */}
        {backendError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Bank account service unavailable</p>
                <p className="text-xs text-amber-800 mt-0.5 break-words">{backendError}</p>
              </div>
            </div>
            {backendError.toLowerCase().includes("airwallex") || backendError.toLowerCase().includes("not configured") ? (
              <p className="text-xs text-amber-700 pl-5">
                Add your <strong>AIRWALLEX_CLIENT_ID</strong> and <strong>AIRWALLEX_API_KEY</strong> to{" "}
                <code className="bg-amber-100 px-1 rounded">backend/.env</code>, then restart the server.
                See <strong>AIRWALLEX_SETUP.md</strong> in your project root for full instructions.
              </p>
            ) : (
              <p className="text-xs text-amber-700 pl-5">
                Make sure the backend server is running:{" "}
                <code className="bg-amber-100 px-1 rounded">cd backend &amp;&amp; npm start</code>
              </p>
            )}
            <button
              onClick={loadAccounts}
              className="ml-5 flex items-center gap-1 text-xs text-amber-700 hover:underline font-medium"
            >
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        )}

        {/* Currency picker */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Select currency</p>
          <div className="relative">
            <button
              onClick={() => setShowCcyPicker(v => !v)}
              className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm hover:border-primary/40 transition"
            >
              <span>{ccyInfo?.flag} {ccyInfo?.label}</span>
              {showCcyPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showCcyPicker && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                {CURRENCIES.map(c => (
                  <button key={c.code}
                    onClick={() => { setSelectedCcy(c.code); setShowCcyPicker(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-muted transition
                      ${selectedCcy === c.code ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}
                  >
                    <span>{c.flag}</span> {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account details / create */}
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading your account…</span>
          </div>
        ) : activeAccount ? (
          <div className="rounded-xl border border-border overflow-hidden">
            {buildRows(activeAccount).map(({ label, value }) => (
              <div key={label}
                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 gap-4">
                <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                <div className="flex items-center gap-0 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate font-mono">{value}</span>
                  <CopyButton value={value} label={label} />
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-700 font-medium">
                Account active — transfers credit your wallet instantly
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
            <Globe size={24} className="mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground text-sm">No {selectedCcy} account yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a dedicated {selectedCcy} bank account to receive transfers
              </p>
            </div>
            <Button onClick={createAccount} disabled={creating} size="sm" className="gap-2">
              {creating
                ? <><Loader2 size={13} className="animate-spin" /> Creating…</>
                : <><Building2 size={13} /> Create {selectedCcy} Account</>}
            </Button>
          </div>
        )}

        {/* Notice */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>
            Always use your full name as the transfer reference so we can match your payment.
            Transfers usually arrive within 1–30 minutes depending on your bank.
          </span>
        </div>
      </div>

      {/* Top-up history */}
      {topups.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowTopups(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition"
          >
            <span>Top-up history ({topups.length})</span>
            {showTopups ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showTopups && (
            <div className="divide-y divide-border">
              {topups.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.currency} {Number(t.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {t.sender_name && ` · ${t.sender_name}`}
                    </p>
                  </div>
                  <span className="text-xs border rounded-full px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                    Credited
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
